import { google } from 'googleapis';
import { setCredentials } from './oauth';
import Integration from '@/lib/db/models/Integration';
import dbConnect from '@/lib/db/mongodb';
import { ContactData } from './sheets';

/**
 * Saves a scanned contact directly to the user's Google Contacts
 * @param userId The ID of the authenticated user
 * @param contact The extracted business card data
 */
export async function saveToGoogleContacts(userId: string, contact: ContactData) {
  await dbConnect();
  
  const integration = await Integration.findOne({ userId, provider: 'google' });
  
  if (!integration) {
    throw new Error('Google not connected');
  }

  // Set credentials and handle potential auto-refresh
  const auth = await setCredentials(userId, integration.accessToken, integration.refreshToken);
  const people = google.people({ version: 'v1', auth });

  // Split name into first and last name
  const nameParts = (contact.name || '').trim().split(' ');
  const givenName = nameParts[0] || '';
  const familyName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  // Google People API body
  const requestBody: any = {};

  if (givenName || familyName) {
    requestBody.names = [{ givenName, familyName }];
  }
  
  if (contact.email) {
    requestBody.emailAddresses = [{ value: contact.email }];
  }

  if (contact.phone) {
    requestBody.phoneNumbers = [{ value: contact.phone }];
  }

  if (contact.company || contact.jobTitle) {
    requestBody.organizations = [{ 
      name: contact.company || '', 
      title: contact.jobTitle || '' 
    }];
  }

  if (contact.website) {
    requestBody.urls = [{ value: contact.website }];
  }

  // Create the contact
  const response = await people.people.createContact({
    requestBody,
  });

  return { success: true, resourceName: response.data.resourceName };
}
