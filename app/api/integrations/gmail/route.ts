import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { sendFollowUpEmail } from '@/lib/google/gmail';
import dbConnect from '@/lib/db/mongodb';
import Contact from '@/lib/db/models/Contact';

/**
 * Triggers Follow-up Email manually
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

    // Call library function to send email via Gmail API
    const result = await sendFollowUpEmail(userId, contactData);

    if (!result.success && result.reason === 'no email') {
      return NextResponse.json({ success: false, error: 'Contact has no email address' }, { status: 400 });
    }

    // Update the Contact record in DB to show it's synced to gmail
    if (result.success && contactId) {
      await dbConnect();
      await Contact.findByIdAndUpdate(contactId, {
        $addToSet: { syncedTo: 'gmail' }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Manual Gmail sync error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
