import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import Contact from '@/lib/db/models/Contact';
import Integration from '@/lib/db/models/Integration';
import aiRouter from '@/lib/ai/aiRouter';
import { parseWebhookPayload } from '@/lib/whatsapp/parser';
import { sendWhatsAppMessage, sendWhatsAppDocument } from '@/lib/whatsapp/sender';

// Auto-Sync Phase 2 Imports
import { appendContactToSheet } from '@/lib/google/sheets';
import { createFollowUpEvent } from '@/lib/google/calendar';
import { sendFollowUpEmail } from '@/lib/google/gmail';
import { saveToGoogleContacts } from '@/lib/google/contacts';

/**
 * WhatsApp Business API Webhook handler for 11za
 * POST /api/webhook
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Verification check (if needed)
    const secret = req.headers.get('x-11za-secret');
    if (process.env.ELEVENZA_WEBHOOK_SECRET && secret !== process.env.ELEVENZA_WEBHOOK_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized secret' }, { status: 401 });
    }

    // Process asynchronously to avoid 11za timeout
    processWebhook(payload).catch((err) => console.error("Webhook Background Error:", err));

    return NextResponse.json({ success: true, message: 'Processing in background' });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function processWebhook(payload: any) {
  await dbConnect();

  try {
    const { sender, isImage, text, base64Image } = await parseWebhookPayload(payload);
    if (!sender) return;

    const cleanSender = sender.replace('+', '').trim();
    let user = await User.findOne({ whatsappNumber: cleanSender });

    // Handle initial greeting "hi" or "hello"
    if (text?.toLowerCase() === 'hi' || text?.toLowerCase() === 'hello') {
      if (!user) {
        user = await User.create({
          whatsappNumber: cleanSender,
          state: 'awaiting_email',
          scanCredits: 5,
        });
      }
      
      const welcomeMsg = `Welcome to Grid AI 👋\nPlease share your email to complete \nyour signup and get started with \nyour free card scans.`;
      await sendWhatsAppMessage(cleanSender, welcomeMsg);
      return;
    }

    // Handle email submission during onboarding
    if (user?.state === 'awaiting_email' && text?.includes('@')) {
      const email = text.trim();
      user.email = email;
      user.state = 'active';
      await user.save();

      const successMsg = `Awesome! 🎉 You're now officially \non the GRID AI insider list 😎\nYou can now upload a picture of \nbusiness card to start scanning`;
      await sendWhatsAppMessage(cleanSender, successMsg);
      return;
    }

    // Handle "M" or "menu"
    if (text?.toLowerCase() === 'm' || text?.toLowerCase() === 'menu') {
      await sendMainMenu(cleanSender);
      return;
    }

    // Handle Menu Options
    if (text === 'Do more with Grid') {
      const moreMsg = `List menu:\n- Sheet Setup\n- Calendar Setup\n- Email Setup\n- Enable Front/Back\n- Enable Translation\n- Refer and Earn\n- Create Business Profile`;
      await sendWhatsAppMessage(cleanSender, moreMsg);
      return;
    }

    if (text === 'Sheet Setup') {
      const shortLink = await generateShortLink(user?._id.toString(), 'sheets');
      await sendWhatsAppMessage(cleanSender, `Click the link below to \nsee your drive setup.\n${shortLink}`);
      return;
    }

    // Handle Card Scanning (Image)
    if (isImage && base64Image) {
      if (!user || user.state !== 'active') {
        await sendWhatsAppMessage(cleanSender, "Please say 'hi' to get started first!");
        return;
      }

      if (user.scanCredits <= 0) {
        await sendWhatsAppMessage(cleanSender, "❌ Scan credits exhausted! Please buy more credits to continue.");
        return;
      }

      // 3. Call AI parsing logic
      const { data: contactData, provider } = await aiRouter.parseBusinessCard(base64Image);

      // 4. Save to MongoDB
      const newContact = await Contact.create({
        userId: user._id,
        ...contactData,
        rawText: JSON.stringify(contactData),
        aiProvider: provider,
        syncedTo: [],
      });

      // 5. Update user scan count and credits
      user.scansUsed += 1;
      user.scanCredits -= 1;
      await user.save();

      // 6. Trigger Auto-Sync
      autoSync(user._id.toString(), newContact._id.toString(), contactData).catch(e => console.error("AutoSync Error:", e));

      // 7. Send confirmation reply
      const confirmMessage = `Name: *${contactData.name || 'N/A'}*\nBusiness: *${contactData.company || 'N/A'}*\nDesignation: *${contactData.jobTitle || 'N/A'}*\nEmail: ${contactData.email || 'N/A'}\nWebsite: ${contactData.website || 'N/A'}\nContact: *${contactData.phone || 'N/A'}*\n\n_You have *${user.scanCredits}* scan credits left!_\nReply 'M' for main menu`;

      await sendWhatsAppMessage(cleanSender, confirmMessage);

      // 8. Send VCF file
      const vcfUrl = `https://card-scan-lead.vercel.app/api/vcf/${newContact._id}`;
      await sendWhatsAppDocument(cleanSender, vcfUrl, `${contactData.name || 'contact'}.vcf`, "Save Contact");

      // 9. Send follow-up message if first scan
      if (user.isFirstScan) {
        const firstScanMsg = `✅ Great job! You've just scanned \nyour first business card.\nNow, let's connect your Google Sheets \nand Calendar to streamline your \nfollow-ups.\nReply 'M' for main menu\n\n- Scan a Business Card\n- Do more with Grid\n- Buy Credits`;
        await sendWhatsAppMessage(cleanSender, firstScanMsg);
        user.isFirstScan = false;
        await user.save();
      }

      return;
    }

  } catch (error: any) {
    console.error("Webhook logic failure:", error);
  }
}

async function sendMainMenu(to: string) {
  const menuMsg = `Main Menu 📋\n\n- Scan a Business Card\n- Do more with Grid\n- Buy Credits\n\nReply with the option name.`;
  await sendWhatsAppMessage(to, menuMsg);
}

async function generateShortLink(userId: string | undefined, type: string) {
  if (!userId) return "https://card-scan-lead.vercel.app/dashboard";
  
  try {
    const res = await fetch(`https://card-scan-lead.vercel.app/api/integrations/short-link`, {
      method: 'POST',
      body: JSON.stringify({ userId, type }),
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return data.shortUrl;
  } catch (e) {
    return "https://card-scan-lead.vercel.app/dashboard";
  }
}


/**
 * Fires all connected integrations for a user asynchronously
 */
async function autoSync(userId: string, contactId: string, contactData: any) {
  const integration = await Integration.findOne({ userId, provider: 'google' });
  if (!integration) return;

  const scopes = integration.scope || '';

  const results = await Promise.allSettled([
    scopes.includes('spreadsheets') ? appendContactToSheet(userId, contactData) : Promise.reject('skipped'),
    scopes.includes('calendar') ? createFollowUpEvent(userId, contactData) : Promise.reject('skipped'),
    scopes.includes('gmail') ? sendFollowUpEmail(userId, contactData) : Promise.reject('skipped'),
    scopes.includes('contacts') ? saveToGoogleContacts(userId, contactData) : Promise.reject('skipped'),
  ]);

  const services = ['sheets', 'calendar', 'gmail', 'contacts'];
  const synced = services.filter((_, i) => results[i]?.status === 'fulfilled');

  if (synced.length > 0) {
    await Contact.findByIdAndUpdate(contactId, { syncedTo: synced });
  }
}
