import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google/oauth';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/mongodb';
import Integration from '@/lib/db/models/Integration';

/**
 * GET: generate the Google OAuth consent URL
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.id as string || token?.sub as string;
  
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const authUrl = getAuthUrl(userId);

  return NextResponse.json({ success: true, authUrl });
}

/**
 * PATCH: save user's chosen Google Sheet ID
 */
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.id as string || token?.sub as string;
  
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sheetId } = await req.json();
    if (!sheetId) {
      return NextResponse.json({ success: false, error: 'Missing sheetId' }, { status: 400 });
    }

    await dbConnect();
    await Integration.findOneAndUpdate(
      { userId, provider: 'google' },
      { sheetId }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update Sheet ID:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
