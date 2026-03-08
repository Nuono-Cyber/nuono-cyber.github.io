import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { InstagramPost } from '@/types/instagram';
import { formatNumber } from '@/utils/dataProcessor';
import { Target, TrendingUp, TrendingDown, Minus, Award, Heart, MessageCircle, Info } from 'lucide-react';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

interface BenchmarkTabProps {
  posts: InstagramPost[];
}

// Industry benchmarks for Instagram Reels (2024-2026 averages for accounts <50k followers)
const BENCHMARKS = {
  engagementRate: 4.0,  // % (engagement / reach)
  likesPerPost: 120,
  commentsPerPost: 8,
  savesPerPost: 10,
  sharesPerPost: 5,
  reachRate: 65, // % (reach / views)
  postsPerWeek: 4,
};

export function BenchmarkTab({ posts }: BenchmarkTabProps) {
  const metrics = useMemo(() => {
    if (posts.length === 0) return null;
    
    const avgLikes = posts.reduce((acc, p) => acc + p.likes, 0) / posts.length;
    const avgComments = posts.reduce((acc, p) => acc + p.comments, 0) / posts.length;
    const avgSaves = posts.reduce((acc, p) => acc + p.saves, 0) / posts.length;
    const avgShares = posts.reduce((acc, p) => acc + p.shares, 0) / posts.length;
    const avgEngagementRate = posts.reduce((acc, p) => acc + p.engagementRate, 0) / posts.length;
    const avgReachRate = posts.reduce((acc, p) => acc + p.reachRate, 0) / posts.length;
    
    // Calculate posts per week from actual data
    const dates = posts.map(p => p.publishedAt.getTime()).sort();
    const timeSpanWeeks = Math.max(1, (dates[dates.length - 1] - dates[0]) / (7 * 24 * 60 * 60 * 1000));
    const postsPerWeek = posts.length / timeSpanWeeks;

    // Group by content type (use actual types from data)
    const typeMap = new Map<string, { engagement: number; count: number }>();
    posts.forEach(p => {
      const type = p.postType || 'Outro';
      const existing = typeMap.get(type) || { engagement: 0, count: 0 };
      existing.engagement += p.engagementRate;
      existing.count++;
      typeMap.set(type, existing);
    });
    
    const contentTypes = Array.from(typeMap.entries()).map(([type, data]) => ({
      name: type.replace(' do Instagram', ''),
      avgEngagement: data.engagement / data.count,
      count: data.count,
    }));

    return {
      avgLikes, avgComments, avgSaves, avgShares,
      avgEngagementRate, avgReachRate, postsPerWeek,
      contentTypes, totalPosts: posts.length,
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
    { label: 'Engajamento', value: metrics.avgEngagementRate, benchmark: BENCHMARKS.engagementRate, unit: '%' },
    { label: 'Curtidas/Post', value: metrics.avgLikes, benchmark: BENCHMARKS.likesPerPost, unit: '' },
    { label: 'Comentários/Post', value: metrics.avgComments, benchmark: BENCHMARKS.commentsPerPost, unit: '' },
    { label: 'Salvamentos/Post', value: metrics.avgSaves, benchmark: BENCHMARKS.savesPerPost, unit: '' },
    { label: 'Compartilh./Post', value: metrics.avgShares, benchmark: BENCHMARKS.sharesPerPost, unit: '' },
    { label: 'Posts/Semana', value: metrics.postsPerWeek, benchmark: BENCHMARKS.postsPerWeek, unit: '' },
  ];

  const radarData = comparisons.map(c => ({
    subject: c.label,
    you: Math.min(100, (c.value / c.benchmark) * 50),
    benchmark: 50,
  }));

  const barData = comparisons.map(c => ({
    name: c.label,
    'Você': Math.round(c.value * 100) / 100,
    'Mercado': c.benchmark,
  }));

  const getPerformanceLabel = (value: number, benchmark: number) => {
    const ratio = value / benchmark;
    if (ratio >= 1.5) return { label: 'Excepcional', color: 'text-green-500', icon: TrendingUp };
    if (ratio >= 1) return { label: 'Acima da média', color: 'text-blue-500', icon: TrendingUp };
    if (ratio >= 0.7) return { label: 'Na média', color: 'text-yellow-500', icon: Minus };
    return { label: 'Abaixo da média', color: 'text-red-500', icon: TrendingDown };
  };

  // Overall score based on actual metrics vs benchmarks
  const overallScore = Math.round(
    comparisons.reduce((sum, c) => sum + Math.min(2, c.value / c.benchmark), 0) / comparisons.length * 50
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
          <p className="text-muted-foreground">Comparação com médias do mercado para contas similares</p>
        </div>
      </div>

      {/* Method info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>Benchmarks baseados em médias de contas Instagram com &lt;50K seguidores publicando Reels (2024-2026).</p>
      </div>

      {/* Overall Score */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-full border-8 border-primary/20 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold">{overallScore}</p>
                  <p className="text-xs text-muted-foreground">de 100</p>
                </div>
              </div>
              <Award className="absolute -top-1 -right-1 w-8 h-8 text-yellow-500" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold">
                {overallScore >= 80 ? 'Performance Excepcional! 🏆' :
                 overallScore >= 60 ? 'Boa Performance! 👍' :
                 overallScore >= 40 ? 'Na Média do Mercado 📊' :
                 'Espaço para Melhorar 📈'}
              </h3>
              <p className="text-muted-foreground mt-1">
                Baseado em {metrics.totalPosts} posts analisados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {comparisons.map((item) => {
          const performance = getPerformanceLabel(item.value, item.benchmark);
          const StatusIcon = performance.icon;
          
          return (
            <Card key={item.label} className="glass-card">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <Badge variant="outline" className={`${performance.color} text-xs`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {performance.label}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold">
                    {item.unit === '%' ? item.value.toFixed(1) : Math.round(item.value)}
                    {item.unit}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    vs {item.benchmark}{item.unit}
                  </span>
                </div>
                <Progress 
                  value={Math.min(100, (item.value / item.benchmark) * 50)} 
                  className="mt-2" 
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
            <CardDescription>Sua performance vs benchmark (50 = média do mercado)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis dataKey="subject" className="text-xs" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs" />
                  <Radar name="Você" dataKey="you" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  <Radar name="Mercado" dataKey="benchmark" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Você vs Mercado</CardTitle>
            <CardDescription>Comparação direta por métrica</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="Você" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Mercado" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
