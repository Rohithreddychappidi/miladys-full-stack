// Daily backup of the database and uploaded photos/videos.
//   node src/scripts/backup.js
// Run by cron on the server (/etc/cron.d/miladys-backup, every night).
// Writes to BACKUP_DIR (default /var/backups/miladys):
//   db-YYYY-MM-DD.sql.gz       full database (pg_dump)
//   uploads-YYYY-MM-DD.tar.gz  server/uploads (product photos, videos…)
// and deletes copies older than BACKUP_KEEP_DAYS (default 14).
// If BACKUP_RCLONE_REMOTE is set (e.g. "b2:miladys-backups"), the new files
// are also copied off the server with rclone.
import 'dotenv/config';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { parse } from 'pg-connection-string';

const dir = process.env.BACKUP_DIR || '/var/backups/miladys';
const keepDays = Number(process.env.BACKUP_KEEP_DAYS) || 14;
const day = new Date().toISOString().slice(0, 10);
const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

function fail(msg) {
  console.error(`[backup] FAILED: ${msg}`);
  process.exit(1);
}

// 1. Database. The connection string is split into PG* variables because
//    pg_dump can't read a URL whose password contains special characters.
const c = parse(process.env.DATABASE_URL || '');
if (!c.database) fail('DATABASE_URL is not set');
const dump = spawnSync('pg_dump', ['--no-owner'], {
  env: { ...process.env, PGHOST: c.host || 'localhost', PGPORT: String(c.port || 5432), PGUSER: c.user, PGPASSWORD: c.password, PGDATABASE: c.database },
  maxBuffer: 2 * 1024 ** 3,
});
if (dump.status !== 0) fail(`pg_dump: ${String(dump.stderr).trim()}`);
if (!/PostgreSQL database dump complete/.test(dump.stdout.subarray(-300).toString())) fail('pg_dump output looks incomplete');
const dbFile = path.join(dir, `db-${day}.sql.gz`);
fs.writeFileSync(dbFile, zlib.gzipSync(dump.stdout), { mode: 0o600 });

// 2. Uploaded files.
const upFile = path.join(dir, `uploads-${day}.tar.gz`);
const tar = spawnSync('tar', ['-czf', upFile, '-C', serverDir, 'uploads']);
if (tar.status !== 0) fail(`tar: ${String(tar.stderr).trim()}`);
fs.chmodSync(upFile, 0o600);

// 3. Remove old copies.
const cutoff = Date.now() - keepDays * 86400000;
for (const f of fs.readdirSync(dir)) {
  if (!/^(db|uploads)-\d{4}-\d{2}-\d{2}\.(sql|tar)\.gz$/.test(f)) continue;
  const full = path.join(dir, f);
  if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
}

// 4. Optional off-server copy.
const remote = process.env.BACKUP_RCLONE_REMOTE;
if (remote) {
  const copy = spawnSync('rclone', ['copy', dir, remote, '--max-age', '36h']);
  if (copy.status !== 0) fail(`rclone: ${String(copy.stderr).trim()}`);
}

const size = (f) => `${(fs.statSync(f).size / 1024 / 1024).toFixed(1)} MB`;
console.log(`[backup] ${day} ok — db ${size(dbFile)}, uploads ${size(upFile)}${remote ? `, copied to ${remote}` : ''}`);
