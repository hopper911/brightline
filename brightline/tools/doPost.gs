// T9 Watcher Webhook — Brightline Image Uploads
// Deploy as Web app: Execute as Me, Who has access: Anyone
// Set WEBHOOK_SECRET in File → Project properties → Script properties
// Set SHEET_WEBHOOK_URL and WEBHOOK_SECRET in ~/brightline/tools/.env

const UPLOADS_TAB_NAME = 'Brightline Image Uploads';
const UPLOADS_HEADERS = [
  'Filename_Base',
  'Section_Slug',
  'File_Path',
  'File_Size',
  'Status',
  'Filename_Final',
  'R2_Key_Full',
  'R2_Key_Thumb',
  'Error',
  'Created_At'
];
const STATUS_NEW = 'NEW';
const STATUS_UPLOADED = 'Uploaded';

function getSecret_() {
  const p = PropertiesService.getScriptProperties();
  return p.getProperty('WEBHOOK_SECRET') || '';
}

function checkAuth_(e, bodySecret) {
  const secret = getSecret_();
  if (!secret) return true; // allow if not configured (dev)
  const querySecret = e && e.parameter && e.parameter.secret;
  const reqSecret = bodySecret || querySecret;
  return reqSecret === secret;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(UPLOADS_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(UPLOADS_TAB_NAME);
    sheet.getRange(1, 1, 1, UPLOADS_HEADERS.length).setValues([UPLOADS_HEADERS]);
    sheet.getRange(1, 1, 1, UPLOADS_HEADERS.length)
      .setFontWeight('bold').setBackground('#4285f4').setFontColor('#fff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * GET ?action=pending&secret=... — returns rows where Status=NEW
 */
function doGet(e) {
  if (!checkAuth_(e, null)) {
    return jsonResponse_({ ok: false, error: 'Unauthorized' });
  }
  const action = (e && e.parameter && e.parameter.action) || '';
  if (action !== 'pending') {
    return jsonResponse_({ ok: false, error: 'Invalid action' });
  }

  const sheet = ensureSheet_();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return jsonResponse_({ ok: true, rows: [] });
  }

  const statusCol = UPLOADS_HEADERS.indexOf('Status') + 1;
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const rowData = data[i];
    const status = (rowData[statusCol - 1] || '').toString().trim();
    if (status !== STATUS_NEW) continue;

    const filenameBase = (rowData[0] || '').toString();
    const sectionSlug = (rowData[1] || '').toString();
    const filePath = (rowData[2] || '').toString();
    if (!filenameBase || !sectionSlug || !filePath) continue;

    rows.push({
      row: i + 1,
      filename_base: filenameBase,
      section_slug: sectionSlug,
      file_path: filePath
    });
  }

  return jsonResponse_({ ok: true, rows: rows });
}

/**
 * POST body: { action: "append"|"update", ... }
 * append: { filename_base, section_slug, file_path, file_size }
 * update: { row, filename_final, r2_key_full, r2_key_thumb, status, error }
 */
function doPost(e) {
  let data = {};
  try {
    data = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  } catch (err) {
    return jsonResponse_({ ok: false, error: 'Invalid JSON' });
  }

  if (!checkAuth_(e, data.secret)) {
    return jsonResponse_({ ok: false, error: 'Unauthorized' });
  }

  const action = (data.action || '').toString();

  if (action === 'append') {
    const row = [
      data.filename_base || '',
      data.section_slug || '',
      data.file_path || '',
      data.file_size !== undefined ? String(data.file_size) : '',
      STATUS_NEW,
      '',
      '',
      '',
      '',
      data.created_at || new Date().toISOString()
    ];
    const sheet = ensureSheet_();
    sheet.appendRow(row);
    const rowIndex = sheet.getLastRow();
    return jsonResponse_({ ok: true, row: rowIndex });
  }

  if (action === 'update') {
    const rowIndex = parseInt(data.row, 10);
    if (!rowIndex || rowIndex < 2) {
      return jsonResponse_({ ok: false, error: 'Invalid row' });
    }
    const sheet = ensureSheet_();
    const maxRow = sheet.getLastRow();
    if (rowIndex > maxRow) {
      return jsonResponse_({ ok: false, error: 'Row out of range' });
    }

    const cols = UPLOADS_HEADERS.length;
    const updates = [];
    if (data.filename_final !== undefined) updates.push({ col: 6, val: data.filename_final });
    if (data.r2_key_full !== undefined) updates.push({ col: 7, val: data.r2_key_full });
    if (data.r2_key_thumb !== undefined) updates.push({ col: 8, val: data.r2_key_thumb });
    if (data.status !== undefined) updates.push({ col: 5, val: data.status });
    if (data.error !== undefined) updates.push({ col: 9, val: data.error });

    updates.forEach(function (u) {
      sheet.getRange(rowIndex, u.col).setValue(u.val);
    });
    return jsonResponse_({ ok: true });
  }

  return jsonResponse_({ ok: false, error: 'Invalid action' });
}
