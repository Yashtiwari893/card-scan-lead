import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { saveToGoogleContacts } from '@/lib/google/contacts';
import dbConnect from '@/lib/db/mongodb';
import Contact from '@/lib/db/models/Contact';

/**
 * Triggers Google Contacts sync manually
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

    // Call library function to save to Google Contacts API
    const result = await saveToGoogleContacts(userId, contactData);

    // Update the Contact record in DB to show it's synced to contacts
    if (result.success && contactId) {
      await dbConnect();
      await Contact.findByIdAndUpdate(contactId, {
        $addToSet: { syncedTo: 'contacts' }
      });
    }

    return NextResponse.json({ success: true, resourceName: result.resourceName });
  } catch (error: any) {
    console.error('Manual Google Contacts sync error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
