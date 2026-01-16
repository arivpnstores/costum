/**
 * PGETUNNEL DIGITAL BOT - AUTO ORDER PULSA/KUOTA ONLY
 * Features: Digital Product Management, QRIS Auto, Admin Monitoring, User Account Log, Saldo Management.
 * Removed: VPN/SSH/Server Management, Trial/Renew, Sewa Script, Custom Domain Pointing, Jual Source Code, Auto Stock, Reseller/Member Roles, TopUp Bonus, Weekly Reward, Riwayat Pembelian (My Accounts), Admin List All.
 * Bot ini dioptimalkan HANYA untuk layanan Jual Pulsa, Kuota, dan Produk Digital via API H2H.
 * MODIFIKASI TERAKHIR: Tampilan produk menggunakan tombol langsung (pull button) dan tombol batal.
 * =========================================================================
 * 🛠️ PERBAIKAN KRITIS & OPTIMASI:
 * 1. FIX KRITIS: Logika Sesi TopUp (Mengatasi Saldo 0 dengan Direct Update dan Logging).
 * 2. FIX PERMINTAAN: Menetapkan default 2 kolom per baris untuk tombol produk digital (via ui_config).
 * 3. Menghapus Pulsa Transfer dan Nominal Bebas dari categoryMap.
 * 4. Tambah Fitur: Manajemen Produk Digital Admin (Add/Delete/Edit Price/Mass Price Update).
 * 5. Tambah Fitur: Pengembalian Saldo Otomatis jika Transaksi Digital Gagal/Error.
 * 6. FITUR BARU: Admin Clear All Sessions untuk stabilitas bot.
 * 7. OPTIMASI: Menggunakan PRAGMA WAL untuk Database SQLite.
 * 8. STABILITY: Added connection pooling, better error handling, and session cleanup.
 * 9. UI/UX: Tampilan produk berubah dari daftar bernomor menjadi tombol produk langsung (pull button).
 * 10. UI/UX: Menambahkan tombol "Batalkan" di semua form input untuk kemudahan pengguna.
 * 🔥 OPTIMASI CEK MUTASI: Menggunakan Keep-Alive Agent, Timeout 5s, Interval 1.5s.
 * =========================================================================
 */

// --- PERFORMANCE TUNING ---
// 🔥 MODE SPEED: Mengatur Thread Pool Size untuk Operasi I/O (Database)
process.env.UV_THREADPOOL_SIZE = 100; 

const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const { Telegraf, session } = require('telegraf');
const app = express();
const axios = require('axios');
const winston = require('winston');
const fetch = require("node-fetch");
const FormData = require("form-data");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 🔥 OPTIMASI CEK MUTASI: Import HTTP/HTTPS Agent
const http = require('http');
const https = require('https');

// --- KONFIGURASI ---
let vars;
const SETTING_FILE = './seting.json';
try {
    if (!fs.existsSync(SETTING_FILE)) {
        throw new Error(`File '${SETTING_FILE}' tidak ditemukan.`);
    }
    vars = JSON.parse(fs.readFileSync(SETTING_FILE, 'utf8'));
} catch (e) {
    console.error(`❌ Error Fatal Saat Membaca Konfigurasi: ${e.message}`);
    console.error("Pastikan file 'seting.json' ada dan formatnya benar (JSON valid).");
    process.exit(1);
}

const BUTTON_CONFIG_FILE = './button_config.json';
const BOT_TOKEN = vars.BOT_TOKEN;
const port = vars.PORT || 50123;
const ADMIN = vars.USER_ID;
// Cek jika DATA_QRIS kosong, berikan warning
const DATA_QRIS = vars.DATA_QRIS || 'INVALID_QRIS_STRING_PLEASE_CHECK_SETTING_JSON';

// --- KONFIGURASI API ---
const auth_paymet_getway = vars.auth_paymet_getway || 'INVALID_QRIS_STRING_PLEASE_CHECK_SETTING_JSON';
const ID_GRUP_NOTIP = vars.ID_GRUP_NOTIP; // Tambahkan baris ini

// [KONFIGURASI OKE DIGITAL GROUP]
const OKEC_MEMBER_ID = vars.OKEC_MEMBER_ID;
const OKEC_PIN = vars.OKEC_PIN;
const OKEC_PASSWORD = vars.OKEC_PASSWORD;
const OKEC_H2H_URL = 'https://h2h.okeconnect.com/trx'; 

const pulsaChildrenMap = {
  pulsa_telkomsel: { header: 'TELKOMSEL', icon: '📱' },
  pulsa_indosat:   { header: 'INDOSAT',   icon: '📱' },
  pulsa_xl:        { header: 'XL', icon: '📱' },
  pulsa_tri:       { header: 'TRI (3)',   icon: '📱' },
  pulsa_smartfren: { header: 'SMARTFREN', icon: '📱' },
  pulsa_axis:      { header: 'AXIS',      icon: '📱' },
  pulsa_byu:       { header: 'BY.U',      icon: '📱' },
};

const kuotaChildrenMap = {
  kuota_telkomsel: { header: 'TELKOMSEL', icon: '📶' },
  kuota_indosat:   { header: 'INDOSAT',   icon: '📶' },
  kuota_xl:           { header: 'XL', icon: '📶' },
  kuota_tri:       { header: 'TRI (3)',   icon: '📶' },
  kuota_smartfren: { header: 'SMARTFREN', icon: '📶' },
  kuota_axis:      { header: 'AXIS',      icon: '📶' },
  kuota_byu:       { header: 'BY.U',      icon: '📶' },
};

const gameChildrenMap = {
  game_ff: { header: 'FREE FIRE', icon: '🪖' },
  game_ml: { header: 'MOBILE LEGENDS', icon: '⚔️' },
};

const plnChildrenMap = {
  pln_token: { header: 'TOKEN LISTRIK', icon: '⚡' }
};

const ewalletChildrenMap = {
  ewallet_dana:      { header: 'DANA',      icon: '🔵' },
  ewallet_gopay:     { header: 'GOPAY',     icon: '🟢' },
  ewallet_ovo:       { header: 'OVO',       icon: '🟣' },
  ewallet_shopeepay: { header: 'SHOPEEPAY', icon: '🟠' },
  ewallet_linkaja:   { header: 'LINKAJA',   icon: '🔴' },
};
  
if (!BOT_TOKEN) {
    console.error("❌ ERROR: BOT_TOKEN tidak ditemukan di seting.json. Bot gagal berjalan.");
    process.exit(1);
}
if (!ADMIN) {
    console.warn("⚠️ WARNING: USER_ID Admin tidak ditemukan. Beberapa fitur admin mungkin tidak berfungsi.");
}

const bot = new Telegraf(BOT_TOKEN);

// Pastikan adminIds diproses menjadi array angka
const adminIds = String(ADMIN || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

// 🔥 OPTIMASI CEK MUTASI: Setup Keep-Alive Agent
// Ini membuat koneksi ke API tidak putus-nyambung, mempercepat request berikutnya
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 5, maxFreeSockets: 2 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 5, maxFreeSockets: 2 });

// --- LOGGER ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
    transports: [
    new winston.transports.File({ filename: 'bot-error.log', level: 'error' }), 
    new winston.transports.File({ filename: 'bot-combined.log' }),             
  ],
}); 

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================================================================
// 🔥🔥🔥 DATABASE SYSTEM 🔥🔥🔥
// =========================================================================

const dbDir = fs.existsSync('/home/container') ? '/home/container' : __dirname;
const dbPath = path.join(dbDir, 'sellppob.db');

// 🔥 STABILITY: Connection pooling and retry logic
const dbConfig = {
    file: dbPath,
    maxConnections: 10,
    connectionTimeout: 30000,
    busyTimeout: 30000
};

let dbPool = [];
let dbConnectionIndex = 0;

function getDbConnection() {
    if (dbPool.length < dbConfig.maxConnections) {
        const conn = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) { 
                logger.error('❌ DB Error Fatal:', err.message); 
                return;
            }
        });
        
        // 🔥 MODE SPEED: Optimasi PRAGMA SQLite
        conn.serialize(() => {
            conn.run("PRAGMA journal_mode = WAL;"); 
            conn.run("PRAGMA synchronous = NORMAL;"); 
            conn.run("PRAGMA temp_store = MEMORY;"); 
            conn.run("PRAGMA cache_size = -64000;"); 
            conn.run(`PRAGMA busy_timeout = ${dbConfig.busyTimeout}`);
        });
        
        dbPool.push(conn);
        return conn;
    } else {
        const conn = dbPool[dbConnectionIndex % dbConfig.maxConnections];
        dbConnectionIndex++;
        return conn;
    }
}

// 🔥 MODE SPEED: Mengubah semua operasi DB menjadi Promise untuk Async/Await
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    const db = getDbConnection();
    const timeout = setTimeout(() => {
        logger.error(`DB GET TIMEOUT: ${sql}`);
        reject(new Error('Database operation timeout'));
    }, dbConfig.connectionTimeout);
    
    db.get(sql, params, (err, row) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve(row);
    });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    const db = getDbConnection();
    const timeout = setTimeout(() => {
        logger.error(`DB ALL TIMEOUT: ${sql}`);
        reject(new Error('Database operation timeout'));
    }, dbConfig.connectionTimeout);
    
    db.all(sql, params, (err, rows) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve(rows);
    });
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    const db = getDbConnection();
    const timeout = setTimeout(() => {
        logger.error(`DB RUN TIMEOUT: ${sql}`);
        reject(new Error('Database operation timeout'));
    }, dbConfig.connectionTimeout);
    
    db.run(sql, params, function(err) { 
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve(this); 
    });
});

async function ensureColumn(tableName, columnName, columnType, defaultValue = null) {
    try {
        const tableInfo = await dbAll(`PRAGMA table_info(${tableName})`);
        if (!tableInfo.some(col => col.name === columnName)) {
            let query = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
            if (defaultValue !== null) query += ` DEFAULT ${defaultValue}`;
            await dbRun(query);
            logger.info(`✅ DB Migration: Kolom ${columnName} ditambahkan ke ${tableName}.`);
        }
    } catch (e) { 
        logger.error(`Error ensuring column ${columnName} in table ${tableName}:`, e);
    }
}

async function migrateDigitalProductsTable() {
    try {
        // Kolom harus dipastikan ada
        await dbRun(`CREATE TABLE IF NOT EXISTS digital_products (id INTEGER PRIMARY KEY AUTOINCREMENT, product_code TEXT UNIQUE, product_name TEXT, category TEXT, price INTEGER DEFAULT 0)`);
        await ensureColumn('digital_products', 'product_code', 'TEXT', null);
        await ensureColumn('digital_products', 'product_name', 'TEXT', null);
        await ensureColumn('digital_products', 'category', 'TEXT', null);
        await ensureColumn('digital_products', 'price', 'INTEGER', 0);
        logger.info("✅ Migrasi digital_products selesai (kolom ditambahkan jika hilang).");
    } catch (e) {
        logger.error("Error migrating digital_products table:", e);
    }
}

async function initDatabase() {
    try {
        const tables = [
            `CREATE TABLE IF NOT EXISTS pending_deposits (unique_code TEXT PRIMARY KEY, user_id INTEGER, username TEXT, amount INTEGER, original_amount INTEGER, timestamp INTEGER, status TEXT, qr_message_id INTEGER)`,
            `CREATE TABLE IF NOT EXISTS log_penjualan (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, username TEXT, nama_server TEXT, tipe_akun TEXT, harga INTEGER, masa_aktif_hari INTEGER, waktu_transaksi TEXT, action_type TEXT, user_role TEXT DEFAULT 'member')`, 
            // ui_config sekarang hanya menyimpan konfigurasi UI/Global
            `CREATE TABLE IF NOT EXISTS ui_config (id INTEGER PRIMARY KEY CHECK (id = 1), maintenance_mode INTEGER DEFAULT 0)`, 
            `CREATE TABLE IF NOT EXISTS topup_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, username TEXT, amount INTEGER, method TEXT, waktu TEXT)`,
            `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE, saldo INTEGER DEFAULT 0, CONSTRAINT unique_user_id UNIQUE (user_id))`,
        ];

        for (const sql of tables) await dbRun(sql);
        
        // Pastikan ID 1 ada
        await dbRun(`INSERT OR IGNORE INTO ui_config (id, maintenance_mode) VALUES (1, 0)`); 
        
        // Pastikan kolom migrasi terbaru ada
        await migrateDigitalProductsTable();
        
        await ensureColumn('ui_config', 'maintenance_mode', 'INTEGER', 0);
        await ensureColumn('log_penjualan', 'user_role', 'TEXT', "'member'");
        // FIX PERMINTAAN: Tambahkan kolom untuk mengatur jumlah kolom tombol produk digital
        await ensureColumn('ui_config', 'digital_product_cols', 'INTEGER', 2); // Default ke 2 kolom
        
        // Hapus kolom lama yang tidak relevan dengan bot digital
        try {
             await dbRun('ALTER TABLE ui_config DROP COLUMN show_trial_button');
             await dbRun('ALTER TABLE ui_config DROP COLUMN show_sewa_script_button');
        } catch (e) {/* ignore error if columns don't exist */}

        logger.info("✅ Database Optimized & Ready.");
        await initGlobalCache();
    } catch (e) {
        logger.error("Error initializing database:", e);
        throw e;
    }
}

// =========================================================================
// 🚀🚀🚀 RAM CACHE SYSTEM 🚀🚀🚀
// =========================================================================
// 🔥 MODE SPEED: Menyimpan data yang sering diakses di RAM (Global Cache)
let userState = {}; // Ubah dari const ke let agar bisa di-reset (Clear All Sessions)
global.depositState = {};
global.pendingDeposits = {}; 
global.processedTransactions = new Set();
// 🔥 STATUS API QRIS - New Cache
global.apiStatus = { isOnline: true, lastCheck: 0 }; 

global.fastCache = {
    adminUsername: 'Admin', 
    uiConfig: { maintenance_mode: 0, digital_product_cols: 2 }, // Default ke 2
    buttonConfig: { topup_saldo: true },
    isInitialized: false,
    globalStats: { omset: 0, total_trx: 0, total_users: 0 } 
};

// 🔥 STABILITY: Session cleanup
function cleanupExpiredSessions() {
    const now = Date.now();
    const sessionTimeout = 60 * 60 * 1000; // 30 minutes
    
    // Clean userState
    Object.keys(userState).forEach(userId => {
        if (userState[userId].timestamp && (now - userState[userId].timestamp > sessionTimeout)) {
            delete userState[userId];
        }
    });
    
    // Clean depositState
    Object.keys(global.depositState).forEach(userId => {
        if (global.depositState[userId].timestamp && (now - global.depositState[userId].timestamp > sessionTimeout)) {
            delete global.depositState[userId];
        }
    });
    
    // Clean processedTransactions (keep only last 1000)
    if (global.processedTransactions.size > 1000) {
        const array = Array.from(global.processedTransactions);
        global.processedTransactions = new Set(array.slice(-500));
    }
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredSessions, 10 * 60 * 1000);

// 🔥 MODE SPEED: Refresh statistik latar belakang setiap 5 menit 
async function refreshGlobalStats() {
    try {
        const [stats, usrCount] = await Promise.all([
            dbGet('SELECT SUM(harga) as omset, COUNT(*) as total_trx FROM log_penjualan'),
            dbGet('SELECT COUNT(id) as c FROM users')
        ]);
        global.fastCache.globalStats.omset = stats?.omset || 0;
        global.fastCache.globalStats.total_trx = stats?.total_trx || 0;
        global.fastCache.globalStats.total_users = usrCount?.c || 0;
    } catch(e) { 
        logger.error("Error refreshing global stats", e); 
    }
}
setInterval(refreshGlobalStats, 300000); 

async function initGlobalCache() {
    try {
        let adminChat = { username: 'Admin' };
        if (adminIds.length > 0) {
             adminChat = await bot.telegram.getChat(adminIds[0]).catch(() => ({ username: 'Admin' }));
        }
        
        global.fastCache.adminUsername = adminChat.username || 'Admin';
        
        const uiRow = await dbGet('SELECT maintenance_mode, digital_product_cols FROM ui_config WHERE id = 1'); 
        if (uiRow) global.fastCache.uiConfig = uiRow;
        
        try { 
            if (fs.existsSync(BUTTON_CONFIG_FILE)) {
                global.fastCache.buttonConfig = JSON.parse(fs.readFileSync(BUTTON_CONFIG_FILE, 'utf8')); 
            }
        } catch (e) { 
             logger.error(`Error membaca ${BUTTON_CONFIG_FILE}: ${e.message}. Menggunakan default.`);
             fs.writeFileSync(BUTTON_CONFIG_FILE, JSON.stringify(global.fastCache.buttonConfig, null, 2));
        }
        
        await refreshGlobalStats();
        
        global.fastCache.isInitialized = true;
    } catch (e) {
        logger.error("Error saat inisialisasi Global Cache:", e.message);
    }
}

// Restore Pending Deposits
(async () => {
    try {
        await new Promise(r => setTimeout(r, 1000));
        const rows = await dbAll('SELECT * FROM pending_deposits WHERE status = "pending"');
        rows.forEach(row => {
            global.pendingDeposits[row.unique_code] = {
                amount: row.amount,
                originalAmount: row.original_amount, // FIX: Menggunakan original_amount
                userId: row.user_id,
                username: row.username,
                timestamp: row.timestamp,
                qrMessageId: row.qr_message_id
            };
        });
    } catch (e) {
        logger.error("Error saat memulihkan Deposit Pending:", e.message);
    }
})();

// =========================================================================
// 🌐 FUNGSI CHECK STATUS API MUTASI
// =========================================================================

async function checkApiStatus() {
  // config wajib
  if (!AUTH_USER || !AUTH_TOKEN || !WEB_MUTASI) {
    global.apiStatus.isOnline = false;
    return false;
  }

  // cek tiap 30 detik saja
  if (Date.now() - global.apiStatus.lastCheck < 30_000) {
    return global.apiStatus.isOnline;
  }

  global.apiStatus.lastCheck = Date.now();

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      // 🔥 pindah cek pembayaran ke OrderKuota
      const qrisData = await cekQRISOrderKuota();

      const ok =
        qrisData &&
        qrisData.success === true &&
        qrisData.qris_history &&
        qrisData.qris_history.success === true &&
        Array.isArray(qrisData.qris_history.results);

      if (ok) {
        global.apiStatus.isOnline = true;
        logger.info('🌐 OrderKuota API: ONLINE');
        return true;
      }

      logger.warn(
        `🌐 OrderKuota API invalid response (attempt ${attempt}): ${JSON.stringify(qrisData).slice(0, 300)}`
      );
    } catch (err) {
      logger.error(
        `🌐 OrderKuota API check failed (attempt ${attempt}):`,
        err?.message || err
      );
    }

    // delay retry
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  global.apiStatus.isOnline = false;
  logger.error(`🌐 OrderKuota API: OFFLINE after ${maxRetries} attempts`);
  return false;
}

