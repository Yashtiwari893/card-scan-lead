import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import Contact from '@/lib/db/models/Contact';
import { appendContactToSheet } from '@/lib/google/sheets';
import { createFollowUpEvent } from '@/lib/google/calendar';
import { sendFollowUpEmail } from '@/lib/google/gmail';
import { saveToGoogleContacts } from '@/lib/google/contacts';

export async function POST(req: NextRequest) {
  try {
    const { phone, contactId, services } = await req.json();

    if (!phone || !contactId || !services) {
      return NextResponse.json({ success: false, error: 'phone, contactId, and services are required' }, { status: 400 });
    }

    await dbConnect();
    const cleanPhone = phone.replace('+', '').trim();
    const user = await User.findOne({ whatsappNumber: cleanPhone });
    if (!user) return NextResponse.json({ success: false, error: 'user_not_found' });

    const contact = await Contact.findById(contactId);
    if (!contact) return NextResponse.json({ success: false, error: 'contact_not_found' });

    const results: string[] = [];
    const failures: string[] = [];

    const syncPromises = [];

    if (services.includes('sheets')) {
      syncPromises.push(appendContactToSheet(user._id.toString(), contact).then(() => results.push('sheets')).catch(() => failures.push('sheets')));
    }
    if (services.includes('calendar')) {
      syncPromises.push(createFollowUpEvent(user._id.toString(), contact).then(() => results.push('calendar')).catch(() => failures.push('calendar')));
    }
    if (services.includes('email')) {
      syncPromises.push(sendFollowUpEmail(user._id.toString(), contact).then(() => results.push('email')).catch(() => failures.push('email')));
    }
    if (services.includes('contacts')) {
      syncPromises.push(saveToGoogleContacts(user._id.toString(), contact).then(() => results.push('contacts')).catch(() => failures.push('contacts')));
    }

    await Promise.allSettled(syncPromises);

    // Update contact synced status
    if (results.length > 0) {
      contact.syncedTo = [...new Set([...(contact.syncedTo || []), ...results])];
      await contact.save();
    }

    return NextResponse.json({
      success: true,
      synced: results,
      failed: failures,
      message: `Synced to ${results.join(', ')}`
    });

  } catch (error: any) {
    console.error("Sync error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
