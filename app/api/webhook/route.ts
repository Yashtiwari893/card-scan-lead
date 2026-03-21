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

// Helper to generate a unique 6-digit referral code
function generateReferCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function processWebhook(payload: any) {
  await dbConnect();
  const { sender, isImage, text, base64Image } = await parseWebhookPayload(payload);
  if (!sender) return;

  const cleanSender = sender.replace('+', '').trim();
  let user = await User.findOne({ whatsappNumber: cleanSender });

  // 1. Initial State / "hi" trigger with Referral Check
  if (!user || text?.toLowerCase().startsWith('hi')) {
    const isNew = !user;
    let referralTag = "";
    
    // Check if "hi code" like "hi RFR123"
    if (text?.toLowerCase().includes(' ')) {
      referralTag = text.split(' ')[1].toUpperCase().trim();
    }

    if (!user) {
      user = await User.create({ 
        whatsappNumber: cleanSender, 
        botState: 'new',
        referralCode: generateReferCode(),
        referredBy: referralTag || null,
        scanCredits: referralTag ? 10 : 5 // Bonus for using referral
      });
      
      // Reward the referrer if credit awarded
      if (referralTag) {
        const referrer = await User.findOne({ referralCode: referralTag });
        if (referrer) {
          referrer.scanCredits += 10;
          referrer.referralCount += 1;
          await referrer.save();
          // Notify referrer (Optionally)
          await sendWhatsAppMessage(referrer.whatsappNumber, `🎉 Great news! Someone used your referral. You've earned 10 additional scan credits! 🎁`);
        }
      }
    }
    
    if (user.botState === 'new' || text?.toLowerCase() === 'hi') {
      user.botState = 'awaiting_email';
      await user.save();
      const bonusMsg = referralTag ? ` (Wait, I see you used a referral! You got 10 scans instead of 5 🎁)` : "";
      await sendWhatsAppMessage(cleanSender, `Welcome to Grid AI 👋${bonusMsg}\nPlease share your email to complete your signup.`);
      return;
    }
  }

  // 2. Awaiting Email State
  if (user.botState === 'awaiting_email' && text?.includes('@')) {
    user.email = text.trim();
    user.botState = 'active';
    await user.save();
    const welcome = `Awesome! 🎉 You're officially on the GRID AI insider list 😎\nYou can now upload a business card image to scan. Current Credits: *${user.scanCredits}*`;
    await sendWhatsAppMessage(cleanSender, welcome);
    return;
  }

  // 3. Active State
  if (user.botState === 'active') {
    
    // Command: Refer and Earn
    if (text?.toLowerCase() === 'refer and earn') {
       const refLink = `https://wa.me/${process.env.ELEVENZA_PHONE_NUMBER}?text=hi%20${user.referralCode}`;
       const stats = `🎁 *Refer and Earn* 🎁\n\nInvite your friends and earn *10 scan credits* per referral! Your friend also gets 10 scans.\n\nYour Referral Code: *${user.referralCode}*\nYour Referrals: *${user.referralCount}*\n\nShare this link:\n${refLink}`;
       await sendWhatsAppMessage(cleanSender, stats);
       return;
    }

    if (text?.toLowerCase() === 'm' || text?.toLowerCase() === 'menu') {
      await sendWhatsAppMessage(cleanSender, "Main Menu 📋\n\n- Scan a Business Card\n- Do more with Grid\n- Refer and Earn\n- Buy Credits");
      return;
    }

    // Handle Image Scan...
    if (isImage && base64Image) {
      if (user.scanCredits <= 0) {
        await sendWhatsAppMessage(cleanSender, "❌ Scan credits exhausted! Refer friends or buy credits.");
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

      autoSync(user._id.toString(), newContact._id.toString(), contactData);

      const confirm = `Name: *${contactData.name || 'N/A'}*\nBusiness: *${contactData.company || 'N/A'}*\nEmail: ${contactData.email || 'N/A'}\n\n_Credits left: *${user.scanCredits}*_`;
      await sendWhatsAppMessage(cleanSender, confirm);

      const vcfUrl = `https://card-scan-lead.vercel.app/api/vcf/${newContact._id}`;
      await sendWhatsAppDocument(cleanSender, vcfUrl, `${contactData.name || 'contact'}.vcf`);
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
