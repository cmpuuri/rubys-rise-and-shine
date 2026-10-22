/* Ruby's Rise & Shine: order sheet.
   Paste this whole file into the Google Sheet's Apps Script editor (Extensions > Apps Script).
   Setup steps are in README.md under "Order sheet".

   What it does:
   - GET  (the order page opening): returns how many pans are booked on each upcoming bake day.
          Counts only. Never names, phones, or notes.
   - POST (someone placing an order): checks the day still has room, then adds one row to "Orders".
          A lock makes two orders for the last pan wait in line, so a day can never go over.

   The pans-per-bake limit, bake days, and max pans per order come from the live site.config.json,
   so the website and this script always agree. */

var SITE_CONFIG_URL = 'https://rubysriseandshine.com/site.config.json';
var SHEET_NAME = 'Orders';
var TZ = 'America/Los_Angeles';
var HEADERS = ['Received', 'Order ID', 'Bake date', 'Bake day', 'Flavor', 'Pans', 'Name', 'Phone',
               'Get it by', 'Where', 'Notes', 'Total', 'Status', 'Paid'];
var COL = { bakeDate: 3, pans: 6, status: 13 }; // 1-based column numbers in HEADERS

/* Run this once from the editor (pick "setup" in the toolbar, then Run). */
function setup() {
  var sheet = sheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange('C:C').setNumberFormat('yyyy-mm-dd');
  sheet.getRange('H:H').setNumberFormat('@');           // keep phone numbers as text
  // Status: leave blank, or pick "Cancelled" to free up those pans. (No checkboxes: they would count as filled rows.)
  var statusRule = SpreadsheetApp.newDataValidation().requireValueInList(['Cancelled'], true).setAllowInvalid(true).build();
  sheet.getRange(2, COL.status, sheet.getMaxRows() - 1, 1).setDataValidation(statusRule);
}

function doGet() {
  var cfg = config_();
  return json_({ ok: true, pansPerBake: cfg.pansPerBake, booked: bookedByDate_(todayIso_()) });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, reason: 'busy' });
  try {
    var o;
    try { o = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, reason: 'bad' }); }
    var cfg = config_();
    var problem = validate_(o, cfg);
    if (problem) return json_({ ok: false, reason: 'bad', detail: problem });

    var booked = bookedByDate_(todayIso_());
    var left = cfg.pansPerBake - (booked[o.bakeDate] || 0);
    if (o.qty > left) return json_({ ok: false, reason: 'full', left: Math.max(left, 0), booked: booked });

    sheet_().appendRow([
      new Date(), text_(o.id), o.bakeDate, text_(o.bakeDayLong), text_(o.flavor), o.qty,
      text_(o.name), text_(o.phone), text_(o.method), text_(o.where), text_(o.notes), '$' + o.qty * cfg.price, '', ''
    ]);
    return json_({ ok: true, left: left - o.qty });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- helpers ---------- */

function validate_(o, cfg) {
  if (!o || typeof o !== 'object') return 'no order';
  if (o.botcheck) return 'spam';
  if (!/^RRS-\d{5}$/.test(o.id || '')) return 'order id';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.bakeDate || '')) return 'bake date';
  if (o.bakeDate <= todayIso_()) return 'bake date in the past';
  var weekday = new Date(o.bakeDate + 'T12:00:00Z').getUTCDay();
  if (cfg.bakeDays.indexOf(weekday) < 0) return 'not a bake day';
  if (o.qty !== Math.floor(o.qty) || o.qty < 1 || o.qty > cfg.maxPansPerOrder) return 'pans';
  var flavors = cfg.flavors.map(function (f) { return f.name; });
  if (flavors.indexOf(o.flavor) < 0) return 'flavor';
  if (!o.name || String(o.name).length > 80) return 'name';
  if (!o.phone || String(o.phone).replace(/\D/g, '').length < 10 || String(o.phone).length > 30) return 'phone';
  if (String(o.notes || '').length > 1000) return 'notes';
  return '';
}

// Pans booked per bake date, from today on. Rows with Status "Cancelled" do not count.
function bookedByDate_(fromIso) {
  var sheet = sheet_(), last = sheet.getLastRow(), out = {};
  if (last < 2) return out;
  var rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  rows.forEach(function (r) {
    var d = isoOf_(r[COL.bakeDate - 1]);
    var pans = Number(r[COL.pans - 1]) || 0;
    var status = String(r[COL.status - 1] || '').trim().toLowerCase();
    if (!d || d < fromIso || status === 'cancelled') return;
    out[d] = (out[d] || 0) + pans;
  });
  return out;
}

function config_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('site-config');
  if (hit) return JSON.parse(hit);
  var res = UrlFetchApp.fetch(SITE_CONFIG_URL, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Could not read site.config.json');
  var cfg = JSON.parse(res.getContentText());
  cache.put('site-config', JSON.stringify(cfg), 300); // 5 minutes
  return cfg;
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function isoOf_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  var s = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function todayIso_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

// Stops a customer's text from being read as a spreadsheet formula.
function text_(v) {
  var s = String(v == null ? '' : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
