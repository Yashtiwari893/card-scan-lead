import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import SetupToken from '@/lib/db/models/SetupToken';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: 'phone is required' }, { status: 400 });
    }

    await dbConnect();

    const cleanPhone = phone.replace('+', '').trim();
    const user = await User.findOne({ whatsappNumber: cleanPhone });

    if (!user) {
      return NextResponse.json({ success: false, error: 'user_not_found' });
    }

    // Generate random 6-char token
    const token = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Save token with 30 min expiry
    await SetupToken.create({
      token: token,
      phone: cleanPhone,
      type: 'sheets',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    return NextResponse.json({
      success: true,
      setupUrl: `https://card-scan-lead.vercel.app/setup/sheets?token=${token}`,
      message: "Click the link to connect Google Sheets"
    });

  } catch (error: any) {
    console.error("Setup error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
