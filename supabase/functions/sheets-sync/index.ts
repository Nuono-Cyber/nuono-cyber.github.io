import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { google } from "https://esm.sh/googleapis@121";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = claimsData.claims.sub;
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { _user_id: userId });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Super admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { action, spreadsheetId, range } = body;

    if (action !== 'fetch' || !spreadsheetId) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    if (!saJson) {
      return new Response(JSON.stringify({ error: 'Google service account not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const sa = JSON.parse(saJson);

    // Use googleapis with JWT auth
    const jwtClient = new google.auth.JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    } as any);

    await jwtClient.authorize();

    const sheets = google.sheets({ version: 'v4', auth: jwtClient } as any);

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: range || 'A:Z',
    } as any);

    const values = res.data.values || [];

    // Convert rows (array of arrays) to array of objects using header row
    let rows: Record<string, any>[] = [];
    if (values.length > 0) {
      const headers = values[0].map((h: string) => String(h).trim());
      rows = values.slice(1).map((r: any[]) => {
        const obj: Record<string, any> = {};
        headers.forEach((h: string, idx: number) => {
          obj[h] = r[idx] ?? '';
        });
        return obj;
      });
    }

    return new Response(JSON.stringify({ success: true, rows, count: rows.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('Sheets sync error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
