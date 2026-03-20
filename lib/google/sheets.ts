import { google } from 'googleapis';
import { setCredentials } from './oauth';
import Integration from '@/lib/db/models/Integration';
import dbConnect from '@/lib/db/mongodb';

export type ContactData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  website: string;
};

/**
 * Appends a new scanned contact as a row to the user's connected Google Sheet
 * @param userId The ID of the authenticated user
 * @param contact The extracted business card data
 */
export async function appendContactToSheet(userId: string, contact: ContactData) {
  await dbConnect();
  
  const integration = await Integration.findOne({ userId, provider: 'google' });
  
  if (!integration) {
    throw new Error('Google not connected');
  }

  if (!integration.sheetId) {
    throw new Error('Google Sheet ID not configured');
  }

  // Set credentials and handle potential auto-refresh
  const auth = await setCredentials(userId, integration.accessToken, integration.refreshToken);
  const sheets = google.sheets({ version: 'v4', auth });

  // Format the row data
  const row = [
    contact.name || '',
    contact.email || '',
    contact.phone || '',
    contact.company || '',
    contact.jobTitle || '',
    contact.website || '',
    new Date().toISOString() // Timestamp
  ];

  // Append to the sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId: integration.sheetId,
    range: 'Sheet1!A:G',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row]
    }
  });

  return { success: true };
}
