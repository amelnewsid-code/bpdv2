/**
 * APLIKASI DASHBOARD BPD — BACKEND (Google Apps Script)
 * =====================================================
 * Deploy sebagai Web App:
 *  1. Buka Google Sheet baru (kosong) -> Extensions > Apps Script
 *  2. Tempel file ini sebagai Code.gs
 *  3. Jalankan fungsi initSheets() sekali (dari editor, Run) untuk membuat semua sheet + header
 *  4. Deploy > New deployment > Web app
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  5. Salin URL Web App (.../exec) -> pastekan ke API_URL di index.html
 *
 * Front-end (index.html) berjalan di luar Apps Script (GitHub Pages / Blogger / mana saja)
 * dan berkomunikasi ke sini murni lewat fetch() JSON. Karena itu:
 *  - GET  dipakai untuk semua operasi baca (?action=...)
 *  - POST dipakai untuk tulis (Content-Type: text/plain agar tidak kena CORS preflight)
 */

// ============ KONFIGURASI ============
var APP_TOKEN = ''; // isi jika ingin proteksi tambahan (harus sama dgn APP_TOKEN di index.html). Kosongkan = nonaktif.

var CONFIG_SHEET = 'Input';
var USERS_SHEET = 'Users';
var USERS_HEADERS = ['Nama', 'PIN', 'Role', 'Aktif'];
var CONFIG_KEYS = [
  ['desa', 'Desa'],
  ['kecamatan', 'Kecamatan'],
  ['kabupaten', 'Kabupaten'],
  ['provinsi', 'Provinsi'],
  ['alamat', 'Alamat Kantor BPD'],
  ['telp', 'No. Telepon/WA'],
  ['email', 'Email'],
  ['ketua', 'Ketua BPD'],
  ['waket', 'Wakil Ketua BPD'],
  ['sekretaris', 'Sekretaris BPD'],
  ['anggota1', 'Anggota 1'],
  ['anggota2', 'Anggota 2'],
  ['anggota3', 'Anggota 3'],
  ['anggota4', 'Anggota 4'],
  ['anggota5', 'Anggota 5'],
  ['anggota6', 'Anggota 6'],
  ['logo_url', 'URL Logo (Kop Surat & Ikon App)'],
  ['kode_surat', 'Kode Jenis Surat (contoh: BPD)']
];

