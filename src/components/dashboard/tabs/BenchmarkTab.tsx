import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { InstagramPost } from '@/types/instagram';
import { Target, TrendingUp, TrendingDown, Minus, Award, Users, Heart, MessageCircle } from 'lucide-react';
import { 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

interface BenchmarkTabProps {
  posts: InstagramPost[];
}

// Industry benchmarks for Instagram (simulated averages)
const industryBenchmarks = {
  engagementRate: 3.5, // Average engagement rate %
  likesPerPost: 150,
  commentsPerPost: 12,
  postsPerWeek: 4,
  videoEngagement: 4.2,
  imageEngagement: 2.8,
  carouselEngagement: 3.8,
};

export function BenchmarkTab({ posts }: BenchmarkTabProps) {
  const metrics = useMemo(() => {
    if (posts.length === 0) return null;
    
    const totalLikes = posts.reduce((acc, p) => acc + p.likes, 0);
    const totalComments = posts.reduce((acc, p) => acc + p.comments, 0);
    const totalEngagement = posts.reduce((acc, p) => acc + p.engagementTotal, 0);
    
    const avgLikes = totalLikes / posts.length;
    const avgComments = totalComments / posts.length;
    const avgEngagement = totalEngagement / posts.length;
    
    // Calculate posts per week
    const firstPost = posts.reduce((min, p) => p.publishedAt < min.publishedAt ? p : min, posts[0]);
    const lastPost = posts.reduce((max, p) => p.publishedAt > max.publishedAt ? p : max, posts[0]);
    const weeksDiff = Math.max(1, (lastPost.publishedAt.getTime() - firstPost.publishedAt.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const postsPerWeek = posts.length / weeksDiff;
    
    // Engagement by type
    const videosPosts = posts.filter(p => p.postType === 'Vídeo' || p.postType === 'Reels');
    const imagePosts = posts.filter(p => p.postType === 'Imagem');
    const carouselPosts = posts.filter(p => p.postType === 'Carrossel');
    
    const videoEngagement = videosPosts.length > 0 
      ? videosPosts.reduce((acc, p) => acc + p.engagementTotal, 0) / videosPosts.length 
      : 0;
    const imageEngagement = imagePosts.length > 0 
      ? imagePosts.reduce((acc, p) => acc + p.engagementTotal, 0) / imagePosts.length 
      : 0;
    const carouselEngagement = carouselPosts.length > 0 
      ? carouselPosts.reduce((acc, p) => acc + p.engagementTotal, 0) / carouselPosts.length 
      : 0;
    
    // Estimated engagement rate (simulated based on typical follower counts)
    const estimatedFollowers = 10000; // Placeholder
    const engagementRate = (avgEngagement / estimatedFollowers) * 100;
    
    return {
      avgLikes,
      avgComments,
      avgEngagement,
      postsPerWeek,
      videoEngagement,
      imageEngagement,
      carouselEngagement,
      engagementRate,
      totalPosts: posts.length
    };
  }, [posts]);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Sem dados para comparação</p>
      </div>
    );
  }

  const comparisons = [
    {
      label: 'Likes por Post',
      value: metrics.avgLikes,
      benchmark: industryBenchmarks.likesPerPost,
      icon: Heart
    },
    {
      label: 'Comentários por Post',
      value: metrics.avgComments,
      benchmark: industryBenchmarks.commentsPerPost,
      icon: MessageCircle
    },
    {
      label: 'Posts por Semana',
      value: metrics.postsPerWeek,
      benchmark: industryBenchmarks.postsPerWeek,
      icon: Target
    }
  ];

  const radarData = [
    { subject: 'Likes', you: Math.min(100, (metrics.avgLikes / industryBenchmarks.likesPerPost) * 50), benchmark: 50 },
    { subject: 'Comentários', you: Math.min(100, (metrics.avgComments / industryBenchmarks.commentsPerPost) * 50), benchmark: 50 },
    { subject: 'Frequência', you: Math.min(100, (metrics.postsPerWeek / industryBenchmarks.postsPerWeek) * 50), benchmark: 50 },
    { subject: 'Vídeos', you: Math.min(100, (metrics.videoEngagement / industryBenchmarks.videoEngagement) * 50), benchmark: 50 },
    { subject: 'Imagens', you: Math.min(100, (metrics.imageEngagement / industryBenchmarks.imageEngagement) * 50), benchmark: 50 },
    { subject: 'Carrossel', you: Math.min(100, (metrics.carouselEngagement / industryBenchmarks.carouselEngagement) * 50), benchmark: 50 },
  ];

  const contentComparisonData = [
    { name: 'Vídeo', voce: Math.round(metrics.videoEngagement), mercado: industryBenchmarks.videoEngagement * 40 },
    { name: 'Imagem', voce: Math.round(metrics.imageEngagement), mercado: industryBenchmarks.imageEngagement * 40 },
    { name: 'Carrossel', voce: Math.round(metrics.carouselEngagement), mercado: industryBenchmarks.carouselEngagement * 40 },
  ];

  const getPerformanceLabel = (value: number, benchmark: number) => {
    const ratio = value / benchmark;
    if (ratio >= 1.5) return { label: 'Excepcional', color: 'text-green-500', icon: TrendingUp };
    if (ratio >= 1) return { label: 'Acima da média', color: 'text-blue-500', icon: TrendingUp };
    if (ratio >= 0.7) return { label: 'Na média', color: 'text-yellow-500', icon: Minus };
    return { label: 'Abaixo da média', color: 'text-red-500', icon: TrendingDown };
  };

  // Calculate overall score
  const overallScore = Math.round(
    ((metrics.avgLikes / industryBenchmarks.likesPerPost) * 25 +
    (metrics.avgComments / industryBenchmarks.commentsPerPost) * 25 +
    (metrics.postsPerWeek / industryBenchmarks.postsPerWeek) * 25 +
    (metrics.avgEngagement / (industryBenchmarks.likesPerPost + industryBenchmarks.commentsPerPost)) * 25) * 
    100 / 100
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Benchmarking</h2>
          <p className="text-muted-foreground">Compare sua performance com o mercado</p>
        </div>
      </div>

      {/* Overall Score */}
      <Card className="glass-card overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-primary/20 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl font-bold">{overallScore}</p>
                  <p className="text-sm text-muted-foreground">Score</p>
                </div>
              </div>
              <Award className="absolute -top-2 -right-2 w-10 h-10 text-yellow-500" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold">
                {overallScore >= 80 ? 'Performance Excepcional! 🏆' :
                 overallScore >= 60 ? 'Boa Performance! 👍' :
                 overallScore >= 40 ? 'Na Média do Mercado 📊' :
                 'Espaço para Melhorar 📈'}
              </h3>
              <p className="text-muted-foreground mt-1">
                Seu perfil está {overallScore >= 50 ? 'acima' : 'abaixo'} da média do mercado em {Math.abs(overallScore - 50)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {comparisons.map((item) => {
          const performance = getPerformanceLabel(item.value, item.benchmark);
          const Icon = item.icon;
          const StatusIcon = performance.icon;
          
          return (
            <Card key={item.label} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <Icon className="w-8 h-8 text-muted-foreground" />
                  <Badge variant="outline" className={performance.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {performance.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold">{Math.round(item.value)}</span>
                  <span className="text-sm text-muted-foreground">vs {item.benchmark} média</span>
                </div>
                <Progress 
                  value={Math.min(100, (item.value / item.benchmark) * 50)} 
                  className="mt-3" 
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Radar de Performance</CardTitle>
            <CardDescription>Sua performance vs benchmark do mercado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis dataKey="subject" className="text-xs" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs" />
                  <Radar 
                    name="Você" 
                    dataKey="you" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.3} 
                  />
                  <Radar 
                    name="Mercado" 
                    dataKey="benchmark" 
                    stroke="hsl(var(--muted-foreground))" 
                    fill="hsl(var(--muted-foreground))" 
                    fillOpacity={0.1} 
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Engajamento por Tipo de Conteúdo</CardTitle>
            <CardDescription>Seu desempenho comparado ao mercado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contentComparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="voce" name="Você" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="mercado" name="Mercado" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
