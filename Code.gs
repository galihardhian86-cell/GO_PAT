/*******************************************************
 * GO FASTER — Google Apps Script Backend
 *
 * 1. Buat Google Spreadsheet baru.
 * 2. Extensions → Apps Script.
 * 3. Tempel seluruh kode ini ke Code.gs.
 * 4. Buka Project Settings → Script properties.
 *    Tambahkan:
 *      SPREADSHEET_ID = ID spreadsheet kamu
 *      DRIVE_FOLDER_ID = ID folder Google Drive (opsional)
 * 5. Tambahkan file HTML bernama "Index" lalu tempel
 *    isi Index.html dari folder project ini.
 * 6. Deploy → New deployment → Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 *******************************************************/

const CONFIG = {
  SHEET_NAME: 'Pendaftaran',
  ROOT_FOLDER_NAME: 'GO_FASTER_Uploads',
  MAX_FILE_BYTES: 5 * 1024 * 1024
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('GO FASTER — Pendaftaran')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID belum diatur di Script Properties.');
  return SpreadsheetApp.openById(id);
}

function getUploadFolder_() {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('DRIVE_FOLDER_ID');
  if (folderId) return DriveApp.getFolderById(folderId);

  const root = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  if (root.hasNext()) return root.next();
  return DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
}

function getSheet_() {
  const ss = getSpreadsheet_();
  let sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.SHEET_NAME);
    sh.appendRow([
      'Timestamp','Registration ID','Nama','Email','WhatsApp','Jurusan',
      'Bukti Pembayaran','Bukti Instagram','Bukti YouTube','Status'
    ]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function submitRegistration(payload) {
  if (!payload) throw new Error('Data pendaftaran kosong.');

  const required = ['name','email','wa','major','paymentProof','igProof','ytProof'];
  required.forEach(k => {
    if (!payload[k] || (typeof payload[k] === 'string' && !payload[k].trim())) {
      throw new Error('Data belum lengkap: ' + k);
    }
  });

  const email = String(payload.email).trim().toLowerCase();
  const sh = getSheet_();

  // Cegah pendaftaran ganda berdasarkan email.
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][3]).trim().toLowerCase() === email) {
      throw new Error('Email tersebut sudah terdaftar.');
    }
  }

  const registrationId =
    'GF-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');

  const folder = getUploadFolder_();
  const userFolder = folder.createFolder(
    sanitize_(registrationId + '-' + payload.name)
  );

  const paymentUrl = saveBase64File_(payload.paymentProof, userFolder, 'PAYMENT');
  const igUrl = saveBase64File_(payload.igProof, userFolder, 'INSTAGRAM');
  const ytUrl = saveBase64File_(payload.ytProof, userFolder, 'YOUTUBE');

  sh.appendRow([
    new Date(),
    registrationId,
    payload.name,
    email,
    payload.wa,
    payload.major,
    paymentUrl,
    igUrl,
    ytUrl,
    'Menunggu Verifikasi'
  ]);

  return { ok:true, registrationId:registrationId };
}

function saveBase64File_(fileObj, folder, prefix) {
  if (!fileObj || !fileObj.data) throw new Error('File ' + prefix + ' tidak ditemukan.');

  const bytes = Utilities.base64Decode(fileObj.data);
  if (bytes.length > CONFIG.MAX_FILE_BYTES) {
    throw new Error('File ' + prefix + ' melebihi 5 MB.');
  }

  const safeName = sanitize_(fileObj.name || 'upload');
  const blob = Utilities.newBlob(bytes, fileObj.mimeType || 'application/octet-stream',
    prefix + '_' + safeName);
  const file = folder.createFile(blob);

  // File tetap privat secara default. Link dicatat di Sheet untuk panitia.
  return file.getUrl();
}

function sanitize_(text) {
  return String(text || '')
    .replace(/[\\/:*?"<>|#%{}~&]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 120);
}
