import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_ALLOWED_ORIGINS = [
  "https://nuono-cyber.github.io",
  "http://localhost:5173",
  "http://localhost:8080",
];
const RESET_WINDOW_MINUTES = 15;
const MAX_ATTEMPTS_PER_WINDOW = 5;

interface PasswordResetRequest {
  corporateEmail: string;
  personalEmail: string;
  redirectUrl: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getAllowedOrigins() {
  const configured = Deno.env.get("ALLOWED_PASSWORD_RESET_ORIGINS");
  if (!configured) return DEFAULT_ALLOWED_ORIGINS;
  return configured.split(",").map((origin) => origin.trim()).filter(Boolean);
}

function getSafeRedirectUrl(redirectUrl: string) {
  const parsed = new URL(redirectUrl);
  const allowedOrigins = getAllowedOrigins();

  if (!allowedOrigins.includes(parsed.origin)) {
    throw new Error("Origem de redirecionamento nao permitida");
  }

  if (parsed.pathname !== "/auth/reset-password") {
    throw new Error("Caminho de redirecionamento invalido");
  }

  return parsed.toString();
}

function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function checkRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  corporateEmail: string,
  ipAddress: string,
) {
  const since = new Date(Date.now() - RESET_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count, error } = await supabaseAdmin
    .from("password_reset_attempts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .or(`corporate_email.eq.${corporateEmail},ip_address.eq.${ipAddress}`);

  if (error) {
    console.error("Password reset rate limit check failed:", error);
    return true;
  }

  if ((count || 0) >= MAX_ATTEMPTS_PER_WINDOW) {
    return false;
  }

  await supabaseAdmin.from("password_reset_attempts").insert({
    corporate_email: corporateEmail,
    ip_address: ipAddress,
  });

  return true;
}

async function sendRecoveryEmail(to: string, recoveryUrl: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("PASSWORD_RESET_FROM_EMAIL");

  if (!resendApiKey || !from) {
    throw new Error("Servico de email nao configurado");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Recuperacao de senha - Instagram Analytics",
      text: `Use este link para redefinir sua senha: ${recoveryUrl}`,
      html: `
        <p>Use o link abaixo para redefinir sua senha:</p>
        <p><a href="${recoveryUrl}">Redefinir senha</a></p>
        <p>Se voce nao solicitou esta recuperacao, ignore este email.</p>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Password reset email provider error:", response.status, errorText);
    throw new Error("Erro ao enviar email de recuperacao");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { corporateEmail, personalEmail, redirectUrl }: PasswordResetRequest = await req.json();
    const normalizedCorporateEmail = normalizeEmail(corporateEmail);
    const normalizedPersonalEmail = normalizeEmail(personalEmail);

    if (
      !isValidEmail(normalizedCorporateEmail) ||
      !normalizedCorporateEmail.endsWith("@nadenterprise.com") ||
      !isValidEmail(normalizedPersonalEmail) ||
      !redirectUrl
    ) {
      return jsonResponse({ error: "Dados invalidos" }, 400);
    }

    const safeRedirectUrl = getSafeRedirectUrl(redirectUrl);
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const ipAddress = getClientIp(req);
    const rateLimitAllowed = await checkRateLimit(
      supabaseAdmin,
      normalizedCorporateEmail,
      ipAddress,
    );

    if (!rateLimitAllowed) {
      return jsonResponse({ error: "Muitas tentativas. Tente novamente em alguns minutos." }, 429);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("personal_email")
      .ilike("email", normalizedCorporateEmail)
      .maybeSingle();

    if (profileError) {
      console.error("Password reset profile lookup failed:", profileError);
      return jsonResponse({ error: "Erro ao validar dados" }, 500);
    }

    if (!profile || normalizeEmail(profile.personal_email) !== normalizedPersonalEmail) {
      return jsonResponse({
        success: true,
        message: "Se os dados estiverem corretos, enviaremos um link de recuperacao.",
      });
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedCorporateEmail,
      options: {
        redirectTo: safeRedirectUrl,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Password reset link generation failed:", linkError);
      return jsonResponse({ error: "Erro ao gerar link de recuperacao" }, 500);
    }

    await sendRecoveryEmail(normalizedPersonalEmail, linkData.properties.action_link);

    return jsonResponse({
      success: true,
      message: "Se os dados estiverem corretos, enviaremos um link de recuperacao.",
    });
  } catch (error: unknown) {
    console.error("Password reset function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    return jsonResponse({ error: errorMessage }, 500);
  }
});
