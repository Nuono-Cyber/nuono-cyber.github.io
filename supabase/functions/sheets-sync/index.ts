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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = user.id;
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { _user_id: userId });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Super admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { action, spreadsheetId, range } = body;

    if (!action || !spreadsheetId) {
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

    // If action is 'fetch' just return rows
    if (action === 'fetch') {
      return new Response(JSON.stringify({ success: true, rows, count: rows.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If action is 'sync' attempt to upsert into instagram_posts
    if (action === 'sync') {
      const parseNumber = (v: any) => {
        if (typeof v === 'number') return v;
        if (!v) return 0;
        const cleaned = String(v).replace(/[^0-9.-]/g, '');
        return parseFloat(cleaned) || 0;
      };

      const parseDate = (v: any) => {
        if (!v) return null;
        const iso = new Date(v);
        if (!isNaN(iso.getTime())) return iso.toISOString();
        try {
          const [datePart, timePart] = String(v).split(' ');
          const [day, month, year] = datePart.split('/').map(Number);
          const [hh = 0, mm = 0] = (timePart || '00:00').split(':').map(Number);
          return new Date(year, month - 1, day, hh, mm).toISOString();
        } catch {
          return null;
        }
      };

      const mapKey = (key: string) => {
        const k = key.toLowerCase().trim();
        if (k === 'identificação do post' || k === 'id' || k === 'post id' || k === 'post_id') return 'post_id';
        if (k === 'identificação da conta' || k === 'account id' || k === 'account_id') return 'account_id';
        if (k === 'nome da conta' || k === 'account name' || k === 'account_name') return 'account_name';
        if (k === 'nome de usuário da conta' || k === 'username') return 'username';
        if (k === 'descrição' || k === 'description') return 'description';
        if (k === 'duração (s)' || k === 'duration' || k === 'duration (s)') return 'duration';
        if (k === 'horário de publicação' || k === 'published_at' || k === 'published at') return 'published_at';
        if (k === 'link permanente' || k === 'permalink') return 'permalink';
        if (k === 'tipo de post' || k === 'post_type' || k === 'post type') return 'post_type';
        if (k === 'visualizações' || k === 'views') return 'views';
        if (k === 'alcance' || k === 'reach') return 'reach';
        if (k === 'curtidas' || k === 'likes') return 'likes';
        if (k === 'comentários' || k === 'comments') return 'comments';
        if (k === 'compartilhamentos' || k === 'shares') return 'shares';
        if (k === 'salvamentos' || k === 'saves') return 'saves';
        if (k === 'seguimentos' || k === 'follows') return 'follows';
        return null;
      };

      const headers = values[0].map((h: string) => String(h).trim());
      const normalizedHeaders = headers.map(h => mapKey(h));

      const records = rows.map(r => {
        const rec: Record<string, any> = {};
        headers.forEach((h: string, idx: number) => {
          const key = normalizedHeaders[idx];
          if (!key) return;
          const val = r[h];
          if (['views','reach','likes','comments','shares','saves','follows','duration'].includes(key)) {
            rec[key] = parseNumber(val);
          } else if (key === 'published_at') {
            rec[key] = parseDate(val);
          } else {
            rec[key] = val ? String(val) : null;
          }
        });
        if (!rec.post_id) {
          rec.post_id = rec.permalink ? rec.permalink : `sheet-${Math.random().toString(36).slice(2,9)}`;
        }
        return rec;
      });

      const { data: upserted, error: upsertError } = await supabase
        .from('instagram_posts')
        .upsert(records.map(r => ({
          post_id: r.post_id,
          account_id: r.account_id || null,
          username: r.username || null,
          account_name: r.account_name || null,
          description: r.description || null,
          duration: r.duration || null,
          published_at: r.published_at || null,
          permalink: r.permalink || null,
          post_type: r.post_type || null,
          views: r.views || 0,
          reach: r.reach || 0,
          likes: r.likes || 0,
          shares: r.shares || 0,
          follows: r.follows || 0,
          comments: r.comments || 0,
          saves: r.saves || 0,
        })), { onConflict: 'post_id' })
        .select();

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        return new Response(JSON.stringify({ success: false, error: upsertError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await supabase.from('activity_logs').insert({
        user_id: userId,
        action: 'sheets_sync',
        details: { count: records.length },
      });

      return new Response(JSON.stringify({ success: true, count: records.length, upsertedCount: upserted?.length || records.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('Sheets sync error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
