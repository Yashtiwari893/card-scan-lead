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

import Contact, { IContact } from '@/lib/db/models/Contact';
import mongoose from 'mongoose';

/**
 * Ensures a Google Sheet exists for the user. If not, it creates a new one.
 */
export async function getOrCreateSheet(userId: string) {
  await dbConnect();
  
  const integration = await Integration.findOne({ userId, provider: 'google' });
  if (!integration) throw new Error('Google not connected');

  console.log(`Checking sheet for user ${userId}, current sheetId: ${integration.sheetId}`);
  if (integration.sheetId) return integration.sheetId;

  // No sheet exists, create a new one named "Grid AI - Scanned Contacts"
  try {
    const auth = await setCredentials(userId, integration.accessToken, integration.refreshToken);
    const sheets = google.sheets({ version: 'v4', auth });

    console.log("Creating new Google Sheet...");
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: "Grid AI - Scanned Contacts",
        },
        sheets: [
          {
            properties: {
              title: "Sheet1",
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      },
    });

    const sheetId = spreadsheet.data.spreadsheetId;
    if (!sheetId) throw new Error('Failed to create spreadsheet');

    console.log(`Sheet created: ${sheetId}, adding headers...`);
    // Add Headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1:G1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Name', 'Email', 'Phone', 'Company', 'Role', 'Website', 'Created At']],
      },
    });

    // Save sheetId to integration
    integration.sheetId = sheetId;
    await integration.save();
    console.log("Sheet ID saved to database.");

    return sheetId;
  } catch (err: any) {
    console.error("Error in getOrCreateSheet:", err.message);
    throw err;
  }
}

/**
 * Retroactively syncs all unsynced contacts to Google Sheets
 */
export async function syncHistoricalContacts(userId: string) {
  try {
    const sheetId = await getOrCreateSheet(userId);
    console.log(`Starting historical sync for user ${userId} to sheet ${sheetId}`);
    
    // Find all contacts for this user NOT synced to sheets
    const unsyncedContacts = await Contact.find({
      userId: new mongoose.Types.ObjectId(userId),
      syncedTo: { $ne: 'sheets' }
    });

    console.log(`Found ${unsyncedContacts.length} unsynced contacts.`);
    if (unsyncedContacts.length === 0) return { success: true, count: 0 };

    // Set credentials once
    const integration = await Integration.findOne({ userId, provider: 'google' });
    const auth = await setCredentials(userId, integration.accessToken, integration.refreshToken);
    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare rows
    const rows = unsyncedContacts.map(contact => [
      contact.name || '',
      contact.email || '',
      contact.phone || '',
      contact.company || '',
      contact.jobTitle || '',
      contact.website || '',
      contact.createdAt.toISOString()
    ]);

    // Batch append to sheet
    console.log("Pushing rows to Sheets...");
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows
      }
    });

    // Mark all as synced in MongoDB
    const ids = unsyncedContacts.map(c => c._id);
    await Contact.updateMany(
      { _id: { $in: ids } },
      { $push: { syncedTo: 'sheets' } }
    );

    console.log(`Successfully synced ${unsyncedContacts.length} contacts.`);
    return { success: true, count: unsyncedContacts.length };
  } catch (err: any) {
    console.error("Historical sync error:", err.message);
    throw err;
  }
}

/**
 * Appends a new scanned contact as a row to the user's connected Google Sheet
 */
export async function appendContactToSheet(userId: string, contact: ContactData) {
  await dbConnect();
  
  try {
    // Ensure sheet exists first
    const sheetId = await getOrCreateSheet(userId);
    console.log(`Appending contact for user ${userId} to sheet ${sheetId}`);
    
    const integration = await Integration.findOne({ userId, provider: 'google' });
    const auth = await setCredentials(userId, integration.accessToken, integration.refreshToken);
    const sheets = google.sheets({ version: 'v4', auth });

    const row = [
      contact.name || '',
      contact.email || '',
      contact.phone || '',
      contact.company || '',
      contact.jobTitle || '',
      contact.website || '',
      new Date().toISOString()
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });

    console.log("Contact successfully appended to sheet.");
    return { success: true };
  } catch (err: any) {
    console.error("Error in appendContactToSheet:", err.message);
    throw err;
  }
}
