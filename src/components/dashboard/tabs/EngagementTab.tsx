import { InstagramPost } from '@/types/instagram';
import { ChartCard } from '../ChartCard';
import { formatNumber, calculateMetricSummary } from '@/utils/dataProcessor';
import { getChartColors, getTooltipStyle } from '@/utils/chartColors';
import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ComposedChart, Line, Legend
} from 'recharts';

interface EngagementTabProps {
  posts: InstagramPost[];
}

export function EngagementTab({ posts }: EngagementTabProps) {
  const colors = getChartColors();
  const tooltipStyle = getTooltipStyle();

  const metricDistributions = useMemo(() => {
    const metrics = ['views', 'reach', 'likes', 'comments', 'shares', 'saves'] as const;
    const labels: Record<string, string> = {
      views: 'Visualizações', reach: 'Alcance', likes: 'Curtidas',
      comments: 'Comentários', shares: 'Compartilhamentos', saves: 'Salvamentos',
    };
    return metrics.map(metric => ({
      metric,
      label: labels[metric],
      summary: calculateMetricSummary(posts.map(p => p[metric] as number)),
    }));
  }, [posts]);

  const derivedMetrics = useMemo(() => {
    if (posts.length === 0) return [];
    const avgEngagement = posts.reduce((sum, p) => sum + p.engagementRate, 0) / posts.length;
    const avgReachRate = posts.reduce((sum, p) => sum + p.reachRate, 0) / posts.length;
    
    // Safe follower conversion: only count posts where reach > 0
    const postsWithReach = posts.filter(p => p.reach > 0);
    const avgConversionRate = postsWithReach.length > 0
      ? postsWithReach.reduce((sum, p) => sum + (p.follows / p.reach * 100), 0) / postsWithReach.length
      : 0;

    const avgViews = posts.reduce((sum, p) => sum + p.views, 0) / posts.length;
    const viralThreshold = avgViews * 3; // Dynamic: 3x the average
    const viralPosts = posts.filter(p => p.views > viralThreshold);
    
    return [
      { name: 'Engajamento Médio', value: avgEngagement, format: '%', description: 'Interações / Alcance' },
      { name: 'Conversão de Alcance', value: avgReachRate, format: '%', description: 'Alcance / Views' },
      { name: 'Conversão → Seguidor', value: avgConversionRate, format: '%', description: 'Seguidores / Alcance' },
      { name: `Posts Virais (>${formatNumber(viralThreshold)})`, value: viralPosts.length, format: '', description: `Acima de 3x a média` },
    ];
  }, [posts]);

  // Simplified "what drives engagement" chart instead of raw correlation
  const engagementDrivers = useMemo(() => {
    if (posts.length < 3) return [];
    
    // Calculate practical impact: compare top 25% vs bottom 25% for each factor
    const sorted = [...posts].sort((a, b) => b.engagementRate - a.engagementRate);
    const topQuartile = sorted.slice(0, Math.max(1, Math.floor(posts.length * 0.25)));
    const bottomQuartile = sorted.slice(-Math.max(1, Math.floor(posts.length * 0.25)));
    
    const factors = [
      { name: 'Duração (s)', top: avg(topQuartile.map(p => p.duration)), bottom: avg(bottomQuartile.map(p => p.duration)) },
      { name: 'Tam. Legenda', top: avg(topQuartile.map(p => p.descriptionLength)), bottom: avg(bottomQuartile.map(p => p.descriptionLength)) },
      { name: 'Emojis', top: avg(topQuartile.map(p => p.emojiCount)), bottom: avg(bottomQuartile.map(p => p.emojiCount)) },
      { name: 'Hashtags', top: avg(topQuartile.map(p => p.hashtagCount)), bottom: avg(bottomQuartile.map(p => p.hashtagCount)) },
    ];

    return factors.map(f => ({
      name: f.name,
      'Top 25%': Math.round(f.top * 10) / 10,
      'Bottom 25%': Math.round(f.bottom * 10) / 10,
    }));
  }, [posts]);

  const scatterData = useMemo(() => {
    return posts.map((p, i) => ({
      views: p.views,
      reach: p.reach,
      engagement: p.engagementRate,
      label: p.description ? p.description.substring(0, 40) : `Post ${i + 1}`,
    }));
  }, [posts]);

  const topEngagementPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 10)
      .map((p, i) => ({
        rank: `#${i + 1}`,
        engagementRate: Math.round(p.engagementRate * 100) / 100,
        likes: p.likes,
        comments: p.comments,
        saves: p.saves,
        shares: p.shares,
        views: p.views,
      }));
  }, [posts]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Derived KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {derivedMetrics.map((metric, i) => (
          <div key={i} className="metric-card">
            <p className="text-sm text-muted-foreground mb-1">{metric.name}</p>
            <p className="text-2xl font-bold">
              {metric.format === '%'
                ? (isFinite(metric.value) ? metric.value.toFixed(2) : '0.00')
                : metric.value}
              {metric.format}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
          </div>
        ))}
      </div>

      {/* Metric distributions + engagement drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Distribuição de Métricas" description="Estatísticas descritivas por métrica">
          <div className="space-y-3">
            {metricDistributions.map(({ label, summary }) => (
              <div key={label} className="p-3 bg-secondary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    Total: {formatNumber(summary.total)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Média</p>
                    <p className="font-mono text-sm">{formatNumber(summary.average)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mediana</p>
                    <p className="font-mono text-sm">{formatNumber(summary.median)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Min</p>
                    <p className="font-mono text-sm">{formatNumber(summary.min)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max</p>
                    <p className="font-mono text-sm">{formatNumber(summary.max)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="O que Impulsiona o Engajamento" description="Comparação: melhores posts vs piores posts">
          {engagementDrivers.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={engagementDrivers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis type="number" stroke={colors.axis} fontSize={12} />
                <YAxis dataKey="name" type="category" width={100} stroke={colors.axis} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="Top 25%" fill={colors.success} radius={[0, 4, 4, 0]} />
                <Bar dataKey="Bottom 25%" fill={colors.destructive} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">Dados insuficientes</p>
          )}
        </ChartCard>
      </div>

      {/* Scatter Plot */}
      <ChartCard 
        title="Views vs Alcance" 
        description="Cada ponto é um post — tamanho reflete engajamento"
      >
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis 
              dataKey="views" name="Views" stroke={colors.axis} fontSize={12}
              tickFormatter={formatNumber} label={{ value: 'Visualizações', position: 'bottom', offset: -5 }}
            />
            <YAxis 
              dataKey="reach" name="Alcance" stroke={colors.axis} fontSize={12}
              tickFormatter={formatNumber} label={{ value: 'Alcance', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, name: string) => [formatNumber(value), name === 'views' ? 'Views' : name === 'reach' ? 'Alcance' : name]}
            />
            <Scatter data={scatterData} fill={colors.primary}>
              {scatterData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors.primary} opacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top Engagement Posts - cleaner table-like chart */}
      <ChartCard 
        title="Top 10 Posts por Engajamento" 
        description="Composição de interações dos melhores posts"
      >
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={topEngagementPosts}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis dataKey="rank" stroke={colors.axis} fontSize={12} />
            <YAxis yAxisId="left" stroke={colors.axis} fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke={colors.axis} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar yAxisId="left" dataKey="likes" stackId="a" fill={colors.primary} name="Curtidas" />
            <Bar yAxisId="left" dataKey="comments" stackId="a" fill={colors.secondary} name="Comentários" />
            <Bar yAxisId="left" dataKey="saves" stackId="a" fill={colors.tertiary} name="Salvamentos" />
            <Bar yAxisId="left" dataKey="shares" stackId="a" fill={colors.quaternary} name="Compartilh." />
            <Line 
              yAxisId="right" type="monotone" dataKey="engagementRate" 
              stroke={colors.success} strokeWidth={2}
              name="Taxa (%)" dot={{ fill: colors.success, r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
