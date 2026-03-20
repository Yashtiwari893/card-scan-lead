import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';

/**
 * GET /api/bot/check-user?phone=919876543210&name=Rahul
 * 
 * Auto-registers user on first interaction.
 * No manual signup needed — jab bhi koi "hi" bheje, agar
 * nahi mila toh automatically free plan pe register ho jata hai.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const senderName = searchParams.get('name') || ''; // optional: sender name from 11za

    if (!phone) {
      return NextResponse.json({ exists: false, error: 'Missing phone' }, { status: 400 });
    }

    await dbConnect();

    const cleanPhone = phone.replace(/\+/g, '').trim();

    // Try to find existing user (with or without + prefix)
    let user = await User.findOne({
      $or: [
        { whatsappNumber: cleanPhone },
        { whatsappNumber: `+${cleanPhone}` }
      ]
    });

    let isNew = false;

    if (!user) {
      // ✅ AUTO-REGISTER: Create new user from WhatsApp number
      user = await User.create({
        whatsappNumber: cleanPhone,
        whatsappName: senderName,
        name: senderName || `User_${cleanPhone.slice(-4)}`,
        isAutoRegistered: true,
        plan: 'free',
        scansUsed: 0,
        scansLimit: 10,
      });
      isNew = true;
      console.log(`[AUTO-REGISTER] New user created: ${cleanPhone} (${senderName})`);
    } else if (senderName && !user.whatsappName) {
      // Update name if we have it now
      user.whatsappName = senderName;
      await user.save();
    }

    return NextResponse.json({
      exists: true,
      isNew,
      name: user.name || user.whatsappName || 'User',
      plan: user.plan || 'free',
      scansUsed: user.scansUsed || 0,
      scansLimit: user.scansLimit || 10,
      scansRemaining: (user.scansLimit || 10) - (user.scansUsed || 0),
    });

  } catch (error: any) {
    console.error("check-user error:", error);
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
