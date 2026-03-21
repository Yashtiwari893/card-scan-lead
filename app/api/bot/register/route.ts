import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';

export async function POST(req: NextRequest) {
  try {
    const { phone, email } = await req.json();

    if (!phone || !email) {
      return NextResponse.json({ success: false, error: 'phone and email are required' }, { status: 400 });
    }

    await dbConnect();

    const cleanPhone = phone.replace('+', '').trim();
    let user = await User.findOne({ whatsappNumber: cleanPhone });

    if (!user) {
      user = await User.create({
        whatsappNumber: cleanPhone,
        email: email,
        state: 'active',
        scanCredits: 5,
        scansLimit: 10,
        plan: 'free',
        isFirstScan: true,
      });

      return NextResponse.json({
        success: true,
        isNew: true,
        name: "",
        scanCredits: 5,
        message: "registered"
      });
    }

    return NextResponse.json({
      success: true,
      isNew: false,
      name: user.name || "",
      scanCredits: user.scanCredits,
      message: "existing"
    });
  } catch (error: any) {
    console.error("Register error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