// =========================================================================
// 🛒 FUNGSI DIGITAL PRODUCT (OKECONNECT H2H)
// =========================================================================

/**
 * Memproses pembelian produk digital (Pulsa/Data/Token) menggunakan H2H HTTP GET.
 */
async function processDigitalProduct(productCode, destination, refId) {
    if (!OKEC_MEMBER_ID || !OKEC_PIN || !OKEC_PASSWORD) {
        return { status: 'ERROR', message: "❌ Konfigurasi Okeconnect (memberID/PIN/Password) hilang di seting.json." };
    }

    const url = `${OKEC_H2H_URL}?product=${productCode}&dest=${destination}&refID=${refId}&memberID=${OKEC_MEMBER_ID}&pin=${OKEC_PIN}&password=${OKEC_PASSWORD}`;

    try {
        // 🔥 STABILITY: Add retry logic for API calls
        const maxRetries = 3;
        let retryCount = 0;
        let response = null;
        
        while (retryCount < maxRetries && !response) {
            try {
                response = await axios.get(url, { 
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'PGETunnelBot/1.0'
                    }
                });
            } catch (err) {
                retryCount++;
                logger.error(`H2H API attempt ${retryCount} failed:`, err.message);
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        if (!response) {
            return { 
                status: 'ERROR', 
                message: `❌ Error API H2H: Gagal terhubung setelah ${maxRetries} percobaan.` 
            };
        }
        
        const data = response.data;
        const responseString = (typeof data === 'object') ? JSON.stringify(data) : data;
        
        // Cek Respon Sukses/Gagal
        // Status 0 dari Okeconnect biasanya berarti sukses
        if (responseString.toLowerCase().includes('sukses') || responseString.toLowerCase().includes('done') || data.status === 0) {
            return { 
                status: 'SUCCESS', 
                message: `✅ Transaksi ${productCode} ke ${destination} SUKSES. Balasan: ${responseString}` 
            };
        }
        
        // Status 1 atau 2 atau kata kunci gagal
        if (responseString.toLowerCase().includes('gagal') || responseString.toLowerCase().includes('failed') || responseString.toLowerCase().includes('reject') || responseString.toLowerCase().includes('error') || data.status > 0) {
            return { 
                status: 'FAILED', 
                message: `❌ Transaksi ${productCode} GAGAL/ERROR. Balasan: ${responseString}` 
            };
        }

        // Default: Pending (status API tidak jelas atau belum final)
        return { 
            status: 'PENDING', 
            message: `⏳ Transaksi ${productCode} sedang diproses. Cek status manual. Balasan: ${responseString.substring(0, 100)}...` 
        };

    } catch (error) {
        logger.error(`Error H2H Okeconnect: ${error.message}`);
        return { 
            status: 'ERROR', 
            message: `❌ Error API H2H: Gagal terhubung atau API Error. (${error.message})` 
        };
    }
}


// --- MIDDLEWARE OPTIMIZED ---
// 🔥 MODE SPEED: Middleware yang ringan dan cepat
bot.use(async (ctx, next) => {
    // 🔥 MODE SPEED: Menjawab CallbackQuery secara non-blocking dan di awal
    if (ctx.callbackQuery) ctx.answerCbQuery().catch(() => {});

    if (!ctx.from) return next();

    const isMaintenance = global.fastCache.uiConfig?.maintenance_mode === 1;
    if (isMaintenance && !adminIds.includes(ctx.from.id)) {
        if (ctx.updateType === 'callback_query') {
             // Memberikan feedback error yang lebih baik saat Maintenance
             return ctx.answerCbQuery("🛠 Mohon maaf, Bot sedang Maintenance sistem.").catch(() => {});
        }
        if (ctx.message && ctx.message.text && (ctx.message.text.startsWith('/') || ctx.message.text.length > 2)) { 
            return ctx.reply("🛠 Mohon maaf, Bot sedang Maintenance sistem.");
        }
        return; 
    }
    return next();
});


// =========================================================================================
// 1. MENU UTAMA DIGITAL PRODUCTS (KUOTA/PULSA) - Category Map dan Generator
// =========================================================================================

const categoryMap = {
  pulsa: {
    header: 'PULSA OPERATOR',
    icon: '📱'
  },
  kuota: {
    header: 'PAKET DATA',
    icon: '📶'
  },
  game: {
    header: 'VOUCHER GAME',
    icon: '🎮'
  },
  pln: {
    header: 'TOKEN PLN',
    icon: '⚡'
  },
  ewallet: {
    header: 'E-WALLET',
    icon: '💳'
  }
};
    

/**
 * Menghasilkan keyboard tombol kategori digital (pulsa/kuota) dengan N kolom.
 * 🔥 FIX: Menggunakan default 2 kolom.
 */
function generateDigitalCategoryKeyboard(columns = 2) {
  const allCategoriesKeys = Object.keys(categoryMap);
  const kb = [];

  for (let i = 0; i < allCategoriesKeys.length; i += columns) {
    const row = [];

    for (let j = 0; j < columns; j++) {
      const catKey = allCategoriesKeys[i + j];
      if (!catKey) continue;

      const cat = categoryMap[catKey];

      row.push({
        text: `${cat.icon} ${cat.header}`,
        callback_data: `menu_${catKey}`   // 🔥 FIX DISINI
      });
    }

    if (row.length) kb.push(row);
  }

  return kb;
}

function getWIBTime() {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
}

function isBetween(time, start, end) {
  return time >= start && time < end;
}
// =========================================================================================
// 2. AUTO MAINTENANCE MODE (23:40 - 00:10 WIB)
// =========================================================================================
async function autoMaintenanceScheduler() {
  try {
    const now = getWIBTime();

    // Rekap/pembukuan: 23:40 -> 00:10 (30 menit)
    const start = new Date(now);
    start.setHours(23, 40, 0, 0);

    const end = new Date(now);
    end.setHours(0, 10, 0, 0);

    // lewat tengah malam: end = besok
    if (end <= start) end.setDate(end.getDate() + 1);

    const shouldMaintenance = isBetween(now, start, end);
    const current = global.fastCache.uiConfig?.maintenance_mode === 1;

    if (shouldMaintenance && !current) {
      await dbRun('UPDATE ui_config SET maintenance_mode = 1 WHERE id = 1');
      global.fastCache.uiConfig.maintenance_mode = 1;
      logger.info('🛠 AUTO MAINTENANCE ON (23:40 WIB)');
    }

    if (!shouldMaintenance && current) {
      await dbRun('UPDATE ui_config SET maintenance_mode = 0 WHERE id = 1');
      global.fastCache.uiConfig.maintenance_mode = 0;
      logger.info('✅ AUTO MAINTENANCE OFF (00:10 WIB)');
    }
  } catch (e) {
    logger.error('Auto maintenance error:', e);
  }
}

// cek tiap 1 menit
setInterval(autoMaintenanceScheduler, 60 * 1000);

// OPTIONAL: jalankan sekali saat bot start biar langsung sync
autoMaintenanceScheduler();

// --- MAIN MENU ---
async function sendMainMenu(ctx) {
    const userId = ctx.from.id;
    delete userState[userId];
    delete global.depositState[userId]; 

    const now = new Date();
    // PERBAIKAN: Gunakan 30 hari terakhir untuk statistik bulanan yang lebih relevan
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();

    // 🔥 MODE SPEED: Mengambil data DB secara paralel
    const [userRow, userStats] = await Promise.all([
        dbGet('SELECT saldo FROM users WHERE user_id = ?', [userId]),
        dbGet('SELECT COUNT(*) as count FROM log_penjualan WHERE user_id = ? AND waktu_transaksi >= ?', [userId, thirtyDaysAgo])
    ]);

    // 🔥 MODE SPEED: Mengambil statistik global dari RAM Cache
    const { total_users, total_trx: globalTrx } = global.fastCache.globalStats;
    
    const saldo = Number(userRow?.saldo) || 0; 
    
    // --- HAPUS: Baris ini tidak lagi diperlukan ---
    // const globalOmsetSafe = Number(globalOmset) || 0; 
    const globalTrxSafe = Number(globalTrx) || 0;

    const userName = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || 'Member');
    const userMonthTrx = userStats?.count || 0; 
    
    const uiConfig = global.fastCache.uiConfig;
    const isAdmin = adminIds.includes(userId);

    let statusText = `<code>👤 Member </code>`;
    if (isAdmin) statusText = `<code>👨‍💻 Admin </code>`;
    
    // --- MODIFIKASI: Menghapus baris Total Omset dari statsBlock ---
    let statsBlock = `<b>✏️ Transaksi 30 hari ini:</b> ${userMonthTrx}`;
    // statsBlock += `\n<b>💰 Total Omset:</b> Rp${globalOmsetSafe.toLocaleString('id-ID')}`; // BARIS INI DIHAPUS
    statsBlock += `\n<b>📦 Total Transaksi:</b> ${globalTrxSafe} Produk`; 
    
    let infoCatatan = `<b>📝 Info Toko:</b>\n<i>🎁 Selamat datang Di bot order PPOB</i>`;
    if (isAdmin) {
        infoCatatan = `<b>📝 Info Admin:</b>\n<i>✨ Mode Maintenance: ${uiConfig.maintenance_mode ? 'ON' : 'OFF'}</i>`;
    }
    
    const messageText =
`<b>🏪 MENU UTAMA PPOB</b>
<i>Payment Point Online Bank</i>
<i>layanan pembayaran & pembelian produk digital</i>
━━━━━━━━━━━━━━━━━━
<b>Informasi Pengguna</b><blockquote>
• User : ${userName}
• ID : <code>${userId}</code>
• Saldo : Rp ${saldo.toLocaleString('id-ID')}
• Status : ${statusText.replace(/<\/?code>/g,'')}</blockquote>
━━━━━━━━━━━━━━━━━━
<b>Statistik</b><blockquote>
${statsBlock}</blockquote>
━━━━━━━━━━━━━━━━━━
${infoCatatan}
<blockquote>Jadwal Maintenance Harian System
Pukul: 23:40 - 00:10 WIB
⚠️ Hindari pembelian produk di jam tersebut.</blockquote>
━━━━━━━━━━━━━━━━━━
<b>Total User</b> : ${total_users}
`;

    const keyboard = [];
    
    // Mengambil kolom dari cache, jika tidak ada, default ke 2 sesuai permintaan
    const columns = global.fastCache.uiConfig.digital_product_cols || 2; 
    const digitalCategoryKeyboard = generateDigitalCategoryKeyboard(columns); 
    keyboard.push(...digitalCategoryKeyboard);
    
    // Tombol Top Up dipindah ke bawah kategori
    if (global.fastCache.buttonConfig.topup_saldo) {
    keyboard.push([
        { text: '💳 Top Up Saldo', callback_data: 'menu_topup' },        { text: '🔍 Cek Kuota', callback_data: 'menu_cek_kuota' },           ]);
    keyboard.push([
  { text: '📞 Hubungi Admin', url: 'https://t.me/FRosi46' }
]);
}
    
    if (isAdmin) keyboard.push([{ text: '🛠 Admin Panel', callback_data: 'admin_menu_cmd' }]); 

    const imageUrl = 'https://image2url.com/r2/default/files/1768314979801-48616829-f1a9-46c4-a945-97d508639318.jpeg';

    try {
        if (ctx.callbackQuery) {
            // For callback queries, we need to delete the old message and send a new one with photo
            await ctx.deleteMessage().catch(() => {});
            await ctx.replyWithPhoto(imageUrl, {
                caption: messageText,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            // Jika pesan baru (dari /start)
            if (ctx.message && ctx.message.message_id) await ctx.deleteMessage().catch(() => {});
            await ctx.replyWithPhoto(imageUrl, {
                caption: messageText,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    } catch (e) {
        // Fallback if sending photo fails (e.g., image URL is not accessible)
        console.error('Error sending photo:', e);
        if (ctx.callbackQuery) {
            await ctx.editMessageText(messageText, { 
                parse_mode: 'HTML', 
                disable_web_page_preview: true, 
                reply_markup: { inline_keyboard: keyboard } 
            });
        } else {
            await ctx.reply(messageText, { 
                parse_mode: 'HTML', 
                disable_web_page_preview: true, 
                reply_markup: { inline_keyboard: keyboard } 
            });
        }
    }
}

// --- Kode lainnya tidak berubah ---
bot.command(['start', 'menu'], async (ctx) => {
  try {
    const userId = ctx.from.id;

    // langsung aman, gak perlu SELECT dulu
    await dbRun('INSERT OR IGNORE INTO users (user_id) VALUES (?)', [userId]);

    await sendMainMenu(ctx);
  } catch (err) {
    console.error('start/menu error:', err);
    await ctx.reply('❌ Terjadi error. Coba lagi sebentar ya.');
  }
});
// ================= SUBMENU KUOTA USER =================

bot.command('admin', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return ctx.reply('❌ Akses Ditolak');
    await sendAdminMenu(ctx);
});

// --- ADMIN MENU ---
async function sendAdminMenu(ctx) {
    if (!adminIds.includes(ctx.from.id)) return ctx.reply('❌ Akses Ditolak');

    const config = global.fastCache.buttonConfig;
    const uiConfig = global.fastCache.uiConfig;
    const isMaintenance = uiConfig.maintenance_mode === 1;

    // 🔥 MODE SPEED: Fetch data statistik secara paralel
    const [salesStats, topupStats] = await Promise.all([
        dbGet('SELECT SUM(harga) as omset, COUNT(*) as trx_count FROM log_penjualan'),
        dbGet('SELECT SUM(amount) as deposit FROM topup_log WHERE amount > 0') 
    ]);

    const globalOmset = salesStats?.omset || 0;
    const globalTrx = salesStats?.trx_count || 0;
    const globalDepo = topupStats?.deposit || 0;
    
    const currentCols = global.fastCache.uiConfig.digital_product_cols || 2; // FIX: Fallback ke 2 di Admin Menu

    const adminKeyboard = [
        [
            { text: '💰 Add Saldo', callback_data: 'add_saldo_start' },
            { text: '🔻 Kurangi Saldo', callback_data: 'debit_saldo_start' }
        ],
        [
            { text: '📜 Riwayat Trx Digital', callback_data: 'admin_digital_history' },
            { text: '📱 Kelola Produk', callback_data: 'admin_digital_menu' }
        ],
        [
            { text: '📣 Broadcast Message', callback_data: 'admin_broadcast' },
            { text: '🔍 Check User', callback_data: 'admin_check_user' }
        ],
        [
            { 
                text: isMaintenance ? '🛠 Disable Maintenance' : '✅ Enable Maintenance', 
                callback_data: `toggle_maintenance_${isMaintenance ? 'off' : 'on'}`
            }
        ],
        [
            { text: `${config.topup_saldo ? '🟢' : '🔴'} Toggle Topup Orkut`, callback_data: 'toggle_topup_saldo' },
            { text: `🎚 Set Kolom Digital: ${currentCols} ➡️`, callback_data: 'admin_set_digital_cols' }
        ],
        // 👇 FITUR BARU: CLEAR ALL SESSIONS
        [
            { text: '🗑️ Clear All Sessions', callback_data: 'admin_clear_all_sessions' }
        ],
        // 👆 FITUR BARU END
        [
            { text: '💾 Backup Database', callback_data: 'manual_backup' }
        ],
        [
            { text: '🏡 Main Menu', callback_data: 'send_main_menu' }
        ]
    ];


    const text = `
⚙️ *PANEL ADMIN - DIGITAL ONLY*
─────────────────────────────────
📊 *STATISTIK GLOBAL TOKO*
💰 Total Omset: \`Rp${globalOmset.toLocaleString('id-ID')}\`
🛍 Total Transaksi: \`${globalTrx}\`
💳 Total Deposit: \`Rp${globalDepo.toLocaleString('id-ID')}\`
─────────────────────────────────
⚠️ Status Maintenance: *${isMaintenance ? 'AKTIF (⛔)' : 'NON-AKTIF (✅)'}*
─────────────────────────────────
Silahkan pilih menu manajemen:`;

    try {
        await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } });
    } catch (e) {
        if (ctx.message) ctx.deleteMessage().catch(()=>{});
        await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } });
    }
}

// ---------------------- ADMIN ACTIONS HANDLERS ----------------------

bot.action('admin_clear_all_sessions', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;

    // Hitung sesi yang akan dihapus
    const cleanedCount = Object.keys(userState).length;
    
    // Hapus semua sesi userState (depositState dibiarkan karena diurus oleh QRIS Check)
    userState = {}; // Reset userState

    await ctx.editMessageText(
        `✅ *Pembersihan Sesi Selesai!*\n\n` +
        `🗑️ **${cleanedCount} sesi chat** telah dihapus dari memori.\n` +
        `Kinerja bot seharusnya lebih stabil dan responsif sekarang.`, 
        { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Admin', callback_data: 'admin_menu_cmd' }]] }
        }
    );
});

bot.action('admin_set_digital_cols', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    
    const kb = [
        [{ text: '1 Kolom', callback_data: 'set_digital_cols_1' }],
        [{ text: '2 Kolom', callback_data: 'set_digital_cols_2' }],
        [{ text: '3 Kolom', callback_data: 'set_digital_cols_3' }],
        [{ text: '🔙 Batal', callback_data: 'admin_menu_cmd' }]
    ];

    await ctx.editMessageText('📐 *Pilih jumlah kolom untuk tombol produk digital:*', { 
        parse_mode: 'Markdown', 
        reply_markup: { inline_keyboard: kb } 
    });
});

bot.action(/set_digital_cols_(\d+)/, async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    const cols = parseInt(ctx.match[1]);
    
    await dbRun('UPDATE ui_config SET digital_product_cols = ? WHERE id = 1', [cols]);
    global.fastCache.uiConfig.digital_product_cols = cols;
    
    await ctx.answerCbQuery(`Kolom diatur menjadi ${cols}.`);
    await sendMainMenu(ctx);
});

bot.action('admin_menu_cmd', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    await sendAdminMenu(ctx);
});

bot.action('menu_cek_kuota', async (ctx) => {
  userState[ctx.from.id] = {
    step: 'cek_kuota_input',
    timestamp: Date.now()
  };

  // 🔥 HAPUS pesan menu foto lama
  await ctx.deleteMessage().catch(() => {});

  // 🔥 KIRIM PESAN BARU (TEXT BIASA)
  await ctx.reply(
    '📱 <b>CEK KUOTA XL/AXIS</b>\n\n' +
    'Masukkan nomor HP:\n\n' +
    'Contoh:\n<code>08383457890</code>',
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Batal', callback_data: 'send_main_menu' }]
        ]
      }
    }
  );
});

bot.action(/toggle_maintenance_(on|off)/, async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    const newVal = ctx.match[1] === 'on' ? 1 : 0;
    dbRun('UPDATE ui_config SET maintenance_mode = ? WHERE id = 1', [newVal]);
    global.fastCache.uiConfig.maintenance_mode = newVal;
    await sendAdminMenu(ctx); 
});

