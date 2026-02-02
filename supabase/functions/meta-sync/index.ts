import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  permalink: string;
  timestamp: string;
  thumbnail_url?: string;
}

interface InsightsData {
  name: string;
  period: string;
  values: { value: number }[];
  title: string;
  description: string;
  id: string;
}

interface ReelInsights {
  reach: number;
  plays: number;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  total_interactions: number;
  ig_reels_avg_watch_time?: number;
  ig_reels_video_view_total_time?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { _user_id: userId });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Super admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, configId, accessToken, instagramAccountId } = await req.json();

    console.log(`Meta sync action: ${action}`);

    if (action === 'test-connection') {
      // Test the connection with the provided credentials
      const testUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}?fields=id,username,name,profile_picture_url&access_token=${accessToken}`;
      
      const testResponse = await fetch(testUrl);
      const testData = await testResponse.json();

      if (testData.error) {
        console.error('Meta API error:', testData.error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: testData.error.message || 'Failed to connect to Meta API' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        account: testData 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sync') {
      // Get config from database
      const { data: config, error: configError } = await supabase
        .from('meta_integration_config')
        .select('*')
        .eq('id', configId)
        .single();

      if (configError || !config) {
        return new Response(JSON.stringify({ error: 'Configuration not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create sync log entry
      const { data: syncLog, error: logError } = await supabase
        .from('meta_sync_logs')
        .insert({
          config_id: configId,
          status: 'partial',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (logError) {
        console.error('Error creating sync log:', logError);
      }

      try {
        // Fetch media from Instagram Graph API
        const mediaUrl = `https://graph.facebook.com/v21.0/${config.instagram_account_id}/media?fields=id,caption,media_type,media_url,permalink,timestamp,thumbnail_url&limit=50&access_token=${config.access_token}`;
        
        console.log('Fetching media from Meta API...');
        const mediaResponse = await fetch(mediaUrl);
        const mediaData = await mediaResponse.json();

        if (mediaData.error) {
          throw new Error(mediaData.error.message || 'Failed to fetch media');
        }

        const mediaItems: MediaItem[] = mediaData.data || [];
        console.log(`Fetched ${mediaItems.length} media items`);

        // Filter for Reels only (VIDEO or REELS type)
        const reels = mediaItems.filter(item => 
          item.media_type === 'VIDEO' || item.media_type === 'REELS'
        );
        console.log(`Found ${reels.length} reels`);

        // Fetch insights for each reel
        const processedReels = [];
        for (const reel of reels) {
          try {
            // Insights metrics for reels
            const insightsUrl = `https://graph.facebook.com/v21.0/${reel.id}/insights?metric=reach,plays,likes,comments,shares,saved,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time&access_token=${config.access_token}`;
            
            const insightsResponse = await fetch(insightsUrl);
            const insightsData = await insightsResponse.json();

            const insights: ReelInsights = {
              reach: 0,
              plays: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              saved: 0,
              total_interactions: 0,
            };

            if (insightsData.data) {
              for (const metric of insightsData.data as InsightsData[]) {
                const value = metric.values?.[0]?.value || 0;
                switch (metric.name) {
                  case 'reach':
                    insights.reach = value;
                    break;
                  case 'plays':
                    insights.plays = value;
                    break;
                  case 'likes':
                    insights.likes = value;
                    break;
                  case 'comments':
                    insights.comments = value;
                    break;
                  case 'shares':
                    insights.shares = value;
                    break;
                  case 'saved':
                    insights.saved = value;
                    break;
                  case 'total_interactions':
                    insights.total_interactions = value;
                    break;
                  case 'ig_reels_avg_watch_time':
                    insights.ig_reels_avg_watch_time = value;
                    break;
                  case 'ig_reels_video_view_total_time':
                    insights.ig_reels_video_view_total_time = value;
                    break;
                }
              }
            }

            processedReels.push({
              id: reel.id,
              caption: reel.caption || '',
              mediaType: reel.media_type,
              permalink: reel.permalink,
              timestamp: reel.timestamp,
              thumbnailUrl: reel.thumbnail_url,
              ...insights,
            });

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (reelError) {
            console.error(`Error fetching insights for reel ${reel.id}:`, reelError);
          }
        }

        // Update sync log with success
        if (syncLog) {
          await supabase
            .from('meta_sync_logs')
            .update({
              status: 'success',
              records_fetched: processedReels.length,
              records_updated: processedReels.length,
              completed_at: new Date().toISOString(),
            })
            .eq('id', syncLog.id);
        }

        // Update last sync timestamp
        await supabase
          .from('meta_integration_config')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', configId);

        console.log(`Sync completed: ${processedReels.length} reels processed`);

        return new Response(JSON.stringify({ 
          success: true, 
          reels: processedReels,
          count: processedReels.length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (syncError) {
        console.error('Sync error:', syncError);
        
        // Update sync log with error
        if (syncLog) {
          await supabase
            .from('meta_sync_logs')
            .update({
              status: 'error',
              error_message: syncError instanceof Error ? syncError.message : 'Unknown error',
              completed_at: new Date().toISOString(),
            })
            .eq('id', syncLog.id);
        }

        return new Response(JSON.stringify({ 
          success: false, 
          error: syncError instanceof Error ? syncError.message : 'Sync failed' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('Meta sync function error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
