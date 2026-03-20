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

    // 1. Parse payload
    const parsed = await parseWebhookPayload(payload);
    console.log("Parsed result:", JSON.stringify(parsed, null, 2));

    // 2. Status updates (delivery receipts) — just log them
    if (parsed.type === 'status') {
      console.log(`[STATUS] MsgID: ${parsed.messageId}, State: ${parsed.status}`);
      return;
    }

    if (parsed.type !== 'message') {
      console.warn("Received non-message event type from 11za.");
      return;
    }

    const { sender, isImage, base64Image } = parsed;

    if (!sender) {
      console.error("Missing sender ID in payload.");
      return;
    }

    // ⚠️  IMPORTANT: Text messages (hi, menu, help, etc.) are handled
    // entirely by the 11za bot flow via /api/bot/* routes.
    // Webhook ONLY processes image uploads for OCR scanning.
    if (!isImage) {
      console.log(`[SKIP] Non-image message from ${sender} — handled by bot flow.`);
      return; // Do NOT send any reply here — bot flow does it
    }

    if (!base64Image) {
      console.error("[ERROR] Image received but base64 parsing failed.");
      return;
    }

    // 3. User lookup
    const cleanSender = sender.replace(/\+/g, '').trim();
    console.log(`[IMAGE] Processing card from: ${cleanSender}`);

    const user = await User.findOne({
      $or: [
        { whatsappNumber: cleanSender },
        { whatsappNumber: `+${cleanSender}` }
      ]
    });

    if (!user) {
      console.warn(`[SKIP] Image from unregistered number: ${cleanSender}. Bot flow auto-registers on "hi".`);
      return; // User must say "hi" first to register via bot flow
    }

    console.log(`[AUTH] User: ${user.name || user.whatsappName} (${user.plan}, ${user.scansUsed}/${user.scansLimit})`);

    if (user.scansUsed >= user.scansLimit) {
      console.warn(`[LIMIT] User scan limit reached for ${cleanSender}.`);
      return;
    }

    // 4. AI Extraction
    console.log("[AI] Starting OCR parsing...");
    const { data: contactData, provider } = await aiRouter.parseBusinessCard(base64Image);
    console.log(`[AI] Success via ${provider}:`, JSON.stringify(contactData));

    // 5. DB Storage
    const newContact = await Contact.create({
      userId: user._id,
      ...contactData,
      rawText: JSON.stringify(contactData),
      aiProvider: provider,
      syncedTo: [],
    });
    console.log(`[DB] Contact saved: ${newContact._id}`);

    // Increment scan count
    user.scansUsed += 1;
    await user.save();

    // 6. Auto-Sync (background)
    console.log("[SYNC] Starting Auto-Sync...");
    autoSync(user._id.toString(), newContact._id.toString(), contactData)
      .then(() => console.log("[SYNC] Done."))
      .catch(e => console.error("[SYNC] Error:", e));

    // NOTE: No WhatsApp reply sent here.
    // The scan result is returned via /api/bot/scan-card which the bot flow calls.
    // This webhook path handles the raw image upload only.
    console.log(`[DONE] Card processed for ${cleanSender}, contactId: ${newContact._id}`);

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