bot.action('admin_broadcast', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    userState[ctx.from.id] = { step: 'awaiting_broadcast_content', timestamp: Date.now() };
    await ctx.reply('📢 *MODE BROADCAST*\nKirim Teks atau Gambar.\n\n_Ketik /batal atau tekan tombol di bawah untuk membatalkan._', { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_broadcast' }]] }
    });
});

// Handler untuk tombol batalkan broadcast
bot.action('cancel_broadcast', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    delete userState[ctx.from.id];
    await ctx.editMessageText('❌ Mode broadcast dibatalkan.', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Admin', callback_data: 'admin_menu_cmd' }]] }
    });
});

async function runBroadcast(ctx, type, content, caption = '') {
    let statusMsg;
    try { 
        statusMsg = await ctx.reply('🚀 Memuat data user...'); 
    } catch (e) { 
        logger.error("Error creating broadcast status message:", e);
        return; 
    }
    
    try {
        const users = await dbAll('SELECT user_id FROM users');
        const total = users.length;
        let sent = 0, blocked = 0, error = 0;
        
        const batchSize = 20; // Reduced batch size to prevent flooding
        for (let i = 0; i < total; i += batchSize) {
            const batchUsers = users.slice(i, i + batchSize);
            const sendPromises = batchUsers.map(user => {
                return new Promise(async (resolve) => {
                    try {
                        if (type === 'text') await bot.telegram.sendMessage(user.user_id, content, { parse_mode: 'HTML' });
                        else if (type === 'photo') await bot.telegram.sendPhoto(user.user_id, content, { caption: caption, parse_mode: 'HTML' });
                        sent++;
                        resolve();
                    } catch (e) {
                        const desc = e.description || '';
                        if (desc.includes('blocked') || desc.includes('deactivated')) blocked++;
                        else error++;
                        resolve(); 
                    }
                });
            });

            await Promise.all(sendPromises); 
            await new Promise(r => setTimeout(r, 100)); // Increased delay between batches
            
            await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, 
                `🚀 *BROADCAST PROSES* (${i + batchUsers.length}/${total})\nSukses: \`${sent}\`\nGagal: \`${error + blocked}\``, 
                { parse_mode: 'Markdown' }
            ).catch(() => {});
        }

        await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, 
            `✅ *BROADCAST SELESAI*\nTarget: \`${total}\`\nSukses: \`${sent}\`\nGagal: \`${error + blocked}\``, 
            { parse_mode: 'Markdown' }
        );
    } catch (err) { 
        logger.error("Broadcast Error", err); 
        await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, 
            `❌ *BROADCAST ERROR*\n${err.message}`, 
            { parse_mode: 'Markdown' }
        ).catch(() => {});
    }
}

const CATEGORY_PROMPT_MAP = {
    // --- PULSA ---
    pulsa: "👉Nomor HP (Contoh: 081234567890)",
    
    
    // --- PAKET DATA / KUOTA ---
    data: "👉 masukan Nomor HP (Contoh: 081234567890)",
    kuotatri: "👉 masukan Nomor HP (Contoh: 089512345678)",
    kuotatelkomsel: "👉 masukanNomor HP (Contoh: 081234567890)",
    kuotasmartfren: "👉Nomor HP (Contoh: 088212345678)",
    kuota_indosat: "👉 masukan Nomor HP (Contoh: 085712345678)",
    kuotabyu: "👉 masukan Nomor HP (Contoh: 085712345678)",
    kuotaaxis: "👉 masukan Nomor HP (Contoh: 083812345678)",
       // Default untuk ID Pelanggan/Game jika kategori tidak spesifik
    DEFAULT: "👉Nomor Tujuan / ID Pelanggan" 
};


// handler pagination
bot.action(/^digital_page\|/, async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const [, categoryKey, pageStr] = ctx.callbackQuery.data.split('|');
    const page = parseInt(pageStr, 10) || 0;

    const header =
      global.fastCache?.categories?.[categoryKey]?.name ||
      global.fastCache?.categoryMap?.[categoryKey]?.name || // kalau struktur kamu beda
      categoryKey;

    return showDigitalProductsByCategory(ctx, categoryKey, header, page);
  } catch (e) {
    console.error('digital_page error:', e);
    return ctx.reply('❌ Gagal pindah halaman. Coba lagi.');
  }
});

// =========================================================================================
// 2. FUNGSI DISPLAY PRODUK PER KATEGORI (DENGAN PAGINATION) - FIXED
// =========================================================================================

const PRODUCTS_PER_PAGE = 20;

async function showDigitalProductsByCategory(ctx, categoryKey, categoryHeader, page = 0) {
    const allProducts = await dbAll(`
        SELECT dp.*, 
        (SELECT COUNT(*) FROM log_penjualan lp 
         WHERE lp.tipe_akun = dp.product_code 
         AND lp.action_type = 'digital_success') as total_sold
        FROM digital_products dp 
        WHERE dp.category = ? 
        ORDER BY dp.price
    `, [categoryKey]);

    if (allProducts.length === 0) {
        const msg = `⚠️ Belum ada produk di kategori *${categoryHeader}*.`;
        const kb = [[{ text: '🔙 Kembali ke Menu Utama', callback_data: 'send_main_menu' }]];

        try {
            return await ctx.editMessageText(msg, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: kb }
            });
        } catch {
            return await ctx.reply(msg, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: kb }
            });
        }
    }

    const totalPages = Math.ceil(allProducts.length / PRODUCTS_PER_PAGE);
    const currentPage = Math.min(Math.max(Number(page) || 0, 0), totalPages - 1);

    const startIndex = currentPage * PRODUCTS_PER_PAGE;
    const currentProducts = allProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);

    let msg = `🛒 *Produk: ${categoryHeader}* (Hal ${currentPage + 1}/${totalPages})\n\n`;
    msg += `Silakan pilih produk:\n`;

    const kb = [];

    // ===== BUTTON PRODUK =====
    for (const p of currentProducts) {
        const displayPrice = p.price === 0
            ? 'Gratis'
            : `Rp${Number(p.price).toLocaleString('id-ID')}`;

        let displayName = p.product_name;
        const suffix = ` - ${displayPrice}`;
        const maxLen = 60 - suffix.length;

        if (displayName.length > maxLen) {
            displayName = displayName.slice(0, maxLen - 3) + '...';
        }

        kb.push([{
            text: `${displayName}${suffix}`,
            callback_data: `digital_select|${p.product_code}|${p.price}`
        }]);
    }

    // ===== NAVIGASI =====
    if (totalPages > 1) {
        const nav = [];

        if (currentPage > 0) {
            nav.push({
                text: '⬅️ Previous',
                callback_data: `digital_page|${categoryKey}|${currentPage - 1}`
            });
        } else {
            nav.push({ text: ' ', callback_data: 'ignore_nav' });
        }

        if (currentPage < totalPages - 1) {
            nav.push({
                text: 'Next ➡️',
                callback_data: `digital_page|${categoryKey}|${currentPage + 1}`
            });
        } else {
            nav.push({ text: ' ', callback_data: 'ignore_nav' });
        }

        kb.push(nav);
    }

    kb.push([{ text: '🔙 Kembali ke Menu Utama', callback_data: 'send_main_menu' }]);

    const options = {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: kb }
    };

    try {
        await ctx.editMessageText(msg, options);
    } catch (e) {
        // Anti error "message is not modified"
        const desc = e?.description || e?.message || '';
        if (!desc.includes('message is not modified')) {
            await ctx.reply(msg, options);
        }
    }
}

// ===============================
// 🔥 HANDLER KUOTA DATA (FINAL & AMAN)
// ===============================

// ===============================
// MENU USER → PULSA
// ===============================
bot.action('menu_pulsa', async (ctx) => {
  const kb = Object.entries(pulsaChildrenMap).map(([key, v]) => ([
    {
      text: `${v.icon} ${v.header}`,
      callback_data: `show_cat_${key}`
    }
  ]));

  kb.push([
    { text: '⬅️ Menu Utama', callback_data: 'send_main_menu' }
  ]);

  await ctx.deleteMessage().catch(() => {});

  await ctx.reply(
    '📱 *PULSA OPERATOR*\n\nSilakan pilih provider:',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: kb }
    }
  );
});

// ===============================
// MENU USER → KUOTA / PAKET DATA
// ============================
bot.action('menu_kuota', async (ctx) => {
  const kb = Object.entries(kuotaChildrenMap).map(([key, v]) => ([
    {
      text: `${v.icon} ${v.header}`,
      callback_data: `show_cat_${key}`
    }
  ]));

  kb.push([
    { text: '← Menu Utama', callback_data: 'send_main_menu' }
  ]);

  await ctx.deleteMessage().catch(() => {});

  await ctx.reply(
    '📶 *PAKET DATA*\n\nSilakan pilih provider:',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: kb }
    }
  );
});

// ==============================
// 🎮 MENU USER → VOUCHER GAME
// ==============================
bot.action('menu_game', async (ctx) => {
  await ctx.answerCbQuery();

  const kb = Object.entries(gameChildrenMap).map(([key, v]) => ([
    {
      text: `${v.icon} ${v.header}`,
      callback_data: `show_cat_${key}`
    }
  ]));

  kb.push([{ text: '⬅️ Menu Utama', callback_data: 'send_main_menu' }]);

  // 🔥 HAPUS pesan menu utama (foto)
  await ctx.deleteMessage().catch(() => {});

  // 🔥 KIRIM pesan baru
  await ctx.reply(
    '🎮 *VOUCHER GAME*',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: kb }
    }
  );
});

bot.action('menu_pln', async (ctx) => {
  await ctx.answerCbQuery();

  const kb = Object.entries(plnChildrenMap).map(([key, v]) => ([
    {
      text: `${v.icon} ${v.header}`,
      callback_data: `show_cat_${key}`
    }
  ]));

  kb.push([{ text: '⬅️ Menu Utama', callback_data: 'send_main_menu' }]);

  await ctx.deleteMessage().catch(() => {});

  await ctx.reply(
    '⚡ *TOKEN PLN*',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: kb }
    }
  );
});

bot.action('menu_ewallet', async (ctx) => {
  await ctx.answerCbQuery();

  const kb = Object.entries(ewalletChildrenMap).map(([key, v]) => ([
    {
      text: `${v.icon} ${v.header}`,
      callback_data: `show_cat_${key}`
    }
  ]));

  kb.push([{ text: '← Menu Utama', callback_data: 'send_main_menu' }]);

  await ctx.deleteMessage().catch(() => {});
  await ctx.reply(
    '💳 *E-WALLET*',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: kb }
    }
  );
});

bot.action('menu_pulsa_add', async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;

  const userId = ctx.from.id;
  const state = userState[userId];
  if (!state) return;

  state.type = 'pulsa';
  state.step = 'add_digital_product_provider';

  console.log('[ADD PRODUCT] TYPE:', state.type);

  const kb = Object.entries(pulsaChildrenMap).map(([key, val]) => ([
    { text: `${val.icon} ${val.header}`, callback_data: `cat_${key}` }
  ]));

  kb.push([{ text: '❌ Batal', callback_data: 'cancel_add_product' }]);

  await ctx.editMessageText(
    '📱 *Pilih Provider Pulsa:*',
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }
  );
});

bot.action('menu_kuota_add', async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;

  const userId = ctx.from.id;
  const state = userState[userId];
  if (!state) return;

  state.type = 'kuota';
  state.step = 'add_digital_product_provider';

  console.log('[ADD PRODUCT] TYPE:', state.type);

  const kb = Object.entries(kuotaChildrenMap).map(([key, val]) => ([
    { text: `${val.icon} ${val.header}`, callback_data: `cat_${key}` }
  ]));

  kb.push([{ text: '❌ Batal', callback_data: 'cancel_add_product' }]);

  await ctx.editMessageText(
    '📶 *Pilih Provider Paket Data:*',
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }
  );
});

bot.action('menu_game_add', async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;

  const state = userState[ctx.from.id];
  if (!state) return;

  state.type = 'game';
  state.step = 'add_digital_product_category';

  const kb = Object.entries(gameChildrenMap).map(([key, v]) => ([
  {
    text: `${v.icon} ${v.header}`,
    callback_data: `show_cat_${key}`
  }
]));

  kb.push([{ text: '❌ Batal', callback_data: 'cancel_add_product' }]);

  await ctx.editMessageText(
    '🎮 *Pilih Game:*',
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }
  );
});

bot.action('menu_pln_add', async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;

  const state = userState[ctx.from.id];
  if (!state) return;

  state.type = 'pln';
  state.step = 'add_digital_product_category';

  const kb = Object.entries(plnChildrenMap).map(([key, v]) => ([
    {
      text: `${v.icon} ${v.header}`,
      callback_data: `provider_${key}`
    }
  ]));

  kb.push([{ text: '❌ Batal', callback_data: 'cancel_add_product' }]);

  await ctx.editMessageText(
    '⚡ *Pilih Jenis Token PLN:*',
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }
  );
});

bot.action('menu_ewallet_add', async (ctx) => {
  await ctx.answerCbQuery();

  state.step = 'add_digital_product_category';

  const kb = Object.entries(ewalletChildrenMap).map(([key, v]) => ([
    {
      text: `${v.icon} ${v.header}`,
      callback_data: `provider_${key}`
    }
  ]));

  kb.push([{ text: '❌ Batal', callback_data: 'cancel_add_product' }]);

  await ctx.editMessageText(
    '💳 *Pilih Jenis E-Wallet:*',
    {
      parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb }
    }
  );
});

// ===============================
// SHOW CATEGORY (USER MENU)
// ===============================
bot.action(/^show_cat_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const categoryKey = ctx.match[1];
  console.log('[SHOW_CAT]', categoryKey);

  const map =
  pulsaChildrenMap[categoryKey] ||
  kuotaChildrenMap[categoryKey] ||
  gameChildrenMap[categoryKey] ||
  plnChildrenMap[categoryKey] ||
  ewalletChildrenMap[categoryKey];

  if (!map) {
    console.log('[ERROR] Category not found:', categoryKey);
    return ctx.reply('❌ Kategori tidak ditemukan');
  }

  return showDigitalProductsByCategory(
    ctx,
    categoryKey,
    map.header,
    0
  );
});

// HANDLER PILIH PRODUK
// HANDLER PILIH PRODUK (FIX: pakai format digital_select|code|price)
bot.action(/^digital_select\|/, async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;
    const data = ctx.callbackQuery?.data || '';
    const [, productCode, priceStr] = data.split('|');
    const priceFromBtn = parseInt(String(priceStr || '0'), 10) || 0;

    if (!productCode) return ctx.reply('❌ Produk tidak valid.');

    // Ambil data dari DB (lebih aman daripada percaya harga dari tombol)
    const productDetail = await dbGet(
      "SELECT product_name, category, price FROM digital_products WHERE product_code = ?",
      [productCode]
    );

    if (!productDetail) return ctx.reply("❌ Produk tidak ditemukan.");

    const categoryKey = productDetail.category;
    const promptText = CATEGORY_PROMPT_MAP[categoryKey] || CATEGORY_PROMPT_MAP.DEFAULT;
    const finalPrice = Number(productDetail.price) || priceFromBtn;

    userState[userId] = {
      step: 'digital_input_destination',
      productCode,
      price: finalPrice,
      categoryKey,
      timestamp: Date.now()
    };

    await ctx.reply(
      `📱 produk *${productDetail.product_name}* (Rp${finalPrice.toLocaleString('id-ID')}).\n\n` +
      `\`${promptText}\`\n\n_Tekan tombol di bawah untuk membatalkan._`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_digital_input' }]]
        }
      }
    );
  } catch (e) {
    console.error('digital_select handler error:', e);
    return ctx.reply('❌ Gagal memproses pilihan produk. Coba lagi.');
  }
});


// Handler untuk tombol batalkan input digital
bot.action('cancel_digital_input', async (ctx) => {
    const userId = ctx.from.id;
    delete userState[userId];
    await ctx.editMessageText('❌ Input pembelian dibatalkan.', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Utama', callback_data: 'send_main_menu' }]] }
    });
});


// =========================================================================
// 🔄 HANDLER ADMIN MANAJEMEN PRODUK DIGITAL
// =========================================================================
bot.action('admin_digital_menu', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    
    const kb = [
       [{ text: '➕ Tambah Produk Massal', callback_data: 'add_digital_product_massal_start' }],
        [{ text: '➕ Tambah Produk', callback_data: 'add_digital_product_start' }],
        [{ text: '📦 List Produk', callback_data: 'listproduk' }],
        [{ text: '🗑 Hapus Produk', callback_data: 'delete_digital_product_start' }],
        [{ text: '✏️ Edit Harga Produk', callback_data: 'edit_digital_price_start' }],
        [{ text: '📝 Edit Nama Produk', callback_data: 'edit_digital_name_start' }], 
        
        [{ text: '⬆️ Naikkan Harga Massal', callback_data: 'increase_all_digital_price' }], 
        [{ text: '⬇️ Turunkan Harga Massal', callback_data: 'decrease_all_digital_price' }], 
        
        [{ text: '🔙 Kembali ke Admin Menu', callback_data: 'admin_menu_cmd' }]
    ];

    await ctx.editMessageText('📱 *KELOLA PRODUK DIGITAL*\n\nSilahkan pilih aksi:', { 
        parse_mode: 'Markdown', 
        reply_markup: { inline_keyboard: kb } 
    });
});

function getCategoryIcon(category) {
  const icons = { PULSA:'📱', DATA:'📶', PLN:'⚡', GAME:'🎮', E_WALLET:'💰', LAINNYA:'📦', DEFAULT:'📦' };
  return icons[category] || icons.DEFAULT;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


function splitIntoChunks(text, maxLen = 3500) {
  const chunks = [];
  let current = '';

  const lines = String(text).split('\n');
  for (const line of lines) {
    // +1 buat newline
    if ((current.length + line.length + 1) > maxLen) {
      if (current.trim()) chunks.push(current);
      current = line + '\n';
    } else {
      current += line + '\n';
    }
  }

  if (current.trim()) chunks.push(current);
  return chunks;
}

bot.action('listproduk', async (ctx) => {
  try {
    if (!adminIds.includes(ctx.from.id)) return;

    const rows = await dbAll(
      `SELECT product_code, product_name, category, price
       FROM digital_products
       ORDER BY category ASC, product_name ASC`
    );

    await ctx.answerCbQuery().catch(() => {});

    if (!rows.length) {
      return ctx.reply('📭 Produk masih kosong.');
    }

    // group by category
    const grouped = {};
    for (const p of rows) {
      const cat = String(p.category || 'LAINNYA').toUpperCase();
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }

    let message = `<b>📦 DAFTAR PRODUK PPOB</b>\n━━━━━━━━━━━━━━━━━━\n\n`;

    for (const cat of Object.keys(grouped)) {
      message += `<b>${getCategoryIcon(cat)} ${cat} (${grouped[cat].length})</b>\n`;
      for (const p of grouped[cat]) {
        const harga = Number(p.price || 0).toLocaleString('id-ID');
        message += `• <code>${escapeHtml(p.product_code)}</code> | ${escapeHtml(p.product_name)} | Rp ${harga}\n`;
      }
      message += `\n`;
    }

    const parts = splitIntoChunks(message, 3500);

    // kirim per part biar nggak mentok limit Telegram
    for (let i = 0; i < parts.length; i++) {
      const footerKb =
        (i === parts.length - 1)
          ? { inline_keyboard: [[{ text: '🔙 Menu Digital', callback_data: 'admin_digital_menu' }]] }
          : undefined;

      await ctx.reply(parts[i], {
        parse_mode: 'HTML',
        reply_markup: footerKb
      });
    }

  } catch (err) {
    console.error('listproduk action error:', err);
    await ctx.answerCbQuery('Gagal ambil produk').catch(() => {});
    await ctx.reply('❌ Gagal mengambil daftar produk.');
  }
});


bot.action('increase_all_digital_price', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    userState[ctx.from.id] = { step: 'input_digital_price_mass_amount', action: 'increase', timestamp: Date.now() };
    await ctx.reply(
        '⬆️ *KENAIKAN HARGA MASSAL*\n\n' +
        'Masukkan nominal *kenaikan harga* (angka, misal: `2000`) yang akan diterapkan ke **semua** produk digital:\n\n_Tekan tombol di bawah untuk membatalkan._',
        { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_mass_price' }]] }
        }
    );
});