// Definisi 15 Buku Agenda BPD — sumber tunggal (dipakai server utk header sheet & dikirim ke front-end utk bentuk form)
var BUKU_DEFS = {
  1: { sheet: 'Buku1', title: 'Buku Agenda Surat Keluar', fields: [
      { k: 'tanggal_catat', l: 'Tanggal Catat', t: 'date' },
      { k: 'nomor', l: 'Nomor Surat', t: 'text', auto: true },
      { k: 'tanggal_surat', l: 'Tanggal Surat', t: 'date' },
      { k: 'hal', l: 'Hal / Isi Singkat', t: 'textarea' },
      { k: 'tujuan', l: 'Tujuan', t: 'text' },
      { k: 'keterangan', l: 'Keterangan', t: 'text' }
    ]},
  2: { sheet: 'Buku2', title: 'Buku Agenda Surat Masuk', fields: [
      { k: 'tanggal_catat', l: 'Tanggal Catat', t: 'date' },
      { k: 'nomor', l: 'Nomor Surat', t: 'text' },
      { k: 'tanggal_surat', l: 'Tanggal Surat', t: 'date' },
      { k: 'asal', l: 'Asal / Pengirim', t: 'text' },
      { k: 'hal', l: 'Hal / Isi Singkat', t: 'textarea' },
      { k: 'keterangan', l: 'Keterangan', t: 'text' }
    ]},
  3: { sheet: 'Buku3', title: 'Buku Ekspedisi', fields: [
      { k: 'tanggal_kirim', l: 'Tanggal Pengiriman', t: 'date' },
      { k: 'tgl_no_surat', l: 'Tanggal & Nomor Surat', t: 'text' },
      { k: 'hal', l: 'Hal / Isi Singkat Surat', t: 'textarea' },
      { k: 'tujuan', l: 'Tujuan Surat', t: 'text' },
      { k: 'keterangan', l: 'Keterangan', t: 'text' }
    ]},
  4: { sheet: 'Buku4', title: 'Buku Data Inventaris BPD', fields: [
      { k: 'jenis_barang', l: 'Jenis Barang/Bangunan', t: 'text' },
      { k: 'asal_apbdesa', l: 'Asal: APBDesa', t: 'text' },
      { k: 'asal_bantuan_pem', l: 'Bantuan Pemerintah', t: 'text' },
      { k: 'asal_bantuan_prov', l: 'Bantuan Provinsi', t: 'text' },
      { k: 'asal_bantuan_kab', l: 'Bantuan Kab/Kota', t: 'text' },
      { k: 'awal_baik', l: 'Awal Tahun: Baik', t: 'number' },
      { k: 'awal_rusak', l: 'Awal Tahun: Rusak', t: 'number' },
      { k: 'hapus_rusak', l: 'Penghapusan: Rusak', t: 'text' },
      { k: 'hapus_dijual', l: 'Penghapusan: Dijual', t: 'text' },
      { k: 'hapus_sumbang', l: 'Penghapusan: Disumbangkan', t: 'text' },
      { k: 'tgl_hapus', l: 'Tanggal Penghapusan', t: 'date' },
      { k: 'akhir_baik', l: 'Akhir Tahun: Baik', t: 'number' },
      { k: 'akhir_rusak', l: 'Akhir Tahun: Rusak', t: 'number' },
      { k: 'keterangan', l: 'Keterangan', t: 'text' }
    ]},
  5: { sheet: 'Buku5', title: 'Buku Laporan Keuangan', fields: [
      { k: 'tanggal', l: 'Tanggal', t: 'date' },
      { k: 'uraian', l: 'Uraian', t: 'text' },
      { k: 'penerimaan', l: 'Penerimaan (Rp)', t: 'number' },
      { k: 'pengeluaran', l: 'Pengeluaran (Rp)', t: 'number' }
    ]},
  6: { sheet: 'Buku6', title: 'Buku Tamu BPD', fields: [
      { k: 'tanggal', l: 'Tanggal', t: 'date' },
      { k: 'nama', l: 'Nama', t: 'text' },
      { k: 'jabatan', l: 'Jabatan', t: 'text' },
      { k: 'alamat', l: 'Alamat', t: 'text' },
      { k: 'keperluan', l: 'Keperluan', t: 'text' }
    ]},
  7: { sheet: 'Buku7', title: 'Buku Data Anggota BPD', fields: [
      { k: 'nama', l: 'Nama Lengkap', t: 'text' },
      { k: 'nip', l: 'NIP', t: 'text' },
      { k: 'jk', l: 'Jenis Kelamin', t: 'select', opts: ['Laki-laki', 'Perempuan'] },
      { k: 'ttl', l: 'Tempat, Tanggal Lahir', t: 'text' },
      { k: 'agama', l: 'Agama', t: 'text' },
      { k: 'jabatan', l: 'Jabatan', t: 'text' },
      { k: 'pendidikan', l: 'Pendidikan Terakhir', t: 'text' },
      { k: 'sk_angkat', l: 'No. & Tgl. SK Pengangkatan', t: 'text' },
      { k: 'sk_berhenti', l: 'No. & Tgl. SK Pemberhentian', t: 'text' },
      { k: 'keterangan', l: 'Keterangan', t: 'text' }
    ]},
  8: { sheet: 'Buku8', title: 'Buku Data Kegiatan BPD', fields: [
      { k: 'tanggal', l: 'Hari/Tanggal', t: 'date' },
      { k: 'jenis_kegiatan', l: 'Jenis Kegiatan', t: 'text' },
      { k: 'pelaksana', l: 'Pelaksana', t: 'text' },
      { k: 'agenda_hasil', l: 'Agenda dan Hasil Kegiatan', t: 'textarea' },
      { k: 'keterangan', l: 'Keterangan', t: 'text' }
    ]},
  9: { sheet: 'Buku9', title: 'Buku Data Aspirasi Masyarakat', fields: [
      { k: 'tanggal', l: 'Hari/Tanggal', t: 'date' },
      { k: 'penyampai', l: 'Nama/Lembaga Penyampai', t: 'text' },
      { k: 'aspirasi', l: 'Aspirasi yang Disampaikan', t: 'textarea' },
      { k: 'tindak_lanjut', l: 'Tindak Lanjut', t: 'textarea' }
    ]},
  10: { sheet: 'Buku10', title: 'Buku Daftar Hadir Rapat BPD', fields: [
      { k: 'nama', l: 'Nama', t: 'text' },
      { k: 'jabatan', l: 'Jabatan', t: 'text' },
      { k: 'ttd', l: 'Status Tanda Tangan', t: 'select', opts: ['Hadir', 'Tidak Hadir'] },
      { k: 'keterangan', l: 'Keterangan', t: 'text' }
    ]},
  11: { sheet: 'Buku11', title: 'Buku Notulen Rapat BPD', fields: [
      { k: 'tanggal', l: 'Hari/Tanggal', t: 'date' },
      { k: 'materi', l: 'Materi Rapat', t: 'text' },
      { k: 'peserta', l: 'Peserta', t: 'text' },
      { k: 'ringkasan', l: 'Ringkasan Pembahasan', t: 'textarea' }
    ]},
  12: { sheet: 'Buku12', title: 'Buku Data Peraturan/Keputusan BPD', fields: [
      { k: 'no_tgl', l: 'Nomor, Tanggal Peraturan/Keputusan', t: 'text' },
      { k: 'tentang', l: 'Tentang', t: 'text' },
      { k: 'uraian', l: 'Uraian Singkat', t: 'textarea' },
      { k: 'keterangan', l: 'Keterangan', t: 'text' }
    ]},
  13: { sheet: 'Buku13', title: 'Buku Data Peraturan Desa', fields: [
      { k: 'no_tgl', l: 'Nomor & Tgl. Peraturan Desa', t: 'text' },
      { k: 'tentang', l: 'Tentang', t: 'text' },
      { k: 'uraian', l: 'Uraian Singkat', t: 'textarea' },
      { k: 'no_tgl_sepakat', l: 'Nomor & Tgl. Kesepakatan', t: 'text' },
      { k: 'keterangan', l: 'Keterangan', t: 'text' }
    ]},
  14: { sheet: 'Buku14', title: 'Buku Keputusan Musyawarah Desa', fields: [
      { k: 'tanggal', l: 'Hari/Tanggal', t: 'date' },
      { k: 'tentang', l: 'Tentang/Hal Strategis', t: 'text' },
      { k: 'pokok', l: 'Pokok-Pokok Keputusan', t: 'textarea' },
      { k: 'keterangan', l: 'Keterangan', t: 'text' }
    ]},
  15: { sheet: 'Buku15', title: 'Buku Keputusan Perencanaan Pembangunan Desa', fields: [
      { k: 'tanggal', l: 'Hari/Tanggal', t: 'date' },
      { k: 'pokok', l: 'Pokok-Pokok Usulan/Kegiatan', t: 'textarea' },
      { k: 'keterangan', l: 'Keterangan', t: 'text' }
    ]}
};

