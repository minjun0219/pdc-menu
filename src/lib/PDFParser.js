import _ from 'lodash';
import PDF2Json from 'pdf2json';
import PDFMenuParser from '../parsers/PDFMenuParser';
import PvvPDFMenuParser from '../parsers/PvvPDFMenuParser';

/**
 * 식단표 타입
 * PDC: 판교디지털센터
 * PVV: 판교세븐벤처밸리 (NS홈쇼핑)
 */
export const Location = {
  PDC: 'PDC',
  PVV: 'PVV'
};

/**
 * PDF문서에서 메뉴를 파싱
 * @export
 * @param {String} base64Data 첨부파일에서 받아온 Base64 String
 */
export function parsePDFMenu(base64Data, location = Location.PDC) {
  return new Promise((resolve, reject) => {
    const pdf2Json = new PDF2Json();
    pdf2Json.on('pdfParser_dataReady', data => resolve(data));
    pdf2Json.on('pdfParser_dataError', err => reject(err.parserError));

    const buffer = new Buffer(base64Data, 'base64');
    pdf2Json.parseBuffer(buffer);
  })
  .then(data => {
    const page = data && data.formImage && data.formImage.Pages && data.formImage.Pages[0];
    if (!page) {
      throw new Error('데이터가 없습니다!!!');
    }
    return page;
  })
  .then(data => {
    if (location === Location.PDC) {
      return new PDFMenuParser(data);
    } else if (location === Location.PVV) {
      return new PvvPDFMenuParser(data);
    }
    throw new Error('식당 위치가 잘못 선택 되었습니다.');
  })
  .then(parser => parser.getData());
}

/**
 * 첨부파일에서 읽어온 PDF 파일을 파싱해서 Array로 던짐
 * @export default
 * @param {Array} attach Gmail에서 읽어온 첨부파일
 */
export default function PDFParser(attach, location) {
  const parsePdfs = attach.map(obj => parsePDFMenu(obj.data, location));
  return Promise.all(parsePdfs)
    .then(data => _.flatten(data));
}
