import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import Contact from '@/lib/db/models/Contact';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const limitNum = parseInt(searchParams.get('limit') || '5');

    if (!phone) {
      return NextResponse.json({ success: false, error: 'phone is required' }, { status: 400 });
    }

    await dbConnect();
    const cleanPhone = phone.replace('+', '').trim();
    const user = await User.findOne({ whatsappNumber: cleanPhone });
    if (!user) return NextResponse.json({ success: false, error: 'user_not_found' });

    const totalContacts = await Contact.countDocuments({ userId: user._id });
    const contacts = await Contact.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(limitNum);

    const summaryText = contacts.map((c: any, i: number) => 
      `${i + 1}. ${c.name || 'N/A'} - ${c.company || 'N/A'}`
    ).join('\n');

    return NextResponse.json({
      total: totalContacts,
      summaryText: summaryText,
      contacts: contacts
    });

  } catch (error: any) {
    console.error("My Contacts error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