var ROMAWI_BULAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

// ============ ENTRY POINTS ============
function doGet(e) {
  try {
    var action = e.parameter.action || 'ping';
    if (!checkToken_(e.parameter.token)) return jsonOut_({ ok: false, error: 'Token tidak valid' });

    switch (action) {
      case 'ping': return jsonOut_({ ok: true, msg: 'BPD API aktif' });
      case 'getMeta': return jsonOut_({ ok: true, data: { bukuDefs: BUKU_DEFS, configKeys: CONFIG_KEYS } });
      case 'getConfig': return jsonOut_({ ok: true, data: getConfig_() });
      case 'getBuku': return jsonOut_({ ok: true, data: getBukuData_(Number(e.parameter.id)) });
      case 'nextNomor': return jsonOut_({ ok: true, data: nextNomorSurat_(e.parameter.tanggal) });
      case 'dashboard': return jsonOut_({ ok: true, data: getDashboardSummary_() });
      case 'listUsers': return jsonOut_({ ok: true, data: getUsers_() });
      default: return jsonOut_({ ok: false, error: 'Aksi tidak dikenal: ' + action });
    }
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var action = body.action;
    // login tidak wajib token app (dipakai sebelum sesi ada)
    if (action !== 'login' && !checkToken_(body.token)) return jsonOut_({ ok: false, error: 'Token tidak valid' });

    switch (action) {
      case 'login': return jsonOut_(loginUser_(body.pin));
      case 'saveConfig': saveConfig_(body.data); return jsonOut_({ ok: true });
      case 'addRow': return jsonOut_({ ok: true, data: addRow_(Number(body.id), body.data) });
      case 'updateRow': updateRow_(Number(body.id), Number(body.rowIndex), body.data); return jsonOut_({ ok: true });
      case 'deleteRow': deleteRow_(Number(body.id), Number(body.rowIndex)); return jsonOut_({ ok: true });
      case 'addUser': addUser_(body.data); return jsonOut_({ ok: true });
      case 'updateUser': updateUser_(Number(body.rowIndex), body.data); return jsonOut_({ ok: true });
      case 'deleteUser': deleteUser_(Number(body.rowIndex)); return jsonOut_({ ok: true });
      default: return jsonOut_({ ok: false, error: 'Aksi tidak dikenal: ' + action });
    }
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function checkToken_(t) {
  if (!APP_TOKEN) return true;
  return t === APP_TOKEN;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ============ SETUP ============
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var cfg = ss.getSheetByName(CONFIG_SHEET) || ss.insertSheet(CONFIG_SHEET);
  cfg.clear();
  cfg.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
  var rows = CONFIG_KEYS.map(function (c) { return [c[0], '']; });
  cfg.getRange(2, 1, rows.length, 2).setValues(rows);
  cfg.setFrozenRows(1);

  Object.keys(BUKU_DEFS).forEach(function (id) {
    var def = BUKU_DEFS[id];
    var sh = ss.getSheetByName(def.sheet) || ss.insertSheet(def.sheet);
    sh.clear();
    var headers = def.fields.map(function (f) { return f.l; });
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  });

  var users = ss.getSheetByName(USERS_SHEET) || ss.insertSheet(USERS_SHEET);
  if (users.getLastRow() < 1) {
    users.getRange(1, 1, 1, USERS_HEADERS.length).setValues([USERS_HEADERS]);
    users.appendRow(['Admin', '123456', 'Admin', true]);
  }
  users.setFrozenRows(1);

  // Buang sheet default "Sheet1" jika masih ada & kosong
  var def1 = ss.getSheetByName('Sheet1');
  if (def1 && ss.getSheets().length > 1) ss.deleteSheet(def1);

  SpreadsheetApp.flush();
  return 'Setup selesai: ' + (Object.keys(BUKU_DEFS).length + 2) + ' sheet siap. User admin awal: PIN 123456 (segera ganti).';
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet ' + name + ' belum dibuat. Jalankan initSheets() dulu.');
  return sh;
}

// ============ CONFIG ============
function getConfig_() {
  var sh = getSheet_(CONFIG_SHEET);
  var vals = sh.getDataRange().getValues();
  var out = {};
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0]) out[vals[i][0]] = vals[i][1];
  }
  return out;
}