bot.action('decrease_all_digital_price', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    userState[ctx.from.id] = { step: 'input_digital_price_mass_amount', action: 'decrease', timestamp: Date.now() };
    await ctx.reply(
        '⬇️ *PENURUNAN HARGA MASSAL*\n\n' +
        'Masukkan nominal *penurunan harga* (angka, misal: `500`) yang akan diterapkan ke **semua** produk digital:\n\n_Tekan tombol di bawah untuk membatalkan._',
        { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_mass_price' }]] }
        }
    );
});

// Handler untuk tombol batalkan mass price
bot.action('cancel_mass_price', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    delete userState[ctx.from.id];
    await ctx.editMessageText('❌ Perubahan harga massal dibatalkan.', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Digital', callback_data: 'admin_digital_menu' }]] }
    });
});


bot.action(/confirm_mass_price_(\w+)_(\d+)/, async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;

    const action = ctx.match[1]; 
    const amount = parseInt(ctx.match[2]);
    const userId = ctx.from.id;

    if (userState[userId] && userState[userId].step === 'awaiting_confirmation_digital_mass' && userState[userId].action === action) {
        
        delete userState[userId];
        await ctx.editMessageText(`⏳ Sedang memproses ${action === 'increase' ? 'kenaikan' : 'penurunan'} harga sebesar Rp${amount.toLocaleString('id-ID')}...`, { parse_mode: 'HTML' });

        try {
            let sql;
            if (action === 'decrease') {
                 // Pastikan harga tidak menjadi negatif
                 sql = `UPDATE digital_products SET price = MAX(0, price - ?)`;
            } else {
                 sql = `UPDATE digital_products SET price = price + ?`;
            }

            const result = await dbRun(sql, [amount]);
            
            await ctx.editMessageText(`✅ <b>Harga Semua Produk Digital Berhasil Diperbarui!</b>\n\nNominal ${action === 'increase' ? 'Kenaikan' : 'Penurunan'}: <b>Rp${amount.toLocaleString('id-ID')}</b>.\nJumlah Produk Diperbarui: <b>${result.changes}</b>`, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [[{text:'🔙 Menu Digital', callback_data:'admin_digital_menu'}]] }
            });

        } catch (e) {
            await ctx.editMessageText(`❌ Gagal memperbarui harga: ${e.message}`, {
                reply_markup: { inline_keyboard: [[{text:'🔙 Menu Digital', callback_data:'admin_digital_menu'}]] }
            });
        }
    } else {
        await ctx.reply('❌ Sesi konfirmasi tidak valid atau kadaluarsa.', { reply_markup: { inline_keyboard: [[{text:'🔙 Menu Digital', callback_data:'admin_digital_menu'}]] } });
    }
});


bot.action('add_digital_product_start', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    userState[ctx.from.id] = { step: 'add_digital_product_code', timestamp: Date.now() };
    await ctx.reply(
        '✍️ *Masukkan KODE Produk:* (Contoh: XL10, TSEL2K) \n_Pastikan kode produk sesuai dengan API H2H._\n\n_Tekan tombol di bawah untuk membatalkan._', 
        { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_add_product' }]] }
        }
    );
});

bot.action('add_digital_product_massal_start', async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;

  userState[ctx.from.id] = {
    step: 'massal_choose_root',
    timestamp: Date.now()
  };

  await ctx.reply('📦 *Tambah Produk Massal*\n\nPilih dulu *kategori utama*:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📱 Pulsa', callback_data: 'massal_root_pulsa' }],
        [{ text: '📶 Kuota', callback_data: 'massal_root_kuota' }],
        [{ text: '🎮 Game', callback_data: 'massal_root_game' }],
        [{ text: '⚡ PLN', callback_data: 'massal_root_pln' }],
        [{ text: '💳 E-Wallet', callback_data: 'massal_root_ewallet' }],
        [{ text: '❌ Batal', callback_data: 'cancel_add_product' }],
      ]
    }
  });
});
bot.action(/^massal_root_(.+)$/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;

  const userId = ctx.from.id;
  const state = userState[userId];
  if (!state || state.step !== 'massal_choose_root') return;

  const root = ctx.match[1]; // pulsa/kuota/game/pln/ewallet
  state.category_root = root;
  state.step = 'massal_choose_provider';

  let providerMap;
  if (root === 'pulsa') providerMap = pulsaChildrenMap;
  else if (root === 'kuota') providerMap = kuotaChildrenMap;
  else if (root === 'game') providerMap = gameChildrenMap;
  else if (root === 'pln') providerMap = plnChildrenMap;
  else if (root === 'ewallet') providerMap = ewalletChildrenMap;
  else return ctx.reply('❌ Kategori tidak dikenali');

  const kb = Object.keys(providerMap).map(key => {
    const p = providerMap[key];
    return [{ text: `${p.icon} ${p.header}`, callback_data: `massal_provider_${key}` }];
  });

  kb.push([{ text: '❌ Batal', callback_data: 'cancel_add_product' }]);

  await ctx.editMessageText('🎯 *Pilih PROVIDER:*', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: kb }
  });
});
bot.action(/^massal_provider_(.+)$/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;

  const userId = ctx.from.id;
  const state = userState[userId];
  if (!state || state.step !== 'massal_choose_provider') return;

  const providerKey = ctx.match[1];
  state.provider = providerKey;
  state.category = providerKey; // kamu tadi set category=providerKey
  state.step = 'massal_input_lines';

  await ctx.editMessageText(
    '🧾 *Kirim list produk (massal)*\n\n' +
    'Format per baris:\n' +
    '`KODE|KETERANGAN|HARGA`\n' +
    'atau\n' +
    '`KODE|HARGA`\n\n' +
    'Contoh:\n' +
    '`A5|Axis 5.000|5847`\n' +
    '`A10|10838`\n\n' +
    '_Ketik_ `batal` _untuk membatalkan._',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '❌ Batal', callback_data: 'cancel_add_product' }]] }
    }
  );
});

// ===============================
// PILIH JENIS PRODUK
// ===============================
bot.action('menu_pulsa_add', async (ctx) => {
  const state = userState[ctx.from.id];
  if (!state || state.step !== 'add_digital_product_type') return;

  state.type = 'pulsa';
  state.step = 'add_digital_product_category';

  const kb = Object.keys(pulsaChildrenMap).map(key => {
    const cat = pulsaChildrenMap[key];
    return [{ text: `${cat.icon} ${cat.header}`, callback_data: `cat_${key}` }];
  });

  kb.push([{ text: '❌ Batal', callback_data: 'cancel_add_product' }]);

  await ctx.editMessageText(
    '📱 *Pilih Provider Pulsa:*',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: kb }
    }
  );
});

// ===============================
// ADD PRODUK → PILIH PROVIDER PULSA
// ===============================
bot.action('menu_kuota_add', async (ctx) => {
  const state = userState[ctx.from.id];
  if (!state || state.step !== 'add_digital_product_type') return;

  state.type = 'kuota';
  state.step = 'add_digital_product_category';

  const kb = Object.keys(kuotaChildrenMap).map(key => {
    const cat = kuotaChildrenMap[key];
    return [{ text: `${cat.icon} ${cat.header}`, callback_data: `cat_${key}` }];
  });

  kb.push([{ text: '❌ Batal', callback_data: 'cancel_add_product' }]);

  await ctx.editMessageText(
    '📶 *Pilih Provider Paket Data:*',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: kb }
    }
  );
});

// =====================================
// HANDLER PILIH PROVIDER PULSA (WAJIB)
// =====================================
// ==============================
// HANDLER PILIH KATEGORI
// ==============================
bot.action(/^cat_(.+)$/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;

  const userId = ctx.from.id;
  const state = userState[userId];
  if (!state || state.step !== 'add_digital_product_category') return;

  const categoryKey = ctx.match[1];
  console.log('[ADD PRODUCT] CATEGORY ROOT:', categoryKey);

  state.category_root = categoryKey;
  state.step = 'add_digital_product_provider';

  let providerMap;
if (categoryKey === 'pulsa') {
  providerMap = pulsaChildrenMap;
} 
else if (categoryKey === 'kuota') {
  providerMap = kuotaChildrenMap;
} 
else if (categoryKey === 'game') {
  providerMap = gameChildrenMap;
}
else if (categoryKey === 'pln') {               
  providerMap = plnChildrenMap;
}
else if (categoryKey === 'ewallet') {            
  providerMap = ewalletChildrenMap;
}
else {
  return ctx.reply('❌ Kategori tidak dikenali');
}
  const kb = Object.keys(providerMap).map(key => {
    const p = providerMap[key];
    return [{ text: `${p.icon} ${p.header}`, callback_data: `provider_${key}` }];
  });

  kb.push([{ text: '❌ Batal', callback_data: 'cancel_add_product' }]);

  await ctx.editMessageText(
    '🎯 *Pilih PROVIDER:*',
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }
  );
});

// ==============================
// HANDLER PILIH PROVIDER (WAJIB)
// ==============================
bot.action(/^provider_(.+)$/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;

  const userId = ctx.from.id;
  const state = userState[userId];
  if (!state) return ctx.reply('❌ Sesi tidak ditemukan');

  // ❗ pastikan step benar
  if (state.step !== 'add_digital_product_provider') {
    console.log('[SKIP] Salah step:', state.step);
    return;
  }

  const providerKey = ctx.match[1];
  console.log('[ADMIN] Provider dipilih:', providerKey);

  state.provider = providerKey;
  state.category = providerKey;
  state.step = 'add_digital_product_price';

  await ctx.editMessageText(
    '💰 *Masukkan HARGA JUAL:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Batal', callback_data: 'cancel_add_product' }]
        ]
      }
    }
  );
});

// Handler untuk tombol batalkan add product
bot.action('cancel_add_product', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    delete userState[ctx.from.id];
    await ctx.editMessageText('❌ Penambahan produk dibatalkan.', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Digital', callback_data: 'admin_digital_menu' }]] }
    });
});


const ADMIN_PRODUCTS_PER_PAGE = 20; 

async function showDeleteProductsPage(ctx, page = 0) {
    if (!adminIds.includes(ctx.from.id)) return;
    
    const { count } = await dbGet("SELECT COUNT(*) as count FROM digital_products");
    const totalProducts = count || 0;
    
    if (totalProducts === 0) {
        return ctx.editMessageText('⚠️ Tidak ada produk digital.', { 
            reply_markup: { inline_keyboard: [[{ text: '🔙 Batal', callback_data: 'admin_digital_menu' }]] } 
        });
    }

    const totalPages = Math.ceil(totalProducts / ADMIN_PRODUCTS_PER_PAGE);
    const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
    const offset = currentPage * ADMIN_PRODUCTS_PER_PAGE;

    const products = await dbAll(
        `SELECT id, product_code, product_name FROM digital_products ORDER BY id DESC LIMIT ? OFFSET ?`, 
        [ADMIN_PRODUCTS_PER_PAGE, offset]
    );

    let msg = `🗑 *Pilih produk untuk dihapus* (Hal ${currentPage + 1}/${totalPages})\n\n`;
    
    const kb = [];
    products.forEach((p, index) => {
        const displayIndex = offset + index + 1;
        msg += `**[${displayIndex}]** [${p.product_code}] ${p.product_name}\n`;
        kb.push([{ text: `🗑 [${displayIndex}]`, callback_data: `del_digital_${p.id}` }]);
    });
    
    const navButtons = [];
    if (currentPage > 0) {
        navButtons.push({ text: '⬅️ Previous', callback_data: `admin_del_page_${currentPage - 1}` });
    } else {
        navButtons.push({ text: ' ', callback_data: 'ignore_nav' });
    }
    navButtons.push({ text: `Page ${currentPage + 1}/${totalPages}`, callback_data: 'ignore_nav' });
    if (currentPage < totalPages - 1) {
        navButtons.push({ text: 'Next ➡️', callback_data: `admin_del_page_${currentPage + 1}` });
    } else {
        navButtons.push({ text: ' ', callback_data: 'ignore_nav' });
    }
    
    if (totalPages > 1) {
        kb.push(navButtons);
    }
    
    kb.push([{ text: '🔙 Batal', callback_data: 'admin_digital_menu' }]);

    try {
        await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
    } catch (e) {
        await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
    }
}

// ===============================
// DELETE MASSAL (SELECT + CONFIRM)
// ===============================

const ADMIN_DEL_PER_PAGE = 20;

// Simpan pilihan per-admin (in-memory). Kalau mau persistent, simpan ke DB.
global.delSelection = global.delSelection || {}; // { [adminId]: Set(productId) }

function getDelSet(adminId) {
  if (!global.delSelection[adminId]) global.delSelection[adminId] = new Set();
  return global.delSelection[adminId];
}

// Start delete massal
bot.action('delete_digital_product_start', async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;
  // reset pilihan setiap start (opsional)
  global.delSelection[ctx.from.id] = new Set();
  await showDeleteProductsPage(ctx, 0);
});

// Pagination delete
bot.action(/admin_del_page_(\d+)/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;
  const page = parseInt(ctx.match[1], 10);
  await showDeleteProductsPage(ctx, page);
});

// Toggle pilih produk (klik tombol produk)
bot.action(/del_toggle_(\d+)_(\d+)/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;
  const page = parseInt(ctx.match[1], 10);
  const id = String(ctx.match[2]);

  const set = getDelSet(ctx.from.id);
  if (set.has(id)) set.delete(id);
  else set.add(id);

  await showDeleteProductsPage(ctx, page);
});

// Pilih semua produk di halaman ini
bot.action(/del_select_page_(\d+)/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;
  const page = parseInt(ctx.match[1], 10);

  const { count } = await dbGet("SELECT COUNT(*) as count FROM digital_products");
  const totalProducts = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalProducts / ADMIN_DEL_PER_PAGE));
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
  const offset = currentPage * ADMIN_DEL_PER_PAGE;

  const products = await dbAll(
    `SELECT id FROM digital_products ORDER BY id DESC LIMIT ? OFFSET ?`,
    [ADMIN_DEL_PER_PAGE, offset]
  );

  const set = getDelSet(ctx.from.id);
  products.forEach(p => set.add(String(p.id)));

  await showDeleteProductsPage(ctx, currentPage);
});

// Bersihkan pilihan
bot.action(/del_clear_(\d+)/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;
  const page = parseInt(ctx.match[1], 10);
  global.delSelection[ctx.from.id] = new Set();
  await showDeleteProductsPage(ctx, page);
});

// Konfirmasi hapus terpilih
bot.action(/del_confirm_selected_(\d+)/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;
  const page = parseInt(ctx.match[1], 10);

  const set = getDelSet(ctx.from.id);
  const ids = Array.from(set);

  if (ids.length === 0) {
    return ctx.answerCbQuery('Belum ada produk dipilih.', { show_alert: true });
  }

  const msg =
    `⚠️ *Konfirmasi Hapus*\n\n` +
    `Kamu akan menghapus *${ids.length}* produk terpilih.\n` +
    `_Aksi ini tidak bisa dibatalkan._`;

  const kb = [
    [{ text: `🗑️ YA, Hapus (${ids.length})`, callback_data: `del_exec_selected_${page}` }],
    [{ text: '❌ Batal', callback_data: `admin_del_page_${page}` }],
  ];

  try {
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
  } catch (e) {
    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
  }
});

// Eksekusi hapus terpilih
bot.action(/del_exec_selected_(\d+)/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;
  const page = parseInt(ctx.match[1], 10);

  const set = getDelSet(ctx.from.id);
  const ids = Array.from(set);
  if (ids.length === 0) return ctx.answerCbQuery('Tidak ada pilihan.', { show_alert: true });

  // SQL IN (...) aman pakai placeholders
  const placeholders = ids.map(() => '?').join(',');
  await dbRun(`DELETE FROM digital_products WHERE id IN (${placeholders})`, ids);

  // reset pilihan
  global.delSelection[ctx.from.id] = new Set();

  // refresh page (kalau halaman jadi kosong, fungsi show akan clamp sendiri)
  await showDeleteProductsPage(ctx, page);
});

// Opsional: hapus semua produk di halaman ini (tanpa pilih satu-satu)
bot.action(/del_confirm_page_(\d+)/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;
  const page = parseInt(ctx.match[1], 10);

  const msg =
    `⚠️ *Konfirmasi Hapus Halaman*\n\n` +
    `Kamu akan menghapus *SEMUA produk* yang tampil di halaman ini.\n` +
    `_Aksi ini tidak bisa dibatalkan._`;

  const kb = [
    [{ text: '🗑️ YA, Hapus Semua Halaman', callback_data: `del_exec_page_${page}` }],
    [{ text: '❌ Batal', callback_data: `admin_del_page_${page}` }],
  ];

  try {
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
  } catch (e) {
    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
  }
});

bot.action(/del_exec_page_(\d+)/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;
  const page = parseInt(ctx.match[1], 10);

  const { count } = await dbGet("SELECT COUNT(*) as count FROM digital_products");
  const totalProducts = count || 0;
  if (totalProducts === 0) return showDeleteProductsPage(ctx, 0);

  const totalPages = Math.max(1, Math.ceil(totalProducts / ADMIN_DEL_PER_PAGE));
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
  const offset = currentPage * ADMIN_DEL_PER_PAGE;

  const products = await dbAll(
    `SELECT id FROM digital_products ORDER BY id DESC LIMIT ? OFFSET ?`,
    [ADMIN_DEL_PER_PAGE, offset]
  );

  const ids = products.map(p => String(p.id));
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await dbRun(`DELETE FROM digital_products WHERE id IN (${placeholders})`, ids);
  }

  // reset pilihan
  global.delSelection[ctx.from.id] = new Set();
  await showDeleteProductsPage(ctx, currentPage);
});

