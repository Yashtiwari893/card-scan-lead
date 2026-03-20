import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ exists: false, error: 'Missing phone' }, { status: 400 });
    }

    await dbConnect();

    // Check with and without + prefix
    const cleanPhone = phone.replace('+', '').trim();
    const user = await User.findOne({
      $or: [
        { whatsappNumber: cleanPhone },
        { whatsappNumber: `+${cleanPhone}` }
      ]
    });

    if (!user) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      name: user.name || 'User',
      plan: user.plan || 'Free',
      scansUsed: user.scansUsed || 0,
      scansLimit: user.scansLimit || 10
    });
  } catch (error: any) {
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
