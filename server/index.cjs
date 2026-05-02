const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const fs = require("node:fs");
const path = require("node:path");
const { db, uuidv4 } = require("./db.cjs");

const app = express();
const PORT = Number(process.env.PORT || 8787);
const staticDir = path.join(__dirname, "..", "dist");
const isProduction = process.env.NODE_ENV === "production";
const configuredJwtSecret = (process.env.JWT_SECRET || "").trim();
const JWT_SECRET = configuredJwtSecret || (isProduction ? "" : "dev-only-secret");

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production.");
}

if (!configuredJwtSecret && !isProduction) {
  console.warn("[auth] JWT_SECRET not set; using development fallback secret.");
}

const configuredOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllOrigins = configuredOrigins.includes("*");
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://nuono-cyber.github.io",
];
const allowedOrigins = new Set(configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins);
const exposeResetLink =
  !isProduction || String(process.env.EXPOSE_RESET_LINK || "").toLowerCase() === "true";

app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowAllOrigins || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "2mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em alguns minutos." },
});

const inviteValidationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas validações de convite. Tente novamente em alguns minutos." },
});

function createToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function superAdminRequired(req, res, next) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

app.get("/api/health", (_req, res) => {
  try {
    const dbCheck = db.prepare("SELECT 1 as ok").get();
    const postsCount = db.prepare("SELECT COUNT(*) as count FROM instagram_posts").get().count;
    const usersCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    res.json({
      ok: true,
      api: "up",
      db: dbCheck?.ok === 1 ? "up" : "down",
      stats: {
        instagram_posts: postsCount,
        users: usersCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      api: "up",
      db: "down",
      error: error instanceof Error ? error.message : "Healthcheck failed",
      timestamp: new Date().toISOString(),
    });
  }
});

app.post("/api/auth/login", authLimiter, (req, res) => {
  const email = String(req.body?.email || "").toLowerCase().trim();
  const password = String(req.body?.password || "");
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Email ou senha incorretos" });
  }
  const token = createToken(user);
  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
  });
});

app.post("/api/invites/validate", inviteValidationLimiter, (req, res) => {
  const code = String(req.body?.code || "").toLowerCase().trim();
  const email = String(req.body?.email || "").toLowerCase().trim();
  const invite = db
    .prepare("SELECT * FROM invites WHERE code = ? AND used_at IS NULL AND expires_at > ?")
    .get(code, new Date().toISOString());
  if (!invite) return res.json({ valid: false });
  if (invite.email && invite.email.toLowerCase() !== email) return res.json({ valid: false });
  return res.json({ valid: true });
});

app.post("/api/auth/signup", authLimiter, (req, res) => {
  const email = String(req.body?.email || "").toLowerCase().trim();
  const password = String(req.body?.password || "");
  const fullName = req.body?.fullName ? String(req.body.fullName) : null;
  const personalEmail = req.body?.personalEmail ? String(req.body.personalEmail).toLowerCase() : null;
  const inviteCode = String(req.body?.inviteCode || "").toLowerCase().trim();

  if (!email.endsWith("@nadenterprise.com")) {
    return res.status(400).json({ error: "Apenas emails @nadenterprise.com são permitidos" });
  }
  if (password.length < 6) return res.status(400).json({ error: "Senha muito curta" });

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(400).json({ error: "Este email já está cadastrado" });

  const invite = db
    .prepare("SELECT * FROM invites WHERE code = ? AND used_at IS NULL AND expires_at > ?")
    .get(inviteCode, new Date().toISOString());
  if (!invite) return res.status(400).json({ error: "Código inválido, expirado ou já utilizado" });
  if (invite.email && invite.email.toLowerCase() !== email) {
    return res.status(400).json({ error: "Código não corresponde ao email informado" });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, personal_email, role, created_at)
    VALUES (?, ?, ?, ?, ?, 'user', ?)
  `).run(id, email, bcrypt.hashSync(password, 10), fullName, personalEmail, now);
  db.prepare("UPDATE invites SET used_at = ? WHERE id = ?").run(now, invite.id);
  return res.json({ ok: true });
});

app.get("/api/auth/session", authRequired, (req, res) => {
  const user = db.prepare("SELECT id, email, role, full_name FROM users WHERE id = ?").get(req.user.sub);
  if (!user) return res.status(401).json({ error: "Invalid session" });
  res.json({ user: { ...user, isSuperAdmin: user.role === "super_admin" } });
});

app.post("/api/auth/password-reset/request", authLimiter, (req, res) => {
  const corporateEmail = String(req.body?.corporateEmail || "").toLowerCase().trim();
  const personalEmail = String(req.body?.personalEmail || "").toLowerCase().trim();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(corporateEmail);
  if (!user || (user.personal_email || "").toLowerCase() !== personalEmail) {
    return res.status(400).json({ error: "Dados não conferem" });
  }
  const token = uuidv4();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token, created_at, expires_at, used_at)
    VALUES (?, ?, ?, ?, ?, NULL)
  `).run(uuidv4(), user.id, token, now, expiresAt);
  const response = { ok: true };
  if (exposeResetLink) {
    response.resetLink = `/auth/reset-password?token=${token}`;
  }
  res.json(response);
});