// ===============================
// UI LIST DELETE (dengan toggle)
// ===============================
async function showDeleteProductsPage(ctx, page = 0) {
  if (!adminIds.includes(ctx.from.id)) return;

  const { count } = await dbGet("SELECT COUNT(*) as count FROM digital_products");
  const totalProducts = count || 0;

  if (totalProducts === 0) {
    return ctx.editMessageText('⚠️ Tidak ada produk digital.', {
      reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'admin_digital_menu' }]] }
    });
  }

  const totalPages = Math.ceil(totalProducts / ADMIN_DEL_PER_PAGE);
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
  const offset = currentPage * ADMIN_DEL_PER_PAGE;

  const products = await dbAll(
    `SELECT id, product_code, product_name, price
     FROM digital_products
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [ADMIN_DEL_PER_PAGE, offset]
  );

  const set = getDelSet(ctx.from.id);
  const selectedCount = set.size;

  let msg =
    `🗑️ *Hapus Produk (Massal)*\n` +
    `Hal ${currentPage + 1}/${totalPages}\n\n` +
    `Klik produk untuk *pilih/batal pilih*.\n` +
    `Terpilih: *${selectedCount}* produk\n\n`;

  const kb = [];

  products.forEach((p, i) => {
    const isSelected = set.has(String(p.id));
    const mark = isSelected ? '✅' : '⬜️';
    const no = offset + i + 1;

    msg += `*${no}.* ${p.product_code} — ${p.product_name}\n`;
    msg += `   Harga: Rp${Number(p.price).toLocaleString('id-ID')}\n\n`;

    kb.push([{
      text: `${mark} [${no}] ${p.product_code}`,
      callback_data: `del_toggle_${currentPage}_${p.id}`
    }]);
  });

  // Action buttons
  kb.push([
    { text: '✅ Pilih semua (halaman)', callback_data: `del_select_page_${currentPage}` },
    { text: '🧹 Clear', callback_data: `del_clear_${currentPage}` }
  ]);

  kb.push([
    { text: `🗑️ Hapus Terpilih (${selectedCount})`, callback_data: `del_confirm_selected_${currentPage}` },
    { text: '🗑️ Hapus Semua Halaman', callback_data: `del_confirm_page_${currentPage}` }
  ]);

  // Navigation
  const nav = [];
  nav.push(currentPage > 0
    ? { text: '⬅️ Prev', callback_data: `admin_del_page_${currentPage - 1}` }
    : { text: ' ', callback_data: 'ignore_nav' }
  );
  nav.push({ text: `Page ${currentPage + 1}/${totalPages}`, callback_data: 'ignore_nav' });
  nav.push(currentPage < totalPages - 1
    ? { text: 'Next ➡️', callback_data: `admin_del_page_${currentPage + 1}` }
    : { text: ' ', callback_data: 'ignore_nav' }
  );
  if (totalPages > 1) kb.push(nav);

  // Back
  kb.push([{ text: '🔙 Kembali', callback_data: 'admin_digital_menu' }]);

  try {
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
  } catch (e) {
    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
  }
}

bot.action('edit_digital_price_start', (ctx) => showEditPriceProductsPage(ctx, 0));

bot.action(/admin_price_page_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    await showEditPriceProductsPage(ctx, page);
});


bot.action(/edit_digital_prc_(\d+)/, async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    const productId = ctx.match[1];
    userState[ctx.from.id] = { step: 'edit_digital_price_amount', productId, timestamp: Date.now() };
    await ctx.reply(
        '💰 *Masukkan HARGA BARU (Angka saja):*\n\n_Tekan tombol di bawah untuk membatalkan._', 
        { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_edit_price' }]] }
        }
    );
});

// ===============================
// EDIT HARGA PRODUK (PAGINATION)
// ===============================
const ADMIN_PRICE_PER_PAGE = 20; // boleh kamu ubah (misal 10 / 30)

async function showEditPriceProductsPage(ctx, page = 0) {
  if (!adminIds.includes(ctx.from.id)) return;

  const row = await dbGet("SELECT COUNT(*) as count FROM digital_products");
  const totalProducts = row?.count || 0;

  if (totalProducts === 0) {
    const msg = '⚠️ Tidak ada produk digital.';
    const opt = { reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'admin_digital_menu' }]] } };

    try { return await ctx.editMessageText(msg, opt); }
    catch (e) { return await ctx.reply(msg, opt); }
  }

  const totalPages = Math.max(1, Math.ceil(totalProducts / ADMIN_PRICE_PER_PAGE));
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
  const offset = currentPage * ADMIN_PRICE_PER_PAGE;

  const products = await dbAll(
    `SELECT id, product_code, product_name, price
     FROM digital_products
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [ADMIN_PRICE_PER_PAGE, offset]
  );

  let msg = `💰 *Pilih produk untuk ubah harga* (Hal ${currentPage + 1}/${totalPages})\n\n`;
  const kb = [];

  products.forEach((p, index) => {
    const displayIndex = offset + index + 1;
    const price = Number(p.price) || 0;

    msg += `*${displayIndex}.* [${p.product_code}] ${p.product_name}\n`;
    msg += `   Harga: Rp${price.toLocaleString('id-ID')}\n\n`;

    kb.push([{
      text: `💰 [${displayIndex}] Ubah Harga`,
      callback_data: `edit_digital_prc_${p.id}`
    }]);
  });

  // Navigation
  if (totalPages > 1) {
    const nav = [];

    nav.push(currentPage > 0
      ? { text: '⬅️ Prev', callback_data: `admin_price_page_${currentPage - 1}` }
      : { text: ' ', callback_data: 'ignore_nav' }
    );

    nav.push({ text: `Page ${currentPage + 1}/${totalPages}`, callback_data: 'ignore_nav' });

    nav.push(currentPage < totalPages - 1
      ? { text: 'Next ➡️', callback_data: `admin_price_page_${currentPage + 1}` }
      : { text: ' ', callback_data: 'ignore_nav' }
    );

    kb.push(nav);
  }

  kb.push([{ text: '🔙 Kembali', callback_data: 'admin_digital_menu' }]);

  const options = { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } };

  try {
    return await ctx.editMessageText(msg, options);
  } catch (e) {
    return await ctx.reply(msg, options);
  }
}


// Handler untuk tombol batalkan edit price
bot.action('cancel_edit_price', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    delete userState[ctx.from.id];
    await ctx.editMessageText('❌ Edit harga dibatalkan.', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Digital', callback_data: 'admin_digital_menu' }]] }
    });
});

const ADMIN_NAME_PER_PAGE = 20; 

async function showEditNameProductsPage(ctx, page = 0) {
    if (!adminIds.includes(ctx.from.id)) return;
    
    const { count } = await dbGet("SELECT COUNT(*) as count FROM digital_products");
    const totalProducts = count || 0;
    
    if (totalProducts === 0) {
        return ctx.editMessageText('⚠️ Tidak ada produk digital.', { 
            reply_markup: { inline_keyboard: [[{ text: '🔙 Batal', callback_data: 'admin_digital_menu' }]] } 
        });
    }

    const totalPages = Math.ceil(totalProducts / ADMIN_NAME_PER_PAGE);
    const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
    const offset = currentPage * ADMIN_NAME_PER_PAGE;

    const products = await dbAll(
        `SELECT id, product_code, product_name FROM digital_products ORDER BY id DESC LIMIT ? OFFSET ?`, 
        [ADMIN_NAME_PER_PAGE, offset]
    );

    let msg = `📝 *Pilih produk untuk ubah nama* (Hal ${currentPage + 1}/${totalPages})\n\n`;
    
    const kb = [];
    products.forEach((p, index) => {
        const displayIndex = offset + index + 1;
        
        msg += `**[${displayIndex}]** Kode: [${p.product_code}]\n`;
        msg += `   Nama Saat Ini: **${p.product_name}**\n`;
        
        kb.push([{ 
            text: `📝 [${displayIndex}]`, 
            callback_data: `edit_digital_name_${p.id}` 
        }]);
    });
    
    const navButtons = [];
    if (currentPage > 0) {
        navButtons.push({ text: '⬅️ Previous', callback_data: `admin_name_page_${currentPage - 1}` });
    } else {
        navButtons.push({ text: ' ', callback_data: 'ignore_nav' });
    }
    navButtons.push({ text: `Page ${currentPage + 1}/${totalPages}`, callback_data: 'ignore_nav' });
    if (currentPage < totalPages - 1) {
        navButtons.push({ text: 'Next ➡️', callback_data: `admin_name_page_${currentPage + 1}` });
    } else {
        navButtons.push({ text: ' ', callback_data: 'ignore_nav' });
    }
    
    if (totalPages > 1) {
        kb.push(navButtons);
    }
    
    kb.push([{ text: '🔙 Batal', callback_data: 'admin_digital_menu' }]);

    const options = { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } };

    try {
        await ctx.editMessageText(msg, options);
    } catch (e) {
        await ctx.reply(msg, options);
    }
}

bot.action('edit_digital_name_start', (ctx) => showEditNameProductsPage(ctx, 0));

bot.action(/admin_name_page_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    await showEditNameProductsPage(ctx, page);
});

bot.action(/edit_digital_name_(\d+)/, async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    const productId = ctx.match[1];
    const product = await dbGet('SELECT product_name FROM digital_products WHERE id = ?', [productId]);
    
    if (!product) return ctx.reply('❌ Produk tidak ditemukan.');

    userState[ctx.from.id] = { step: 'edit_digital_name_input', productId, timestamp: Date.now() };
    await ctx.reply(
        `🏷 *Masukkan NAMA BARU* untuk produk *${product.product_name}*:\n\n_Tekan tombol di bawah untuk membatalkan._`, 
        { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_edit_name' }]] }
        }
    );
});

// Handler untuk tombol batalkan edit name
bot.action('cancel_edit_name', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    delete userState[ctx.from.id];
    await ctx.editMessageText('❌ Edit nama dibatalkan.', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Digital', callback_data: 'admin_digital_menu' }]] }
    });
});


// Handler Kategori saat Admin Add Produk
bot.action(/^cat_(.+)$/, async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;

  const userId = ctx.from.id;
  const state = userState[userId];
  if (!state) {
    return ctx.reply('❌ Sesi tidak ditemukan. Ulangi tambah produk.');
  }

  // ⛔ WAJIB CEK STEP
  if (state.step !== 'add_digital_product_provider') {
    console.log('❌ STEP SALAH:', state.step);
    return;
  }

  const categoryKey = ctx.match[1];
  state.category = categoryKey;

  console.log('[ADD PRODUCT] PROVIDER:', categoryKey);

  // ⬇️ BARU BOLEH KE PRICE
  state.step = 'add_digital_product_price';

  await ctx.editMessageText(
    `📦 *Provider:* ${categoryKey.replace(/_/g, ' ').toUpperCase()}\n\n💰 *Masukkan HARGA JUAL:*`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Batal', callback_data: 'cancel_add_product' }]
        ]
      }
    }
  );
});

// --- COMBINED TEXT & PHOTO HANDLER (INPUTS) ---
bot.on(['text', 'photo'], async (ctx, next) => {
    const userId = ctx.from.id;
    if (!ctx.message) return next();
    if (!userState[userId]) userState[userId] = {};
    const state = userState[userId];
    
    // ================== CEK KUOTA ==================
if (
  ctx.message.text &&
  userState[userId]?.step === 'cek_kuota_input'
) {
  let msisdn = ctx.message.text.replace(/[^\d]/g, '');

  if (msisdn.startsWith('08')) {
    msisdn = '62' + msisdn.substring(1);
  }

  delete userState[userId];

  const loading = await ctx.reply('⏳ Mengecek kuota...');

  try {
    const { data: res } = await axios.get(
      `https://apigw.kmsp-store.com/sidompul/v4/cek_kuota?msisdn=${msisdn}&isJSON=true`,
      {
        headers: {
          Authorization: 'Basic c2lkb21wdWxhcGk6YXBpZ3drbXNw',
          'X-API-Key': '60ef29aa-a648-4668-90ae-20951ef90c55',
          'X-App-Version': '4.0.0'
        },
        timeout: 30000
      }
    );

    if (!res || !res.status) {
      return ctx.telegram.editMessageText(
        ctx.chat.id,
        loading.message_id,
        null,
        '❌ Gagal cek kuota'
      );
    }

    let text = `<b>📱 Nomor:</b> <code>${msisdn}</code>\n`;
    text += `<b>📡 Operator:</b> ${res.data?.data_sp?.prefix?.value || '-'}\n`;
    text += `<b>📆 Masa Aktif:</b> ${res.data?.data_sp?.active_period?.value || '-'}\n`;
    text += `<b>⏳ Masa Tenggang:</b> ${res.data?.data_sp?.grace_period?.value || '-'}\n\n`;

    if (res.data?.hasil) {
      text += `<b>📊 Detail Kuota:</b>\n<pre>${
        res.data.hasil
          .replace(/<br>/g, '\n')
          .replace(/=+/g, '')
          .trim()
      }</pre>`;
    } else {
      text += '❌ Tidak ada info kuota.';
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      loading.message_id,
      null,
      text,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔍 Cek Lagi', callback_data: 'menu_cek_kuota' }],
            [{ text: '🏠 Menu Utama', callback_data: 'send_main_menu' }]
          ]
        }
      }
    );
  } catch (e) {
    console.error('ERROR cek kuota:', e.message);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      loading.message_id,
      null,
      '❌ Server cek kuota sedang bermasalah'
    );
  }
  return;
}
// ================== END CEK KUOTA ==================

