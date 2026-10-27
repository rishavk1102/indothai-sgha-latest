/**
 * Dump MySQL database using credentials from backend/.env
 * Usage: node scripts/dump-database.js
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const host = process.env.DB_HOST;
const port = process.env.DB_PORT || "3306";
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME;

if (!host || !user || !password || !database) {
  console.error("Missing DB_HOST, DB_USER, DB_PASSWORD, or DB_NAME in backend/.env");
  process.exit(1);
}

const mysqldumpCandidates = [
  process.env.MYSQLDUMP_PATH,
  "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe",
  "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe",
  "mysqldump",
].filter(Boolean);

let mysqldump = null;
for (const candidate of mysqldumpCandidates) {
  if (candidate === "mysqldump") {
    mysqldump = candidate;
    break;
  }
  if (fs.existsSync(candidate)) {
    mysqldump = candidate;
    break;
  }
}

if (!mysqldump) {
  console.error("mysqldump not found. Install MySQL client or set MYSQLDUMP_PATH in .env");
  process.exit(1);
}

const dumpsDir =
  process.env.DB_DUMP_DIR ||
  path.join(os.homedir(), "Documents", "Indothai-SGHA-dumps");
fs.mkdirSync(dumpsDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outFile = path.join(dumpsDir, `${database}_${stamp}.sql`);

const args = [
  `-h${host}`,
  `-P${port}`,
  `-u${user}`,
  "--single-transaction",
  "--routines",
  "--triggers",
  "--set-gtid-purged=OFF",
  database,
];

console.log(`Dumping ${database} @ ${host}:${port} → ${outFile}`);

const result = spawnSync(mysqldump, args, {
  env: { ...process.env, MYSQL_PWD: password },
  encoding: "buffer",
  maxBuffer: 512 * 1024 * 1024,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  const errText = (result.stderr || Buffer.alloc(0)).toString("utf8");
  console.error("mysqldump failed:", errText || `exit ${result.status}`);
  process.exit(result.status || 1);
}

fs.writeFileSync(outFile, result.stdout);
const mb = (result.stdout.length / (1024 * 1024)).toFixed(2);
console.log(`Done. ${mb} MB written.`);
