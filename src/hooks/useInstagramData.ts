import { useState, useEffect, useMemo } from 'react';
import { InstagramPost } from '@/types/instagram';
import { parseCSVData, parseXLSXData } from '@/utils/dataProcessor';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import { logActivity } from '@/utils/activityLogger';
import { toast } from 'sonner';

interface DbInstagramPost {
  id: string;
  post_id: string;
  account_id: string | null;
  username: string | null;
  account_name: string | null;
  description: string | null;
  duration: number | null;
  published_at: string | null;
  permalink: string | null;
  post_type: string | null;
  views: number | null;
  reach: number | null;
  likes: number | null;
  shares: number | null;
  follows: number | null;
  comments: number | null;
  saves: number | null;
}

function dbPostToInstagramPost(dbPost: DbInstagramPost): InstagramPost {
  const publishedAt = dbPost.published_at ? new Date(dbPost.published_at) : new Date();
  const views = dbPost.views || 0;
  const reach = dbPost.reach || 0;
  const likes = dbPost.likes || 0;
  const comments = dbPost.comments || 0;
  const shares = dbPost.shares || 0;
  const saves = dbPost.saves || 0;
  const follows = dbPost.follows || 0;
  const description = dbPost.description || '';

  const engagementTotal = likes + comments + shares + saves;
  const engagementRate = reach > 0 ? (engagementTotal / reach) * 100 : 0;
  const reachRate = views > 0 ? (reach / views) * 100 : 0;

  const dayOfWeek = publishedAt.getDay();
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const hour = publishedAt.getHours();

  let period: 'morning' | 'afternoon' | 'evening' | 'night';
  if (hour >= 6 && hour < 12) period = 'morning';
  else if (hour >= 12 && hour < 18) period = 'afternoon';
  else if (hour >= 18 && hour < 22) period = 'evening';
  else period = 'night';

  const weekNumber = Math.ceil((publishedAt.getDate() + new Date(publishedAt.getFullYear(), publishedAt.getMonth(), 1).getDay()) / 7);

  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojis = description.match(emojiRegex) || [];
  const hashtags = description.match(/#\w+/g) || [];

  return {
    id: dbPost.post_id,
    accountId: dbPost.account_id || '',
    username: dbPost.username || '',
    accountName: dbPost.account_name || '',
    description,
    duration: dbPost.duration || 0,
    publishedAt,
    permalink: dbPost.permalink || '',
    postType: dbPost.post_type || 'unknown',
    views,
    reach,
    likes,
    shares,
    follows,
    comments,
    saves,
    engagementRate,
    engagementTotal,
    reachRate,
    dayOfWeek,
    dayName: dayNames[dayOfWeek],
    hour,
    period,
    weekNumber,
    descriptionLength: description.length,
    hasEmoji: emojis.length > 0,
    emojiCount: emojis.length,
    hashtagCount: hashtags.length,
  };
}

function instagramPostToDbFormat(post: InstagramPost) {
  return {
    post_id: post.id,
    account_id: post.accountId || null,
    username: post.username || null,
    account_name: post.accountName || null,
    description: post.description || null,
    duration: post.duration || 0,
    published_at: post.publishedAt.toISOString(),
    permalink: post.permalink || null,
    post_type: post.postType || null,
    views: post.views || 0,
    reach: post.reach || 0,
    likes: post.likes || 0,
    shares: post.shares || 0,
    follows: post.follows || 0,
    comments: post.comments || 0,
    saves: post.saves || 0,
  };
}

export function useInstagramData() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load data from database
  const loadFromDatabase = async () => {
    try {
      setIsLoading(true);
      const { data, error: dbError } = await supabase
        .from('instagram_posts')
        .select('*')
        .order('published_at', { ascending: false });

      if (dbError) throw dbError;

      if (data && data.length > 0) {
        const instagramPosts = data.map(dbPostToInstagramPost);
        setPosts(instagramPosts);
      } else {
        // If no data in DB, try to load from CSV file as initial seed
        await loadFromCSVFile();
      }
      setError(null);
    } catch (err: any) {
      console.error('Error loading from database:', err);
      // Fallback to CSV file
      await loadFromCSVFile();
    } finally {
      setIsLoading(false);
    }
  };

  // Load from CSV file (fallback/initial seed)
  const loadFromCSVFile = async () => {
    try {
      const response = await fetch('/data/instagram-posts.csv');
      const csvText = await response.text();
      const parsedPosts = parseCSVData(csvText);
      setPosts(parsedPosts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()));
      setError(null);
    } catch (err) {
      setError('Erro ao carregar dados do Instagram');
      console.error(err);
    }
  };

  useEffect(() => {
    loadFromDatabase();
  }, []);

  const addUploadedData = async (type: 'csv' | 'xlsx', data: any[]) => {
    setIsSaving(true);
    let newPosts: InstagramPost[] = [];

    try {
      // Parse data based on type
      if (type === 'csv') {
        const csvText = Papa.unparse(data);
        newPosts = parseCSVData(csvText);
      } else if (type === 'xlsx') {
        newPosts = parseXLSXData(data);
      }

      if (newPosts.length === 0) {
        toast.error('Nenhum registro válido encontrado no arquivo');
        setIsSaving(false);
        return;
      }

      // Convert to database format
      const dbRecords = newPosts.map(instagramPostToDbFormat);
      
      console.log(`Processing ${dbRecords.length} records for upsert...`);

      // Use native Supabase upsert with onConflict for atomic operation
      const { data: upsertedData, error: upsertError } = await supabase
        .from('instagram_posts')
        .upsert(dbRecords, { 
          onConflict: 'post_id',
          ignoreDuplicates: false // Update existing records
        })
        .select();

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        toast.error(`Erro ao salvar: ${upsertError.message}`);
        setError(upsertError.message);
        return;
      }

      const processedCount = upsertedData?.length || dbRecords.length;
      
      logActivity(`upload_${type}`, { 
        recordsCount: newPosts.length, 
        processedCount
      });

      toast.success(`${processedCount} registros processados com sucesso!`);
      console.log(`Successfully upserted ${processedCount} records`);

      // Reload from database to get fresh data
      await loadFromDatabase();

    } catch (err: any) {
      console.error('Error saving to database:', err);
      toast.error('Erro ao salvar no banco de dados: ' + err.message);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const summary = useMemo(() => {
    if (posts.length === 0) return null;

    const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
    const totalReach = posts.reduce((sum, p) => sum + p.reach, 0);
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
    const totalShares = posts.reduce((sum, p) => sum + p.shares, 0);
    const totalSaves = posts.reduce((sum, p) => sum + p.saves, 0);
    const totalFollows = posts.reduce((sum, p) => sum + p.follows, 0);
    const avgEngagement = posts.reduce((sum, p) => sum + p.engagementRate, 0) / posts.length;

    return {
      totalPosts: posts.length,
      totalViews,
      totalReach,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      totalFollows,
      avgViews: totalViews / posts.length,
      avgReach: totalReach / posts.length,
      avgLikes: totalLikes / posts.length,
      avgEngagement,
    };
  }, [posts]);

  return { 
    posts, 
    isLoading, 
    error, 
    summary, 
    addUploadedData, 
    isSaving,
    refreshData: loadFromDatabase
  };
}
