export interface InstagramPost {
  id: string;
  accountId: string;
  username: string;
  accountName: string;
  description: string;
  duration: number;
  publishedAt: Date;
  permalink: string;
  postType: string;
  views: number;
  reach: number;
  likes: number;
  shares: number;
  follows: number;
  comments: number;
  saves: number;
  // Derived metrics
  engagementRate: number;
  engagementTotal: number;
  reachRate: number;
  dayOfWeek: number;
  dayName: string;
  hour: number;
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  weekNumber: number;
  descriptionLength: number;
  hasEmoji: boolean;
  emojiCount: number;
  hashtagCount: number;
}

export interface MetricSummary {
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
}

export interface PerformanceByDay {
  day: string;
  dayIndex: number;
  avgViews: number;
  avgReach: number;
  avgLikes: number;
  avgEngagement: number;
  postCount: number;
}

export interface PerformanceByHour {
  hour: number;
  avgViews: number;
  avgReach: number;
  avgLikes: number;
  avgEngagement: number;
  postCount: number;
}

export interface ContentTypePerformance {
  type: string;
  avgViews: number;
  avgReach: number;
  avgLikes: number;
  avgEngagement: number;
  postCount: number;
  totalViews: number;
}

export interface CorrelationMatrix {
  metric1: string;
  metric2: string;
  correlation: number;
}

export interface ClusterResult {
  clusterId: number;
  posts: InstagramPost[];
  centroid: {
    views: number;
    reach: number;
    likes: number;
    engagement: number;
  };
  label: string;
}

export interface InsightRecommendation {
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  metric?: string;
  value?: string;
}

export interface PredictionResult {
  predictedViews: number;
  predictedReach: number;
  predictedLikes: number;
  confidence: number;
  factors: {
    name: string;
    impact: number;
  }[];
}
