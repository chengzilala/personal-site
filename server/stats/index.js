/* personal-site · 匿名访问统计（自建，零依赖）
   只做三件事：记录一次匿名访问、返回累计/今日、健康检查。
   隐私：不写 Cookie；IP 只在内存里参与匿名哈希，不落盘；
        只存「日期 + 匿名哈希 + 来源域名 + 设备类型 + 页面路径」的聚合。 */

'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const net = require('node:net');
const path = require('node:path');
const fsp = require('node:fs/promises');

const PORT = Number(process.env.STATS_PORT || 8950);
const HOST = process.env.STATS_HOST || '127.0.0.1';
const DATA_FILE = process.env.STATS_DATA || path.join(__dirname, '.data', 'store.json');

const TZ_OFFSET_MIN = 480; // Asia/Shanghai（UTC+8）
const MAX_BODY = 1024;
const RATE_PER_MIN = 60;
const RATE_PER_HOUR = 600;
const KEEP_DAYS = 400;

const BOT_RE = /bot|crawler|spider|headless|preview|curl|wget|python-requests|httpclient/i;

let store = { salt: '', total: 0, days: {} };
let writeChain = Promise.resolve();

/* ---------- 存储 ---------- */

async function loadStore() {
  try {
    const raw = await fsp.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.days && typeof parsed.days === 'object') {
      store = parsed;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[stats] 读取数据失败：' + err.message);
  }

  if (!store.salt) store.salt = crypto.randomBytes(32).toString('hex');
  if (typeof store.total !== 'number') store.total = 0;
  if (typeof store.days !== 'object' || !store.days) store.days = {};
}

function saveStore() {
  const snapshot = JSON.stringify(store);
  writeChain = writeChain
    .then(async () => {
      await fsp.mkdir(path.dirname(DATA_FILE), { recursive: true });
      const tmp = DATA_FILE + '.' + process.pid + '.tmp';
      await fsp.writeFile(tmp, snapshot, 'utf8');
      await fsp.rename(tmp, DATA_FILE);
    })
    .catch((err) => console.error('[stats] 写盘失败：' + err.message));
  return writeChain;
}

/* ---------- 日期 / 设备 / 匿名标识 ---------- */

function todayKey() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + TZ_OFFSET_MIN * 60000).toISOString().slice(0, 10);
}

function ensureDay(key) {
  const day = store.days[key];
  if (day && Array.isArray(day.visitors)) return day;

  const fresh = { uv: 0, pv: 0, visitors: [], refs: {}, devices: {}, paths: {} };
  store.days[key] = fresh;
  return fresh;
}

function visitorId(dateKey, ip, ua) {
  return crypto
    .createHmac('sha256', store.salt)
    .update(dateKey + '|' + ip + '|' + ua)
    .digest('hex')
    .slice(0, 16);
}

function deviceOf(ua) {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return 'tablet';
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return 'tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'mobile';
  return 'desktop';
}

/* ---------- 限流 ---------- */

const hits = new Map(); // ip -> 时间戳数组

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600000);
  const inMinute = recent.filter((t) => now - t < 60000).length;

  if (inMinute >= RATE_PER_MIN || recent.length >= RATE_PER_HOUR) {
    hits.set(ip, recent);
    return true;
  }

  recent.push(now);
  hits.set(ip, recent);
  return false;
}

setInterval(function prune() {
  const now = Date.now();
  hits.forEach(function (list, ip) {
    const recent = list.filter((t) => now - t < 3600000);
    if (recent.length) hits.set(ip, recent);
    else hits.delete(ip);
  });
}, 600000).unref();

function pruneDays() {
  const keys = Object.keys(store.days).sort();
  while (keys.length > KEEP_DAYS) {
    delete store.days[keys.shift()];
  }
}

/* ---------- HTTP ---------- */

function allowOrigin(origin) {
  if (!origin) return '';
  if (/^https:\/\/(www\.)?chesterlee\.cn$/.test(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return '';
}

function sendJson(req, res, status, data) {
  const body = JSON.stringify(data);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
  const origin = allowOrigin(req.headers.origin);
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(body);
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const candidate = forwarded || String(req.headers['x-real-ip'] || '') || req.socket.remoteAddress || '';
  const clean = candidate.replace(/^::ffff:/, '');
  return net.isIP(clean) ? clean : '0.0.0.0';
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    let size = 0;
    const chunks = [];
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('body too large'), { code: 'TOO_LARGE' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function cleanPath(value) {
  if (typeof value !== 'string') return '';
  return value.split('?')[0].split('#')[0].slice(0, 200);
}

function cleanRef(value) {
  if (typeof value !== 'string') return '';
  const ref = value.trim().toLowerCase();
  return /^[a-z0-9.-]+(:\d+)?$/.test(ref) ? ref.slice(0, 100) : '';
}

function recordHit(req, body) {
  const dayKey = todayKey();
  const day = ensureDay(dayKey);
  const ip = clientIp(req);
  const ua = String(req.headers['user-agent'] || '');
  const vid = visitorId(dayKey, ip, ua);

  if (!day.visitors.includes(vid)) {
    day.visitors.push(vid);
    day.uv = day.visitors.length;
    store.total += 1;
  }

  day.pv += 1;

  const ref = cleanRef(body.r);
  if (ref) day.refs[ref] = (day.refs[ref] || 0) + 1;

  const device = deviceOf(ua);
  day.devices[device] = (day.devices[device] || 0) + 1;

  const pagePath = cleanPath(body.p);
  if (pagePath) day.paths[pagePath] = (day.paths[pagePath] || 0) + 1;

  pruneDays();
  saveStore();

  return { ok: true, total: store.total, today: day.uv };
}

function summary() {
  return { ok: true, total: store.total, today: ensureDay(todayKey()).uv };
}

const server = http.createServer(async function (req, res) {
  const origin = allowOrigin(req.headers.origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin || 'null',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const route = (url.pathname.replace(/^\/stats/, '') || '/').replace(/\/+$/, '') || '/';

  try {
    if (route === '/healthz' && req.method === 'GET') {
      sendJson(req, res, 200, { ok: true });
      return;
    }

    if (route === '/summary' && req.method === 'GET') {
      sendJson(req, res, 200, summary());
      return;
    }

    if (route === '/hit' && req.method === 'POST') {
      const raw = await readBody(req);
      let body = {};
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch (err) {
          sendJson(req, res, 400, { ok: false, error: 'bad json' });
          return;
        }
      }

      const ua = String(req.headers['user-agent'] || '');
      const prefetch = String(req.headers['sec-purpose'] || '').toLowerCase().indexOf('prefetch') >= 0;
      if (BOT_RE.test(ua) || prefetch) {
        sendJson(req, res, 200, summary());
        return;
      }

      if (rateLimited(clientIp(req))) {
        sendJson(req, res, 429, { ok: false, error: 'too many requests' });
        return;
      }

      sendJson(req, res, 200, recordHit(req, body || {}));
      return;
    }

    sendJson(req, res, 404, { ok: false, error: 'not found' });
  } catch (err) {
    if (err && err.code === 'TOO_LARGE') {
      sendJson(req, res, 413, { ok: false, error: 'body too large' });
      return;
    }
    console.error('[stats] 处理失败：' + (err && err.message));
    sendJson(req, res, 500, { ok: false, error: 'server error' });
  }
});

loadStore().then(function () {
  server.listen(PORT, HOST, function () {
    console.log('[stats] listening on http://' + HOST + ':' + PORT + '，数据文件 ' + DATA_FILE);
  });
});

function shutdown() {
  saveStore().then(function () {
    server.close(function () {
      process.exit(0);
    });
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
