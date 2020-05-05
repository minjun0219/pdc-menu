import chalk from 'chalk';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { MenuMealData } from 'welstory-menu-pdf-parser';
import moment from 'moment';
import 'moment/locale/ko';

import print from '../utils/print';

require('dotenv').config({ silent: true });

const TIMEZONE = 'Asia/Seoul';
const CALENDAR_ID = process.env.GOOGLE_PDC_MENU_CALENDAR_ID;

moment().locale('ko-KR');
const calendar = google.calendar('v3');

/**
 * 메뉴를 이벤트로 등록
 * @export
 * @param menu 등록될 메뉴 목록
 * @param auth Google APIs OAuth2 인증
 */
export async function insertEvents(menu: MenuMealData[], auth: OAuth2Client): Promise<void> {
  const list = convertEvents(menu);
  console.log();
  console.log(chalk.cyan.bold('이벤트 등록:'));
  await Promise.all(list.map((event) => insertMenuEvent(auth, event)));
  
  console.log();
  print(`이벤트를 ${chalk.cyan.bold(list.length)}건 생성하였습니다.`);
}

/**
 * 개별 메뉴를 이벤트로 등록
 * @param auth Google APIs OAuth2 인증
 * @param eventData Google Calendar 데이터
 */
async function insertMenuEvent(auth: OAuth2Client, eventData: calendar_v3.Schema$Event) {
  try {
    const { data: event } = await calendar.events.insert({
      auth,
      calendarId: CALENDAR_ID,
      requestBody: eventData
    });
    console.log('  - [%s] %s', event.id, event.summary)
  } catch (err) {
    throw new Error(`There was an error contacting the Calendar service: ${err}`);
  }
}

/**
 * 메뉴 목록을 Google Calendar 데이터로 변환
 * @param menu 메뉴 목록
 */
function convertEvents(menu: MenuMealData[]) {
  const list: calendar_v3.Schema$Event[] = [];

  // 날짜별
  menu.forEach(item => {
    // 목록에 추가
    list.push({
      summary: item.summary,
      description: item.description,
      start: setDate(item.startDateTime),
      end: setDate(item.endDateTime)
    });
  });

  return list;
}

/**
 * 다음 이벤트를 1건 호출
 * @param auth Google APIs OAuth2 인증
 * @param endTime 마지막 이벤트 종료시간
 */
export async function nextEvents(auth: OAuth2Client, endTime: string) {
  const { data: { items } } = await calendar.events.list({
    auth,
    calendarId: CALENDAR_ID,
    timeMin: endTime || (new Date()).toISOString(),
    maxResults: 3,
    singleEvents: true,
    orderBy: 'startTime'
  });
  if (!items?.length) {
    throw new Error('No upcoming events found.');
  }

  return items;
}

/**
 * Event에 등록 될 날짜 형식으로 변환
 * @param date 날짜
 */
function setDate(date: Date) {
  return {
    dateTime: date.toISOString(),
    timeZone: TIMEZONE
  };
}