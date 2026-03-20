import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import Contact from '@/lib/db/models/Contact';
import aiRouter from '@/lib/ai/aiRouter';

export async function POST(req: NextRequest) {
  try {
    const { phone, imageUrl } = await req.json();

    if (!phone || !imageUrl) {
      return NextResponse.json({ error: 'Missing phone or imageUrl' }, { status: 400 });
    }

    await dbConnect();

    // 1. Find User
    const cleanPhone = phone.replace('+', '').trim();
    const user = await User.findOne({
      $or: [
        { whatsappNumber: cleanPhone },
        { whatsappNumber: `+${cleanPhone}` }
      ]
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User not found' }, { status: 401 });
    }

    if (user.scansUsed >= user.scansLimit) {
      return NextResponse.json({ error: 'Scan limit reached' }, { status: 403 });
    }

    // 2. Download Image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    const base64 = buffer.toString('base64');

    // 3. AI Parse
    const { data: contactData, provider } = await aiRouter.parseBusinessCard(base64);

    // 4. Save to DB
    const newContact = await Contact.create({
      userId: user._id,
      ...contactData,
      rawText: JSON.stringify(contactData),
      aiProvider: provider,
      syncedTo: [],
    });

    // 5. Update user scans
    user.scansUsed += 1;
    await user.save();

    return NextResponse.json({
      ...contactData,
      contactId: newContact._id,
      aiProvider: provider,
      success: true
    });

  } catch (error: any) {
    console.error("Bot Scan Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
