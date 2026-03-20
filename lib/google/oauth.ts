import { google } from 'googleapis';
import dbConnect from '@/lib/db/mongodb';
import Integration from '@/lib/db/models/Integration';

/**
 * Get configured Google OAuth2 Client
 */
export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`
  );
}

/**
 * Generate Google consent URL requesting necessary scopes
 * @param userId ID of the user connecting the account
 */
export function getAuthUrl(userId: string): string {
  const oauth2Client = getOAuthClient();
  
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/contacts',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: userId,
  });
}

/**
 * Sets credentials on the OAuth client and configures auto-refresh
 * @param userId ID of the user (for saving refreshed tokens)
 * @param accessToken Current access token
 * @param refreshToken Refresh token
 */
export async function setCredentials(userId: string, accessToken: string, refreshToken: string) {
  const oauth2Client = getOAuthClient();
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Listen for token updates (refresh) and save to MongoDB
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await dbConnect();
      
      const updateData: any = {
        accessToken: tokens.access_token,
      };
      
      if (tokens.refresh_token) {
        updateData.refreshToken = tokens.refresh_token;
      }
      if (tokens.expiry_date) {
        updateData.expiresAt = new Date(tokens.expiry_date);
      }

      await Integration.findOneAndUpdate(
        { userId, provider: 'google' },
        updateData
      ).catch(err => console.error("Failed to update tokens on refresh:", err));
    }
  });

  return oauth2Client;
}
