const fs = require("node:fs");
const path = require("node:path");
const Papa = require("papaparse");
const { db, uuidv4 } = require("../server/db.cjs");

const csvPath = process.argv[2] || path.join(__dirname, "..", "server", "data", "instagram_posts-export-2026-05-02_09-17-47.csv");

if (!fs.existsSync(csvPath)) {
  console.error(`CSV not found: ${csvPath}`);
  process.exit(1);
}

const csvText = fs.readFileSync(csvPath, "utf8");
const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true, delimiter: ";" });

if (parsed.errors.length > 0) {
  console.error("CSV parse errors:", parsed.errors.slice(0, 5));
}

function toInt(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(String(value).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toNullable(value) {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  return v.length ? v : null;
}

const rows = parsed.data.map((r) => ({
  id: toNullable(r.id) || uuidv4(),
  post_id: toNullable(r.post_id),
  account_id: toNullable(r.account_id),
  username: toNullable(r.username),
  account_name: toNullable(r.account_name),
  description: toNullable(r.description),
  duration: toInt(r.duration),
  published_at: toNullable(r.published_at),
  permalink: toNullable(r.permalink),
  post_type: toNullable(r.post_type),
  views: toInt(r.views),
  reach: toInt(r.reach),
  likes: toInt(r.likes),
  shares: toInt(r.shares),
  follows: toInt(r.follows),
  comments: toInt(r.comments),
  saves: toInt(r.saves),
})).filter((r) => !!r.post_id);

const stmt = db.prepare(`
  INSERT INTO instagram_posts (
    id, post_id, account_id, username, account_name, description, duration, published_at, permalink, post_type, views, reach, likes, shares, follows, comments, saves
  ) VALUES (
    @id, @post_id, @account_id, @username, @account_name, @description, @duration, @published_at, @permalink, @post_type, @views, @reach, @likes, @shares, @follows, @comments, @saves
  )
  ON CONFLICT(post_id) DO UPDATE SET
    account_id=excluded.account_id,
    username=excluded.username,
    account_name=excluded.account_name,
    description=excluded.description,
    duration=excluded.duration,
    published_at=excluded.published_at,
    permalink=excluded.permalink,
    post_type=excluded.post_type,
    views=excluded.views,
    reach=excluded.reach,
    likes=excluded.likes,
    shares=excluded.shares,
    follows=excluded.follows,
    comments=excluded.comments,
    saves=excluded.saves
`);

db.exec("BEGIN");
try {
  for (const item of rows) stmt.run(item);
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}

const total = db.prepare("SELECT COUNT(*) as c FROM instagram_posts").get().c;
console.log(`Imported ${rows.length} rows. instagram_posts total: ${total}`);
