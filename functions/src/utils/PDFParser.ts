import { menuPdfParser } from 'welstory-menu-pdf-parser';
import type { Attachments } from '../apis/Gmail';

/**
 * PDF문서에서 메뉴를 파싱
 * @param base64Data 첨부파일에서 받아온 Base64 String
 */
export function parsePDFMenu(base64Data: string) {
  const buffer = new Buffer(base64Data, 'base64');
  return menuPdfParser(buffer);
}

/**
 * 첨부파일에서 읽어온 PDF 파일을 파싱해서 Array로 던짐
 * @param attach Gmail에서 읽어온 첨부파일
 */
export default function PDFParser(attach: Attachments[]) {
  const pdfFile = attach.find(o => o.filename.indexOf('영문') === -1);
  if (pdfFile?.data) {
    return parsePDFMenu(pdfFile.data);
  }
  return null;
}
