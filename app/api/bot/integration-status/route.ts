import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import Integration from '@/lib/db/models/Integration';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

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

    // 2. Fetch Google Integration
    const integration = await Integration.findOne({ userId: user._id, provider: 'google' });

    if (!integration) {
      return NextResponse.json({
        sheets: "❌ Not Connected",
        calendar: "❌ Not Connected",
        gmail: "❌ Not Connected",
        contacts: "❌ Not Connected"
      });
    }

    const scope = integration.scope || '';

    // 3. Check scopes
    return NextResponse.json({
      sheets: scope.includes("spreadsheets") ? "✅ Connected" : "❌ Not Connected",
      calendar: scope.includes("calendar") ? "✅ Connected" : "❌ Not Connected",
      gmail: scope.includes("gmail") ? "✅ Connected" : "❌ Not Connected",
      contacts: scope.includes("contacts") ? "✅ Connected" : "❌ Not Connected"
    });

  } catch (error: any) {
    console.error("Bot Status Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
