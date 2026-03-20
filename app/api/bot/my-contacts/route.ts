import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import Contact from '@/lib/db/models/Contact';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!phone) {
      return NextResponse.json({ error: 'Missing phone' }, { status: 400 });
    }

    await dbConnect();

    // 1. Get User ID from Phone
    const cleanPhone = phone.replace('+', '').trim();
    const user = await User.findOne({
      $or: [
        { whatsappNumber: cleanPhone },
        { whatsappNumber: `+${cleanPhone}` }
      ]
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch Contacts for this user
    const contacts = await Contact.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(limit);

    if (contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts found' }, { status: 500 });
    }

    // 3. Create Summary Text
    const summaryText = contacts
      .map((c, index) => `${index + 1}. ${c.name || 'Unknown'} - ${c.company || 'N/A'} (${c.email || 'N/A'})`)
      .join('\n');

    return NextResponse.json({
      total: await Contact.countDocuments({ userId: user._id }),
      contacts,
      summaryText
    });

  } catch (error: any) {
    console.error("Bot Contacts Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
