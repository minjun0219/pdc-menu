import promisify from 'es6-promisify';
import Table from 'cli-table';
import google from 'googleapis';
import GoogleAPIs from '../src/apis/GoogleAPIs';

const gmail = google.gmail('v1');
const calendar = google.calendar('v3');
const drive = google.drive('v3');

/**
 * 사용자 캘린더 목록
 * @param {google.auth.OAuth2} auth
 */
function listCalendars(auth) {
  // calendar list
  return promisify(calendar.calendarList.list)({
    auth
  })
    .then(response => {
      if (response.items) {
        const table = new Table({
          head: ['Calendar ID', 'Calendar Name']
        });
        response.items.forEach(item => {
          table.push([item.id, item.summary]);
        });

        console.log('Calendars');
        console.log(table.toString());
        console.log();
      }
      return auth;
    });
}

/**
 * 사용자 기본 캘린더 일정 10개
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  // calendar list
  return promisify(calendar.events.list)({
    auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  })
    .then(response => {
      const events = response.items;
      if (events.length === 0) {
        console.log('No upcoming events found.');
      } else {
        const table = new Table({
          head: ['Start Time', 'End Time', 'Event Name']
        });
        events.forEach(event => {
          const start = event.start.dateTime || event.start.date;
          const end = event.end.dateTime || event.end.date;
          table.push([start, end, event.summary]);
        });

        console.log('Primary Calendar Upcoming 10 events:');
        console.log(table.toString());
        console.log();
      }
      return auth;
    });
}

/**
 * Gmail 사용자 라벨 목록
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @return {Promise}
 */
function listLabels(auth) {
  return promisify(gmail.users.labels.list)({
    auth,
    userId: 'me'
  })
    .then(response => {
      const labels = response.labels;
      if (labels.length === 0) {
        console.log('No labels found.');
      } else {
        const table = new Table({
          head: ['Label ID', 'Label Name']
        });
        labels.forEach(label => table.push([label.id, label.name]));

        console.log('Gmail Labels:');
        console.log(table.toString());
        console.log();
      }
      return auth;
    });
}

/**
 * Google Drive 파일 목록
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @return {Promise}
 */
function listFiles(auth) {
  return promisify(drive.files.list)({
    auth,
    pageSize: 10,
    fields: 'files(id, name)'
  })
    .then(response => {
      const files = response.files;
      if (files.length === 0) {
        console.log('No files found.');
      } else {
        const table = new Table({
          head: ['File ID', 'File Name']
        });
        files.forEach(file => table.push([file.id, file.name]));

        console.log('Google Drive Files:');
        console.log(table.toString());
        console.log();
      }
      return auth;
    });
}

GoogleAPIs()
  .then(auth => listCalendars(auth))
  .then(auth => listEvents(auth))
  .then(auth => listLabels(auth))
  .then(auth => listFiles(auth))
  .catch(err => console.log(err));
