# Bright Line Apps Script — PIPELINE Sheet Setup

Paste this script into your Google Sheet: **Extensions > Apps Script**. Replace the default `Code.gs` contents, save, and run `setupPipeline` once (or use the custom menu). Authorize when prompted.

## Pipeline Sheet Schema (New — BrightLine_images/pipeline)

The production pipeline (`BrightLine_images/pipeline/`) uses a simpler schema. Create a sheet with these headers (A–K):

| Col | Header |
|-----|--------|
| A | Original_Filename |
| B | Section |
| C | Captured_Date |
| D | Sequence |
| E | Filename_Final |
| F | R2_Key_Full |
| G | R2_Key_Thumb |
| H | Status |
| I | Error |
| J | Created_At |
| K | Updated_At |

**Section** values: `arc`, `cam`, `cor`. The pipeline appends and updates rows automatically. Set `SHEET_ID` and `GOOGLE_CREDENTIALS_PATH` in `pipeline/.env`.

## Usage

1. Open your Bright Line spreadsheet (the one with Sheet ID used by the pipeline).
2. **Extensions > Apps Script**
3. Delete default code and paste the script below.
4. Save (Ctrl+S / Cmd+S).
5. Run `onOpen` once to add the menu (or just open the sheet; `onOpen` runs automatically).
6. **BrightLine > Setup/Repair PIPELINE Sheet**

## Script

```javascript
/**
 * Bright Line PIPELINE Sheet Setup
 * Creates/repairs PIPELINE tab with headers, validations, and formatting.
 */
const TAB_NAME = 'PIPELINE';
const HEADERS = [
  'Thumb_Preview',
  'Uploaded file',
  'Filename_Base',
  'Pillar_Slug',
  'Section_Slug',
  'Client_Slug',
  'Location',
  'Year',
  'Project_N',
  'Sequence',
  'Filename_Final',
  'R2_Key',
  'R2_Key_Full',
  'R2_Key_Thumb',
  'R2_WEBP',
  'Ready',
  'Alt_Text',
  'Caption',
  'Description',
  'Hero_Image',
  'Orientation',
  'Usage_Type',
  'Year_N',
  'Seq_N',
  'Status',
  'Upload',
  'Error'
];

const PILLAR_OPTIONS = ['arc', 'cam', 'cor'];
const SECTION_OPTIONS = ['acd', 'rea', 'cul', 'biz', 'tri'];
const ORIENTATION_OPTIONS = ['Horizontal', 'Vertical', 'Square'];
const USAGE_OPTIONS = ['Editorial', 'Commercial', 'Personal', ''];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('BrightLine')
    .addItem('Setup/Repair PIPELINE Sheet', 'setupPipeline')
    .addToUi();
}

function setupPipeline() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_NAME);
  }

  const lastCol = HEADERS.length;
  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setValues([HEADERS]);
  headerRange.setFontWeight('bold').setBackground('#4285f4').setFontColor('#fff');

  sheet.setFrozenRows(1);

  // Data validation: Pillar_Slug (arc, cam, cor — aligns with T9 folders and R2)
  const pillarCol = HEADERS.indexOf('Pillar_Slug') + 1;
  const pillarRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(PILLAR_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, pillarCol, 1000, pillarCol).setDataValidation(pillarRule);

  // Data validation: Section_Slug (for DB mapping; derived from pillar if needed)
  const sectionCol = HEADERS.indexOf('Section_Slug') + 1;
  const sectionRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(SECTION_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, sectionCol, 1000, sectionCol).setDataValidation(sectionRule);

  // Data validation: Orientation (col 20)
  const orientCol = HEADERS.indexOf('Orientation') + 1;
  const orientRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ORIENTATION_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, orientCol, 1000, orientCol).setDataValidation(orientRule);

  // Data validation: Usage_Type (col 21)
  const usageCol = HEADERS.indexOf('Usage_Type') + 1;
  const usageRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(USAGE_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, usageCol, 1000, usageCol).setDataValidation(usageRule);

  // Hero_Image: checkbox (col 19)
  const heroCol = HEADERS.indexOf('Hero_Image') + 1;
  sheet.getRange(2, heroCol, 1000, heroCol).insertCheckboxes();

  // Conditional formatting: Status
  const statusCol = HEADERS.indexOf('Status') + 1;
  const statusColLetter = columnToLetter(statusCol);
  const dataRange = sheet.getRange(2, 1, 1000, lastCol);

  const rules = sheet.getConditionalFormatRules();
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Uploaded')
      .setBackground('#34a853')
      .setRanges([dataRange])
      .build()
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Failed')
      .setBackground('#ea4335')
      .setRanges([dataRange])
      .build()
  );
  sheet.setConditionalFormatRules(rules);

  // Protect header row
  const protection = headerRange.protect().setDescription('PIPELINE header');
  protection.setWarningOnly(true);

  SpreadsheetApp.getUi().alert('PIPELINE sheet setup complete.');
}

function columnToLetter(col) {
  let letter = '';
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}
```