// ================= ADMIN SUBMENU KUOTA =================
bot.action('admin_kuota_menu', async (ctx) => {
  if (!adminIds.includes(ctx.from.id)) return;

  // ❌ JANGAN sentuh state add produk di sini
  // state.step = 'add_digital_product_category'; // HAPUS

  const kb = [
    [
      { text: '📶 TSEL', callback_data: 'cat_kuota_telkomsel' },
      { text: '📶 INDOSAT', callback_data: 'cat_kuota_indosat' }
    ],
    [
      { text: '📶 XL', callback_data: 'cat_kuota_xl' },
      { text: '📶 TRI (3)', callback_data: 'cat_kuota_tri' }
    ],
    [
      { text: '📶 SMARTFREN', callback_data: 'cat_kuota_smartfren' },
      { text: '📶 AXIS', callback_data: 'cat_kuota_axis' }
    ],
    [
      { text: '📶 BY.U', callback_data: 'cat_kuota_byu' }
    ],
    [
      { text: '⬅️ Kembali', callback_data: 'admin_menu_cmd' }
    ]
  ];

  await ctx.editMessageText(
    '📶 <b>PILIH OPERATOR KUOTA</b>',
    {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: kb }
    }
  );
});

    // 1. Handle command /batal, /start, /menu (GLOBAL)
    if (ctx.message.text && ctx.message.text.startsWith('/')) {
        if (ctx.message.text.toLowerCase() === '/batal' && (Object.keys(state).length > 0 || global.depositState[userId])) { 
            const isAdm = adminIds.includes(userId);
            delete userState[userId];
            // Tambahan: Batalkan sesi deposit jika ada
            if (global.depositState[userId]) {
                if (global.depositState[userId].qrMsgId) {
                     bot.telegram.deleteMessage(userId, global.depositState[userId].qrMsgId).catch(() => {});
                }
                delete global.depositState[userId]; 
            }
            return ctx.reply('❌ Proses dibatalkan.', { reply_markup: { inline_keyboard: [[{text:`🔙 Menu ${isAdm ? 'Admin' : 'Utama'}`, callback_data:`${isAdm ? 'admin_menu_cmd' : 'send_main_menu'}` }]] } });
        }
        if (ctx.message.text === '/start' || ctx.message.text === '/menu') {
            return next(); 
        }
        return next();
    }

    // 2. Handle Deposit (Input Nominal) - GLOBAL
    if (ctx.message.text && global.depositState[userId] && global.depositState[userId].action === 'request_amount_orkut') {
        const isApiOnline = global.apiStatus.isOnline;
        if (!isApiOnline && !adminIds.includes(userId)) {
            delete global.depositState[userId];
            return ctx.reply(`⚠️ **PROSES TOPUP DIBATALKAN.**\n\nSistem pengecekan mutasi (API QRIS) sedang *Down* atau *Timeout*.\n\nDemi keamanan saldo Anda, TopUp dihentikan sementara. Coba lagi dalam 5 menit.`, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Utama', callback_data: 'send_main_menu' }]] }
            });
        }
        
        const nominal = parseInt(ctx.message.text.replace(/[^\d]/g, ''), 10);
        if (isNaN(nominal) || nominal < 100) return ctx.reply('⚠️ Nominal tidak valid. Minimal Rp100.');
        
        const depoState = global.depositState[userId];
        
        // 🔥 FIX KRITIS: Tandai sesi sudah diproses, JANGAN dihapus dulu.
        depoState.action = 'processing_deposit'; 
        
        if (ctx.message) ctx.deleteMessage().catch(()=>{}); 
        if (depoState.msgId) bot.telegram.deleteMessage(userId, depoState.msgId).catch(()=>{});

        await processDeposit(ctx, nominal);
        return;
    }

    if (Object.keys(state).length === 0 || !state.step) return next(); // Tidak ada state atau step, lewati

    // 3. Handle Broadcast Content (ADMIN ONLY)
    if (state.step === 'awaiting_broadcast_content') {
        if (!adminIds.includes(userId)) return next(); 
        delete userState[userId]; 
        if (ctx.message.photo) {
            const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            const caption = ctx.message.caption || '';
            runBroadcast(ctx, 'photo', photoId, caption);
            return;
        } else if (ctx.message.text) {
            runBroadcast(ctx, 'text', ctx.message.text);
            return;
        } else {
            userState[userId] = { step: 'awaiting_broadcast_content', timestamp: Date.now() };
            return ctx.reply('⚠️ Format tidak didukung.');
        }
    }

    if (!ctx.message.text) return; 
    const text = ctx.message.text.trim();

    // ============================================================
    // HANDLER FITUR USER LAINNYA (Digital)
    // ============================================================

    // Handle Input Nomor Tujuan (Produk Digital)
    if (state.step === 'digital_input_destination') {
        let destination = text.trim();
        // Hanya izinkan angka dan hapus semua karakter non-digit
        destination = destination.replace(/[^0-9]/g, ''); 
        
        // **PERBAIKAN: Validasi Awal Nomor Tujuan**
        if (!destination || destination.length < 8 || destination.length > 15) { 
             delete userState[userId];
             return ctx.reply(`❌ <b>Jumlah Digit Salah!</b>\nAnda memasukkan ${destination.length} digit (atau kosong).\nMinimal: 8 digit, Maksimal: 15 digit (Untuk ID Game/PLN/HP).`, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Utama', callback_data: 'send_main_menu' }]] }
            });
        }
        
        const { productCode, price, categoryKey } = state;
        
        // Cek apakah kategori membutuhkan nomor HP valid
        const requiresHp =
  typeof categoryKey === 'string' &&
  (
    categoryKey.startsWith('pulsa') ||
    categoryKey.startsWith('kuota') ||
    categoryKey === 'data' ||
    categoryKey === 'byu'
  );
        // Jika input terlihat seperti HP (10-15 digit)
        if (destination.length >= 10 && destination.length <= 15) {
            // Jika diawali 62, konversi ke 08 (untuk validasi awal, konversi final di trx)
            if (destination.startsWith('62')) {
                destination = '0' + destination.substring(2);
            }
            
            // Jika produk adalah pulsa/kuota (membutuhkan nomor HP), lakukan validasi ketat
            if (requiresHp && !destination.startsWith('08')) { 
                 delete userState[userId];
                 return ctx.reply('❌ <b>Nomor HP Tidak Valid!</b>\nUntuk produk pulsa/kuota, nomor harus diawali <code>08</code> atau <code>628</code>.', {
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Utama', callback_data: 'send_main_menu' }]] }
                });
            }
        } else if (requiresHp) {
             // Jika produk memerlukan HP tapi inputnya terlalu pendek untuk HP
             delete userState[userId];
             return ctx.reply('❌ <b>Input Tidak Valid!</b>\nProduk ini memerlukan Nomor HP yang valid (10-15 digit).', {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Utama', callback_data: 'send_main_menu' }]] }
            });
        }


        const user = await dbGet('SELECT saldo FROM users WHERE user_id = ?', [userId]);
        if (!user || user.saldo < price) {
            delete userState[userId];
            return ctx.reply(`❌ Saldo tidak cukup.\nHarga: Rp${price.toLocaleString('id-ID')}\nSaldo: Rp${(user?.saldo || 0).toLocaleString('id-ID')}`);
        }
        
        // --- PROSES KONFIRMASI ---
        const productDetail = await dbGet("SELECT product_name FROM digital_products WHERE product_code = ?", [productCode]);
        const productName = productDetail ? productDetail.product_name : productCode;

        delete userState[userId]; 
        userState[userId] = {
            step: 'awaiting_digital_confirmation',
            productCode: productCode,
            price: price,
            destination: destination,
            refId: Date.now().toString().slice(-8),
            timestamp: Date.now()
        };
        
        const messageKonfirmasi = `
🛒 <b>KONFIRMASI PEMBELIAN</b>
──────────────────────
📦 <b>Produk:</b> ${productName}
📱 <b>Tujuan:</b> <code>${destination}</code>
💰 <b>Harga:</b> Rp${price.toLocaleString('id-ID')}
──────────────────────
⚠️ <i>Pastikan Nomor Tujuan bener..</i>`;
        
        await ctx.reply(messageKonfirmasi, { 
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [
                [{ text: '✅ BELI SEKARANG', callback_data: 'confirm_digital_trx' }],
                [{ text: '❌ BATAL', callback_data: 'send_main_menu' }]
            ]} 
        });
        return; 
    }

    // ============================================================
    // ⛔ PEMBATAS ADMIN ⛔
    // ============================================================
    if (!adminIds.includes(userId)) return next();

    // 1. Admin: Check User ID Details
    if (state.step === 'check_user_id') {
        const targetId = parseInt(text);
        if (isNaN(targetId)) return ctx.reply('❌ User ID harus angka.');

        const [u, sales, topups] = await Promise.all([
            dbGet('SELECT * FROM users WHERE user_id = ?', [targetId]),
            dbGet('SELECT SUM(harga) as total_beli, COUNT(*) as total_count FROM log_penjualan WHERE user_id = ? AND action_type = "digital_success"', [targetId]),
            dbGet('SELECT SUM(amount) as total_topup FROM topup_log WHERE user_id = ? AND amount > 0', [targetId]) 
        ]);

        if (!u) return ctx.reply('❌ User ID tidak ditemukan.');
        
        const role = adminIds.includes(targetId) ? 'Admin' : 'Member';
        
        const activeLogs = await dbAll(`SELECT username, tipe_akun, harga, waktu_transaksi, action_type FROM log_penjualan WHERE user_id = ? AND nama_server = 'Digital Product' ORDER BY id DESC LIMIT 20`, [targetId]);
        
        let trxListText = "";
        if (activeLogs && activeLogs.length > 0) {
            activeLogs.forEach(log => {
                const date = log.waktu_transaksi ? new Date(log.waktu_transaksi).toLocaleDateString('id-ID') : 'N/A';
                const statusIcon = log.action_type.includes('success') ? '✅' : (log.action_type.includes('pending') ? '⏳' : '❌');
                trxListText += `• ${statusIcon} ${log.tipe_akun} (Rp${log.harga.toLocaleString('id-ID')}) - ${date}\n`;
            });
        } else {
            trxListText = "<i>Belum ada history transaksi digital.</i>";
        }

        const msg = `🔎 <b>DETAIL USER</b>\n🆔 <b>ID:</b> <code>${u.user_id}</code>\n💰 <b>Saldo:</b> Rp${u.saldo.toLocaleString('id-ID')}\n🎭 <b>Role:</b> ${role.toUpperCase()}\n📥 <b>Total Topup:</b> Rp${(topups?.total_topup || 0).toLocaleString('id-ID')}\n📤 <b>Total Belanja (Sukses):</b> Rp${(sales?.total_beli || 0).toLocaleString('id-ID')}\n\n📂 <b>HISTORY TRANSAKSI (Max 20):</b>\n${trxListText}`;

        delete userState[userId];
        return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{text:'🔙 Menu Admin', callback_data:'admin_menu_cmd'}]] } });
    }

    // 2. Admin: Mass Price Update
    if (state.step === 'input_digital_price_mass_amount') {
        const amount = parseInt(text);
        const action = state.action; 
        if (isNaN(amount) || amount <= 0) return ctx.reply('❌ Nominal harus angka positif!');
        
        const actionText = action === 'increase' ? 'kenaikan' : 'penurunan';
        const confirmKeyboard = [
            [{ text: `✅ YA, ${action === 'increase' ? 'Naikkan' : 'Turunkan'} Rp${amount.toLocaleString('id-ID')}`, callback_data: `confirm_mass_price_${action}_${amount}` }],
            [{ text: '❌ Batal', callback_data: 'admin_digital_menu' }]
        ];
        
        userState[userId] = { 
            step: 'awaiting_confirmation_digital_mass', 
            amount: amount,
            action: action,
            timestamp: Date.now()
        };
        return ctx.reply(`⚠️ Anda akan melakukan **${actionText} harga** semua produk digital sebesar **Rp${amount.toLocaleString('id-ID')}**. Lanjutkan?`, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: confirmKeyboard }
        });
    }

    // 3. Admin: Add Digital Product
    if (state.step === 'add_digital_product_code') {
        state.product_code = text.toUpperCase();
        state.step = 'add_digital_product_name';
        return ctx.reply('🏷 *Masukkan NAMA Produk:* (Contoh: XL Bebas Puas 1 Hari)\n\n_Tekan tombol di bawah untuk membatalkan._', { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_add_product' }]] }
        });
    }
    if (state.step === 'add_digital_product_name') {
  state.product_name = text;
  state.step = 'add_digital_product_category';

  // buat tombol kategori
  const buttons = Object.keys(categoryMap).map(key => {
    const cat = categoryMap[key];
    return {
      text: `${cat.icon} ${cat.header}`,
      callback_data: `cat_${key}`
    };
  });

  // 🔥 INI YANG KAMU LUPA
  const categoryKb = [];
  for (let i = 0; i < buttons.length; i += 2) {
    categoryKb.push(buttons.slice(i, i + 2));
  }

  categoryKb.push([
    { text: '❌ Batal', callback_data: 'cancel_add_product' }
  ]);

  return ctx.reply(
    '📦 *Pilih KATEGORI:*',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: categoryKb }
    }
  );
}
    if (state.step === 'add_digital_product_price') {
        const price = parseInt(text);
        if(isNaN(price) || price < 0) return ctx.reply('❌ Harga harus angka!');
        
        await dbRun(`INSERT INTO digital_products (product_code, product_name, category, price) VALUES (?, ?, ?, ?)`,
            [state.product_code, state.product_name, state.category, price])
            .then(() => {
                ctx.reply(`✅ Produk *${state.product_code}* berhasil ditambahkan!`, { 
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[{text:'🔙', callback_data:'admin_digital_menu'}]] } 
                });
            })
            .catch(e => {
                ctx.reply(`❌ Gagal menambahkan produk (Mungkin kode duplikat): ${e.message}`);
            });
        delete userState[userId];
        return;
    }
    
    // 4. Admin: Edit Digital Product Price/Name
    if (state.step === 'edit_digital_price_amount') {
        const price = parseInt(text);
        if(isNaN(price) || price < 0) return ctx.reply('❌ Harga harus angka!');
        await dbRun('UPDATE digital_products SET price = ? WHERE id = ?', [price, state.productId]); 
        delete userState[userId]; 
        return ctx.reply('✅ Harga produk berhasil diupdate.', { reply_markup: { inline_keyboard: [[{text:'🔙', callback_data:'admin_digital_menu'}]] } });
    }
    if (state.step === 'edit_digital_name_input') {
        const newName = text.trim();
        if (newName.length < 3) return ctx.reply('❌ Nama terlalu pendek. Minimal 3 karakter.');
        await dbRun('UPDATE digital_products SET product_name = ? WHERE id = ?', [newName, state.productId]); 
        delete userState[userId]; 
        return ctx.reply(`✅ Nama produk berhasil diupdate menjadi *${newName}*.`, { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{text:'🔙', callback_data:'admin_digital_menu'}]] } 
        });
    }

    // 5. Admin: Tambah Saldo Manual
    if (state.step === 'add_saldo_input_id_manual') {
        const targetId = parseInt(text);
        if (isNaN(targetId)) return ctx.reply('❌ ID User harus angka.');
        const userRow = await dbGet('SELECT user_id FROM users WHERE user_id = ?', [targetId]);
        if (!userRow) return ctx.reply(`❌ User ID ${targetId} tidak ditemukan.`);
        
        state.targetId = targetId;
        state.step = 'add_saldo_input_amount_manual';
        return ctx.reply(`✅ ID User ${targetId} ditemukan.\n\n💰 Masukkan NOMINAL saldo yang akan *ditambahkan* (Angka saja):\n\n_Tekan tombol di bawah untuk membatalkan._`, { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_add_saldo' }]] }
        });
    }
    if (state.step === 'add_saldo_input_amount_manual') {
        const amount = parseInt(text); 
        if (isNaN(amount) || amount <= 0) return ctx.reply('❌ Nominal harus angka positif.');
        
        const targetId = state.targetId;
        await Promise.all([
            dbRun('UPDATE users SET saldo = saldo + ? WHERE user_id = ?', [amount, targetId]),
            dbRun('INSERT INTO topup_log (user_id, username, amount, method, waktu) VALUES (?, ?, ?, ?, ?)', [targetId, 'Admin Manual', amount, 'Deposit Manual Admin', new Date().toISOString()])
        ]);
        
        const userRow = await dbGet('SELECT saldo FROM users WHERE user_id = ?', [targetId]);
        
        delete userState[userId]; 
        const newSaldo = userRow?.saldo || 0;
        bot.telegram.sendMessage(targetId, `💰 Saldo Anda telah ditambah sebesar *Rp${amount.toLocaleString('id-ID')}* oleh Admin.\nSaldo Baru: *Rp${newSaldo.toLocaleString('id-ID')}*`, { parse_mode: 'Markdown' }).catch(()=>{});
        
        return ctx.reply(`✅ Saldo *Rp${amount.toLocaleString('id-ID')}* berhasil ditambahkan ke User ID ${targetId}.`, { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{text:'🔙 Admin Menu', callback_data:'admin_menu_cmd'}]] }
        });
    }

    // 6. Admin: Kurangi Saldo Manual
    if (state.step === 'debit_saldo_input_id') {
        const targetId = parseInt(text);
        if (isNaN(targetId)) return ctx.reply('❌ ID User harus angka.');
        const userRow = await dbGet('SELECT user_id, saldo FROM users WHERE user_id = ?', [targetId]);
        if (!userRow) return ctx.reply(`❌ User ID ${targetId} tidak ditemukan.`);
        
        state.targetId = targetId;
        state.currentSaldo = userRow.saldo;
        state.step = 'debit_saldo_input_amount';
        return ctx.reply(`💰 Saldo User ${targetId} saat ini: *Rp${userRow.saldo.toLocaleString('id-ID')}*\n\n🔻 Masukkan NOMINAL saldo yang akan *dikurangi* (Angka saja):\n\n_Tekan tombol di bawah untuk membatalkan._`, { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_debit_saldo' }]] }
        });
    }
    if (state.step === 'debit_saldo_input_amount') {
        const amount = parseInt(text); 
        if (isNaN(amount) || amount <= 0) return ctx.reply('❌ Nominal harus angka positif.');
        
        const targetId = state.targetId;
        const currentSaldo = state.currentSaldo;
        if (amount > currentSaldo) {
            delete userState[userId];
            return ctx.reply(`❌ Nominal pengurangan (*Rp${amount.toLocaleString('id-ID')}*) melebihi saldo user (*Rp${currentSaldo.toLocaleString('id-ID')}*). Transaksi dibatalkan.`);
        }

        await Promise.all([
            dbRun('UPDATE users SET saldo = saldo - ? WHERE user_id = ?', [amount, targetId]),
            dbRun('INSERT INTO topup_log (user_id, username, amount, method, waktu) VALUES (?, ?, ?, ?, ?)', [targetId, 'Admin Manual', -amount, 'Debit Manual Admin', new Date().toISOString()])
        ]);
        
        const userRow = await dbGet('SELECT saldo FROM users WHERE user_id = ?', [targetId]);
        delete userState[userId]; 
        const newSaldo = userRow?.saldo || 0;
        bot.telegram.sendMessage(targetId, `⚠️ Saldo Anda telah dikurangi sebesar *Rp${amount.toLocaleString('id-ID')}* oleh Admin.\nSaldo Baru: *Rp${newSaldo.toLocaleString('id-ID')}*`, { parse_mode: 'Markdown' }).catch(()=>{});
        
        return ctx.reply(`✅ Saldo *Rp${amount.toLocaleString('id-ID')}* berhasil dikurangi dari User ID ${targetId}.`, { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{text:'🔙 Admin Menu', callback_data:'admin_menu_cmd'}]] }
        });
    }

    return next();
});

// Handler untuk tombol batalkan add saldo
bot.action('cancel_add_saldo', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    delete userState[ctx.from.id];
    await ctx.editMessageText('❌ Penambahan saldo dibatalkan.', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Admin', callback_data: 'admin_menu_cmd' }]] }
    });
});

// Handler untuk tombol batalkan debit saldo
bot.action('cancel_debit_saldo', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    delete userState[ctx.from.id];
    await ctx.editMessageText('❌ Pengurangan saldo dibatalkan.', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Admin', callback_data: 'admin_menu_cmd' }]] }
    });
});


// --- TOPUP SYSTEM ---
bot.action('menu_topup', async (ctx) => {
    const isApiOnline = await checkApiStatus();
    
    if (!global.fastCache.buttonConfig.topup_saldo) return ctx.reply('❌ Fitur Topup saat ini dinonaktifkan oleh Admin.');

    if (!isApiOnline && !adminIds.includes(ctx.from.id)) {
        delete global.depositState[ctx.from.id];
        const warning = `
⚠️ **SISTEM QRIS GANGGUAN**
Mohon maaf, sistem pengecekan pembayaran otomatis (API Mutasi) sedang *DOWN* atau *TIMEOUT*.
Demi keamanan saldo Anda, TopUp via QRIS diblokir sementara.
_Silakan coba lagi dalam 5 menit._
`;
        return ctx.reply(warning, { 
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '🔄 Coba Lagi', callback_data: 'menu_topup' }, { text: '🔙 Kembali', callback_data: 'send_main_menu' }]] }
        });
    }
    
    if (global.depositState[ctx.from.id] && global.depositState[ctx.from.id].action === 'request_amount_orkut') {
        return ctx.answerCbQuery('Anda sudah dalam mode permintaan nominal topup.', { cache_time: 5 });
    }

    const text = `💰 *MENU DEPOSIT SALDO*\n\nSilahkan ketik nominal topup (Min Rp100).\n_Pembayaran via QRIS (Otomatis)._`;
    const markup = { inline_keyboard: [[{ text: "🔙 Kembali", callback_data: "send_main_menu" }]] };
    let msg;
    try { 
        msg = await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: markup }); 
    } 
    catch (e) { 
        msg = await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: markup }); 
    }
    global.depositState[ctx.from.id] = { action: 'request_amount_orkut', amount: '', msgId: msg.message_id, timestamp: Date.now() }; 
});

bot.action('toggle_topup_saldo', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    const config = global.fastCache.buttonConfig;
    config.topup_saldo = !config.topup_saldo;
    fs.writeFileSync(BUTTON_CONFIG_FILE, JSON.stringify(config, null, 2));
    global.fastCache.buttonConfig = config;
    await sendAdminMenu(ctx);
});

// ===== RATE LIMIT (taruh di scope global file) =====
let lastRequestTime = 0;
const requestInterval = 3000; // 3 detik (ubah sesuai mau)

function generateRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function processDeposit(ctx, amount) {
  // 0) fitur dimatikan admin
  if (!global.fastCache?.buttonConfig?.topup_saldo) {
    return ctx.reply('❌ Fitur Topup saat ini dinonaktifkan oleh Admin.');
  }

  // 1) rate limit request
  const now = Date.now();
  if (now - lastRequestTime < requestInterval) {
    return ctx.reply('⚠️ *Terlalu banyak permintaan. Silakan tunggu sebentar sebelum mencoba lagi.*', {
      parse_mode: 'Markdown',
    });
  }
  lastRequestTime = now;

  const userId = ctx.from.id;

  // 2) buat unique code + nominal unik
  const uniqueCode = `depo-${userId}-${Date.now()}`; // konsisten dg batal_topup_...
  const uniqueSuffix = generateRandomNumber(1, 300); // 1..300
  const finalAmount = Number(amount) + uniqueSuffix;
  const adminFee = finalAmount - Number(amount);
  const depositTimestamp = Date.now();

  // 3) pesan loading
  const loadingMsg = await ctx.reply('⏳ Membuat Pembayaran Anda...');

  try {
    const axios = require('axios');

    const urlQr = DATA_QRIS;   // codeqr
    const auth_apikey = auth_paymet_getway; // apikey orderkuota

    // 4) create payment -> dapat URL gambar QRIS
    const bayar = await axios.get(
      `https://api.rajaserverpremium.web.id/orderkuota/createpayment?apikey=${encodeURIComponent(auth_apikey)}&amount=${encodeURIComponent(finalAmount)}&codeqr=${encodeURIComponent(urlQr)}`,
      { timeout: 15000 }
    );

    const get = bayar.data;
    if (!get || get.status !== 'success') {
      throw new Error('Gagal membuat QRIS: ' + JSON.stringify(get));
    }

    const qrImageUrl = get.result?.imageqris?.url;
    if (!qrImageUrl || String(qrImageUrl).includes('undefined')) {
      throw new Error('URL QRIS tidak valid: ' + qrImageUrl);
    }

    // 5) download QR image jadi buffer
    const qrResponse = await axios.get(qrImageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
    });
    const qrBuffer = Buffer.from(qrResponse.data);

    // 6) hapus loading
    await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});

    // 7) kirim QR
    const caption =
      `✅ *Pembayaran Via QRIS*\n\n` +
      `💰 *Total Bayar:* Rp${finalAmount.toLocaleString('id-ID')} _(Wajib Persis)_\n` +
      `- Nominal Top Up: Rp${Number(amount).toLocaleString('id-ID')}\n` +
      `- Admin Fee: Rp${adminFee.toLocaleString('id-ID')}\n\n` +
      `⏱️ *Batas Pembayaran:* 60 menit\n\n` +
      `_Jika sudah melakukan pembayaran, silakan tunggu beberapa detik._\n` +
      `_Jika dalam 1 jam saldo belum masuk, hubungi admin._`;

    const qrMsg = await ctx.replyWithPhoto(
      { source: qrBuffer },
      {
        caption,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '❌ Batal', callback_data: `batal_topup_${uniqueCode}` }]],
        },
      }
    );

    // 8) simpan ke DB
    // pakai dbRun kalau ada, fallback ke db.run
    const username = ctx.from.username || String(userId);

    if (typeof dbRun === 'function') {
      await dbRun(
        `INSERT INTO pending_deposits (unique_code, user_id, username, amount, original_amount, timestamp, status, qr_message_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uniqueCode, userId, username, finalAmount, Number(amount), depositTimestamp, 'pending', qrMsg.message_id]
      ).catch(logger.error);
    } else {
      db.run(
        `INSERT INTO pending_deposits (unique_code, user_id, username, amount, original_amount, timestamp, status, qr_message_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uniqueCode, userId, username, finalAmount, Number(amount), depositTimestamp, 'pending', qrMsg.message_id],
        (err) => err && logger.error('Gagal insert pending_deposits:', err.message)
      );
    }

    // 9) simpan ke memory global
    if (!global.pendingDeposits) global.pendingDeposits = {};
    global.pendingDeposits[uniqueCode] = {
      amount: finalAmount,
      originalAmount: Number(amount),
      userId,
      timestamp: depositTimestamp,
      status: 'pending',
      qrMessageId: qrMsg.message_id,
    };

    // 10) FIX KRITIS: hapus depositState hanya setelah sukses create QR + save
    if (global.depositState && global.depositState[userId]) {
      delete global.depositState[userId];
    }

    // Optional: hapus pesan user input nominal (kalau konteksnya message biasa)
    try {
      await ctx.deleteMessage().catch(() => {});
    } catch (e) {
      // amanin aja
    }
  } catch (error) {
    logger.error('❌ Kesalahan saat memproses deposit:', error?.message || error);

    // hapus loading kalau masih ada
    await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});

    await ctx.reply('❌ *GAGAL! Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi nanti.*', {
      parse_mode: 'Markdown',
    });

    // bersihkan state
    if (global.depositState && global.depositState[userId]) delete global.depositState[userId];
    if (global.pendingDeposits && global.pendingDeposits[uniqueCode]) delete global.pendingDeposits[uniqueCode];

    // bersihkan DB pending jika sempat kebuat (kadang belum)
    db.run('DELETE FROM pending_deposits WHERE unique_code = ?', [uniqueCode], (err) => {
      if (err) logger.error('Gagal hapus pending_deposits (error):', err.message);
    });
  }
}

bot.action(/^batal_topup_(.+)$/, async (ctx) => {
    const code = ctx.match[1];
    const depositData = global.pendingDeposits[code];
    if (depositData && depositData.qrMessageId) {
        bot.telegram.deleteMessage(ctx.from.id, depositData.qrMessageId).catch(() => {});
    }

    dbRun('DELETE FROM pending_deposits WHERE unique_code = ?', [code]).catch(logger.error);
    delete global.pendingDeposits[code];
    try {
        await ctx.editMessageText('❌ Topup dibatalkan.', { reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Utama', callback_data: 'send_main_menu' }]] } });
    } catch (e) {
        await ctx.reply('❌ Topup dibatalkan.', { reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Utama', callback_data: 'send_main_menu' }]] } });
    }
});

const { exec } = require('child_process');

// =======================
// SOCKS PROXY POOL
// =======================
const SOCKS_POOL = [
  'aristore:1447@idnusa.rajaserverpremium.web.id:1080',
  'aristore:1447@biznet.rajaserverpremium.web.id:1080',
];

function getRandomProxy() {
  return SOCKS_POOL[Math.floor(Math.random() * SOCKS_POOL.length)];
}

function parseSocks(proxyStr) {
  // "user:pass@host:port"
  const [auth, hostport] = proxyStr.split('@');
  const [user, pass] = auth.split(':');
  return { hostport, user, pass };
}

function onlyDigits(v) {
  return Number(String(v || '0').replace(/\D/g, '')) || 0;
}

// =======================
// ORDERKUOTA MUTASI (CURL + SOCKS)
// =======================
const WEB_MUTASI = vars.web_mutasi;                 // contoh: https://app.orderkuota.com/api/v2/qris/mutasi/1540779
const AUTH_USER  = vars.auth_username_mutasi;
const AUTH_TOKEN = vars.auth_token_mutasi;

function cekQRISOrderKuota() {
  return new Promise((resolve, reject) => {
    const { hostport, user, pass } = parseSocks(getRandomProxy());

    const cmd = `
curl --silent --compressed \
  --connect-timeout 10 --max-time 20 \
  --socks5-hostname '${hostport}' \
  --proxy-user '${user}:${pass}' \
  -X POST '${WEB_MUTASI}' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Accept-Encoding: gzip' \
  -H 'User-Agent: okhttp/4.12.0' \
  --data-urlencode 'requests[qris_history][page]=1' \
  --data-urlencode 'auth_username=${AUTH_USER}' \
  --data-urlencode 'auth_token=${AUTH_TOKEN}'
`.trim();

    exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      const out = (stdout || '').trim();
      logger.info(`[QRIS]: ${stdout}`);
      if (!out) return reject(new Error('Empty response from curl'));
      try {
        resolve(JSON.parse(out));
      } catch (e) {
        reject(new Error(`Invalid JSON: ${out.slice(0, 200)}`));
      }
    });
  });
}

// =======================
// NORMALISASI MUTASI (biar mirip bawaan)
// mutations => [{ amount, issuer_reff }]
// =======================
function normalizeMutations(qrisData) {
  const list = qrisData?.qris_history?.results || [];
  return list
    .filter(tx => String(tx.status || '').toUpperCase() === 'IN')
    .map(tx => ({
      amount: onlyDigits(tx.kredit), // kredit "1.271" => 1271
      issuer_reff: tx.issuer_reff || tx.reff || tx.trx_id || tx.id || tx.tanggal || 'REF_UNKNOWN',
      raw: tx
    }));
}

// =======================
// LOOP CEK QRIS (MODEL BAWAAN, SUMBER MUTASI BARU)
// =======================
if (!global.processedTransactions) global.processedTransactions = new Set();
if (!global.qrisHealth) global.qrisHealth = { checking: false, blockedUntil: 0 };

async function checkQRISStatus() {
  // anti overlap
  if (global.qrisHealth.checking) return;
  if (Date.now() < global.qrisHealth.blockedUntil) return;

  const pendingKeys = Object.keys(global.pendingDeposits || {});
  if (pendingKeys.length === 0) return;

  // Jangan cek API jika offline
  if (global.apiStatus && global.apiStatus.isOnline === false) return;

  global.qrisHealth.checking = true;

  try {
    // 1) ambil mutasi terbaru dari OrderKuota (curl)
    const qrisData = await cekQRISOrderKuota();

    if (!qrisData?.success || !qrisData?.qris_history?.success) {
      // rate limit handling (kalau msg ada)
      const msg = String(qrisData?.message || qrisData?.msg || '');
      const kenaLimit =
        msg.toLowerCase().includes('terlalu sering') ||
        msg.toLowerCase().includes('5 menit');

      if (kenaLimit) {
        global.qrisHealth.blockedUntil = Date.now() + (5 * 60 * 1000) + 5000;
        logger.warn(`[QRIS] Rate-limited. Pause until ${new Date(global.qrisHealth.blockedUntil).toISOString()}`);
      } else {
        logger.warn(`[QRIS] OrderKuota invalid: ${JSON.stringify(qrisData).slice(0, 300)}`);
      }
      return;
    }

    const mutations = normalizeMutations(qrisData);

    // 2) proses pending paralel (model bawaan)
    await Promise.all(pendingKeys.map(async (uniqueCode) => {
      const data = global.pendingDeposits[uniqueCode];
      if (!data) return;

      const now = Date.now();
      const depositTime = Number(data.timestamp || 0);

      // ✅ cek match DULU (biar gak expired padahal sudah bayar telat)
      const match = mutations.find(trx => onlyDigits(trx.amount) === onlyDigits(data.amount));

      if (match) {
        const trxKey = `${match.issuer_reff || 'REF_UNKNOWN'}_${onlyDigits(match.amount)}`;

        if (!global.processedTransactions.has(trxKey)) {
          global.processedTransactions.add(trxKey);

          try {
            // kalau kamu mau saldo sesuai nominal ASLI -> pakai originalAmount
            // kalau mau saldo sesuai bayar UNIK -> pakai data.amount
            const addSaldo = data.originalAmount || onlyDigits(data.amount);

            await successDeposit(data.userId, addSaldo, trxKey, 'QRIS Orkut', data.qrMessageId);

            delete global.pendingDeposits[uniqueCode];
            await dbRun('DELETE FROM pending_deposits WHERE unique_code = ?', [uniqueCode]).catch(()=>{});
          } catch (e) {
            global.processedTransactions.delete(trxKey);
            logger.error(`❌ successDeposit gagal (${uniqueCode}):`, e?.message || e);
          }
        } else {
          // duplikat -> hapus pending biar tidak nyangkut
          logger.warn(`⚠️ Mutasi duplikat DITOLAK: ${trxKey}`);
          delete global.pendingDeposits[uniqueCode];
          await dbRun('DELETE FROM pending_deposits WHERE unique_code = ?', [uniqueCode]).catch(()=>{});
        }

        return;
      }

      // 1) PEMBATALAN WAKTU HABIS (10 menit)
      if (now - depositTime > 10 * 60 * 1000) {
        bot.telegram.deleteMessage(data.userId, data.qrMessageId).catch(() => {});
        bot.telegram.sendMessage(
          data.userId,
          '❌ Waktu pembayaran QRIS habis (10 menit). Transaksi dibatalkan. Silakan ulangi TopUp.',
          { reply_markup: { inline_keyboard: [[{ text: '💳 Top Up Saldo', callback_data: 'menu_topup' }]] } }
        ).catch(() => {});

        delete global.pendingDeposits[uniqueCode];
        return dbRun('DELETE FROM pending_deposits WHERE unique_code = ?', [uniqueCode]).catch(()=>{});
      }

      // 2) PEMBATALAN TRANSAKSI SANGAT LAMA (2 jam)
      if (now - depositTime > 2 * 60 * 60 * 1000) {
        logger.warn(`🗑️ CLEANUP: Menghapus deposit ${uniqueCode} (${data.amount}) karena terlalu tua (>2 jam).`);
        bot.telegram.deleteMessage(data.userId, data.qrMessageId).catch(() => {});
        delete global.pendingDeposits[uniqueCode];
        return dbRun('DELETE FROM pending_deposits WHERE unique_code = ?', [uniqueCode]).catch(()=>{});
      }

      // belum match & belum expired
      logger.info(`⏳ Payment pending for ${uniqueCode} (amount=${onlyDigits(data.amount)})`);
    }));

  } catch (e) {
    logger.error("QRIS Check Error:", e?.message || e);
  } finally {
    global.qrisHealth.checking = false;
  }
}

// interval aman (biar gak limit). kalau maksa turbo, bisa 3000-5000ms.
setInterval(checkQRISStatus, 10_000);


// =======================
// successDeposit: versi bawaanmu (tapi aku bikin atomic biar gak miss)
// =======================
async function successDeposit(userId, amount, refId, method, msgId) {
  logger.info(`🚨 [SUCCESS DEPO TRIGGER] User ID: ${userId}, Nominal: ${amount}, Method: ${method}`);
  // ==============================
  // AUTO RUN WD PYTHON
  // ==============================
  exec(
    '/usr/bin/python3 /root/BotPPOB/wd.py >> /root/BotPPOB/wd.log 2>&1',
    { timeout: 60_000 }, // max 60 detik biar aman
    (error) => {
      if (error) {
        logger.error('❌ WD.py error:', error.message);
      } else {
        logger.info('✅ WD.py executed successfully');
      }
    }
  );
  
  const add = onlyDigits(amount);
  if (add <= 0) throw new Error(`Amount invalid: ${amount}`);

  // Pastikan user ada
  await dbRun('INSERT OR IGNORE INTO users (user_id, saldo) VALUES (?, 0)', [userId]);

  // ✅ ATOMIC ADD (langsung saldo + add, ga perlu select dulu)
  await dbRun('UPDATE users SET saldo = COALESCE(saldo,0) + ? WHERE user_id = ?', [add, userId]);

  // ambil saldo terbaru
  const userRowAfter = await dbGet('SELECT saldo FROM users WHERE user_id = ?', [userId]);
  const currentSaldo = Number(userRowAfter?.saldo) || 0;

  // log topup (kalau tabel ada)
  try {
    await dbRun(
      'INSERT INTO topup_log (user_id, amount, method, waktu) VALUES (?, ?, ?, ?)',
      [userId, add, method, new Date().toISOString()]
    );
  } catch (e) {
    // kalau tabel / kolom belum ada, skip aja biar gak gagal topup
    logger.warn(`⚠️ topup_log skip: ${e.message}`);
  }

  if (msgId) { try { await bot.telegram.deleteMessage(userId, msgId); } catch (e) {} }

  // Pesan untuk User
  const msgUser =
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ <b>TOP UP BERHASIL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 <b>Nominal:</b> Rp${add.toLocaleString('id-ID')}\n` +
    `💳 <b>Metode:</b> ${method}\n` +
    `👤 <b>Saldo Sekarang:</b> Rp${currentSaldo.toLocaleString('id-ID')}\n` +
    `🧾 <b>Ref:</b> <code>${String(refId || '-')}</code>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━`;

  bot.telegram.sendMessage(userId, msgUser, { parse_mode: 'HTML' }).catch(()=>{});

  // NOTIFIKASI (opsional, tetap seperti bawaan)
  try {
    const userChat = await bot.telegram.getChat(userId).catch(() => ({ first_name: 'User', username: null }));
    const userTag = userChat.username ? `@${userChat.username}` : userChat.first_name;

    const msgNotif = `<blockquote>
✅️ <b>Top Up Berhasil</b>
━━━━━━━━━━━━━━━━━━
👤 <b>User:</b> ${userTag}
🆔 <b>ID:</b> <code>${userId}</code>
💰 <b>Nominal:</b> Rp${add.toLocaleString('id-ID')}
💳 <b>Metode:</b> ${method}
🧾 <b>Ref:</b> <code>${String(refId || '-')}</code>
✅ <b>Saldo Akhir:</b> Rp${currentSaldo.toLocaleString('id-ID')}
━━━━━━━━━━━━━━━━━━
</blockquote>`;

    if (typeof ID_GRUP_NOTIP !== 'undefined' && ID_GRUP_NOTIP) {
      bot.telegram.sendMessage(ID_GRUP_NOTIP, msgNotif, { parse_mode: 'HTML' }).catch(() => {});
    }
  } catch (e) {
    logger.error("Gagal mengirim notif topup:", e.message);
  }

  try { if (typeof refreshGlobalStats === 'function') refreshGlobalStats().catch(()=>{}); } catch {}
}

// -----------------------------------------------------------------
// 🔥 FUNGSI AUTO BACKUP (3 FILE SQLITE)
// -----------------------------------------------------------------
async function autoBackup() {
    const nowTime = new Date().toLocaleTimeString('id-ID');

    try {
        // Paksa WAL ditulis ke disk (lebih aman)
        await dbRun("PRAGMA wal_checkpoint(TRUNCATE);");
        logger.info("✅ WAL checkpoint success");

        const files = [
            { path: `${dbPath}`, name: 'sellppob.db' },
            { path: `${dbPath}-wal`, name: 'sellppob.db-wal' },
            { path: `${dbPath}-shm`, name: 'sellppob.db-shm' }
        ];

        for (const adminId of adminIds) {
            for (const file of files) {
                if (!fs.existsSync(file.path)) {
                    logger.warn(`⚠️ File tidak ditemukan: ${file.path}`);
                    continue;
                }

                await bot.telegram.sendDocument(
                    adminId,
                    { source: fs.createReadStream(file.path), filename: file.name },
                    {
                        caption: `📦 Backup OTOMATIS\n🕒 Jam: ${nowTime}\n📄 File: ${file.name}`,
                        parse_mode: 'Markdown'
                    }
                );

                logger.info(`✅ Backup ${file.name} terkirim ke Admin ${adminId}`);
            }
        }

        logger.info("✅ Auto Backup 3 FILE selesai");

    } catch (e) {
        logger.error("❌ Auto Backup Error:", e.message);

        for (const adminId of adminIds) {
            bot.telegram.sendMessage(
                adminId,
                `⚠️ *GAGAL BACKUP DATABASE*\n\n${e.message}`,
                { parse_mode: 'Markdown' }
            ).catch(logger.error);
        }
    }
}

// ⏱️ SETIAP 3 JAM
setInterval(autoBackup, 3 * 60 * 60 * 1000);

// =========================================================================
// 📜 FITUR ADMIN: RIWAYAT TRANSAKSI DIGITAL
// =========================================================================
bot.action('admin_digital_history', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;

    await ctx.editMessageText("⏳ <b>Memuat Data Riwayat Digital...</b>", { parse_mode: 'HTML' }).catch(()=>{});

    try {
        const logs = await dbAll(`
            SELECT * FROM log_penjualan 
            WHERE nama_server = 'Digital Product'
            ORDER BY id DESC LIMIT 15
        `);

        if (!logs || logs.length === 0) {
            return ctx.editMessageText("⚠️ <b>Belum ada riwayat transaksi produk digital.</b>", { 
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Admin', callback_data: 'admin_menu_cmd' }]] }
            });
        }

        let msg = "📜 <b>RIWAYAT DIGITAL (15 Terakhir)</b>\n──────────────────────\n";

        logs.forEach((log) => {
            let statusIcon = "❓";
            if (log.action_type === 'digital_success') statusIcon = "✅"; 
            else if (log.action_type === 'digital_pending') statusIcon = "⏳";
            else if (log.action_type.includes('failed') || log.action_type.includes('error')) statusIcon = "❌"; 

            const date = log.waktu_transaksi ? new Date(log.waktu_transaksi).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'N/A';

            msg += `${statusIcon} <b>${log.tipe_akun}</b> ➜ <code>${log.username || log.user_id}</code>\n`;
            msg += `   └ 🗓 ${date} | 💰 Rp${log.harga.toLocaleString('id-ID')}\n\n`;
        });

        msg += "──────────────────────";

        await ctx.editMessageText(msg, { 
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [
                [{ text: '🔄 Refresh', callback_data: 'admin_digital_history' }],
                [{ text: '🔙 Menu Admin', callback_data: 'admin_menu_cmd' }]
            ]}
        });

    } catch (e) {
        await ctx.editMessageText(`❌ <b>Error Database:</b>\n${e.message}`, { 
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Admin', callback_data: 'admin_menu_cmd' }]] }
        });
    }
});


// --- NAVIGASI UMUM ---
bot.action('send_main_menu', async (ctx) => {
    await sendMainMenu(ctx);
});

// --- ADMIN: TAMBAH SALDO MANUAL START ---
bot.action('add_saldo_start', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    userState[ctx.from.id] = { step: 'add_saldo_input_id_manual', timestamp: Date.now() };
    await ctx.editMessageText('💰 *TAMBAH SALDO MANUAL*\n\nMasukkan ID User yang akan ditambahkan saldonya:\n\n_Tekan tombol di bawah untuk membatalkan._', { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_add_saldo' }]] } 
    });
});

// --- ADMIN: KURANGI SALDO MANUAL START ---
bot.action('debit_saldo_start', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    userState[ctx.from.id] = { step: 'debit_saldo_input_id', timestamp: Date.now() };
    await ctx.editMessageText('🔻 *KURANGI SALDO MANUAL*\n\nMasukkan ID User yang akan dikurangi saldonya:\n\n_Tekan tombol di bawah untuk membatalkan._', { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_debit_saldo' }]] } 
    });
});

// --- ADMIN: CHECK USER START ---
bot.action('admin_check_user', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    userState[ctx.from.id] = { step: 'check_user_id', timestamp: Date.now() };
    await ctx.editMessageText('🔍 *CHECK USER*\n\nMasukkan ID User yang ingin Anda periksa:\n\n_Tekan tombol di bawah untuk membatalkan._', { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan', callback_data: 'cancel_check_user' }]] } 
    });
});

// Handler untuk tombol batalkan check user
bot.action('cancel_check_user', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    delete userState[ctx.from.id];
    await ctx.editMessageText('❌ Pemeriksaan user dibatalkan.', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Admin', callback_data: 'admin_menu_cmd' }]] }
    });
});

// -----------------------------------------------------------------
// 💾 HANDLER BACKUP DATABASE MANUAL 
// -----------------------------------------------------------------
bot.action('manual_backup', async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;
    
    await ctx.editMessageText('⏳ Sedang memproses backup database. File akan dikirim ke chat Anda setelah selesai...');

    try {
        await autoBackup(); 
        await ctx.editMessageText('✅ Backup Database Selesai. File telah dikirim ke chat Anda.', {
            reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Admin', callback_data: 'admin_menu_cmd' }]] }
        });
    } catch (e) {
        logger.error("Manual Backup Error:", e.message);
        await ctx.editMessageText(`❌ Gagal melakukan Backup Manual: ${e.message}`, {
            reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Admin', callback_data: 'admin_menu_cmd' }]] }
        });
    }
});


// --- NAVIGASI: Ignore ---
bot.action('ignore_nav', (ctx) => ctx.answerCbQuery('Hanya tombol navigasi.', { cache_time: 5 }));

// --- FIX FINAL: Handler Konfirmasi Transaksi (Garis Seragam) ---
bot.action('confirm_digital_trx', async (ctx) => {
    const userId = ctx.from.id;
    const state = userState[userId];

    if (!state || state.step !== 'awaiting_digital_confirmation') {
        return ctx.answerCbQuery("❌ Sesi kadaluarsa, silakan ulangi pembelian.", { show_alert: true });
    }

    const { productCode, destination, price, refId } = state;   
    const snTrx = `TRX-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${refId}`;

    try {
        await ctx.answerCbQuery("⏳ Sedang memproses transaksi...", { cache_time: 10 });
        await ctx.editMessageText("⏳ <b>Sedang memproses ke suplier...</b>", { parse_mode: 'HTML' });

        let finalDestination = destination.replace(/\D/g, '');
        if (finalDestination.startsWith('62')) {
            finalDestination = '0' + finalDestination.substring(2);
        }
                        
        // --- STEP 1: POTONG SALDO ---
        const userCheck = await dbGet('SELECT saldo FROM users WHERE user_id = ?', [userId]);
        if (!userCheck || userCheck.saldo < price) {
            return ctx.reply("❌ Saldo Anda tidak mencukupi.");
        }
        await dbRun('UPDATE users SET saldo = saldo - ? WHERE user_id = ?', [price, userId]);

        // Ambil sisa saldo untuk ditampilkan di struk
        const userRow = await dbGet('SELECT saldo FROM users WHERE user_id = ?', [userId]);
        const sisaSaldo = Number(userRow?.saldo) || 0;

        // --- STEP 2: EKSEKUSI API ---
        const result = await processDigitalProduct(productCode, finalDestination, refId);
        const logUsername = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || userId);
        const statusStr = (result.status || 'PENDING').toUpperCase(); 

        let userMessage = "";
        let logStatusText = "";
        const line = "━━━━━━━━━━━━━━━━━━";

        // --- STEP 3: LOGIKA STATUS (FORMAT SERAGAM) ---
        switch (statusStr) {
            case 'SUCCESS':
                userMessage = `✅ <b>PEMBELIAN BERHASIL!</b>\n` +
                              `${line}\n` +
                              `📦 <b>Produk:</b> ${productCode}\n` +
                              `📱 <b>Tujuan:</b> <code>${finalDestination}</code>\n` +
                              `💰 <b>Harga:</b> Rp${price.toLocaleString('id-ID')}\n` +
                              `💳 <b>Sisa Saldo:</b> Rp${sisaSaldo.toLocaleString('id-ID')}\n` +
                              `${line}\n` +
                              `✨ <i>Terima kasih telah berlangganan!</i>`;
                logStatusText = "BERHASIL ✅";
                break;

            case 'FAILED':
                // Refund Saldo
                await dbRun('UPDATE users SET saldo = saldo + ? WHERE user_id = ?', [price, userId]);
                userMessage = `❌ <b>TRANSAKSI GAGAL</b>\n` +
                              `${line}\n` +
                              `📦 <b>Produk:</b> ${productCode}\n` +
                              `📱 <b>Tujuan:</b> <code>${finalDestination}</code>\n` +
                              `💰 <b>Refund:</b> Rp${price.toLocaleString('id-ID')}\n` +
                              `📝 <b>Status:</b> Gangguan Sistem\n` +
                              `${line}\n` +
                              `⚠️ <i>Saldo Anda telah dikembalikan.</i>`;
                logStatusText = "GAGAL / REFUNDED ❌";
                break;

            default: // PENDING (SAMA DENGAN BERHASIL)
                userMessage = `⏳️ <b>PEMBELIAN DI PROSES</b>\n` +
                              `${line}\n` +
                              `📦 <b>Produk:</b> ${productCode}\n` +
                              `📱 <b>Tujuan:</b> <code>${finalDestination}</code>\n` +
                              `💰 <b>Harga:</b> Rp${price.toLocaleString('id-ID')}\n` +
                              `💳 <b>Sisa Saldo:</b> Rp${sisaSaldo.toLocaleString('id-ID')}\n` +
                              `${line}\n` +
                              `😘 <i>Terimakasih sudah order</i>`;
                logStatusText = "BERHASIL ✅️";
                break;
        }

        // --- STEP 4: KIRIM KE USER ---
        await ctx.editMessageText(userMessage, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '🔙 Menu Utama', callback_data: 'send_main_menu' }]] }
        }).catch(() => ctx.reply(userMessage, { parse_mode: 'HTML' }));

        // --- STEP 5: NOTIFIKASI ADMIN/GRUP ---
        sendUniversalNotif(
  logUsername,
  userId,
  productCode,
  finalDestination,
  price,
  logStatusText,
  snTrx
);

        // --- STEP 6: LOG DATABASE ---
        await dbRun(`INSERT INTO log_penjualan (user_id, username, nama_server, tipe_akun, harga, masa_aktif_hari, waktu_transaksi, action_type, user_role) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                     [userId, logUsername, 'Digital Product', productCode, price, 0, new Date().toISOString(), `digital_${statusStr.toLowerCase()}`, 'member']);
        
        delete userState[userId];

    } catch (error) {
        console.error("Error konfirmasi:", error);
        ctx.reply("❌ Terjadi kesalahan fatal pada sistem.");
    }
});

