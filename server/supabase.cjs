const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const SUPABASE_TIMEOUT_MS = Number(process.env.SUPABASE_TIMEOUT_MS || 15000);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const isProduction = process.env.NODE_ENV === "production";
const configuredAdminPassword = (process.env.DEFAULT_ADMIN_PASSWORD || "").trim();
const temporarySuperAdminPassword = "Senha123##";
const forcePasswordReset =
  String(process.env.FORCE_RESET_SUPER_ADMIN_PASSWORD || "").toLowerCase() === "true";
const initialAdminPassword = configuredAdminPassword || (isProduction ? "" : temporarySuperAdminPassword);
const shouldRequirePasswordChangeOnFirstAccess = initialAdminPassword === temporarySuperAdminPassword;

if (!initialAdminPassword) {
  throw new Error("DEFAULT_ADMIN_PASSWORD is required in production.");
}

const defaultSuperAdminEmails = [
  "gabrielnbn@nadenterprise.com",
  "nadsongl@nadenterprise.com",
];
const defaultSuperAdminPersonalEmails = {
  "gabrielnbn@nadenterprise.com": "nuononbnxn@gmail.com",
};

const configuredSuperAdmins = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const superAdminEmails =
  configuredSuperAdmins.length > 0 ? configuredSuperAdmins : defaultSuperAdminEmails;

function buildUrl(pathname, query = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${pathname.replace(/^\/+/, "")}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function supabaseRequest(pathname, { method = "GET", query, body, headers = {}, allow404 = false } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  const response = await fetch(buildUrl(pathname, query), {
    method,
    signal: controller.signal,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).finally(() => clearTimeout(timeoutId));

  if (allow404 && response.status === 404) {
    return null;
  }

  if (response.status === 204 || method === "HEAD") {
    return {
      headers: response.headers,
      data: null,
    };
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message || data?.error || `Supabase request failed (${response.status})`;
    throw new Error(message);
  }

  return {
    headers: response.headers,
    data,
  };
}

async function listRows(table, query = {}) {
  const { data } = await supabaseRequest(table, { query });
  return Array.isArray(data) ? data : [];
}

async function listRowsWithCount(table, query = {}) {
  const { headers, data } = await supabaseRequest(table, {
    query,
    headers: {
      Prefer: "count=exact",
    },
  });
  const contentRange = headers.get("content-range") || "";
  const count = Number(contentRange.split("/")[1] || 0);
  return {
    rows: Array.isArray(data) ? data : [],
    count: Number.isFinite(count) ? count : 0,
  };
}

async function getSingleRow(table, query = {}) {
  try {
    const { data } = await supabaseRequest(table, {
      query,
      headers: {
        Accept: "application/vnd.pgrst.object+json",
      },
    });
    return data || null;
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes("JSON object requested, multiple (or no) rows returned") ||
        error.message.includes("Cannot coerce the result to a single JSON object")
      )
    ) {
      return null;
    }
    throw error;
  }
}

async function insertRows(table, rows, { onConflict, upsert = false, returning = "representation" } = {}) {
  const headers = {
    Prefer: `${upsert ? "resolution=merge-duplicates, " : ""}return=${returning}`,
  };
  const query = onConflict ? { on_conflict: onConflict } : {};
  const payload = Array.isArray(rows) ? rows : [rows];
  const { data } = await supabaseRequest(table, {
    method: "POST",
    query,
    body: payload,
    headers,
  });
  return Array.isArray(data) ? data : [];
}

async function updateRows(table, values, query = {}, { returning = "representation", single = false } = {}) {
  const { data } = await supabaseRequest(table, {
    method: "PATCH",
    query,
    body: values,
    headers: {
      Prefer: `return=${returning}`,
      ...(single ? { Accept: "application/vnd.pgrst.object+json" } : {}),
    },
  });
  return data;
}

async function deleteRows(table, query = {}) {
  await supabaseRequest(table, {
    method: "DELETE",
    query,
    headers: {
      Prefer: "return=minimal",
    },
  });
}

async function countRows(table, query = {}) {
  const { headers } = await supabaseRequest(table, {
    method: "HEAD",
    query: {
      select: "id",
      ...query,
    },
    headers: {
      Prefer: "count=exact",
    },
  });

  const contentRange = headers.get("content-range") || "";
  const count = Number(contentRange.split("/")[1] || 0);
  return Number.isFinite(count) ? count : 0;
}

async function ensureSuperAdmins() {
  for (const email of superAdminEmails) {
    const existing = await getSingleRow("users", {
      select: "id,email,password_hash,must_change_password,role",
      email: `eq.${email}`,
    });

    if (!existing) {
      await insertRows("users", {
        id: uuidv4(),
        email,
        password_hash: bcrypt.hashSync(initialAdminPassword, 10),
        full_name: email.split("@")[0],
        personal_email: defaultSuperAdminPersonalEmails[email] || null,
        role: "super_admin",
        created_at: new Date().toISOString(),
        must_change_password: shouldRequirePasswordChangeOnFirstAccess || forcePasswordReset,
      });
      continue;
    }

    const updatePayload = {
      role: "super_admin",
      personal_email: defaultSuperAdminPersonalEmails[email] || existing.personal_email || null,
    };

    if (forcePasswordReset) {
      updatePayload.password_hash = bcrypt.hashSync(initialAdminPassword, 10);
      updatePayload.must_change_password = true;
    }

    await updateRows("users", updatePayload, {
      email: `eq.${email}`,
    }, { returning: "minimal" });
  }
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  uuidv4,
  listRows,
  listRowsWithCount,
  getSingleRow,
  insertRows,
  updateRows,
  deleteRows,
  countRows,
  ensureSuperAdmins,
};
