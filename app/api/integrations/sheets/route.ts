import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { appendContactToSheet } from '@/lib/google/sheets';
import dbConnect from '@/lib/db/mongodb';
import Contact from '@/lib/db/models/Contact';

/**
 * Appends a contact to the connected Google Sheet manually
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
    await appendContactToSheet(userId, contactData);

    // Update the Contact record in DB to show it's synced to Sheets
    if (contactId) {
      await dbConnect();
      await Contact.findByIdAndUpdate(contactId, {
        $addToSet: { syncedTo: 'sheets' } // Prevent duplicates in array
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Manual Sheets sync error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
