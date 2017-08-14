import PDFParser from './utils/PDFParser';
import GoogleAPIs from './apis/GoogleAPIs';
import { CheckEmail } from './apis/Gmail';
import { InsertEvents } from './apis/GoogleCalendar';
import { printCatch } from './utils/print';

// start
checkNewMenu();

/**
 * Gmail에서 새로운 메일을 읽어서 새로운 이메일에 첨부파일이 있다면
 * 첨부파일에서 메뉴를 파싱해서 구글 캘린더에 이벤트를 등록
 */
function checkNewMenu() {
  GoogleAPIs()
    .then(auth => (
      // 새 이메일이 있으면 첨부파일을 가져온다.
      CheckEmail(auth)

        // 첨부파일로 PDF를 파싱함
        .then(value => PDFParser(value))

        // 구글 캘린더에 등록
        .then(value => InsertEvents(value, auth))
    ))
    .then(() => {
      // 성공
      console.log('success');
      process.exit();
    })
    .catch(err => printCatch(err));
}
