import { useState, useEffect, useMemo } from 'react';
import { InstagramPost } from '@/types/instagram';
import { parseCSVData, parseXLSXData } from '@/utils/dataProcessor';

export function useInstagramData() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [uploadedPosts, setUploadedPosts] = useState<InstagramPost[]>([]);
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

  const addUploadedData = (type: 'csv' | 'xlsx', data: any[]) => {
    let newPosts: InstagramPost[] = [];

    if (type === 'csv') {
      // Para CSV, parseia como CSV e adiciona aos dados existentes
      const csvText = Papa.unparse(data); // Converte de volta para CSV
      newPosts = parseCSVData(csvText);
      setUploadedPosts(prev => [...prev, ...newPosts]);
    } else if (type === 'xlsx') {
      // Para XLSX, substitui todos os dados
      newPosts = parseXLSXData(data);
      setPosts(newPosts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()));
      setUploadedPosts([]); // Limpa uploads anteriores
    }
  };

  // Combina posts originais com uploads incrementais
  const allPosts = useMemo(() => {
    return [...posts, ...uploadedPosts].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }, [posts, uploadedPosts]);

  const summary = useMemo(() => {
    if (allPosts.length === 0) return null;

    const totalViews = allPosts.reduce((sum, p) => sum + p.views, 0);
    const totalReach = allPosts.reduce((sum, p) => sum + p.reach, 0);
    const totalLikes = allPosts.reduce((sum, p) => sum + p.likes, 0);
    const totalComments = allPosts.reduce((sum, p) => sum + p.comments, 0);
    const totalShares = allPosts.reduce((sum, p) => sum + p.shares, 0);
    const totalSaves = allPosts.reduce((sum, p) => sum + p.saves, 0);
    const totalFollows = allPosts.reduce((sum, p) => sum + p.follows, 0);
    const avgEngagement = allPosts.reduce((sum, p) => sum + p.engagementRate, 0) / allPosts.length;

    return {
      totalPosts: allPosts.length,
      totalViews,
      totalReach,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      totalFollows,
      avgViews: totalViews / allPosts.length,
      avgReach: totalReach / allPosts.length,
      avgLikes: totalLikes / allPosts.length,
      avgEngagement,
    };
  }, [allPosts]);

  return { posts: allPosts, isLoading, error, summary, addUploadedData };
}
