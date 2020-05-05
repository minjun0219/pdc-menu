import * as functions from 'firebase-functions';
import PDFParser from './utils/PDFParser';
import { authorize } from './apis/GoogleAPIs';
import { checkEmail } from './apis/Gmail';
import { insertEvents } from './apis/GoogleCalendar';

/**
 * Gmail에서 새로운 메일을 읽어서 새로운 이메일에 첨부파일이 있다면
 * 첨부파일에서 메뉴를 파싱해서 구글 캘린더에 이벤트를 등록
 */
export const checkNewMenu = functions.region('asia-northeast1').pubsub.schedule('0 9 * * 1')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    const auth = await authorize();
    const attachs = await checkEmail(auth);
    const parsed = await PDFParser(attachs);
    if (parsed) {
      await insertEvents(parsed, auth);
    }
  });

