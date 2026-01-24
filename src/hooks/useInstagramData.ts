import { useState, useEffect, useMemo } from 'react';
import { InstagramPost } from '@/types/instagram';
import { parseCSVData } from '@/utils/dataProcessor';

export function useInstagramData() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const response = await fetch('/data/instagram-posts.csv');
        const csvText = await response.text();
        const parsedPosts = parseCSVData(csvText);
        setPosts(parsedPosts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()));
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados do Instagram');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

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

  return { posts, isLoading, error, summary };
}
