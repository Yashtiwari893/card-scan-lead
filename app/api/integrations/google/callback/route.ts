import { NextRequest, NextResponse } from 'next/server';
import { getOAuthClient } from '@/lib/google/oauth';
import dbConnect from '@/lib/db/mongodb';
import Integration from '@/lib/db/models/Integration';
import User from '@/lib/db/models/User';
import { syncHistoricalContacts } from '@/lib/google/sheets';
import { sendWhatsAppMessage } from '@/lib/whatsapp/sender';

/**
 * Handle Google OAuth callback
 * Query Params: ?code=...&state=userId
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const userId = searchParams.get('state'); // State was set to userId during getAuthUrl

  if (!code || !userId) {
    console.error("Missing code or state in Google OAuth callback");
    return NextResponse.redirect(new URL('/dashboard/integrations?error=missing_params', req.url));
  }

  try {
    const oauth2Client = getOAuthClient();
    
    // Exchange auth code for access & refresh tokens
    const { tokens } = await oauth2Client.getToken(code);

    await dbConnect();
    
    // Save tokens in MongoDB connected to this user
    await Integration.findOneAndUpdate(
      { userId, provider: 'google' },
      {
        provider: 'google',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000), // Fallback expiry if unavailable
      },
      { upsert: true, new: true } // Create if doesn't exist, update if it does
    );

    // Trigger retroactive sync for old contacts asynchronously
    if (tokens.scope?.includes('spreadsheets')) {
      syncHistoricalContacts(userId).catch(err => console.error("Auto Historical Sync Error:", err));
    }

    // Determine service for success message
    const service = tokens.scope?.includes('spreadsheets') ? 'sheets' : 
                    tokens.scope?.includes('calendar') ? 'calendar' : 
                    tokens.scope?.includes('gmail') ? 'email' : 'integration';

    // Notify user on WhatsApp
    try {
      const user = await User.findById(userId);
      if (user && user.whatsappNumber) {
        const successNotify = `✅ Your Google ${service.charAt(0).toUpperCase() + service.slice(1)} connected successfully!\nAll your business cards will now sync automatically. 🚀`;
        await sendWhatsAppMessage(user.whatsappNumber, successNotify);
      }
    } catch (err) {
      console.error("WhatsApp notification error:", err);
    }

    // Redirect to frontend on success
    return NextResponse.redirect(new URL(`/setup/success?connected=true&service=${service}`, req.url));
  } catch (error: any) {
    console.error("OAuth Callback Exchange Error:", error);
    return NextResponse.redirect(new URL('/setup/success?error=oauth_failed', req.url));
  }
}
