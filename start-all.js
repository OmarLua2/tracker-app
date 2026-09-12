// ============================================================
// start-all.js — Jalankan Server + Cloudflare + Ngrok sekaligus
// ============================================================
const { spawn } = require('child_process');
const path = require('path');

const ROOT = __dirname;
const NODE = process.execPath;

console.log('\n========================================');
console.log('  TRACKER APP - AUTO LAUNCHER');
console.log('========================================\n');

// Warna
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(color, label, msg) {
  console.log(`${color}[${label}]${colors.reset} ${msg}`);
}

// ============ 1. START SERVER ============
log(colors.green, '1/3', 'Menjalankan server...');

const server = spawn(NODE, ['server.js'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: false
});

server.on('error', (err) => {
  log(colors.red, 'ERROR', `Server gagal: ${err.message}`);
});

// ============ 2. START CLOUDFLARE TUNNEL ============
setTimeout(() => {
  log(colors.blue, '2/3', 'Menjalankan Cloudflare Tunnel (LINK ADMIN)...');

  const cloudflaredPath = 'C:\\cloudflared\\cloudflared.exe';
  const fs = require('fs');

  if (!fs.existsSync(cloudflaredPath)) {
    log(colors.yellow, 'SKIP', 'cloudflared.exe tidak ditemukan di C:\\cloudflared\\');
    return;
  }

  const cloudflare = spawn(cloudflaredPath, ['tunnel', '--url', 'http://localhost:3000'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });

  cloudflare.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(`${colors.blue}[CF]${colors.reset} ${text}`);

    // Deteksi URL
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      console.log('');
      console.log(`${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.blue}║  🔐 LINK ADMIN (JANGAN DI-SHARE!)                       ║${colors.reset}`);
      console.log(`${colors.blue}║  ${match[0]}${colors.reset}`);
      console.log(`${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}`);
      console.log('');
    }
  });

  cloudflare.stderr.on('data', (data) => {
    process.stderr.write(`${colors.blue}[CF]${colors.reset} ${data.toString()}`);
  });

  cloudflare.on('error', (err) => {
    log(colors.red, 'ERROR', `Cloudflare gagal: ${err.message}`);
  });

}, 5000); // tunggu server 5 detik

// ============ 3. START NGROK TUNNEL ============
setTimeout(() => {
  log(colors.yellow, '3/3', 'Menjalankan Ngrok Tunnel (LINK SHARE)...');

  const ngrokPath = 'C:\\ngrok\\ngrok.exe';
  const fs = require('fs');

  if (!fs.existsSync(ngrokPath)) {
    log(colors.yellow, 'SKIP', 'ngrok.exe tidak ditemukan di C:\\ngrok\\');
    return;
  }

  const ngrok = spawn(ngrokPath, ['http', '3000'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });

  ngrok.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(`${colors.yellow}[Ngrok]${colors.reset} ${text}`);

    const match = text.match(/https:\/\/[a-z0-9-]+\.ngrok(?:-free)?\.(?:app|dev)/);
    if (match) {
      console.log('');
      console.log(`${colors.yellow}╔════════════════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.yellow}║  🌐 LINK SHARE (BAGIKAN INI)                            ║${colors.reset}`);
      console.log(`${colors.yellow}║  ${match[0]}${colors.reset}`);
      console.log(`${colors.yellow}╚════════════════════════════════════════════════════════╝${colors.reset}`);
      console.log('');
    }
  });

  ngrok.stderr.on('data', (data) => {
    process.stderr.write(`${colors.yellow}[Ngrok]${colors.reset} ${data.toString()}`);
  });

  ngrok.on('error', (err) => {
    log(colors.red, 'ERROR', `Ngrok gagal: ${err.message}`);
  });

}, 8000); // tunggu 8 detik

// ============ 4. BUKA BROWSER ============
setTimeout(() => {
  log(colors.cyan, 'INFO', 'Membuka browser...');

  const { exec } = require('child_process');
  exec('start http://localhost:3000/admin/login', { shell: 'cmd.exe' });

  console.log('');
  console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  ✅ SEMUA JALAN!                                         ${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
  console.log('');
  console.log(`   Server     : http://localhost:3000/admin/login`);
  console.log(`   Link Admin : Lihat di atas (JANGAN SHARE)`);
  console.log(`   Link Share : Lihat di atas (BAGIKAN INI)`);
  console.log('');
  console.log(`${colors.red}   ⚠️  JANGAN TUTUP JENDELA INI! Ctrl+C untuk stop${colors.reset}`);
  console.log('');
}, 11000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Menghentikan semua proses...');
  server.kill();
  process.exit(0);
});