// ================== SENSOR NOMOR ==================
function maskProduct(product) {
  if (!product) return '-';
  const visible = 2; // jumlah huruf awal yang ditampilkan
  if (product.length <= visible) return '****';
  return product.slice(0, visible) + '****';
}

function maskPhone(number = '') {
    if (!number) return '-';
    const str = String(number);
    if (str.length <= 4) return '*'.repeat(str.length);
    return str.slice(0, 3) + '*'.repeat(str.length - 5) + str.slice(-2);
}
// =================================================

/**
 * Fungsi Pembantu: Notifikasi Universal
 */
function sendUniversalNotif(username, userId, product, target, price, status, snTrx) {
    const msgLaporan = `<blockquote>
✅️ <b>PEMBELIAN SUKSES</b>
━━━━━━━━━━━━━━━━━━
👤 <b>User:</b> <b>${username}</b>
🆔 <b>ID</b> (<code>${userId}</code>)
📦 <b>Produk:</b> ${maskProduct(product)}
📱 <b>Tujuan:</b> <code>${maskPhone(target)}</code>
💰 <b>Harga:</b> Rp${price.toLocaleString('id-ID')}
🧾 <b>SN:</b> <code>${snTrx}</code>
📝 <b>Status:</b> ${status}
━━━━━━━━━━━━━━━━━━
</blockquote>`

    // Kirim ke Grup
    if (typeof ID_GRUP_NOTIP !== 'undefined' && ID_GRUP_NOTIP) {
        bot.telegram.sendMessage(ID_GRUP_NOTIP, msgLaporan, { parse_mode: 'HTML' })
            .catch(e => console.error("Gagal kirim grup:", e.message));
    }

    // Kirim ke Admin
    if (typeof adminIds !== 'undefined' && Array.isArray(adminIds)) {
        for (const adminId of adminIds) {
            bot.telegram.sendMessage(adminId, msgLaporan, { parse_mode: 'HTML' })
                .catch(e => console.error(`Gagal kirim ke admin ${adminId}:`, e.message));
        }
    }
}

bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  const text = (ctx.message?.text || '').trim();
  const state = userState[userId];

  // Kalau tidak ada state, biarkan (jangan error)
  if (!state) return;

  // =========================================================
  // ✅ ROUTER 1: MASSAL INPUT
  // =========================================================
  // =========================================================
// ✅ ROUTER 1: MASSAL INPUT (FIX: 1 koneksi DB + transaksi stabil)
// =========================================================
if (state.step === 'massal_input_lines') {
  if (!adminIds.includes(userId)) {
    delete userState[userId];
    return ctx.reply('❌ Akses ditolak.');
  }

  if (text.toLowerCase() === 'batal') {
    delete userState[userId];
    return ctx.reply('❌ Penambahan produk massal dibatalkan.');
  }

  const MAX_PRICE = 200000;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return ctx.reply('⚠️ Tidak ada baris yang terbaca.');

  const onlyNumber = (s) => Number(String(s || '').replace(/[^\d]/g, ''));

  const ok = [];
  const bad = [];

  let providerMap;
  if (state.category_root === 'pulsa') providerMap = pulsaChildrenMap;
  else if (state.category_root === 'kuota') providerMap = kuotaChildrenMap;
  else if (state.category_root === 'game') providerMap = gameChildrenMap;
  else if (state.category_root === 'pln') providerMap = plnChildrenMap;
  else if (state.category_root === 'ewallet') providerMap = ewalletChildrenMap;

  const providerInfo = providerMap?.[state.provider];
  const produkName = providerInfo?.header || state.provider;

  // ✅ Penting: transaksi harus pakai koneksi yang SAMA (jangan lewat dbRun pool)
  const db = getDbConnection();

  const runOnDb = (sql, params = []) =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Database operation timeout')), dbConfig.connectionTimeout);
      db.run(sql, params, function (err) {
        clearTimeout(t);
        if (err) reject(err);
        else resolve(this);
      });
    });

  const finalizeStmt = (stmt) =>
    new Promise((resolve, reject) => stmt.finalize((err) => (err ? reject(err) : resolve())));

  try {
    // lebih aman ambil lock tulis sejak awal
    await runOnDb('BEGIN IMMEDIATE TRANSACTION');

    const stmt = db.prepare(
      `INSERT OR REPLACE INTO digital_products
       (product_code, product_name, category, price)
       VALUES (?, ?, ?, ?)`
    );

    const stmtRun = (params) =>
      new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Database operation timeout')), dbConfig.connectionTimeout);
        stmt.run(params, function (err) {
          clearTimeout(t);
          if (err) reject(err);
          else resolve(this);
        });
      });

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const parts = raw.split('|').map(p => p.trim());

      let kode, ket, harga;

      if (parts.length === 2) {
        // format: KODE|HARGA
        kode = parts[0];
        ket = parts[0];
        harga = onlyNumber(parts[1]);
      } else if (parts.length >= 3) {
        // format: KODE|KETERANGAN|HARGA
        kode = parts[0];
        ket = parts[1] || parts[0];
        harga = onlyNumber(parts[2]);
      } else {
        bad.push({ line: i + 1, raw, reason: 'Format salah (pakai |)' });
        continue;
      }

      if (!kode || kode.length < 2) {
        bad.push({ line: i + 1, raw, reason: 'Kode kosong/tidak valid' });
        continue;
      }

      if (!Number.isFinite(harga) || harga <= 0) {
        bad.push({ line: i + 1, raw, reason: 'Harga tidak valid' });
        continue;
      }

      if (harga > MAX_PRICE) {
        bad.push({ line: i + 1, raw, reason: `Harga > ${MAX_PRICE}` });
        continue;
      }

      await stmtRun([kode, ket, state.category, harga]);
      ok.push({ kode, ket, harga });
    }

    await finalizeStmt(stmt);
    await runOnDb('COMMIT');

    delete userState[userId];

    let msg =
      `✅ *Massal selesai!*\n` +
      `📌 Root: *${state.category_root}*\n` +
      `🎯 Provider: *${produkName}*\n` +
      `🗂️ CategoryKey: *${state.category}*\n\n` +
      `✅ Berhasil: *${ok.length}*\n` +
      `❌ Gagal: *${bad.length}*`;

    if (bad.length > 0) {
      const preview = bad.slice(0, 10)
        .map(b => `- Baris ${b.line}: ${b.reason}\n  \`${b.raw}\``)
        .join('\n');
      msg += `\n\n⚠️ *Detail gagal (max 10):*\n${preview}`;
      if (bad.length > 10) msg += `\n…dan ${bad.length - 10} baris lainnya.`;
    }

    return ctx.reply(msg, { parse_mode: 'Markdown' });

  } catch (err) {
    try { await runOnDb('ROLLBACK'); } catch (_) {}
    console.error('❌ Massal DB error:', err);
    delete userState[userId];
    return ctx.reply('❌ Gagal menyimpan produk massal (DB error). Cek log server.');
  }
}

  // =========================================================
  // ✅ ROUTER 2: ADD PRODUK SATUAN (PUNYA KAMU)
  // =========================================================

  // STEP 1
  if (state.step === 'add_digital_product_code') {
    state.product_code = text.toUpperCase();
    state.step = 'add_digital_product_name';
    return ctx.reply('Masukkan NAMA Produk:');
  }

  // STEP 2
  if (state.step === 'add_digital_product_name') {
    state.product_name = text;
    state.step = 'add_digital_product_type';

    return ctx.reply('📦 *Pilih Jenis Produk:*', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Pulsa Operator', callback_data: 'menu_pulsa_add' }],
          [{ text: '📊 Paket Data', callback_data: 'menu_kuota_add' }],
          [{ text: '🎮 Voucher Game', callback_data: 'menu_game_add' }],
          [{ text: '⚡ Token Listrik', callback_data: 'menu_pln_add' }],
          [{ text: '💳 E-Wallet', callback_data: 'menu_ewallet_add' }],
          [{ text: '❌ Batal', callback_data: 'cancel_add_product' }],
        ],
      },
    });
  }

  // STEP lain-lain kamu lanjutkan di sini...
});

// --- STARTUP CODE ---
// ================= STARTUP =================
initDatabase()
  .then(() => {
    const port = Number(process.env.PORT) || 50123;

    // simpan server ke global biar gampang diakses kalau perlu
    const server = app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });

    // OPTIONAL: simpan juga ke global
    global.server = server;

    bot.launch()
      .then(() => logger.info("🚀 Bot Started in ULTRA FAST MODE!"))
      .catch(e => {
        logger.error(`❌ FATAL ERROR: Gagal menjalankan Telegraf. Detail: ${e.message}`);
        process.exit(1);
      });

    let shuttingDown = false;

    const shutdown = async (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;

      logger.warn(`${signal} received. Closing bot and server.`);

      // stop bot
      try { bot.stop(signal); } catch (e) {}

      // close server
      try {
        await new Promise((resolve) => {
          // kalau server sudah ketutup / null, resolve saja
          if (!server || typeof server.close !== 'function') return resolve();
          server.close(() => resolve());
        });
      } catch (e) {}

      // close db (AMAN: cek dulu db ada dari mana)
      // Sesuaikan sumber DB kamu:
      // - kalau kamu pakai global.db, dia akan kepakai
      // - kalau kamu memang punya variabel db di luar file ini, typeof db !== 'undefined' akan aman
      const _db = global.db || (typeof db !== 'undefined' ? db : null);

      try {
        await new Promise((resolve) => {
          if (!_db || typeof _db.close !== 'function') return resolve();
          _db.close(() => resolve());
        });
      } catch (e) {}

      logger.warn("Shutdown complete. Exiting process.");
      process.exit(0);
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch(e => {
    logger.error(`❌ FATAL ERROR: Gagal inisialisasi Database. ${e.message}`);
    process.exit(1);
  });

process.on('uncaughtException', err => {
  logger.error('Uncaught:', err);
});

process.on('unhandledRejection', reason => {
  logger.error('Unhandled:', reason);
});

