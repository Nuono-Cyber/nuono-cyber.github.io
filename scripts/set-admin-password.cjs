const bcrypt = require("bcryptjs");

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const TARGET_ADMIN_EMAIL = String(process.env.TARGET_ADMIN_EMAIL || "").toLowerCase().trim();
const NEW_ADMIN_PASSWORD = String(process.env.NEW_ADMIN_PASSWORD || "");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TARGET_ADMIN_EMAIL || !NEW_ADMIN_PASSWORD) {
  console.error(
    "Missing env. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TARGET_ADMIN_EMAIL, NEW_ADMIN_PASSWORD"
  );
  process.exit(1);
}

if (NEW_ADMIN_PASSWORD.length < 6) {
  console.error("NEW_ADMIN_PASSWORD must have at least 6 characters.");
  process.exit(1);
}

async function main() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/users`);
  url.searchParams.set("email", `eq.${TARGET_ADMIN_EMAIL}`);

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      password_hash: bcrypt.hashSync(NEW_ADMIN_PASSWORD, 10),
      must_change_password: false,
    }),
  });

  const data = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Supabase returned ${response.status}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No user found for ${TARGET_ADMIN_EMAIL}`);
  }

  console.log(`Password updated for ${TARGET_ADMIN_EMAIL}. must_change_password=false`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
