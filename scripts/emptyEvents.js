#!/usr/bin/env node

require('babel-register')();

const chalk = require('chalk');
const google = require('googleapis');
const promisify = require('es6-promisify');

const { default: GoogleAPIs } = require('../src/apis/GoogleAPIs');
const { default: print, printCatch } = require('../src/lib/print');

require('dotenv').config({ silent: true });

const calendar = google.calendar('v3');
const CALENDAR_ID = process.env.CALENDAR_ID;

GoogleAPIs()
  .then(auth => (
    promisify(calendar.events.list)({
      auth,
      calendarId: CALENDAR_ID,
      timeMin: (new Date()).toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    })
    .then(response => {
      const events = response.items;
      if (events.length === 0) {
        throw 'No upcoming events found.';
      }
      print(`이벤트가 ${chalk.cyan(events.length)}건 있습니다.`);
      return events;
    })
    .then(events => (
      Promise.all(
        events.map(event => (
          promisify(calendar.events.delete)({
            auth,
            calendarId: CALENDAR_ID,
            eventId: event.id
          })
          .then(() => {
            print(
              '이벤트가 삭제 되었습니다.',
              ['Event ID', event.id]
            );
            return event.id;
          })
        )) // forEach
      ) // Promise.all
    ))
  ))
  .catch(err => printCatch(err));
