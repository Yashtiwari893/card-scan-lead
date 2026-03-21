import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import Integration from '@/lib/db/models/Integration';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ success: false, error: 'phone is required' }, { status: 400 });
    }

    await dbConnect();
    const cleanPhone = phone.replace('+', '').trim();
    const user = await User.findOne({ whatsappNumber: cleanPhone });

    if (!user) {
      return NextResponse.json({ success: false, error: 'user_not_found' });
    }

    const integration = await Integration.findOne({ userId: user._id, provider: 'google' });
    const scopes = integration?.scope || '';

    return NextResponse.json({
      sheets:   scopes.includes('spreadsheets') ? "✅ Connected" : "❌ Not Connected",
      calendar: scopes.includes('calendar') ? "✅ Connected" : "❌ Not Connected",
      email:    (scopes.includes('gmail.send') || scopes.includes('gmail')) ? "✅ Connected" : "❌ Not Connected",
      contacts: scopes.includes('contacts') ? "✅ Connected" : "❌ Not Connected"
    });
  } catch (error: any) {
    console.error("Integration status error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
