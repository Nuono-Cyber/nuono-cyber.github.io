import { InstagramPost } from '@/types/instagram';
import { ChartCard } from '../ChartCard';
import { formatNumber, getPerformanceByDay, getPerformanceByHour } from '@/utils/dataProcessor';
import { getChartColors, getTooltipStyle } from '@/utils/chartColors';
import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';

interface TemporalTabProps {
  posts: InstagramPost[];
}

const PERIOD_LABELS = {
  morning: 'Manhã (5h-12h)',
  afternoon: 'Tarde (12h-18h)',
  evening: 'Noite (18h-22h)',
  night: 'Madrugada (22h-5h)',
};

export function TemporalTab({ posts }: TemporalTabProps) {
  const colors = getChartColors();
  const tooltipStyle = getTooltipStyle();
  const dayPerformance = useMemo(() => getPerformanceByDay(posts), [posts]);
  const hourPerformance = useMemo(() => getPerformanceByHour(posts), [posts]);

  const bestDay = useMemo(() => {
    if (dayPerformance.length === 0) return null;
    return dayPerformance.reduce((best, day) => day.avgViews > best.avgViews ? day : best);
  }, [dayPerformance]);

  const bestHour = useMemo(() => {
    if (hourPerformance.length === 0) return null;
    return hourPerformance.reduce((best, hour) => hour.avgViews > best.avgViews ? hour : best);
  }, [hourPerformance]);

  const periodPerformance = useMemo(() => {
    const byPeriod: Record<string, InstagramPost[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    };

    posts.forEach(post => {
      byPeriod[post.period].push(post);
    });

    return Object.entries(byPeriod).map(([period, periodPosts]) => ({
      period: PERIOD_LABELS[period as keyof typeof PERIOD_LABELS],
      avgViews: periodPosts.length > 0 ? periodPosts.reduce((sum, p) => sum + p.views, 0) / periodPosts.length : 0,
      avgReach: periodPosts.length > 0 ? periodPosts.reduce((sum, p) => sum + p.reach, 0) / periodPosts.length : 0,
      avgEngagement: periodPosts.length > 0 ? periodPosts.reduce((sum, p) => sum + p.engagementRate, 0) / periodPosts.length : 0,
      postCount: periodPosts.length,
    }));
  }, [posts]);

  const heatmapData = useMemo(() => {
    const data: { day: string; hour: number; value: number; count: number }[] = [];
    const grouped: Record<string, { total: number; count: number }> = {};

    posts.forEach(post => {
      const key = `${post.dayName}-${post.hour}`;
      if (!grouped[key]) grouped[key] = { total: 0, count: 0 };
      grouped[key].total += post.views;
      grouped[key].count += 1;
    });

    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    
    days.forEach(day => {
      for (let hour = 6; hour <= 18; hour++) {
        const key = `${day}-${hour}`;
        const entry = grouped[key];
        data.push({
          day,
          hour,
          value: entry ? entry.total / entry.count : 0,
          count: entry ? entry.count : 0,
        });
      }
    });

    return data;
  }, [posts]);

  const radarData = useMemo(() => {
    return dayPerformance.map(day => ({
      day: day.day,
      views: day.avgViews,
      reach: day.avgReach,
      engagement: day.avgEngagement * 100,
    }));
  }, [dayPerformance]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Best Time Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card bg-gradient-to-br from-primary/20 to-accent/20">
          <p className="text-sm text-muted-foreground mb-1">🏆 Melhor Dia</p>
          <p className="text-3xl font-bold gradient-text">{bestDay?.day || '-'}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Média de {formatNumber(bestDay?.avgViews || 0)} views
          </p>
        </div>
        <div className="metric-card bg-gradient-to-br from-accent/20 to-instagram-orange/20">
          <p className="text-sm text-muted-foreground mb-1">⏰ Melhor Horário</p>
          <p className="text-3xl font-bold gradient-text">{bestHour?.hour || 0}:00</p>
          <p className="text-sm text-muted-foreground mt-2">
            Média de {formatNumber(bestHour?.avgViews || 0)} views
          </p>
        </div>
        <div className="metric-card bg-gradient-to-br from-instagram-orange/20 to-warning/20">
          <p className="text-sm text-muted-foreground mb-1">📊 Posts Analisados</p>
          <p className="text-3xl font-bold gradient-text">{posts.length}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Período: {posts.length > 0 ? `${posts[posts.length - 1].publishedAt.toLocaleDateString('pt-BR')} - ${posts[0].publishedAt.toLocaleDateString('pt-BR')}` : '-'}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="Performance por Dia da Semana" 
          description="Média de visualizações por dia"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dayPerformance}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" />
                  <stop offset="100%" stopColor="hsl(var(--chart-2))" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="day" stroke={colors.axis} fontSize={12} />
              <YAxis stroke={colors.axis} fontSize={12} tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [formatNumber(value), 'Média Views']}
              />
              <Bar 
                dataKey="avgViews" 
                fill="url(#barGradient)" 
                radius={[4, 4, 0, 0]}
                name="Média de Views"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard 
          title="Performance por Horário" 
          description="Média de visualizações por hora do dia"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis 
                dataKey="hour" 
                stroke={colors.axis} 
                fontSize={12}
                tickFormatter={(h) => `${h}h`}
              />
              <YAxis stroke={colors.axis} fontSize={12} tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [formatNumber(value), 'Média Views']}
                labelFormatter={(h) => `${h}:00`}
              />
              <Bar 
                dataKey="avgViews" 
                fill={colors.tertiary} 
                radius={[4, 4, 0, 0]}
                name="Média de Views"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Period and Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="Performance por Período" 
          description="Manhã, Tarde, Noite e Madrugada"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={periodPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis type="number" stroke={colors.axis} fontSize={12} tickFormatter={formatNumber} />
              <YAxis dataKey="period" type="category" width={120} stroke={colors.axis} fontSize={11} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [formatNumber(value), name]}
              />
              <Bar dataKey="avgViews" fill={colors.primary} name="Média Views" radius={[0, 4, 4, 0]} />
              <Bar dataKey="avgReach" fill={colors.secondary} name="Média Alcance" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard 
          title="Radar de Performance Semanal" 
          description="Comparativo multidimensional"
        >
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={colors.grid} />
              <PolarAngleAxis dataKey="day" stroke={colors.axis} fontSize={11} />
              <PolarRadiusAxis stroke={colors.axis} fontSize={10} />
              <Radar 
                name="Views" 
                dataKey="views" 
                stroke={colors.primary} 
                fill={colors.primary} 
                fillOpacity={0.3} 
              />
              <Radar 
                name="Alcance" 
                dataKey="reach" 
                stroke={colors.secondary} 
                fill={colors.secondary} 
                fillOpacity={0.3} 
              />
              <Legend wrapperStyle={{ color: colors.foreground }} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Heatmap */}
      <ChartCard 
        title="Mapa de Calor: Dia × Hora" 
        description="Visualize os melhores momentos para postar"
      >
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[80px_repeat(13,1fr)] gap-1">
              {/* Header */}
              <div className="p-2 text-xs text-muted-foreground"></div>
              {Array.from({ length: 13 }, (_, i) => i + 6).map(hour => (
                <div key={hour} className="p-2 text-center text-xs text-muted-foreground">
                  {hour}h
                </div>
              ))}
              
              {/* Rows */}
              {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(day => (
                <>
                  <div key={`label-${day}`} className="p-2 text-xs text-muted-foreground">
                    {day}
                  </div>
                  {Array.from({ length: 13 }, (_, i) => {
                    const hour = i + 6;
                    const cell = heatmapData.find(d => d.day === day && d.hour === hour);
                    const value = cell?.value || 0;
                    const maxValue = Math.max(...heatmapData.map(d => d.value));
                    const intensity = maxValue > 0 ? value / maxValue : 0;
                    
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="aspect-square rounded flex items-center justify-center text-xs font-mono transition-all hover:scale-110"
                        style={{
                          backgroundColor: value > 0 
                            ? `hsla(340, 75%, 55%, ${0.2 + intensity * 0.8})`
                            : 'hsl(222, 47%, 12%)',
                        }}
                        title={`${day} ${hour}h: ${formatNumber(value)} views (${cell?.count || 0} posts)`}
                      >
                        {cell?.count || ''}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsla(340, 75%, 55%, 0.2)' }}></div>
            <span>Baixo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsla(340, 75%, 55%, 0.6)' }}></div>
            <span>Médio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsla(340, 75%, 55%, 1)' }}></div>
            <span>Alto</span>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