## T9 Watcher Webhook — Brightline Image Uploads

The watcher uses a dedicated **"Brightline Image Uploads"** sheet as staging: append NEW rows, fetch pending, upload to R2, update rows. The PIPELINE tab remains for manual/admin use.

**Setup:**
1. Add `SHEET_WEBHOOK_URL` and `WEBHOOK_SECRET` to `~/brightline/tools/.env`.
2. In Apps Script: File → Project properties → Script properties → add `WEBHOOK_SECRET` (same value as .env).
3. Deploy: Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.

**Column layout (10 columns):** Filename_Base | Section_Slug | File_Path | File_Size | Status | Filename_Final | R2_Key_Full | R2_Key_Thumb | Error | Created_At

Copy `tools/doPost.gs` into your Apps Script (alongside `onOpen` and `setupPipeline`). The handler provides:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `?action=append` | POST | Append row (Status=NEW) — watcher calls this |
| `?action=update` | POST | Update row (Filename_Final, R2 keys, Status) — watcher calls after upload |
| `?action=pending&secret=...` | GET | Return rows where Status=NEW — watcher fetches before upload |

**Auth:** All requests require `secret` (query param for GET, or in JSON body for POST) matching `WEBHOOK_SECRET`. If `WEBHOOK_SECRET` is not set in Script Properties, auth is skipped (dev only).

## Brightline Image Uploads Tab — Column Layout

| Col | Header | Filled by | Description |
|-----|--------|-----------|-------------|
| A | Filename_Base | Watcher (append) | Original filename without extension |
| B | Section_Slug | Watcher (append) | arc, cam, or cor (from T9 folder) |
| C | File_Path | Watcher (append) | Full path on disk |
| D | File_Size | Watcher (append) | Size in bytes |
| E | Status | Watcher (append→NEW, update→Uploaded/Error) | NEW, Uploaded, or Error |
| F | Filename_Final | Watcher (update) | bl-{arc,cam,cor}-{yyyymmdd}-{seq}.ext |
| G | R2_Key_Full | Watcher (update) | portfolio/{pillar}/web_full/{filename} |
| H | R2_Key_Thumb | Watcher (update) | portfolio/{pillar}/web_thumb/{base}.webp |
| I | Error | Watcher (update) | Error message if Status=Error |
| J | Created_At | Watcher (append) | ISO timestamp |

## PIPELINE Tab — Column Layout

| Col | Header | Description |
|-----|--------|-------------|
| A | Filename_Base | e.g. brightline-campaign-cisiamo-nyc-2026-001 |
| B | Pillar_Slug | arc, cam, cor |
| C | Client_Slug | Optional |
| D | Description | Human description |
| ... | ... | See setupPipeline for full schema |

## PIPELINE Setup — What It Does

- **Creates/repairs** the `PIPELINE` tab
- **Writes headers** in row 1 (bold, blue background)
- **Data validation** dropdowns:
  - `Pillar_Slug`: architecture, campaign, corporate (aligns with T9 folders and R2)
  - `Section_Slug`: acd, rea, cul, biz, tri (for DB mapping)
  - `Orientation`: Horizontal, Vertical, Square
  - `Usage_Type`: Editorial, Commercial, Personal, (blank)
- **Hero_Image**: checkbox column (TRUE/FALSE)
- **Conditional formatting**: Status = "Uploaded" (green), Status = "Failed" (red)
- **Frozen** row 1
- **Protected** header row (warning only; can override)
- **Custom menu**: BrightLine > Setup/Repair PIPELINE Sheet
