const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const fs = require("node:fs");
const path = require("node:path");
const {
  uuidv4,
  listRows,
  listRowsWithCount,
  getSingleRow,
  insertRows,
  updateRows,
  deleteRows,
  countRows,
  ensureSuperAdmins,
} = require("./supabase.cjs");
const {
  getMetaConfigRow,
  sanitizeMetaConfig,
  saveMetaConfig,
  syncInstagramFromMeta,
  startMetaSyncScheduler,
} = require("./meta.cjs");

const app = express();
const PORT = Number(process.env.PORT || 8787);
const staticDir = path.join(__dirname, "..", "dist");
const isProduction = process.env.NODE_ENV === "production";
const configuredJwtSecret = (process.env.JWT_SECRET || "").trim();
const JWT_SECRET = configuredJwtSecret || (isProduction ? "" : "dev-only-secret");

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production.");
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

function isAllowedDevelopmentOrigin(origin) {
  if (isProduction || !origin) return false;
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

app.set("trust proxy", 1);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowAllOrigins || allowedOrigins.has(origin) || isAllowedDevelopmentOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "12mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em alguns minutos." },
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

function escapeFilterValue(value) {
  return String(value).replace(/,/g, "%2C");
}

app.get("/api/health", async (_req, res) => {
  try {
    const [postsCount, usersCount] = await Promise.all([
      countRows("instagram_posts"),
      countRows("users"),
    ]);

    res.json({
      ok: true,
      api: "up",
      db: "up",
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

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase().trim();
  const password = String(req.body?.password || "");

  try {
    const user = await getSingleRow("users", {
      select: "*",
      email: `eq.${email}`,
    });

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    if (user.must_change_password) {
      return res.status(403).json({
        error: "Senha pendente de configuração. Peça ao administrador para atualizar a senha no ambiente do backend.",
      });
    }

    const token = createToken(user);
    return res.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Falha no login" });
  }
});

app.get("/api/auth/session", authRequired, async (req, res) => {
  const user = await getSingleRow("users", {
    select: "id,email,role,full_name,must_change_password",
    id: `eq.${req.user.sub}`,
  });
  if (!user) return res.status(401).json({ error: "Invalid session" });
  res.json({ user: { ...user, isSuperAdmin: user.role === "super_admin" } });
});

app.post("/api/auth/password-reset/request", authLimiter, async (req, res) => {
  res.status(410).json({ error: "Recuperação de senha desativada neste ambiente." });
});

app.post("/api/auth/password-reset/confirm", authLimiter, async (req, res) => {
  res.status(410).json({ error: "Recuperação de senha desativada neste ambiente." });
});

app.get("/api/posts", authRequired, async (req, res) => {
  const requestedLimit = Number(req.query.limit || 1000);
  const limit = Math.max(1, Math.min(5000, Number.isFinite(requestedLimit) ? requestedLimit : 1000));
  const { rows, count } = await listRowsWithCount("instagram_posts", {
    select: [
      "id",
      "post_id",
      "account_id",
      "username",
      "account_name",
      "description",
      "duration",
      "published_at",
      "permalink",
      "post_type",
      "views",
      "reach",
      "likes",
      "shares",
      "follows",
      "comments",
      "saves",
    ].join(","),
    order: "published_at.desc",
    limit,
  });
  res.json({ rows, meta: { count, limited: count > rows.length, limit } });
});

app.post("/api/posts/upsert", authRequired, superAdminRequired, async (req, res) => {
  const posts = Array.isArray(req.body?.posts) ? req.body.posts : [];
  const mode = req.body?.mode === "replace" ? "replace" : "increment";

  try {
    if (mode === "replace") {
      await deleteRows("instagram_posts", {
        post_id: "not.is.null",
      });
    }

    if (posts.length > 0) {
      const normalizedPosts = posts.map((item) => ({
        id: item.id || uuidv4(),
        ...item,
        updated_at: new Date().toISOString(),
      }));

      await insertRows("instagram_posts", normalizedPosts, {
        onConflict: "post_id",
        upsert: true,
      });
    }

    res.json({ ok: true, processed: posts.length, mode });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Falha ao salvar posts" });
  }
});

app.get("/api/meta/config", authRequired, superAdminRequired, async (_req, res) => {
  res.json(sanitizeMetaConfig(await getMetaConfigRow()));
});

app.post("/api/meta/config", authRequired, superAdminRequired, async (req, res) => {
  try {
    const config = await saveMetaConfig({
      instagramUserId: req.body?.instagramUserId,
      accessToken: req.body?.accessToken,
      enabled: req.body?.enabled,
      syncIntervalMinutes: req.body?.syncIntervalMinutes,
    });
    res.json(config);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Falha ao salvar configuração da Meta" });
  }
});

app.post("/api/meta/sync", authRequired, superAdminRequired, async (_req, res) => {
  try {
    const result = await syncInstagramFromMeta();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Falha ao sincronizar com a Meta" });
  }
});

app.post("/api/activity", authRequired, async (req, res) => {
  await insertRows("activity_logs", {
    id: uuidv4(),
    user_id: req.user.sub,
    action: String(req.body?.action || "unknown"),
    details: req.body?.details || null,
    created_at: new Date().toISOString(),
  });
  res.json({ ok: true });
});

app.get("/api/activity", authRequired, superAdminRequired, async (_req, res) => {
  const [logs, users] = await Promise.all([
    listRows("activity_logs", {
      select: "*",
      order: "created_at.desc",
    }),
    listRows("users", {
      select: "id,email,full_name",
    }),
  ]);

  const userMap = new Map(users.map((user) => [user.id, user]));
  const rows = logs.map((log) => ({
    ...log,
    user_email: userMap.get(log.user_id)?.email || "",
    user_name: userMap.get(log.user_id)?.full_name || null,
  }));
  res.json({ rows });
});

app.get("/api/admin/users", authRequired, superAdminRequired, async (_req, res) => {
  const rows = await listRows("users", {
    select: "id,email,full_name,created_at,role,must_change_password",
    order: "created_at.desc",
  });
  res.json({ rows });
});

app.get("/api/chat/users", authRequired, async (req, res) => {
  const rows = await listRows("users", {
    select: "id,full_name,email",
    id: `neq.${req.user.sub}`,
    order: "full_name.asc",
  });

  res.json({
    rows: rows.map((row) => ({
      user_id: row.id,
      full_name: row.full_name,
      email: row.email,
    })),
  });
});

app.get("/api/chat/messages", authRequired, async (req, res) => {
  const withUser = req.query.withUser ? String(req.query.withUser) : null;
  let rows = [];

  if (withUser) {
    rows = await listRows("internal_messages", {
      select: "*",
      or: `and(sender_id.eq.${escapeFilterValue(req.user.sub)},recipient_id.eq.${escapeFilterValue(withUser)}),and(sender_id.eq.${escapeFilterValue(withUser)},recipient_id.eq.${escapeFilterValue(req.user.sub)})`,
      order: "created_at.asc",
    });
  } else {
    rows = await listRows("internal_messages", {
      select: "*",
      recipient_id: "is.null",
      order: "created_at.asc",
    });
  }

  const users = await listRows("users", {
    select: "id,full_name,email",
  });
  const userMap = new Map(users.map((user) => [user.id, user]));

  const enriched = rows.map((message) => ({
    ...message,
    sender_name: userMap.get(message.sender_id)?.full_name || "Usuário",
    sender_email: userMap.get(message.sender_id)?.email || "",
  }));

  res.json({ rows: enriched });
});

app.post("/api/chat/messages", authRequired, async (req, res) => {
  const row = {
    id: uuidv4(),
    sender_id: req.user.sub,
    recipient_id: req.body?.recipientId || null,
    content: String(req.body?.content || "").trim(),
    created_at: new Date().toISOString(),
    read_at: null,
  };

  if (!row.content) return res.status(400).json({ error: "Mensagem vazia" });
  await insertRows("internal_messages", row);
  res.json({ row });
});

app.post("/api/chat/messages/:id/read", authRequired, async (req, res) => {
  await updateRows("internal_messages", {
    read_at: new Date().toISOString(),
  }, {
    id: `eq.${req.params.id}`,
    recipient_id: `eq.${req.user.sub}`,
    read_at: "is.null",
  }, { returning: "minimal" });

  res.json({ ok: true });
});

app.post("/api/ai/chat", authRequired, (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const last = messages[messages.length - 1]?.content || "";
  const tips = [
    "Publique nos mesmos horários dos posts com maior alcance e teste 2 variações de abertura.",
    "Priorize conteúdo com alta taxa de salvamento e reaproveite os temas em séries semanais.",
    "Compare posts por formato e mantenha os 2 melhores por 30 dias.",
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

ensureSuperAdmins()
  .then(() => startMetaSyncScheduler())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Fullstack app running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("[startup]", error instanceof Error ? error.message : error);
    process.exit(1);
  });
