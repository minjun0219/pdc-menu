import * as fs from 'fs-extra';
import * as path from 'path';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export const tokenPath = path.join(__dirname, '../../.credentials/token.json');

export const scopes = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

export function getClient() {
  const oauth2Client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_OAUTH2_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH2_CLIENT_SECRET,
    redirectUri: 'urn:ietf:wg:oauth:2.0:oob',
  });
  return oauth2Client;
}

export async function authorize(client?: OAuth2Client) {
  const oauth2Client = client || getClient();
  const token = await fs.readJSON(tokenPath);
  oauth2Client.setCredentials(token);
  return oauth2Client;
}
