import Papa, { ParseResult } from 'papaparse';
import { InstagramPost, MetricSummary, PerformanceByDay, PerformanceByHour, ContentTypePerformance, CorrelationMatrix, InsightRecommendation, ClusterResult } from '@/types/instagram';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface CSVRow {
  [key: string]: string;
}

export function parseCSVData(csvText: string): InstagramPost[] {
  const result: ParseResult<CSVRow> = Papa.parse<CSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data.map((row: CSVRow, index: number) => {
    const publishedAt = parseDate(row['Horário de publicação']);
    const description = row['Descrição'] || '';
    const views = parseNumber(row['Visualizações']);
    const reach = parseNumber(row['Alcance']);
    const likes = parseNumber(row['Curtidas']);
    const comments = parseNumber(row['Comentários']);
    const shares = parseNumber(row['Compartilhamentos']);
    const saves = parseNumber(row['Salvamentos']);
    const follows = parseNumber(row['Seguimentos']);
    const duration = parseNumber(row['Duração (s)']);

    const engagementTotal = likes + comments + shares + saves;
    const engagementRate = reach > 0 ? (engagementTotal / reach) * 100 : 0;
    const reachRate = views > 0 ? (reach / views) * 100 : 0;

    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]/gu;
    const emojis = description.match(emojiRegex) || [];
    const hashtags = description.match(/#\w+/g) || [];

    return {
      id: row['Identificação do post'] || `post-${index}`,
      accountId: row['Identificação da conta'] || '',
      username: row['Nome de usuário da conta'] || '',
      accountName: row['Nome da conta'] || '',
      description,
      duration,
      publishedAt,
      permalink: row['Link permanente'] || '',
      postType: row['Tipo de post'] || 'Reel do Instagram',
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
      dayOfWeek: publishedAt.getDay(),
      dayName: DAY_NAMES[publishedAt.getDay()],
      hour: publishedAt.getHours(),
      period: getPeriod(publishedAt.getHours()),
      weekNumber: getWeekNumber(publishedAt),
      descriptionLength: description.length,
      hasEmoji: emojis.length > 0,
      emojiCount: emojis.length,
      hashtagCount: hashtags.length,
    };
  }).filter((post): post is InstagramPost => post.publishedAt instanceof Date && !isNaN(post.publishedAt.getTime()));
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [datePart, timePart] = dateStr.split(' ');
  const [day, month, year] = datePart.split('/').map(Number);
  const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

function getPeriod(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export function calculateMetricSummary(values: number[]): MetricSummary {
  if (values.length === 0) {
    return { total: 0, average: 0, median: 0, min: 0, max: 0, stdDev: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const total = values.reduce((sum, v) => sum + v, 0);
  const average = total / values.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const variance = values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { total, average, median, min, max, stdDev };
}

export function getPerformanceByDay(posts: InstagramPost[]): PerformanceByDay[] {
  const byDay: Record<number, InstagramPost[]> = {};
  
  posts.forEach(post => {
    if (!byDay[post.dayOfWeek]) byDay[post.dayOfWeek] = [];
    byDay[post.dayOfWeek].push(post);
  });

  return Object.entries(byDay).map(([dayIndex, dayPosts]) => ({
    day: DAY_NAMES[parseInt(dayIndex)],
    dayIndex: parseInt(dayIndex),
    avgViews: dayPosts.reduce((sum, p) => sum + p.views, 0) / dayPosts.length,
    avgReach: dayPosts.reduce((sum, p) => sum + p.reach, 0) / dayPosts.length,
    avgLikes: dayPosts.reduce((sum, p) => sum + p.likes, 0) / dayPosts.length,
    avgEngagement: dayPosts.reduce((sum, p) => sum + p.engagementRate, 0) / dayPosts.length,
    postCount: dayPosts.length,
  })).sort((a, b) => a.dayIndex - b.dayIndex);
}

export function getPerformanceByHour(posts: InstagramPost[]): PerformanceByHour[] {
  const byHour: Record<number, InstagramPost[]> = {};
  
  posts.forEach(post => {
    if (!byHour[post.hour]) byHour[post.hour] = [];
    byHour[post.hour].push(post);
  });

  return Object.entries(byHour).map(([hour, hourPosts]) => ({
    hour: parseInt(hour),
    avgViews: hourPosts.reduce((sum, p) => sum + p.views, 0) / hourPosts.length,
    avgReach: hourPosts.reduce((sum, p) => sum + p.reach, 0) / hourPosts.length,
    avgLikes: hourPosts.reduce((sum, p) => sum + p.likes, 0) / hourPosts.length,
    avgEngagement: hourPosts.reduce((sum, p) => sum + p.engagementRate, 0) / hourPosts.length,
    postCount: hourPosts.length,
  })).sort((a, b) => a.hour - b.hour);
}

export function getContentTypePerformance(posts: InstagramPost[]): ContentTypePerformance[] {
  const byType: Record<string, InstagramPost[]> = {};
  
  posts.forEach(post => {
    const type = post.postType || 'Outro';
    if (!byType[type]) byType[type] = [];
    byType[type].push(post);
  });

  return Object.entries(byType).map(([type, typePosts]) => ({
    type,
    avgViews: typePosts.reduce((sum, p) => sum + p.views, 0) / typePosts.length,
    avgReach: typePosts.reduce((sum, p) => sum + p.reach, 0) / typePosts.length,
    avgLikes: typePosts.reduce((sum, p) => sum + p.likes, 0) / typePosts.length,
    avgEngagement: typePosts.reduce((sum, p) => sum + p.engagementRate, 0) / typePosts.length,
    postCount: typePosts.length,
    totalViews: typePosts.reduce((sum, p) => sum + p.views, 0),
  }));
}

export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

export function getCorrelationMatrix(posts: InstagramPost[]): CorrelationMatrix[] {
  const metrics = ['views', 'reach', 'likes', 'comments', 'shares', 'saves', 'duration', 'descriptionLength'] as const;
  const correlations: CorrelationMatrix[] = [];

  for (let i = 0; i < metrics.length; i++) {
    for (let j = i + 1; j < metrics.length; j++) {
      const x = posts.map(p => p[metrics[i]] as number);
      const y = posts.map(p => p[metrics[j]] as number);
      correlations.push({
        metric1: metrics[i],
        metric2: metrics[j],
        correlation: calculateCorrelation(x, y),
      });
    }
  }

  return correlations;
}

export function generateInsights(posts: InstagramPost[]): InsightRecommendation[] {
  const insights: InsightRecommendation[] = [];
  
  if (posts.length === 0) return insights;

  // Best day insight
  const byDay = getPerformanceByDay(posts);
  const bestDay = byDay.reduce((best, day) => day.avgViews > best.avgViews ? day : best);
  const worstDay = byDay.reduce((worst, day) => day.avgViews < worst.avgViews ? day : worst);
  
  insights.push({
    type: 'success',
    title: `${bestDay.day} é seu melhor dia`,
    description: `Posts publicados na ${bestDay.day} têm em média ${formatNumber(bestDay.avgViews)} visualizações, ${((bestDay.avgViews / worstDay.avgViews - 1) * 100).toFixed(0)}% mais que ${worstDay.day}.`,
    impact: 'high',
    metric: 'Visualizações',
    value: formatNumber(bestDay.avgViews),
  });

  // Best hour insight
  const byHour = getPerformanceByHour(posts);
  const bestHour = byHour.reduce((best, hour) => hour.avgViews > best.avgViews ? hour : best);
  
  insights.push({
    type: 'tip',
    title: `Melhor horário: ${bestHour.hour}h`,
    description: `Posts publicados às ${bestHour.hour}h têm melhor desempenho, com média de ${formatNumber(bestHour.avgViews)} views.`,
    impact: 'high',
    metric: 'Horário',
    value: `${bestHour.hour}:00`,
  });

  // Duration insight for videos
  const videoPosts = posts.filter(p => p.duration > 0);
  if (videoPosts.length > 0) {
    const shortVideos = videoPosts.filter(p => p.duration <= 30);
    const longVideos = videoPosts.filter(p => p.duration > 30);
    
    if (shortVideos.length > 0 && longVideos.length > 0) {
      const avgShort = shortVideos.reduce((sum, p) => sum + p.views, 0) / shortVideos.length;
      const avgLong = longVideos.reduce((sum, p) => sum + p.views, 0) / longVideos.length;
      
      if (avgShort > avgLong) {
        insights.push({
          type: 'info',
          title: 'Vídeos curtos performam melhor',
          description: `Vídeos até 30s têm ${((avgShort / avgLong - 1) * 100).toFixed(0)}% mais views que vídeos longos. Foque em conteúdo direto.`,
          impact: 'medium',
        });
      }
    }
  }

  // Engagement rate insight
  const avgEngagement = posts.reduce((sum, p) => sum + p.engagementRate, 0) / posts.length;
  insights.push({
    type: avgEngagement > 5 ? 'success' : 'warning',
    title: `Taxa de engajamento: ${avgEngagement.toFixed(2)}%`,
    description: avgEngagement > 5 
      ? 'Sua taxa de engajamento está acima da média do Instagram (3-6%). Continue assim!'
      : 'Considere posts mais interativos com perguntas ou CTAs para aumentar o engajamento.',
    impact: 'high',
    metric: 'Engajamento',
    value: `${avgEngagement.toFixed(2)}%`,
  });

  // Top performing post insight
  const topPost = posts.reduce((best, post) => post.views > best.views ? post : best);
  insights.push({
    type: 'success',
    title: 'Post viral identificado',
    description: `"${topPost.description.substring(0, 50)}..." alcançou ${formatNumber(topPost.views)} views. Analise elementos para replicar.`,
    impact: 'high',
  });

  // Emoji usage insight
  const withEmoji = posts.filter(p => p.hasEmoji);
  const withoutEmoji = posts.filter(p => !p.hasEmoji);
  if (withEmoji.length > 0 && withoutEmoji.length > 0) {
    const avgWithEmoji = withEmoji.reduce((sum, p) => sum + p.views, 0) / withEmoji.length;
    const avgWithoutEmoji = withoutEmoji.reduce((sum, p) => sum + p.views, 0) / withoutEmoji.length;
    
    if (avgWithEmoji > avgWithoutEmoji) {
      insights.push({
        type: 'tip',
        title: 'Emojis aumentam engajamento',
        description: `Posts com emojis têm ${((avgWithEmoji / avgWithoutEmoji - 1) * 100).toFixed(0)}% mais visualizações. Use-os estrategicamente!`,
        impact: 'medium',
      });
    }
  }

  return insights;
}

export function clusterPosts(posts: InstagramPost[]): ClusterResult[] {
  if (posts.length < 3) return [];

  // Simple K-means implementation for 3 clusters (low, medium, high performance)
  const features = posts.map(p => ({
    views: p.views,
    reach: p.reach,
    engagement: p.engagementTotal,
  }));

  // Normalize features
  const maxViews = Math.max(...features.map(f => f.views));
  const maxReach = Math.max(...features.map(f => f.reach));
  const maxEngagement = Math.max(...features.map(f => f.engagement));

  const normalized = features.map(f => ({
    views: f.views / maxViews,
    reach: f.reach / maxReach,
    engagement: f.engagement / maxEngagement,
  }));

  // Simple clustering based on percentiles
  const scores = posts.map((p, i) => ({
    post: p,
    score: normalized[i].views * 0.4 + normalized[i].reach * 0.35 + normalized[i].engagement * 0.25,
  }));

  const sorted = scores.sort((a, b) => a.score - b.score);
  const third = Math.floor(sorted.length / 3);

  const clusters: ClusterResult[] = [
    {
      clusterId: 0,
      label: 'Baixo Desempenho',
      posts: sorted.slice(0, third).map(s => s.post),
      centroid: { views: 0, reach: 0, likes: 0, engagement: 0 },
    },
    {
      clusterId: 1,
      label: 'Desempenho Médio',
      posts: sorted.slice(third, third * 2).map(s => s.post),
      centroid: { views: 0, reach: 0, likes: 0, engagement: 0 },
    },
    {
      clusterId: 2,
      label: 'Alto Desempenho',
      posts: sorted.slice(third * 2).map(s => s.post),
      centroid: { views: 0, reach: 0, likes: 0, engagement: 0 },
    },
  ];

  // Calculate centroids
  clusters.forEach(cluster => {
    if (cluster.posts.length > 0) {
      cluster.centroid = {
        views: cluster.posts.reduce((sum, p) => sum + p.views, 0) / cluster.posts.length,
        reach: cluster.posts.reduce((sum, p) => sum + p.reach, 0) / cluster.posts.length,
        likes: cluster.posts.reduce((sum, p) => sum + p.likes, 0) / cluster.posts.length,
        engagement: cluster.posts.reduce((sum, p) => sum + p.engagementTotal, 0) / cluster.posts.length,
      };
    }
  });

  return clusters;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(0);
}

export function formatPercentage(num: number): string {
  return num.toFixed(2) + '%';
}
