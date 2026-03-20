import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Contact from '@/lib/db/models/Contact';
import User from '@/lib/db/models/User';
import Integration from '@/lib/db/models/Integration';
import { appendContactToSheet } from '@/lib/google/sheets';
import { createFollowUpEvent } from '@/lib/google/calendar';
import { sendFollowUpEmail } from '@/lib/google/gmail';
import { saveToGoogleContacts } from '@/lib/google/contacts';

export async function POST(req: NextRequest) {
  try {
    const { phone, contactId, syncType } = await req.json();

    if (!contactId || !syncType) {
      return NextResponse.json({ error: 'Missing contactId or syncType' }, { status: 400 });
    }

    // Normalize syncType: accept both hyphens (from 11za bot JSON) and underscores
    // JSON bot payloads: sync-all, sync-sheets, sync-calendar, sync-skip
    const normalizedSyncType = syncType.replace(/-/g, '_');

    if (normalizedSyncType === 'sync_skip') {
      return NextResponse.json({ status: 'success', syncedTo: 'Skipped — saved locally' });
    }

    await dbConnect();

    // 1. Get Contact
    const contact = await Contact.findById(contactId);
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // 2. Identify user from contact's userId
    const user = await User.findById(contact.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id.toString();
    const integration = await Integration.findOne({ userId, provider: 'google' });

    if (!integration) {
      return NextResponse.json({ error: 'Google not connected. Visit: card-scan-lead.vercel.app/dashboard/integrations' }, { status: 400 });
    }

    const scope = integration.scope || '';
    const results: string[] = [];

    // 3. Sheets: run for sync_all, sync_sheets, sync_calendar
    if (['sync_all', 'sync_sheets', 'sync_calendar'].includes(normalizedSyncType)) {
      if (scope.includes('spreadsheets')) {
        await appendContactToSheet(userId, contact);
        results.push('Google Sheets');
      }
    }

    // 4. Calendar: run for sync_all, sync_calendar
    if (['sync_all', 'sync_calendar'].includes(normalizedSyncType)) {
      if (scope.includes('calendar')) {
        await createFollowUpEvent(userId, contact);
        results.push('Google Calendar');
      }
    }

    // 5. Gmail + Contacts: only for sync_all
    if (normalizedSyncType === 'sync_all') {
      if (scope.includes('gmail')) {
        await sendFollowUpEmail(userId, contact);
        results.push('Gmail');
      }
      if (scope.includes('contacts')) {
        await saveToGoogleContacts(userId, contact);
        results.push('Google Contacts');
      }
    }

    // Update syncedTo in DB
    if (results.length > 0) {
      contact.syncedTo = [...new Set([...(contact.syncedTo || []), ...results])];
      await contact.save();
    }

    return NextResponse.json({
      status: 'success',
      syncedTo: results.join(', ') || 'None'
    });

  } catch (error: any) {
    console.error("Bot Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
