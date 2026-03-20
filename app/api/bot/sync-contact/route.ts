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

    if (syncType === 'sync_skip') {
      return NextResponse.json({ status: 'success', syncedTo: 'skipped' });
    }

    await dbConnect();

    // 1. Get Contact
    const contact = await Contact.findById(contactId);
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // 2. Identify user by phone
    const cleanPhone = (phone || '').replace(/\+/g, '').trim(); 
    const user = await User.findById(contact.userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id.toString();
    const integration = await Integration.findOne({ userId, provider: 'google' });

    if (!integration) {
      return NextResponse.json({ error: 'Google integration not found' }, { status: 400 });
    }

    const scope = integration.scope || '';
    const results: string[] = [];

    // 3. Execution based on syncType
    if (syncType === 'sync_all' || syncType === 'sync_sheets' || syncType === 'sync_calendar') {
      if (scope.includes('spreadsheets')) {
        await appendContactToSheet(userId, contact);
        results.push('Google Sheets');
      }
    }

    if (syncType === 'sync_all' || syncType === 'sync_calendar') {
      if (scope.includes('calendar')) {
        await createFollowUpEvent(userId, contact);
        results.push('Google Calendar');
      }
    }

    if (syncType === 'sync_all') {
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
