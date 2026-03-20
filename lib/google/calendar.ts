import { google } from 'googleapis';
import { setCredentials } from './oauth';
import Integration from '@/lib/db/models/Integration';
import dbConnect from '@/lib/db/mongodb';
import { ContactData } from './sheets';

/**
 * Creates a follow-up calendar event 3 days from now
 * @param userId The ID of the authenticated user
 * @param contact The extracted business card data
 */
export async function createFollowUpEvent(userId: string, contact: ContactData) {
  await dbConnect();
  
  const integration = await Integration.findOne({ userId, provider: 'google' });
  
  if (!integration) {
    throw new Error('Google not connected');
  }

  // Set credentials and handle potential auto-refresh
  const auth = await setCredentials(userId, integration.accessToken, integration.refreshToken);
  const calendar = google.calendar({ version: 'v3', auth });

  // Calculate target date: 3 days from now
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 3);
  
  // Format to specifically be 10:00 AM - 10:30 AM IST (Asia/Kolkata)
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  
  const startTime = `${year}-${month}-${day}T10:00:00+05:30`;
  const endTime = `${year}-${month}-${day}T10:30:00+05:30`;

  const summary = `Follow up with ${contact.name || 'Contact'}${contact.company ? ` from ${contact.company}` : ''}`;
  const description = `Email: ${contact.email || 'N/A'}\nPhone: ${contact.phone || 'N/A'}\n\nMet at networking event. (Scanned via 11za AI)`;

  const event = {
    summary: summary,
    description: description,
    start: {
      dateTime: startTime,
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: endTime,
      timeZone: 'Asia/Kolkata',
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  return { success: true, eventId: response.data.id };
}
