import promisify from 'es6-promisify';
import google from 'googleapis';

require('dotenv').config({ silent: true });

const SHEET_ID = process.env.SHEET_ID;
const sheets = google.sheets('v4');

export function getSheetsData(auth, range) {
  return promisify(sheets.spreadsheets.values.get)({
    auth,
    spreadsheetId: SHEET_ID,
    range
  })
  .then(response => response.values)
  .catch(err => {
    throw new Error(`The API returned an error: ${err}`);
  });
}
