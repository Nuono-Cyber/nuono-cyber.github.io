const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "app.db");
const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  personal_email TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  email TEXT,
  personal_email TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  invited_by TEXT
);

CREATE TABLE IF NOT EXISTS instagram_posts (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL UNIQUE,
  account_id TEXT,
  username TEXT,
  account_name TEXT,
  description TEXT,
  duration INTEGER,
  published_at TEXT,
  permalink TEXT,
  post_type TEXT,
  views INTEGER,
  reach INTEGER,
  likes INTEGER,
  shares INTEGER,
  follows INTEGER,
  comments INTEGER,
  saves INTEGER
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS internal_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
`);

const defaultSuperAdminEmails = [
  "gabrielnbn@nadenterprise.com",
  "nadsongl@nadenterprise.com",
];

const configuredSuperAdmins = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);

const superAdminEmails =
  configuredSuperAdmins.length > 0 ? configuredSuperAdmins : defaultSuperAdminEmails;

const isProduction = process.env.NODE_ENV === "production";
const configuredAdminPassword = (process.env.DEFAULT_ADMIN_PASSWORD || "").trim();
const forcePasswordReset =
  String(process.env.FORCE_RESET_SUPER_ADMIN_PASSWORD || "").toLowerCase() === "true";
const initialAdminPassword = configuredAdminPassword || (isProduction ? "" : "nad123*");

if (!initialAdminPassword) {
  throw new Error("DEFAULT_ADMIN_PASSWORD is required in production.");
}

if (!configuredAdminPassword && !isProduction) {
  console.warn("[auth] DEFAULT_ADMIN_PASSWORD not set; using development fallback password.");
}

const upsertSystemAdmin = db.prepare(`
  INSERT INTO users (id, email, password_hash, full_name, personal_email, role, created_at)
  VALUES (@id, @email, @password_hash, @full_name, @personal_email, @role, @created_at)
  ON CONFLICT(email) DO UPDATE SET
    role = excluded.role,
    password_hash = CASE
      WHEN @force_password_reset = 1 THEN excluded.password_hash
      ELSE users.password_hash
    END
`);

for (const email of superAdminEmails) {
  upsertSystemAdmin.run({
    id: uuidv4(),
    email,
    password_hash: bcrypt.hashSync(initialAdminPassword, 10),
    full_name: email.split("@")[0],
    personal_email: null,
    role: "super_admin",
    created_at: new Date().toISOString(),
    force_password_reset: forcePasswordReset ? 1 : 0,
  });
}

module.exports = { db, uuidv4 };
