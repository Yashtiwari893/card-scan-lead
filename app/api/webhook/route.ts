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
    console.log("--- Webhook Triggered ---");
    console.log("Payload:", JSON.stringify(payload, null, 2));

    // 1. Parse payload to get structured data
    const parsed = await parseWebhookPayload(payload);
    console.log("Parsed result:", JSON.stringify(parsed, null, 2));

    // 2. Handle status updates
    if (parsed.type === 'status') {
      console.log(`[STATUS] MsgID: ${parsed.messageId}, State: ${parsed.status}`);
      return;
    }

    if (parsed.type !== 'message') {
      console.warn("Received non-message event type from 11za.");
      return;
    }

    const { sender, isImage, base64Image, text } = parsed;

    if (!sender) {
      console.error("Missing sender ID in payload.");
      return;
    }

    // 3. User Lookup
    const cleanSender = sender.replace(/\+/g, '').trim(); 
    console.log(`Lookup user by WhatsApp: "${cleanSender}" (original: "${sender}")`);
    
    const user = await User.findOne({ 
      $or: [
        { whatsappNumber: cleanSender },
        { whatsappNumber: `+${cleanSender}` }
      ]
    });

    if (!user) {
      console.warn(`[AUTH] Unauthorized number: ${cleanSender}`);
      // Try to send a warning if sender is available
      try {
        await sendWhatsAppMessage(cleanSender, "❌ You are not registered. Please register at card-scan-lead.vercel.app");
      } catch (e) {
        console.error("Failed to send unauthorized warning:", e);
      }
      return;
    }

    console.log(`[AUTH] User found: ${user.email} (Plan: ${user.plan}, Used: ${user.scansUsed}/${user.scansLimit})`);

    // 4. Handle non-image messages
    if (!isImage) {
      console.log("[INPUT] Non-image message received:", text);
      const helpMsg = text?.toLowerCase().includes('help') 
        ? "Send me a business card photo!" 
        : "I only process images of business cards. Please send a photo!";
      await sendWhatsAppMessage(cleanSender, helpMsg);
      return;
    }

    if (!base64Image) {
      console.error("[ERROR] Image parsing failed (no base64 output).");
      await sendWhatsAppMessage(cleanSender, "❌ Error: Could not process the image file.");
      return;
    }

    if (user.scansUsed >= user.scansLimit) {
      console.warn(`[LIMIT] User ${user.email} scan limit exceeded.`);
      await sendWhatsAppMessage(cleanSender, "❌ Limit reached! Please upgrade your plan.");
      return;
    }

    // 5. AI Extraction
    console.log("[AI] Starting OCR parsing...");
    const { data: contactData, provider } = await aiRouter.parseBusinessCard(base64Image);
    console.log(`[AI] Success using ${provider}. Data:`, JSON.stringify(contactData));

    // 6. DB Storage
    const newContact = await Contact.create({
      userId: user._id,
      ...contactData,
      rawText: JSON.stringify(contactData),
      aiProvider: provider,
      syncedTo: [],
    });
    console.log(`[DB] Contact saved: ${newContact._id}`);

    // updates used scans
    user.scansUsed += 1;
    await user.save();

    // 7. Auto-Sync
    console.log("[SYNC] Starting Auto-Sync for integrations...");
    autoSync(user._id.toString(), newContact._id.toString(), contactData)
      .then(() => console.log("[SYNC] Completed."))
      .catch(e => console.error("[SYNC] Error:", e));

    // 8. Reply
    const confirmMessage = `✅ Card scanned!
👤 Name: ${contactData.name || 'N/A'}
🏢 Company: ${contactData.company || 'N/A'}
📧 Email: ${contactData.email || 'N/A'}
📞 Phone: ${contactData.phone || 'N/A'}
🔗 Syncing to Google...`;

    console.log(`[REPLY] Sending confirmation to ${cleanSender}...`);
    const replyRes = await sendWhatsAppMessage(cleanSender, confirmMessage);
    console.log("[REPLY] Status:", JSON.stringify(replyRes));

  } catch (error: any) {
    console.error("Critical Webhook Error:", error);
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
