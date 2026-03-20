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
 * Handle 11za initial Webhook verification request
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify against the secret in environment. (11za Hub verification)
  const VERIFY_TOKEN = process.env.ELEVENZA_WEBHOOK_SECRET || 'your_verify_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

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
    // 1. Parse payload to get sender and base64 image
    const { sender, isImage, base64Image } = await parseWebhookPayload(payload);

    if (!isImage || !base64Image) {
      return; // Skip if not an image message
    }

    // 2. Identify the user (tenant) by their WhatsApp number
    const cleanSender = sender.replace('+', '');
    const user = await User.findOne({ whatsappNumber: cleanSender });

    if (!user) {
      console.warn(`Received message from unknown number: ${cleanSender}`);
      await sendWhatsAppMessage(cleanSender, "Please register at [your-domain.com] to use this service.");
      return;
    }

    if (user.scansUsed >= user.scansLimit) {
      await sendWhatsAppMessage(cleanSender, "❌ Scan limit reached! Please upgrade your plan.");
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

    // 5. Update user scan count
    user.scansUsed += 1;
    await user.save();

    // 6. Trigger Auto-Sync async for Phase 2
    autoSync(user._id.toString(), newContact._id.toString(), contactData).catch(e => console.error("AutoSync Error:", e));

    // 7. Send confirmation reply (sync status updates in DB asynchronously)
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
