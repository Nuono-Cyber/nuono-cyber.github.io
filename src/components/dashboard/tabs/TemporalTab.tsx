import { InstagramPost } from '@/types/instagram';
import { ChartCard } from '../ChartCard';
import { formatNumber, getPerformanceByDay, getPerformanceByHour } from '@/utils/dataProcessor';
import { getChartColors, getTooltipStyle } from '@/utils/chartColors';
import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  ScatterChart, Scatter, ZAxis, Cell
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
      morning: [], afternoon: [], evening: [], night: [],
    };
    posts.forEach(post => { byPeriod[post.period].push(post); });
    return Object.entries(byPeriod).map(([period, periodPosts]) => ({
      period: PERIOD_LABELS[period as keyof typeof PERIOD_LABELS],
      avgViews: periodPosts.length > 0 ? periodPosts.reduce((sum, p) => sum + p.views, 0) / periodPosts.length : 0,
      avgReach: periodPosts.length > 0 ? periodPosts.reduce((sum, p) => sum + p.reach, 0) / periodPosts.length : 0,
      avgEngagement: periodPosts.length > 0 ? periodPosts.reduce((sum, p) => sum + p.engagementRate, 0) / periodPosts.length : 0,
      postCount: periodPosts.length,
    }));
  }, [posts]);

  // Bubble chart data: each bubble = day+hour combo, size = avg views, color = engagement
  const bubbleData = useMemo(() => {
    const DAY_ORDER = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const grouped: Record<string, { totalViews: number; totalEng: number; count: number }> = {};

    posts.forEach(post => {
      const key = `${post.dayName}-${post.hour}`;
      if (!grouped[key]) grouped[key] = { totalViews: 0, totalEng: 0, count: 0 };
      grouped[key].totalViews += post.views;
      grouped[key].totalEng += post.engagementRate;
      grouped[key].count += 1;
    });

    return Object.entries(grouped).map(([key, val]) => {
      const [day, hourStr] = key.split('-');
      const hour = Number(hourStr);
      const avgViews = val.totalViews / val.count;
      const avgEng = val.totalEng / val.count;
      const dayIndex = DAY_ORDER.indexOf(day);
      return {
        dayIndex: dayIndex >= 0 ? dayIndex : 0,
        dayLabel: day,
        hour,
        avgViews,
        avgEngagement: avgEng,
        postCount: val.count,
        // bubble size
        z: avgViews,
      };
    }).sort((a, b) => a.dayIndex - b.dayIndex || a.hour - b.hour);
  }, [posts]);

  const maxBubbleViews = useMemo(() => Math.max(...bubbleData.map(d => d.avgViews), 1), [bubbleData]);

  const radarData = useMemo(() => {
    return dayPerformance.map(day => ({
      day: day.day,
      views: day.avgViews,
      reach: day.avgReach,
      engagement: day.avgEngagement * 100,
    }));
  }, [dayPerformance]);

  const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

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
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatNumber(value), 'Média Views']} />
              <Bar dataKey="avgViews" fill="url(#barGradient)" radius={[4, 4, 0, 0]} name="Média de Views" />
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
              <XAxis dataKey="hour" stroke={colors.axis} fontSize={12} tickFormatter={(h) => `${h}h`} />
              <YAxis stroke={colors.axis} fontSize={12} tickFormatter={formatNumber} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatNumber(value), 'Média Views']} labelFormatter={(h) => `${h}:00`} />
              <Bar dataKey="avgViews" fill={colors.tertiary} radius={[4, 4, 0, 0]} name="Média de Views" />
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
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [formatNumber(value), name]} />
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
              <Radar name="Views" dataKey="views" stroke={colors.primary} fill={colors.primary} fillOpacity={0.3} />
              <Radar name="Alcance" dataKey="reach" stroke={colors.secondary} fill={colors.secondary} fillOpacity={0.3} />
              <Legend wrapperStyle={{ color: colors.foreground }} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bubble Chart replacing Heatmap */}
      <ChartCard 
        title="Mapa de Oportunidade: Dia × Hora" 
        description="Cada bolha representa uma combinação dia+hora. Tamanho = views, Cor = intensidade de performance"
      >
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis 
              type="number" 
              dataKey="hour" 
              name="Hora" 
              domain={[5, 23]}
              ticks={[6, 8, 10, 12, 14, 16, 18, 20, 22]}
              tickFormatter={(h) => `${h}h`}
              stroke={colors.axis} 
              fontSize={12}
              label={{ value: 'Hora do dia', position: 'insideBottom', offset: -10, fill: colors.axis, fontSize: 11 }}
            />
            <YAxis 
              type="number" 
              dataKey="dayIndex" 
              name="Dia" 
              domain={[-0.5, 6.5]}
              ticks={[0, 1, 2, 3, 4, 5, 6]}
              tickFormatter={(i) => DAY_LABELS[i] || ''}
              stroke={colors.axis} 
              fontSize={12}
              label={{ value: 'Dia da semana', angle: -90, position: 'insideLeft', offset: 10, fill: colors.axis, fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="z" range={[40, 800]} />
            <Tooltip 
              contentStyle={tooltipStyle}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d) return null;
                return (
                  <div style={tooltipStyle} className="p-3 rounded-lg shadow-lg">
                    <p className="font-semibold text-sm">{d.dayLabel} às {d.hour}h</p>
                    <p className="text-xs mt-1">📊 Média Views: <strong>{formatNumber(d.avgViews)}</strong></p>
                    <p className="text-xs">💡 Engajamento: <strong>{d.avgEngagement.toFixed(2)}%</strong></p>
                    <p className="text-xs">📝 Posts: <strong>{d.postCount}</strong></p>
                  </div>
                );
              }}
            />
            <Scatter data={bubbleData} name="Performance">
              {bubbleData.map((entry, index) => {
                const intensity = entry.avgViews / maxBubbleViews;
                // Color gradient from cool blue to hot pink
                const hue = 340 - intensity * 120; // 340 (pink) to 220 (blue)
                const sat = 60 + intensity * 20;
                const light = 55 - intensity * 15;
                return (
                  <Cell 
                    key={index} 
                    fill={`hsl(${hue}, ${sat}%, ${light}%)`} 
                    fillOpacity={0.7 + intensity * 0.3}
                    stroke={`hsl(${hue}, ${sat}%, ${light - 10}%)`}
                    strokeWidth={1}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(220, 60%, 55%)' }}></div>
            <span>Baixa performance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(280, 70%, 48%)' }}></div>
            <span>Média</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: 'hsl(340, 80%, 40%)' }}></div>
            <span>Alta performance</span>
          </div>
          <span className="text-xs italic">Tamanho = volume de views</span>
        </div>
      </ChartCard>
    </div>
  );
}
