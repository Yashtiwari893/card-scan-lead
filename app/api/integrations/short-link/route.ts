import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db/mongodb';
import ShortLink from '@/lib/db/models/ShortLink';

export async function POST(req: NextRequest) {
  try {
    const { userId, type } = await req.json();

    if (!userId || !type) {
      return NextResponse.json({ error: 'userId and type are required' }, { status: 400 });
    }

    await dbConnect();

    // Generate random 6-char ID
    const shortId = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Save to MongoDB
    await ShortLink.create({
      id: shortId,
      userId,
      type,
    });

    const shortUrl = `https://card-scan-lead.vercel.app/s/${shortId}`;

    return NextResponse.json({ shortUrl });
  } catch (error: any) {
    console.error("Short-link generation error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
