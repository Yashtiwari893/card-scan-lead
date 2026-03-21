import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import SetupToken from '@/lib/db/models/SetupToken';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ success: false, error: 'phone is required' }, { status: 400 });

    await dbConnect();
    const cleanPhone = phone.replace('+', '').trim();
    const user = await User.findOne({ whatsappNumber: cleanPhone });
    if (!user) return NextResponse.json({ success: false, error: 'user_not_found' });

    const token = crypto.randomBytes(3).toString('hex').toUpperCase();

    await SetupToken.create({
      token: token,
      phone: cleanPhone,
      type: 'credits',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    return NextResponse.json({
      success: true,
      buyUrl: `https://card-scan-lead.vercel.app/buy-credits?token=${token}`,
      plans: {
        basic: "100 Scans - ₹200 + taxes",
        unlimited: "Unlimited - ₹999 + taxes"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