function saveConfig_(data) {
  var sh = getSheet_(CONFIG_SHEET);
  var vals = sh.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < vals.length; i++) map[vals[i][0]] = i + 1;

  Object.keys(data).forEach(function (k) {
    if (map[k]) {
      sh.getRange(map[k], 2).setValue(data[k]);
    } else {
      sh.appendRow([k, data[k]]);
    }
  });
}

// ============ CRUD GENERIK ============
function getBukuData_(id) {
  var def = BUKU_DEFS[id];
  if (!def) throw new Error('Buku ' + id + ' tidak ditemukan');
  var sh = getSheet_(def.sheet);
  var lastRow = sh.getLastRow();
  var lastCol = def.fields.length;
  var rows = [];
  if (lastRow > 1) {
    var vals = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    for (var i = 0; i < vals.length; i++) {
      var isEmpty = vals[i].every(function (v) { return v === '' || v === null; });
      if (isEmpty) continue;
      var obj = { _row: i + 2 };
      def.fields.forEach(function (f, idx) {
        var v = vals[i][idx];
        if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd');
        obj[f.k] = v;
      });
      rows.push(obj);
    }
  }
  return { title: def.title, fields: def.fields, rows: rows };
}

function addRow_(id, data) {
  var def = BUKU_DEFS[id];
  var sh = getSheet_(def.sheet);
  var rowArr = def.fields.map(function (f) { return data[f.k] !== undefined ? data[f.k] : ''; });
  sh.appendRow(rowArr);
  return { _row: sh.getLastRow() };
}

