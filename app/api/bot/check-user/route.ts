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
      return NextResponse.json({ exists: false });
    }

    // Check integration status
    const integration = await Integration.findOne({ userId: user._id, provider: 'google' });
    const scopes = integration?.scope || '';

    return NextResponse.json({
      exists: true,
      name: user.name || "",
      scanCredits: user.scanCredits,
      isFirstScan: user.isFirstScan,
      sheetsConnected: scopes.includes('spreadsheets'),
      calendarConnected: scopes.includes('calendar'),
      emailConnected: scopes.includes('gmail.send') || scopes.includes('gmail'),
    });
  } catch (error: any) {
    console.error("Check-user error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
