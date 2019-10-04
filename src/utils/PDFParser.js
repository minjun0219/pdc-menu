import { menuPdfParser } from 'welstory-menu-pdf-parser';

/**
 * PDF문서에서 메뉴를 파싱
 * @export
 * @param {String} base64Data 첨부파일에서 받아온 Base64 String
 */
export function parsePDFMenu(base64Data) {
  const buffer = new Buffer(base64Data, 'base64');
  return menuPdfParser(buffer);
}

/**
 * 첨부파일에서 읽어온 PDF 파일을 파싱해서 Array로 던짐
 * @export default
 * @param {Array} attach Gmail에서 읽어온 첨부파일
 */
export default function PDFParser(attach) {
  const pdfFile = attach.find(o => o.filename.indexOf('영문') === -1);
  return parsePDFMenu(pdfFile.data);
}
