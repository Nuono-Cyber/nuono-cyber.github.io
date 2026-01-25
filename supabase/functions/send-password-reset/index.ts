import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  corporateEmail: string;
  personalEmail: string;
  redirectUrl: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { corporateEmail, personalEmail, redirectUrl }: PasswordResetRequest = await req.json();

    console.log("Password reset request for:", corporateEmail, "sending to:", personalEmail);

    // Validate required fields
    if (!corporateEmail || !personalEmail || !redirectUrl) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios não informados" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the profile exists and personal email matches
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("personal_email, user_id")
      .eq("email", corporateEmail)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (profile.personal_email !== personalEmail) {
      console.error("Personal email mismatch");
      return new Response(
        JSON.stringify({ error: "Email pessoal não corresponde" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate a magic link for password reset
    // We'll use the admin API to generate a recovery link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: corporateEmail,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      console.error("Error generating link:", linkError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de recuperação" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send email using Lovable AI (simulated email - in production you'd use Resend or similar)
    // For now, we'll use the built-in Supabase email but with a workaround
    // Since we can't change the email recipient, we'll create a custom flow

    // Extract the token from the generated link
    const recoveryUrl = linkData.properties.action_link;
    
    console.log("Recovery link generated successfully");
    console.log("Sending to personal email:", personalEmail);

    // In a production environment, you would integrate with an email service like Resend
    // For now, we'll return success and log the link for testing
    // The user should configure Resend or another email service

    // Return success - in production, integrate with email service
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Link de recuperação gerado",
        // In production, remove this - only for testing
        debug_link: recoveryUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: unknown) {
    console.error("Error in password reset:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
