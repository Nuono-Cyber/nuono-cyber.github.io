import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { InstagramPost } from '@/types/instagram';
import { formatNumber, generateInsights } from '@/utils/dataProcessor';
import { ChartCard } from '../ChartCard';
import { MetricCard } from '../MetricCard';
import { Bookmark, Eye, Heart, Lightbulb, MessageCircle, Play, Sparkles, Target, TrendingUp, Users } from 'lucide-react';

interface OverviewTabProps {
  posts: InstagramPost[];
  summary: {
    totalPosts: number; totalViews: number; totalReach: number; totalLikes: number; totalComments: number;
    totalShares: number; totalSaves: number; totalFollows: number; avgViews: number; avgReach: number;
    avgLikes: number; avgEngagement: number;
  } | null;
}

const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function OverviewTab({ posts, summary }: OverviewTabProps) {
  const timeline = useMemo(() => {
    const grouped = new Map<string, { date: string; views: number; engagement: number }>();
    [...posts].sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime()).forEach(post => {
      const date = post.publishedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      const item = grouped.get(date) || { date, views: 0, engagement: 0 };
      item.views += post.views;
      item.engagement += post.engagementTotal;
      grouped.set(date, item);
    });
    return [...grouped.values()];
  }, [posts]);

  const heatmap = useMemo(() => {
    const cells = Array.from({ length: 7 * 8 }, () => 0);
    posts.forEach(post => {
      const slot = Math.min(7, Math.floor(post.hour / 3));
      cells[post.dayOfWeek * 8 + slot] += post.engagementTotal;
    });
    const max = Math.max(...cells, 1);
    return cells.map(value => value / max);
  }, [posts]);

  const ranked = useMemo(() => [...posts].sort((a, b) => b.engagementTotal - a.engagementTotal).slice(0, 5), [posts]);
  const insights = useMemo(() => generateInsights(posts).slice(0, 3), [posts]);

  if (!summary) return null;

  const metrics = [
    { title: 'Posts analisados', value: summary.totalPosts, subtitle: 'base atual', icon: TrendingUp, trend: 3.8 },
    { title: 'Engajamento médio', value: `${summary.avgEngagement.toFixed(2)}%`, subtitle: 'por publicação', icon: Heart, trend: 5.2 },
    { title: 'Alcance total', value: formatNumber(summary.totalReach), subtitle: `${formatNumber(summary.avgReach)} / post`, icon: Users, trend: 12.4 },
    { title: 'Impressões', value: formatNumber(summary.totalViews), subtitle: `${formatNumber(summary.avgViews)} / post`, icon: Eye, trend: 7.3 },
    { title: 'Interações', value: formatNumber(summary.totalLikes + summary.totalComments), subtitle: 'curtidas e comentários', icon: MessageCircle, trend: 9.1 },
    { title: 'Salvamentos', value: formatNumber(summary.totalSaves), subtitle: 'intenção de retorno', icon: Bookmark, trend: 6.2 },
  ];

  return (
    <div className="overview-layout animate-fade-in">
      <div className="min-w-0 space-y-3">
        <div className="dashboard-metrics-grid">
          {metrics.map((metric, index) => <MetricCard key={metric.title} {...metric} className={`metric-tone-${index % 3}`} />)}
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.25fr_0.75fr]">
          <ChartCard title="Evolução de alcance e engajamento" description="Performance consolidada da base">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={timeline} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="overviewViews" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="hsl(var(--chart-1))" stopOpacity=".42" /><stop offset="1" stopColor="hsl(var(--chart-1))" stopOpacity="0" /></linearGradient>
                  <linearGradient id="overviewEngagement" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="hsl(var(--chart-2))" stopOpacity=".32" /><stop offset="1" stopColor="hsl(var(--chart-2))" stopOpacity="0" /></linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }} />
                <Area type="monotone" dataKey="views" name="Alcance" stroke="hsl(var(--chart-1))" fill="url(#overviewViews)" strokeWidth={2} />
                <Area type="monotone" dataKey="engagement" name="Engajamento" stroke="hsl(var(--chart-2))" fill="url(#overviewEngagement)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Mapa de calor - atividade" description="Engajamento por dia e faixa horária">
            <div className="heatmap-grid">
              {dayLabels.map((day, dayIndex) => <div className="contents" key={day}><span className="heatmap-label">{day}</span>{Array.from({ length: 8 }, (_, slot) => { const value = heatmap[dayIndex * 8 + slot]; return <span key={slot} className="heatmap-cell" style={{ '--heat': value } as React.CSSProperties} title={`${day} · ${slot * 3}h`} />; })}</div>)}
            </div>
            <div className="mt-4 flex items-center justify-between text-[9px] text-muted-foreground"><span>Menor atividade</span><span className="heatmap-scale" /><span>Maior atividade</span></div>
          </ChartCard>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <ChartCard title="Conteúdos com melhor desempenho" description="Ranking por interações">
            <div className="space-y-1.5">
              {ranked.map((post, index) => (
                <div key={post.id} className="ranking-row">
                  <span className="ranking-position">{index + 1}</span>
                  <div className="ranking-icon"><Play className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{post.description || `${post.postType} sem legenda`}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{post.publishedAt.toLocaleDateString('pt-BR')} · {post.postType}</p></div>
                  <div className="text-right"><strong className="text-xs">{formatNumber(post.reach)}</strong><p className="text-[9px] text-success">{post.engagementRate.toFixed(2)}%</p></div>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Benchmark da base" description="Consistência e potencial atual">
            <div className="benchmark-score"><div><span>{Math.min(96, Math.round(58 + summary.avgEngagement * 4))}%</span><small>score de performance</small></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="mini-stat"><strong>{formatNumber(summary.avgReach)}</strong><span>alcance médio</span></div>
              <div className="mini-stat"><strong>{summary.avgEngagement.toFixed(2)}%</strong><span>engajamento</span></div>
            </div>
          </ChartCard>
        </div>
      </div>

      <aside className="insights-rail">
        <div className="flex items-center justify-between"><div><h2 className="gradient-text text-sm font-extrabold uppercase">Insights de IA</h2><p className="mt-1 text-[10px] text-muted-foreground">Recomendações sobre seus dados</p></div><Sparkles className="h-8 w-8 text-info" /></div>
        <div className="mt-5 space-y-3">
          {insights.map((insight, index) => <div key={`${insight.title}-${index}`} className="rail-insight"><div className="flex items-center gap-2"><span className="rail-icon">{index === 0 ? <Target /> : index === 1 ? <TrendingUp /> : <Lightbulb />}</span><strong>{insight.title}</strong></div><p>{insight.description}</p></div>)}
        </div>
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="text-[10px] font-semibold uppercase text-primary">Previsão da base</p><strong className="mt-2 block text-2xl">{formatNumber(Math.round(summary.totalReach * 1.12))}</strong><p className="mt-1 text-[10px] text-muted-foreground">alcance potencial mantendo o ritmo atual</p></div>
      </aside>
    </div>
  );
}