app.post("/api/auth/password-reset/confirm", authLimiter, (req, res) => {
  const token = String(req.body?.token || "");
  const password = String(req.body?.password || "");
  if (password.length < 6) return res.status(400).json({ error: "Senha muito curta" });
  const row = db
    .prepare("SELECT * FROM password_reset_tokens WHERE token = ? AND used_at IS NULL AND expires_at > ?")
    .get(token, new Date().toISOString());
  if (!row) return res.status(400).json({ error: "Token inválido ou expirado" });
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), row.user_id);
  db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?").run(new Date().toISOString(), row.id);
  res.json({ ok: true });
});

app.get("/api/posts", authRequired, (_req, res) => {
  const rows = db.prepare("SELECT * FROM instagram_posts ORDER BY published_at DESC").all();
  res.json({ rows });
});

app.post("/api/posts/upsert", authRequired, (req, res) => {
  const posts = Array.isArray(req.body?.posts) ? req.body.posts : [];
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
  const tx = db.transaction((items) => {
    for (const item of items) {
      stmt.run({ id: item.id || uuidv4(), ...item });
    }
  });
  tx(posts);
  res.json({ ok: true, processed: posts.length });
});

app.post("/api/activity", authRequired, (req, res) => {
  db.prepare(`
    INSERT INTO activity_logs (id, user_id, action, details, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    req.user.sub,
    String(req.body?.action || "unknown"),
    req.body?.details ? JSON.stringify(req.body.details) : null,
    new Date().toISOString()
  );
  res.json({ ok: true });
});

app.get("/api/activity", authRequired, superAdminRequired, (_req, res) => {
  const logs = db.prepare(`
    SELECT l.id, l.user_id, l.action, l.details, l.created_at, u.email as user_email, u.full_name as user_name
    FROM activity_logs l
    JOIN users u ON u.id = l.user_id
    ORDER BY l.created_at DESC
  `).all().map((row) => ({ ...row, details: row.details ? JSON.parse(row.details) : null }));
  res.json({ rows: logs });
});

app.get("/api/admin/invites", authRequired, superAdminRequired, (_req, res) => {
  const rows = db.prepare("SELECT * FROM invites ORDER BY created_at DESC").all();
  res.json({ rows });
});

app.post("/api/admin/invites", authRequired, superAdminRequired, (req, res) => {
  const now = new Date();
  const code = String(req.body?.code || "").toLowerCase().trim();
  if (!/^[a-f0-9]{10}$/.test(code)) {
    return res.status(400).json({ error: "Código inválido. Use 10 caracteres hexadecimais." });
  }

  const inviteEmail = req.body?.email ? String(req.body.email).toLowerCase().trim() : null;
  const personalEmail = req.body?.personalEmail ? String(req.body.personalEmail).toLowerCase().trim() : null;
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const row = {
    id: uuidv4(),
    token: uuidv4(),
    code,
    email: inviteEmail,
    personal_email: personalEmail,
    created_at: now.toISOString(),
    expires_at: expiresAt,
    used_at: null,
    invited_by: req.user.sub,
  };
  db.prepare(`
    INSERT INTO invites (id, code, token, email, personal_email, created_at, expires_at, used_at, invited_by)
    VALUES (@id, @code, @token, @email, @personal_email, @created_at, @expires_at, @used_at, @invited_by)
  `).run(row);
  res.json({ row });
});

app.delete("/api/admin/invites/:id", authRequired, superAdminRequired, (req, res) => {
  db.prepare("DELETE FROM invites WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/admin/users", authRequired, superAdminRequired, (_req, res) => {
  const rows = db.prepare(`
    SELECT id, email, full_name, created_at, role
    FROM users
    ORDER BY created_at DESC
  `).all();
  res.json({ rows });
});

app.get("/api/chat/users", authRequired, (_req, res) => {
  const rows = db.prepare("SELECT id as user_id, full_name, email FROM users WHERE id != ? ORDER BY full_name").all(req.user.sub);
  res.json({ rows });
});

app.get("/api/chat/messages", authRequired, (req, res) => {
  const withUser = req.query.withUser ? String(req.query.withUser) : null;
  let rows = [];
  if (withUser) {
    rows = db.prepare(`
      SELECT * FROM internal_messages
      WHERE (sender_id = ? AND recipient_id = ?)
         OR (sender_id = ? AND recipient_id = ?)
      ORDER BY created_at ASC
    `).all(req.user.sub, withUser, withUser, req.user.sub);
  } else {
    rows = db.prepare(`
      SELECT * FROM internal_messages
      WHERE recipient_id IS NULL
      ORDER BY created_at ASC
    `).all();
  }
  const users = db.prepare("SELECT id, full_name, email FROM users").all();
  const userMap = new Map(users.map((u) => [u.id, u]));
  const enriched = rows.map((m) => ({
    ...m,
    sender_name: userMap.get(m.sender_id)?.full_name || "Usuário",
    sender_email: userMap.get(m.sender_id)?.email || "",
  }));
  res.json({ rows: enriched });
});

app.post("/api/chat/messages", authRequired, (req, res) => {
  const row = {
    id: uuidv4(),
    sender_id: req.user.sub,
    recipient_id: req.body?.recipientId || null,
    content: String(req.body?.content || "").trim(),
    created_at: new Date().toISOString(),
    read_at: null,
  };
  if (!row.content) return res.status(400).json({ error: "Mensagem vazia" });
  db.prepare(`
    INSERT INTO internal_messages (id, sender_id, recipient_id, content, created_at, read_at)
    VALUES (@id, @sender_id, @recipient_id, @content, @created_at, @read_at)
  `).run(row);
  res.json({ row });
});

app.post("/api/chat/messages/:id/read", authRequired, (req, res) => {
  db.prepare(`
    UPDATE internal_messages
    SET read_at = ?
    WHERE id = ? AND recipient_id = ? AND read_at IS NULL
  `).run(new Date().toISOString(), req.params.id, req.user.sub);
  res.json({ ok: true });
});

app.post("/api/ai/chat", authRequired, (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const last = messages[messages.length - 1]?.content || "";
  const tips = [
    "Publique nos mesmos horários dos posts com maior alcance e teste 2 variações de abertura.",
    "Priorize conteúdo com alta taxa de salvamento e reaproveite os temas em séries semanais.",
    "Compare posts por formato (Reel, carrossel, estático) e mantenha os 2 melhores formatos por 30 dias.",
    "Use CTA explícita em legendas quando o objetivo for comentários e compartilhamentos.",
  ];
  const response = `Análise rápida: ${last ? "com base na sua pergunta, " : ""}${tips[Math.floor(Math.random() * tips.length)]}`;
  res.json({ message: response });
});

if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Fullstack app running on http://localhost:${PORT}`);
});
