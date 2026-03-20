import { google } from 'googleapis';
import { setCredentials } from './oauth';
import Integration from '@/lib/db/models/Integration';
import dbConnect from '@/lib/db/mongodb';
import { ContactData } from './sheets';

/**
 * Sends a follow-up email to the scanned contact via Gmail API
 * @param userId The ID of the authenticated user
 * @param contact The extracted business card data
 */
export async function sendFollowUpEmail(userId: string, contact: ContactData) {
  // Prevent sending if no email exists
  if (!contact.email) {
    return { success: false, reason: 'no email' };
  }

  await dbConnect();
  
  const integration = await Integration.findOne({ userId, provider: 'google' });
  
  if (!integration) {
    throw new Error('Google not connected');
  }

  // Set credentials and handle potential auto-refresh
  const auth = await setCredentials(userId, integration.accessToken, integration.refreshToken);
  const gmail = google.gmail({ version: 'v1', auth });

  // Compose the email
  const nameToUse = contact.name || 'there';
  const subject = `Great meeting you, ${nameToUse}!`;
  const body = `Hi ${nameToUse},

It was great meeting you! I scanned your business card and wanted to follow up.

Looking forward to connecting further.

Best regards`;

  // Standard RFC 2822 email format
  const messageLines = [
    `To: ${contact.email}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="utf-8"',
    '',
    body
  ];

  const emailRaw = messageLines.join('\r\n');
  
  // Gmail API requires base64url format
  const encodedEmail = Buffer.from(emailRaw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Send the email
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  });

  return { success: true };
}
