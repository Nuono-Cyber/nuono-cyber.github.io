import { InstagramPost } from '@/types/instagram';
import { ChartCard } from '../ChartCard';
import { formatNumber, getContentTypePerformance } from '@/utils/dataProcessor';
import { getChartColors, getTooltipStyle, CHART_COLORS_ARRAY } from '@/utils/chartColors';
import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, PieChart, Pie
} from 'recharts';

interface ContentTabProps {
  posts: InstagramPost[];
}

export function ContentTab({ posts }: ContentTabProps) {
  const colors = getChartColors();
  const tooltipStyle = getTooltipStyle();
  const contentTypePerformance = useMemo(() => {
    return getContentTypePerformance(posts).map(ct => ({
      ...ct,
      type: ct.type.replace(' do Instagram', ''),
    }));
  }, [posts]);

  const durationAnalysis = useMemo(() => {
    const videoPosts = posts.filter(p => p.duration > 0);
    return videoPosts.map(p => ({
      duration: p.duration,
      views: p.views,
      engagement: p.engagementRate,
      description: p.description.substring(0, 30),
    }));
  }, [posts]);

  const durationBuckets = useMemo(() => {
    const videoPosts = posts.filter(p => p.duration > 0);
    const buckets = [
      { name: '0-15s', min: 0, max: 15, posts: [] as InstagramPost[] },
      { name: '16-30s', min: 16, max: 30, posts: [] as InstagramPost[] },
      { name: '31-60s', min: 31, max: 60, posts: [] as InstagramPost[] },
      { name: '60s+', min: 61, max: Infinity, posts: [] as InstagramPost[] },
    ];

    videoPosts.forEach(post => {
      const bucket = buckets.find(b => post.duration >= b.min && post.duration <= b.max);
      if (bucket) bucket.posts.push(post);
    });

    return buckets.map(b => ({
      name: b.name,
      avgViews: b.posts.length > 0 ? b.posts.reduce((sum, p) => sum + p.views, 0) / b.posts.length : 0,
      avgEngagement: b.posts.length > 0 ? b.posts.reduce((sum, p) => sum + p.engagementRate, 0) / b.posts.length : 0,
      count: b.posts.length,
    }));
  }, [posts]);

  const descriptionLengthAnalysis = useMemo(() => {
    const buckets = [
      { name: '0-20 chars', min: 0, max: 20, posts: [] as InstagramPost[] },
      { name: '21-50 chars', min: 21, max: 50, posts: [] as InstagramPost[] },
      { name: '51-100 chars', min: 51, max: 100, posts: [] as InstagramPost[] },
      { name: '100+ chars', min: 101, max: Infinity, posts: [] as InstagramPost[] },
    ];

    posts.forEach(post => {
      const bucket = buckets.find(b => post.descriptionLength >= b.min && post.descriptionLength <= b.max);
      if (bucket) bucket.posts.push(post);
    });

    return buckets.map(b => ({
      name: b.name,
      avgViews: b.posts.length > 0 ? b.posts.reduce((sum, p) => sum + p.views, 0) / b.posts.length : 0,
      avgEngagement: b.posts.length > 0 ? b.posts.reduce((sum, p) => sum + p.engagementRate, 0) / b.posts.length : 0,
      count: b.posts.length,
    }));
  }, [posts]);

  const emojiAnalysis = useMemo(() => {
    const withEmoji = posts.filter(p => p.hasEmoji);
    const withoutEmoji = posts.filter(p => !p.hasEmoji);

    return [
      {
        name: 'Com Emoji',
        avgViews: withEmoji.length > 0 ? withEmoji.reduce((sum, p) => sum + p.views, 0) / withEmoji.length : 0,
        avgEngagement: withEmoji.length > 0 ? withEmoji.reduce((sum, p) => sum + p.engagementRate, 0) / withEmoji.length : 0,
        count: withEmoji.length,
      },
      {
        name: 'Sem Emoji',
        avgViews: withoutEmoji.length > 0 ? withoutEmoji.reduce((sum, p) => sum + p.views, 0) / withoutEmoji.length : 0,
        avgEngagement: withoutEmoji.length > 0 ? withoutEmoji.reduce((sum, p) => sum + p.engagementRate, 0) / withoutEmoji.length : 0,
        count: withoutEmoji.length,
      },
    ];
  }, [posts]);

  const commonWords = useMemo(() => {
    const wordCount: Record<string, number> = {};
    const stopWords = new Set(['a', 'o', 'e', 'é', 'de', 'da', 'do', 'que', 'com', 'para', 'em', 'um', 'uma', 'não', 'se', 'vc', 'ou', 'como']);

    posts.forEach(post => {
      const words = post.description
        .toLowerCase()
        .replace(/[^\wáéíóúàâêôãõç\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
    });

    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
  }, [posts]);

  const COLORS = [
    'hsl(340, 75%, 55%)',
    'hsl(306, 70%, 50%)',
    'hsl(25, 95%, 55%)',
    'hsl(142, 76%, 45%)',
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Content Type Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="Performance por Tipo de Conteúdo" 
          description="Comparativo entre formatos"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={contentTypePerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="type" stroke={colors.axis} fontSize={12} />
              <YAxis stroke={colors.axis} fontSize={12} tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [formatNumber(value), name]}
              />
              <Bar dataKey="avgViews" fill={colors.primary} name="Média Views" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avgReach" fill={colors.secondary} name="Média Alcance" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard 
          title="Distribuição de Conteúdo" 
          description="Quantidade de posts por tipo"
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={contentTypePerformance}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="postCount"
                nameKey="type"
                label={({ type, postCount }) => `${type}: ${postCount}`}
                labelLine={false}
              >
                {contentTypePerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS_ARRAY[index % CHART_COLORS_ARRAY.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Duration Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="Duração vs Views (Vídeos)" 
          description="Impacto da duração no desempenho"
        >
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis 
                dataKey="duration" 
                name="Duração (s)" 
                stroke={colors.axis} 
                fontSize={12}
                tickFormatter={(v) => `${v}s`}
              />
              <YAxis 
                dataKey="views" 
                name="Views" 
                stroke={colors.axis} 
                fontSize={12}
                tickFormatter={formatNumber}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [
                  name === 'Views' ? formatNumber(value) : `${value}s`,
                  name
                ]}
              />
              <Scatter data={durationAnalysis} fill={colors.primary}>
                {durationAnalysis.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors.primary}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard 
          title="Performance por Faixa de Duração" 
          description="Duração ideal para vídeos"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={durationBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="name" stroke={colors.axis} fontSize={12} />
              <YAxis stroke={colors.axis} fontSize={12} tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [
                  name === 'Qtd Posts' ? value : formatNumber(value),
                  name
                ]}
              />
              <Bar dataKey="avgViews" fill={colors.tertiary} name="Média Views" radius={[4, 4, 0, 0]} />
              <Bar dataKey="count" fill={colors.engagement} name="Qtd Posts" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Description & Emoji Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="Tamanho da Legenda vs Performance" 
          description="Impacto do comprimento do texto"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={descriptionLengthAnalysis}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="name" stroke={colors.axis} fontSize={11} />
              <YAxis stroke={colors.axis} fontSize={12} tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [formatNumber(value), 'Média Views']}
              />
              <Bar dataKey="avgViews" fill={colors.info} name="Média Views" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard 
          title="Impacto do Uso de Emojis" 
          description="Posts com vs sem emojis"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={emojiAnalysis} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis type="number" stroke={colors.axis} fontSize={12} tickFormatter={formatNumber} />
              <YAxis dataKey="name" type="category" width={100} stroke={colors.axis} fontSize={12} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [
                  name === 'Qtd Posts' ? value : formatNumber(value),
                  name
                ]}
              />
              <Bar dataKey="avgViews" fill={colors.quaternary} name="Média Views" radius={[0, 4, 4, 0]} />
              <Bar dataKey="count" fill={colors.primary} name="Qtd Posts" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Word Cloud Alternative - Word List */}
      <ChartCard 
        title="Palavras Mais Usadas" 
        description="Termos frequentes nas legendas"
      >
        <div className="flex flex-wrap gap-2">
          {commonWords.map(({ word, count }, index) => {
            const size = Math.max(14, Math.min(32, 14 + count * 2));
            const opacity = 0.5 + (count / commonWords[0].count) * 0.5;
            
            return (
              <span
                key={word}
                className="px-3 py-1 rounded-full transition-all hover:scale-110"
                style={{
                  fontSize: `${size}px`,
                  backgroundColor: `hsla(${340 - index * 8}, 75%, 55%, ${opacity * 0.3})`,
                  color: `hsla(340, 75%, ${55 + (1 - opacity) * 30}%, 1)`,
                }}
              >
                {word} <span className="text-xs text-muted-foreground">({count})</span>
              </span>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}
