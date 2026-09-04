/**
 * APEX RUN 2026 — registration backend
 *
 * Receives form posts from the site and appends them to a Google Sheet,
 * rejecting duplicate phone numbers and duplicate payment references.
 *
 * The status strings below are contract: script.js branches on these exact
 * values. Change one here and you must change it there.
 *
 *   success           row written
 *   duplicate_phone   that number has already registered
 *   duplicate_utr     that payment reference has already been used
 *   invalid           a required field was missing or malformed
 *   error             something broke server-side
 *
 * Setup
 *   1. Run setupSheet() once to create the header row and grant permissions.
 *   2. Deploy → New deployment → Web app.
 *      Execute as: Me.  Who has access: Anyone.
 *   3. Copy the /exec URL into SCRIPT_URL in script.js.
 */

var SHEET_NAME = 'Registrations';

var HEADERS = [
  'Timestamp', 'Name', 'Location', 'Phone', 'Email',
  'Age', 'Run', 'T-shirt size', 'Organisation', 'UTR'
];

/* Column positions used for the duplicate lookups, 1-based to match
   getRange(). Keep these in step with HEADERS. */
var COL_PHONE = 4;
var COL_UTR   = 10;


/* ------------------------------------------------------------------
   Entry point
------------------------------------------------------------------ */

function doPost(e) {
  // One writer at a time. Without this, two people submitting within the
  // same second can both pass the duplicate check and both get a row.
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(20000);
  } catch (err) {
    return respond('error', 'Server busy, please try again.');
  }

  try {
    var form = (e && e.parameter) ? e.parameter : {};

    var entry = {
      name:         trim(form.name),
      location:     trim(form.location),
      phone:        digitsOnly(form.phone),
      email:        trim(form.email),
      age:          trim(form.age),
      run:          trim(form.run),
      size:         trim(form.size),
      organisation: trim(form.organisation),
      utr:          trim(form.utr).toUpperCase()
    };

    var problem = validate(entry);
    if (problem) return respond('invalid', problem);

    var sheet = getSheet();
    var rows  = sheet.getLastRow();

    if (rows > 1) {
      var phones = flatten(sheet.getRange(2, COL_PHONE, rows - 1, 1).getValues());
      if (contains(phones, entry.phone, digitsOnly)) {
        return respond('duplicate_phone');
      }

      var utrs = flatten(sheet.getRange(2, COL_UTR, rows - 1, 1).getValues());
      if (contains(utrs, entry.utr, upperTrim)) {
        return respond('duplicate_utr');
      }
    }

    sheet.appendRow([
      new Date(),
      entry.name,
      entry.location,
      "'" + entry.phone,   // leading quote stops Sheets eating the leading zero
      entry.email,
      entry.age,
      entry.run,
      entry.size,
      entry.organisation,
      entry.utr
    ]);

    return respond('success');

  } catch (err) {
    console.error(err);
    return respond('error', String(err));

  } finally {
    lock.releaseLock();
  }
}

/* A GET returns a heartbeat, which makes it easy to confirm the deployment
   is live by pasting the URL into a browser. */
function doGet() {
  return respond('ok', 'Apex Run 2026 registration endpoint is live.');
}


/* ------------------------------------------------------------------
   Validation — mirrors the client-side checks in script.js.
   Never trust the browser to have run them.
------------------------------------------------------------------ */

function validate(entry) {
  if (!entry.name)         return 'Name is required.';
  if (!entry.location)     return 'Location is required.';
  if (!entry.email)        return 'Email is required.';
  if (!entry.organisation) return 'Organisation is required.';

  if (!/^[0-9]{10}$/.test(entry.phone)) {
    return 'Phone number must be exactly 10 digits.';
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(entry.email)) {
    return 'Email address does not look valid.';
  }

  var age = parseInt(entry.age, 10);
  if (!age || age < 1 || age > 99) return 'Age must be between 1 and 99.';

  if (['3K', '5K', '10K'].indexOf(entry.run) === -1) {
    return 'Pick a valid run category.';
  }
  if (!entry.size) return 'Pick a T-shirt size.';

  if (!/^[A-Z0-9]{10,20}$/.test(entry.utr)) {
    return 'UTR must be 10 to 20 letters or digits.';
  }
  return null;
}


/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */

function getSheet() {
  var book  = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function respond(status, message) {
  var body = { status: status };
  if (message) body.message = message;

  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function trim(value)       { return value ? String(value).trim() : ''; }
function digitsOnly(value) { return trim(value).replace(/\D/g, ''); }
function upperTrim(value)  { return trim(value).toUpperCase(); }
function flatten(rows)     { return rows.map(function (r) { return r[0]; }); }

function contains(values, needle, normalise) {
  for (var i = 0; i < values.length; i++) {
    if (normalise(values[i]) === needle) return true;
  }
  return false;
}


/* ------------------------------------------------------------------
   Run once from the editor
------------------------------------------------------------------ */

function setupSheet() {
  var sheet = getSheet();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  var header = sheet.getRange(1, 1, 1, HEADERS.length);
  header.setFontWeight('bold');
  header.setBackground('#001d3d');
  header.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);

  SpreadsheetApp.getUi().alert('Sheet ready. Deploy as a web app next.');
}

/**
 * Sanity check you can run from the editor without touching the live site.
 * Writes a real row — delete it afterwards.
 */
function testSubmission() {
  var result = doPost({
    parameter: {
      name: 'Test Runner',
      location: 'Hampankatta',
      phone: '9999999999',
      email: 'test@example.com',
      age: '24',
      run: '5K',
      size: 'M',
      organisation: 'Milagres College',
      utr: 'TEST123456789'
    }
  });
  console.log(result.getContent());
}
