import 'server-only';
import QRCode from 'qrcode';

/** QR code as SVG text. Error correction "M" survives small scratches on printed cards. */
export const qrSvg = (url: string, dark = '#111111', light = '#ffffff') =>
  QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark, light } });
export const qrPng = (url: string, size = 1024) =>
  QRCode.toBuffer(url, { type: 'png', errorCorrectionLevel: 'M', margin: 2, width: size });
