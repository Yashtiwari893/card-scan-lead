import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import Contact from '@/lib/db/models/Contact';
import Integration from '@/lib/db/models/Integration';
import aiRouter from '@/lib/ai/aiRouter';
import { parseWebhookPayload } from '@/lib/whatsapp/parser';
import { sendWhatsAppMessage } from '@/lib/whatsapp/sender';

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
    // 1. Parse payload to get structured data
    const parsed = await parseWebhookPayload(payload);

    // 2. Handle status updates (optional: log or update DB)
    if (parsed.type === 'status') {
      console.log(`Message ${parsed.messageId} status update: ${parsed.status}`);
      // You could update a 'Message' model here if you track outbound messages
      return;
    }

    if (parsed.type !== 'message') {
      console.warn("Received unknown event type from 11za:", parsed);
      return;
    }

    const { sender, isImage, base64Image, text, event, contentType, mediaType } = parsed;

    if (!sender) return;

    // 3. Identify the user (tenant) by their WhatsApp number
    const cleanSender = sender.replace('+', '');
    const user = await User.findOne({ whatsappNumber: cleanSender });

    if (!user) {
      console.warn(`Received message from unknown number: ${cleanSender}`);
      await sendWhatsAppMessage(cleanSender, "Please register at [your-domain.com] to use this service.");
      return;
    }

    // 4. Handle non-image messages (like business card request or help)
    if (!isImage) {
      if (text?.toLowerCase().includes('help')) {
        await sendWhatsAppMessage(cleanSender, "Send me a photo of a business card and I'll extract the details for you!");
      } else {
        await sendWhatsAppMessage(cleanSender, "Please send a photo of a business card (Image) to extract contact details.");
      }
      return;
    }

    if (!base64Image) {
      await sendWhatsAppMessage(cleanSender, "❌ Failed to process image. Please try sending it again.");
      return;
    }

    if (user.scansUsed >= user.scansLimit) {
      await sendWhatsAppMessage(cleanSender, "❌ Scan limit reached! Please upgrade your plan.");
      return;
    }

    // 5. Call AI parsing logic
    const { data: contactData, provider } = await aiRouter.parseBusinessCard(base64Image);

    // 6. Save to MongoDB
    const newContact = await Contact.create({
      userId: user._id,
      ...contactData,
      rawText: JSON.stringify(contactData),
      aiProvider: provider,
      syncedTo: [],
    });

    // 7. Update user scan count
    user.scansUsed += 1;
    await user.save();

    // 8. Trigger Auto-Sync async for Phase 2
    autoSync(user._id.toString(), newContact._id.toString(), contactData).catch(e => console.error("AutoSync Error:", e));

    // 9. Send confirmation reply
    const confirmMessage = `✅ Card scanned!
👤 Name: ${contactData.name || 'N/A'}
🏢 Company: ${contactData.company || 'N/A'}
💼 Role: ${contactData.jobTitle || 'N/A'}
📧 Email: ${contactData.email || 'N/A'}
📞 Phone: ${contactData.phone || 'N/A'}
🔗 Syncing to connected Google services...`;

    await sendWhatsAppMessage(cleanSender, confirmMessage);

  } catch (error: any) {
    console.error("Webhook logic failure:", error);
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