function updateRow_(id, rowIndex, data) {
  var def = BUKU_DEFS[id];
  var sh = getSheet_(def.sheet);
  var rowArr = def.fields.map(function (f) { return data[f.k] !== undefined ? data[f.k] : ''; });
  sh.getRange(rowIndex, 1, 1, rowArr.length).setValues([rowArr]);
}

function deleteRow_(id, rowIndex) {
  var def = BUKU_DEFS[id];
  var sh = getSheet_(def.sheet);
  sh.deleteRow(rowIndex);
}

// ============ NOMOR SURAT OTOMATIS ============
// Format: 001/BPD/PEGANDEKAN/III/2026  (angka romawi bulan mengikuti kaidah baku I..XII)
function nextNomorSurat_(tanggalStr) {
  var tgl = tanggalStr ? new Date(tanggalStr) : new Date();
  var bulan = tgl.getMonth(); // 0-11
  var tahun = tgl.getFullYear();

  var def = BUKU_DEFS[1];
  var sh = getSheet_(def.sheet);
  var lastRow = sh.getLastRow();
  var count = 0;

  if (lastRow > 1) {
    var idxTglSurat = def.fields.findIndex(function (f) { return f.k === 'tanggal_surat'; });
    var vals = sh.getRange(2, 1, lastRow - 1, def.fields.length).getValues();
    vals.forEach(function (r) {
      var d = r[idxTglSurat];
      if (d instanceof Date && d.getMonth() === bulan && d.getFullYear() === tahun) count++;
    });
  }

  var seq = count + 1;
  var seqStr = (seq < 100 ? ('0' + seq).slice(-2) : String(seq));
  seqStr = seq < 10 ? '00' + seq : (seq < 100 ? '0' + seq : String(seq));

  var cfg = getConfig_();
  var kode = (cfg.kode_surat || 'BPD').toUpperCase();
  var desa = (cfg.desa || 'DESA').toUpperCase();
  var romawi = ROMAWI_BULAN[bulan];

  return {
    nomor: seqStr + '/' + kode + '/' + desa + '/' + romawi + '/' + tahun,
    urutan: seq,
    bulan: bulan + 1,
    tahun: tahun
  };
}

