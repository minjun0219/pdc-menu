import * as fs from 'fs-extra';
import * as path from 'path';
import Table from 'cli-table';
import { google } from 'googleapis';
import readline from 'readline';
import { scopes, tokenPath, getClient, authorize } from '../src/apis/GoogleAPIs'
import { Credentials, OAuth2Client } from 'google-auth-library';

require('dotenv').config();

const gmail = google.gmail('v1');
const calendar = google.calendar('v3');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * 허가된 키를 디스크에 저장
 */
async function storeToken(token: Credentials) {
  await fs.ensureDir(path.dirname(tokenPath));
  await fs.writeFile(tokenPath, JSON.stringify(token));
  console.log('Token stored to', tokenPath);
}

async function getNewToken(oauth2Client: OAuth2Client) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  
  return new Promise((resolve, reject) => {
    console.log('Authorize this app by visiting this url: ', authUrl);
    rl.question('Enter the code from that page here: ', code => {
      rl.close();
      oauth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error('Error while trying to retrieve access token');
          reject(err);
          return;
        }

        oauth2Client.setCredentials(token);
        storeToken(token);
        resolve(oauth2Client);
      });
    });
  });
}

/**
 * Gmail 사용자 라벨 목록
 */
async function listLabels(auth: OAuth2Client) {
  const { data: { labels } } = await gmail.users.labels.list({
    auth,
    userId: 'me',
  });

  if (labels.length === 0) {
    console.log('No labels found.');
  } else {
    const table = new Table({
      head: ['Label ID', 'Label Name']
    });
    // @ts-ignore
    labels.forEach(label => table.push([label.id, label.name]));

    console.log('Gmail Labels:');
    console.log(table.toString());
    console.log();
  }
  return auth;
}

/**
 * 사용자 캘린더 목록
 */
async function listCalendars(auth: OAuth2Client) {
  // calendar list
  const { data: { items } } = await calendar.calendarList.list({ auth });
  if (items) {
    const table = new Table({
      head: ['Calendar ID', 'Calendar Name']
    });
    items.forEach(item => {
      // @ts-ignore
      table.push([item.id, item.summary]);
    });

    console.log('Calendars');
    console.log(table.toString());
    console.log();
  }
}

/**
 * 사용자 기본 캘린더 일정 10개
 */
async function listEvents(auth: OAuth2Client) {
  // calendar list
  const  { data: { items } } = await calendar.events.list({
    auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  });

  if (items.length === 0) {
    console.log('No upcoming events found.');
  } else {
    const table = new Table({
      head: ['Start Time', 'End Time', 'Event Name']
    });
    items.forEach(event => {
      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;
      // @ts-ignore
      table.push([start, end, event.summary]);
    });

    console.log('Primary Calendar Upcoming 10 events:');
    console.log(table.toString());
    console.log();
  }
}

async function run(): Promise<void> {
  try {
    const client = getClient();
    
    if (fs.existsSync(tokenPath)) {
      await authorize(client);
    } else {
      await getNewToken(client);
    }

    await listLabels(client);
    await listCalendars(client);
    await listEvents(client);

    rl.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();