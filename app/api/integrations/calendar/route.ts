import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createFollowUpEvent } from '@/lib/google/calendar';
import dbConnect from '@/lib/db/mongodb';
import Contact from '@/lib/db/models/Contact';

/**
 * Triggers Calendar Event creation manually
 * POST body expects: { contactId: string, name, email, phone, company, jobTitle, website }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.id as string || token?.sub as string;
  
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { contactId, ...contactData } = body;

    // Call library function
    const result = await createFollowUpEvent(userId, contactData);

    // Update the Contact record in DB to show it's synced to calendar
    if (result.success && contactId) {
      await dbConnect();
      await Contact.findByIdAndUpdate(contactId, {
        $addToSet: { syncedTo: 'calendar' }
      });
    }

    return NextResponse.json({ success: true, eventId: result.eventId });
  } catch (error: any) {
    console.error('Manual Calendar sync error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