// ============ RINGKASAN DASHBOARD ============
function getDashboardSummary_() {
  var cfg = getConfig_();
  var out = { desa: cfg.desa || '', anggota: 0, suratKeluarBulanIni: 0, suratMasukBulanIni: 0, kegiatanBulanIni: 0, saldo: 0 };

  var now = new Date();
  var bln = now.getMonth(), thn = now.getFullYear();

  // anggota
  try {
    var d7 = getBukuData_(7);
    out.anggota = d7.rows.filter(function (r) { return r.nama; }).length;
  } catch (e) {}

  // surat keluar bulan ini
  try {
    var d1 = getBukuData_(1);
    out.suratKeluarBulanIni = d1.rows.filter(function (r) {
      if (!r.tanggal_surat) return false;
      var d = new Date(r.tanggal_surat);
      return d.getMonth() === bln && d.getFullYear() === thn;
    }).length;
  } catch (e) {}

  // surat masuk bulan ini
  try {
    var d2 = getBukuData_(2);
    out.suratMasukBulanIni = d2.rows.filter(function (r) {
      if (!r.tanggal_surat) return false;
      var d = new Date(r.tanggal_surat);
      return d.getMonth() === bln && d.getFullYear() === thn;
    }).length;
  } catch (e) {}

  // kegiatan bulan ini
  try {
    var d8 = getBukuData_(8);
    out.kegiatanBulanIni = d8.rows.filter(function (r) {
      if (!r.tanggal) return false;
      var d = new Date(r.tanggal);
      return d.getMonth() === bln && d.getFullYear() === thn;
    }).length;
  } catch (e) {}

  // saldo keuangan (total)
  try {
    var d5 = getBukuData_(5);
    var masuk = 0, keluar = 0;
    d5.rows.forEach(function (r) {
      masuk += Number(r.penerimaan) || 0;
      keluar += Number(r.pengeluaran) || 0;
    });
    out.saldo = masuk - keluar;
    out.totalPenerimaan = masuk;
    out.totalPengeluaran = keluar;
  } catch (e) {}

  return out;
}

// ============ LOGIN & MANAJEMEN PENGGUNA (PIN) ============
function getUsers_() {
  var sh = getSheet_(USERS_SHEET);
  var lastRow = sh.getLastRow();
  var out = [];
  if (lastRow > 1) {
    var vals = sh.getRange(2, 1, lastRow - 1, USERS_HEADERS.length).getValues();
    vals.forEach(function (r, i) {
      if (!r[0]) return;
      out.push({ _row: i + 2, nama: r[0], role: r[2], aktif: r[3] === true || r[3] === 'TRUE' || r[3] === 1 });
      // PIN sengaja tidak dikirim ke client demi keamanan minimal
    });
  }
  return out;
}

function loginUser_(pin) {
  if (!pin) return { ok: false, error: 'PIN wajib diisi' };
  var sh = getSheet_(USERS_SHEET);
  var lastRow = sh.getLastRow();
  if (lastRow > 1) {
    var vals = sh.getRange(2, 1, lastRow - 1, USERS_HEADERS.length).getValues();
    for (var i = 0; i < vals.length; i++) {
      var r = vals[i];
      var aktif = r[3] === true || r[3] === 'TRUE' || r[3] === 1;
      if (String(r[1]) === String(pin) && aktif) {
        return { ok: true, data: { nama: r[0], role: r[2] } };
      }
    }
  }
  return { ok: false, error: 'PIN salah atau akun tidak aktif' };
}

function addUser_(data) {
  var sh = getSheet_(USERS_SHEET);
  if (!data.nama || !data.pin) throw new Error('Nama dan PIN wajib diisi');
  if (!/^[0-9]{4,8}$/.test(String(data.pin))) throw new Error('PIN harus 4-8 digit angka');
  sh.appendRow([data.nama, String(data.pin), data.role || 'Petugas', data.aktif !== false]);
}

function updateUser_(rowIndex, data) {
  var sh = getSheet_(USERS_SHEET);
  if (data.pin && !/^[0-9]{4,8}$/.test(String(data.pin))) throw new Error('PIN harus 4-8 digit angka');
  var current = sh.getRange(rowIndex, 1, 1, USERS_HEADERS.length).getValues()[0];
  var row = [
    data.nama || current[0],
    data.pin ? String(data.pin) : current[1],
    data.role || current[2],
    data.aktif !== undefined ? data.aktif : current[3]
  ];
  sh.getRange(rowIndex, 1, 1, USERS_HEADERS.length).setValues([row]);
}

function deleteUser_(rowIndex) {
  var sh = getSheet_(USERS_SHEET);
  if (sh.getLastRow() <= 2) throw new Error('Minimal harus ada satu pengguna admin tersisa');
  sh.deleteRow(rowIndex);
}
