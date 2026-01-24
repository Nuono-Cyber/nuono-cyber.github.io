import { InstagramPost } from '@/types/instagram';
import { ChartCard } from '../ChartCard';
import { formatNumber, calculateMetricSummary, getCorrelationMatrix } from '@/utils/dataProcessor';
import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ComposedChart, Line
} from 'recharts';

interface EngagementTabProps {
  posts: InstagramPost[];
}

const METRIC_LABELS: Record<string, string> = {
  views: 'Views',
  reach: 'Alcance',
  likes: 'Curtidas',
  comments: 'Comentários',
  shares: 'Compartilh.',
  saves: 'Salvamentos',
  duration: 'Duração',
  descriptionLength: 'Tam. Legenda',
};

export function EngagementTab({ posts }: EngagementTabProps) {
  const metricDistributions = useMemo(() => {
    const metrics = ['views', 'reach', 'likes', 'comments', 'shares', 'saves'] as const;
    return metrics.map(metric => ({
      metric,
      label: METRIC_LABELS[metric],
      summary: calculateMetricSummary(posts.map(p => p[metric] as number)),
    }));
  }, [posts]);

  const correlations = useMemo(() => {
    return getCorrelationMatrix(posts);
  }, [posts]);

  const strongCorrelations = useMemo(() => {
    return correlations
      .filter(c => Math.abs(c.correlation) > 0.5)
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
      .slice(0, 8);
  }, [correlations]);

  const scatterData = useMemo(() => {
    return posts.map(p => ({
      views: p.views,
      reach: p.reach,
      likes: p.likes,
      engagement: p.engagementRate,
      description: p.description.substring(0, 30) + '...',
    }));
  }, [posts]);

  const engagementRateData = useMemo(() => {
    return posts.map(p => ({
      name: p.description.substring(0, 20),
      engagementRate: p.engagementRate,
      likes: p.likes,
      comments: p.comments,
      saves: p.saves,
    })).sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 15);
  }, [posts]);

  const derivedMetrics = useMemo(() => {
    const avgEngagement = posts.reduce((sum, p) => sum + p.engagementRate, 0) / posts.length;
    const avgReachRate = posts.reduce((sum, p) => sum + p.reachRate, 0) / posts.length;
    const avgConversionRate = posts.reduce((sum, p) => sum + (p.follows / p.reach * 100), 0) / posts.length;
    const viralPosts = posts.filter(p => p.views > 5000);
    
    return [
      { name: 'Taxa de Engajamento', value: avgEngagement, format: '%' },
      { name: 'Taxa de Alcance', value: avgReachRate, format: '%' },
      { name: 'Conversão → Seguidor', value: avgConversionRate, format: '%' },
      { name: 'Posts Virais (>5K)', value: viralPosts.length, format: '' },
    ];
  }, [posts]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Métricas Derivadas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {derivedMetrics.map((metric, i) => (
          <div key={i} className="metric-card">
            <p className="text-sm text-muted-foreground mb-1">{metric.name}</p>
            <p className="text-2xl font-bold">
              {metric.format === '%' ? metric.value.toFixed(2) : metric.value}
              {metric.format}
            </p>
          </div>
        ))}
      </div>

      {/* Distribuição de Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Distribuição de Métricas" description="Estatísticas descritivas">
          <div className="space-y-4">
            {metricDistributions.map(({ metric, label, summary }) => (
              <div key={metric} className="p-4 bg-secondary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{label}</span>
                  <span className="text-sm text-muted-foreground">
                    Total: {formatNumber(summary.total)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
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

        <ChartCard title="Correlações Fortes" description="Métricas altamente relacionadas">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={strongCorrelations.map(c => ({
                pair: `${METRIC_LABELS[c.metric1]} × ${METRIC_LABELS[c.metric2]}`,
                correlation: c.correlation,
              }))} 
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 18%)" />
              <XAxis 
                type="number" 
                domain={[-1, 1]} 
                stroke="hsl(215, 20%, 65%)" 
                fontSize={12}
              />
              <YAxis 
                dataKey="pair" 
                type="category" 
                width={140} 
                stroke="hsl(215, 20%, 65%)" 
                fontSize={11}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(222, 47%, 9%)',
                  border: '1px solid hsl(222, 47%, 18%)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [value.toFixed(3), 'Correlação']}
              />
              <Bar dataKey="correlation" radius={[0, 4, 4, 0]}>
                {strongCorrelations.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.correlation > 0 ? 'hsl(142, 76%, 45%)' : 'hsl(0, 84%, 60%)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Scatter Plot */}
      <ChartCard 
        title="Views vs Alcance" 
        description="Relação entre visualizações e contas alcançadas"
      >
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 18%)" />
            <XAxis 
              dataKey="views" 
              name="Views" 
              stroke="hsl(215, 20%, 65%)" 
              fontSize={12}
              tickFormatter={formatNumber}
            />
            <YAxis 
              dataKey="reach" 
              name="Alcance" 
              stroke="hsl(215, 20%, 65%)" 
              fontSize={12}
              tickFormatter={formatNumber}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 9%)',
                border: '1px solid hsl(222, 47%, 18%)',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string) => [formatNumber(value), name]}
            />
            <Scatter data={scatterData} fill="hsl(340, 75%, 55%)">
              {scatterData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`hsl(${340 - entry.engagement * 10}, 75%, 55%)`}
                  opacity={0.7}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top Engajamento */}
      <ChartCard 
        title="Top Posts por Taxa de Engajamento" 
        description="Posts com maior interação relativa ao alcance"
      >
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={engagementRateData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 47%, 18%)" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(215, 20%, 65%)" 
              fontSize={10}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              yAxisId="left"
              stroke="hsl(215, 20%, 65%)" 
              fontSize={12}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="hsl(215, 20%, 65%)" 
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 9%)',
                border: '1px solid hsl(222, 47%, 18%)',
                borderRadius: '8px',
              }}
            />
            <Bar yAxisId="left" dataKey="likes" fill="hsl(340, 75%, 55%)" name="Curtidas" />
            <Bar yAxisId="left" dataKey="comments" fill="hsl(306, 70%, 50%)" name="Comentários" />
            <Bar yAxisId="left" dataKey="saves" fill="hsl(25, 95%, 55%)" name="Salvamentos" />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="engagementRate" 
              stroke="hsl(142, 76%, 45%)" 
              strokeWidth={2}
              name="Taxa de Engajamento (%)"
              dot={{ fill: 'hsl(142, 76%, 45%)', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
