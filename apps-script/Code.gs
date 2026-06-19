/****************************************************************
 * ระบบเช็คชื่อกิจกรรมรับน้อง — Backend (Google Apps Script)
 * --------------------------------------------------------------
 * เก็บข้อมูลการเช็คชื่อไว้ใน Google Sheet เดียว เพื่อให้เครื่อง
 * ของเจ้าหน้าที่ทุกเครื่องเห็นข้อมูลตรงกันแบบเรียลไทม์
 *
 * Sheet นี้เก็บ 2 แท็บ:
 *   - students   : รายชื่อนักศึกษา (id, prefix, first, last, house, program)
 *   - attendance : การเช็คชื่อ (id, d1, d2, out, updated)
 *
 * วิธีติดตั้ง (ทำครั้งเดียว):
 *  1. สร้าง Google Sheet ใหม่ 1 ไฟล์ (ชื่ออะไรก็ได้)
 *  2. นำเข้ารายชื่อ: เมนู File → Import → Upload ไฟล์ "roster-import.csv"
 *       เลือก "Insert new sheet(s)" แล้วเปลี่ยนชื่อแท็บที่ได้เป็น  students
 *       (หัวคอลัมน์ต้องเป็น: id, prefix, first, last, house, program)
 *  3. เมนู Extensions → Apps Script  แล้ววางโค้ดนี้แทนของเดิมทั้งหมด
 *  4. กด Deploy → New deployment → ประเภท "Web app"
 *       - Execute as:  Me (บัญชีของคุณ)
 *       - Who has access:  Anyone        ← สำคัญ
 *  5. คัดลอกลิงก์ที่ลงท้ายด้วย /exec
 *  6. หน้านักศึกษา: build index.html ด้วย BACKEND_URL=ลิงก์นี้  (ดู README)
 *     หน้าเจ้าหน้าที่: ไอคอนฟันเฟือง → วางลิงก์ → บันทึก
 *
 * หมายเหตุ: ลิงก์ /exec ไม่ใช่รหัสฐานข้อมูล จึงนำไปใส่ในเว็บได้
 ****************************************************************/

var SHEET_NAME = 'attendance';
var STUDENTS_SHEET = 'students';
var SLOTS = ['d1', 'd2', 'out'];

/* อ่านรายชื่อนักศึกษาจากแท็บ students → [[id,prefix,first,last,house,program], ...] */
function readRoster_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(STUDENTS_SHEET);
  if (!sh) return [];
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, 6).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var id = String(values[i][0]).trim();
    if (!id) continue;
    rows.push([id, values[i][1], values[i][2], values[i][3], values[i][4], values[i][5]]);
  }
  return rows;
}

/* คอลัมน์: id | d1 | t_d1 | d2 | t_d2 | out | t_out | updated  (8 คอลัมน์)
   คอลัมน์เวลา (t_<slot>, updated) เก็บเป็น "วันที่-เวลา" ที่อ่านออกได้ในชีต
   ส่วนแอปจะรับ-ส่งเป็น epoch ms โดยแปลงให้อัตโนมัติ */
var ATT_COLS = 8;
var SLOT_COL = { d1: 2, d2: 4, out: 6 };   // คอลัมน์ค่าของแต่ละช่วง (เวลาอยู่คอลัมน์ถัดไป)
var TS_COLS = [3, 5, 7, 8];                // คอลัมน์ที่เป็นวันที่-เวลา
var TS_FORMAT = 'yyyy-mm-dd hh:mm:ss';

/* แปลงค่าในเซลล์เป็น epoch ms (รองรับทั้ง Date และตัวเลขเดิม) */
function toMs_(v) {
  if (v instanceof Date) return v.getTime();
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, ATT_COLS).setValues([['id', 'd1', 't_d1', 'd2', 't_d2', 'out', 't_out', 'updated']]);
    sh.setFrozenRows(1);
    // ตั้งรูปแบบคอลัมน์เวลาให้อ่านง่าย
    for (var c = 0; c < TS_COLS.length; c++) {
      sh.getRange(2, TS_COLS[c], sh.getMaxRows() - 1, 1).setNumberFormat(TS_FORMAT);
    }
  }
  return sh;
}

/* สร้างดัชนี id -> เลขแถว ครั้งเดียวต่อ request */
function readAll_(sh) {
  var last = sh.getLastRow();
  var map = {}, index = {};
  if (last < 2) return { map: map, index: index };
  var values = sh.getRange(2, 1, last - 1, ATT_COLS).getValues();
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    var id = String(v[0]).trim();
    if (!id) continue;
    map[id] = {
      d1: v[1] ? 1 : 0, t_d1: toMs_(v[2]),
      d2: v[3] ? 1 : 0, t_d2: toMs_(v[4]),
      out: v[5] ? 1 : 0, t_out: toMs_(v[6]),
      t: toMs_(v[7])
    };
    index[id] = i + 2;  // sheet row number
  }
  return { map: map, index: index };
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* GET ?action=list  → คืนข้อมูลเช็คชื่อทั้งหมด */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'list';
    if (action === 'list') {
      var sh = getSheet_();
      var all = readAll_(sh);
      return jsonOut_({ ok: true, data: all.map, count: Object.keys(all.map).length });
    }
    if (action === 'roster') {
      var rows = readRoster_();
      return jsonOut_({ ok: true, rows: rows, count: rows.length });
    }
    return jsonOut_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

/* POST {action:'mark', id, slot, val, t}  → บันทึก/แก้ไขการเช็คชื่อ 1 ช่วง */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(8000);
    var body = JSON.parse(e.postData.contents);
    if (body.action !== 'mark') return jsonOut_({ ok: false, error: 'unknown action' });

    var id = String(body.id || '').trim();
    var slot = String(body.slot || '');
    var val = body.val ? 1 : 0;
    var t = Number(body.t) || Date.now();
    if (!id || SLOTS.indexOf(slot) < 0) return jsonOut_({ ok: false, error: 'bad params' });

    var sh = getSheet_();
    var all = readAll_(sh);
    var row = all.index[id];
    var col = SLOT_COL[slot];          // คอลัมน์ค่าของช่วงนี้
    var tsCol = col + 1;               // คอลัมน์เวลาของช่วงนี้
    var when = new Date(t);            // เก็บเป็นวันที่-เวลาที่อ่านออกได้
    var tsVal = val ? when : '';       // เช็ค = บันทึกเวลา, ยกเลิก = ล้างเวลา

    if (!row) {
      // เพิ่มแถวใหม่: [id, d1, t_d1, d2, t_d2, out, t_out, updated]
      var rowData = [id, '', '', '', '', '', '', when];
      rowData[col - 1] = val;
      rowData[tsCol - 1] = tsVal;
      sh.appendRow(rowData);
      row = sh.getLastRow();
      // ตั้งรูปแบบวันที่-เวลาให้แถวใหม่
      for (var c = 0; c < TS_COLS.length; c++) {
        sh.getRange(row, TS_COLS[c]).setNumberFormat(TS_FORMAT);
      }
    } else {
      sh.getRange(row, col).setValue(val);
      sh.getRange(row, tsCol).setNumberFormat(TS_FORMAT).setValue(tsVal);
      sh.getRange(row, ATT_COLS).setNumberFormat(TS_FORMAT).setValue(when);  // updated
    }
    return jsonOut_({ ok: true, id: id, slot: slot, val: val, t: t });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}
