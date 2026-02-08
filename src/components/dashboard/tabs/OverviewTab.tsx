import { InstagramPost } from '@/types/instagram';
import { formatNumber, getPerformanceByDay, getContentTypePerformance, generateInsights } from '@/utils/dataProcessor';
import { MetricCard } from '../MetricCard';
import { ChartCard } from '../ChartCard';
import { PostsTable } from '../PostsTable';
import { InsightCard } from '../InsightCard';
import { Eye, Users, Heart, MessageCircle, Bookmark, Share2, UserPlus, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useMemo } from 'react';

interface OverviewTabProps {
  posts: InstagramPost[];
  summary: {
    totalPosts: number;
    totalViews: number;
    totalReach: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalSaves: number;
    totalFollows: number;
    avgViews: number;
    avgReach: number;
    avgLikes: number;
    avgEngagement: number;
  } | null;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
];

export function OverviewTab({ posts, summary }: OverviewTabProps) {
  const timelineData = useMemo(() => {
    const byDate: Record<string, { date: string; views: number; reach: number; likes: number; posts: number }> = {};
    
    posts.forEach(post => {
      const dateKey = post.publishedAt.toLocaleDateString('pt-BR');
      if (!byDate[dateKey]) {
        byDate[dateKey] = { date: dateKey, views: 0, reach: 0, likes: 0, posts: 0 };
      }
      byDate[dateKey].views += post.views;
      byDate[dateKey].reach += post.reach;
      byDate[dateKey].likes += post.likes;
      byDate[dateKey].posts += 1;
    });

    return Object.values(byDate).sort((a, b) => {
      const [dayA, monthA] = a.date.split('/').map(Number);
      const [dayB, monthB] = b.date.split('/').map(Number);
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    });
  }, [posts]);

  const contentTypeData = useMemo(() => {
    return getContentTypePerformance(posts).map((ct, i) => ({
      name: ct.type.replace(' do Instagram', ''),
      value: ct.postCount,
      avgViews: ct.avgViews,
    }));
  }, [posts]);

  const topPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.views - a.views);
  }, [posts]);

  const worstPosts = useMemo(() => {
    return [...posts].sort((a, b) => a.views - b.views);
  }, [posts]);

  const insights = useMemo(() => {
    return generateInsights(posts).slice(0, 4);
  }, [posts]);

  if (!summary) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Posts"
          value={summary.totalPosts}
          subtitle={`${(summary.totalPosts / 16).toFixed(1)} posts/dia`}
          icon={TrendingUp}
          iconColor="text-primary"
        />
        <MetricCard
          title="Visualizações"
          value={formatNumber(summary.totalViews)}
          subtitle={`Média: ${formatNumber(summary.avgViews)}/post`}
          icon={Eye}
          iconColor="text-instagram-purple"
        />
        <MetricCard
          title="Alcance Total"
          value={formatNumber(summary.totalReach)}
          subtitle={`Média: ${formatNumber(summary.avgReach)}/post`}
          icon={Users}
          iconColor="text-instagram-pink"
        />
        <MetricCard
          title="Taxa de Engajamento"
          value={`${summary.avgEngagement.toFixed(2)}%`}
          subtitle="Média global"
          icon={Heart}
          trend={summary.avgEngagement > 5 ? 12.5 : -8.2}
          iconColor="text-instagram-orange"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Curtidas"
          value={formatNumber(summary.totalLikes)}
          subtitle={`${formatNumber(summary.avgLikes)} média`}
          icon={Heart}
          iconColor="text-destructive"
        />
        <MetricCard
          title="Comentários"
          value={formatNumber(summary.totalComments)}
          subtitle={`${(summary.totalComments / summary.totalPosts).toFixed(1)} média`}
          icon={MessageCircle}
          iconColor="text-info"
        />
        <MetricCard
          title="Salvamentos"
          value={formatNumber(summary.totalSaves)}
          subtitle={`${(summary.totalSaves / summary.totalPosts).toFixed(1)} média`}
          icon={Bookmark}
          iconColor="text-warning"
        />
        <MetricCard
          title="Novos Seguidores"
          value={summary.totalFollows}
          subtitle="Gerados pelos posts"
          icon={UserPlus}
          iconColor="text-success"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard 
          title="Evolução Temporal" 
          description="Views e alcance ao longo do tempo"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area 
                type="monotone" 
                dataKey="views" 
                name="Visualizações"
                stroke="hsl(var(--chart-1))" 
                fillOpacity={1} 
                fill="url(#colorViews)" 
              />
              <Area 
                type="monotone" 
                dataKey="reach" 
                name="Alcance"
                stroke="hsl(var(--chart-2))" 
                fillOpacity={1} 
                fill="url(#colorReach)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard 
          title="Tipos de Conteúdo" 
          description="Distribuição de posts"
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={contentTypeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {contentTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Insights */}
      <ChartCard title="Insights Automáticos" description="Descobertas baseadas nos seus dados">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <InsightCard key={index} insight={insight} />
          ))}
        </div>
      </ChartCard>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="🏆 Top 5 Melhores Posts" description="Posts com mais visualizações">
          <PostsTable posts={topPosts} limit={5} />
        </ChartCard>

        <ChartCard title="📉 5 Posts com Menor Performance" description="Oportunidades de aprendizado">
          <PostsTable posts={worstPosts} limit={5} />
        </ChartCard>
      </div>
    </div>
  );
}
