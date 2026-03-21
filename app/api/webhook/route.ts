import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import Contact from '@/lib/db/models/Contact';
import Integration from '@/lib/db/models/Integration';
import aiRouter from '@/lib/ai/aiRouter';
import { parseWebhookPayload } from '@/lib/whatsapp/parser';
import { sendWhatsAppMessage, sendWhatsAppDocument } from '@/lib/whatsapp/sender';
import { appendContactToSheet } from '@/lib/google/sheets';
import { createFollowUpEvent } from '@/lib/google/calendar';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    processWebhook(payload).catch((err) => console.error("Webhook Background Error:", err));
    return NextResponse.json({ success: true, message: 'Processing' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function processWebhook(payload: any) {
  await dbConnect();
  const { sender, isImage, text, base64Image } = await parseWebhookPayload(payload);
  if (!sender) return;

  const cleanSender = sender.replace('+', '').trim();
  let user = await User.findOne({ whatsappNumber: cleanSender });

  // STATE MACHINE START
  
  // 1. Initial State / "hi" trigger
  if (!user || text?.toLowerCase() === 'hi' || text?.toLowerCase() === 'hello') {
    if (!user) {
      user = await User.create({ whatsappNumber: cleanSender, botState: 'new' });
    }
    
    // Check if transition to awaiting_email is needed
    if (user.botState === 'new' || text?.toLowerCase() === 'hi') {
      user.botState = 'awaiting_email';
      await user.save();
      await sendWhatsAppMessage(cleanSender, "Welcome to Grid AI 👋\nPlease share your email to complete your signup and get started with your free card scans.");
      return;
    }
  }

  // 2. Awaiting Email State
  if (user.botState === 'awaiting_email' && text?.includes('@')) {
    user.email = text.trim();
    user.botState = 'active';
    await user.save();
    const welcome = `Awesome! 🎉 You're now officially on the GRID AI insider list 😎\nYou can now upload a picture of a business card to start scanning!`;
    await sendWhatsAppMessage(cleanSender, welcome);
    return;
  }

  // 3. Active State (Menu, Scan, NL Calendar)
  if (user.botState === 'active') {
    
    // Handle "M" or "menu"
    if (text?.toLowerCase() === 'm' || text?.toLowerCase() === 'menu') {
      await sendWhatsAppMessage(cleanSender, "Main Menu 📋\n\n- Scan a Business Card\n- Do more with Grid\n- Buy Credits\n\nReply with the option name.");
      return;
    }

    // Handle "Do more with Grid" menu items
    if (text === 'Do more with Grid') {
       const msg = "List menu:\n- Sheet Setup\n- Calendar Setup\n- Email Setup\n- Enable Front/Back\n- Enable Translation\n- Refer and Earn";
       await sendWhatsAppMessage(cleanSender, msg);
       return;
    }

    if (text?.toLowerCase().includes('sheet setup')) {
      const res = await fetch(`https://card-scan-lead.vercel.app/api/integrations/short-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, type: 'sheets' })
      });
      const data = await res.json();
      await sendWhatsAppMessage(cleanSender, `Click the link below to connect your Google Sheets:\n${data.shortUrl}`);
      return;
    }

    // Handle Card Scanning (Image)
    if (isImage && base64Image) {
      if (user.scanCredits <= 0) {
        await sendWhatsAppMessage(cleanSender, "❌ Scan credits exhausted! Please buy more credits.");
        return;
      }

      const { data: contactData, provider } = await aiRouter.parseBusinessCard(base64Image);
      const newContact = await Contact.create({
        userId: user._id,
        ...contactData,
        aiProvider: provider,
        syncedTo: [],
      });

      user.scanCredits -= 1;
      user.scansUsed += 1;
      await user.save();

      // Trigger Auto-Sync (Historical too if needed but handled elsewhere)
      autoSync(user._id.toString(), newContact._id.toString(), contactData);

      const confirm = `Name: *${contactData.name || 'N/A'}*\nBusiness: *${contactData.company || 'N/A'}*\nEmail: ${contactData.email || 'N/A'}\nContact: *${contactData.phone || 'N/A'}*\n\n_Credits left: *${user.scanCredits}*_`;
      await sendWhatsAppMessage(cleanSender, confirm);

      const vcfUrl = `https://card-scan-lead.vercel.app/api/vcf/${newContact._id}`;
      await sendWhatsAppDocument(cleanSender, vcfUrl, `${contactData.name || 'contact'}.vcf`);
      return;
    }

    // Handle Natural Language Calendar (Simple Placeholder Logic for now or use AI)
    if (text && (text.toLowerCase().includes('schedule') || text.toLowerCase().includes('meeting') || text.toLowerCase().includes('tomorrow'))) {
       // Ideally parse with Gemini here
       await sendWhatsAppMessage(cleanSender, "📅 Detecting meeting details... I'll set up a follow-up for you!");
       // Generic follow up for now
       await createFollowUpEvent(user._id.toString(), { name: 'User Request', email: '', phone: '', company: '', jobTitle: '', website: '' });
       await sendWhatsAppMessage(cleanSender, "✅ Meeting scheduled 3 days from now as a follow-up! You can check your Google Calendar.");
       return;
    }
  }
}

async function autoSync(userId: string, contactId: string, contactData: any) {
  const integration = await Integration.findOne({ userId, provider: 'google' });
  if (!integration) return;
  const scopes = integration.scope || '';
  if (scopes.includes('spreadsheets')) {
    await appendContactToSheet(userId, contactData);
    await Contact.findByIdAndUpdate(contactId, { $push: { syncedTo: 'sheets' } });
  }
}
