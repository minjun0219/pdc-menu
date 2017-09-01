import moment from 'moment';
import Webhook from './utils/JandiWebhook';
import GoogleAPIs from './apis/GoogleAPIs';
import { getSheetsData } from './apis/GoogleSheets';
import print, { printCatch } from './utils/print';

require('dotenv').config({ silent: true });

// start
checkBirthday();

/**
 * 구글 시트에서 생일인 사람들 찾고, 오늘이 생일이면 잔디로 알림을 발송
 */
function checkBirthday() {
  GoogleAPIs()
    .then(auth => (
      // 구글에서 데이터를 호출
      getSheetsData(auth, 'A2:B')

        // 생일인지 확인
        .then(value => matchBirthday(value))
    ))
    .then(rows => sendJandiMessage(rows))
    .catch(err => printCatch(err));
}

/**
 * 생일인지 확인
 * @param {array} rows 시트 데이터 목록
 */
function matchBirthday(rows) {
  const today = moment().format('MM-DD');
  return rows.filter(value => {
    const date = moment(value[1]).format('MM-DD');
    return today === date;
  })
  .map(data => data[0]);
}


/**
 * 메시지 셋팅
 * @param {string} description JSON String
 */
function sendJandiMessage(rows) {
  if (!rows.length) {
    process.exit();
    return null;
  }
  const birth = rows.map(name => `${name}프로님`);
  const message = `${birth.join(', ')} 생일축하드려요!!!`;
  print(
    '잔디 메시지를 생성합니다.',
    ['제목', message]
  );
  return Webhook(message);
}
