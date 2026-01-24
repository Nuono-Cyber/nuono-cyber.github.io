import { InstagramPost } from '@/types/instagram';
import { ChartCard } from '../ChartCard';
import { InsightCard } from '../InsightCard';
import { formatNumber, generateInsights, getPerformanceByDay, getPerformanceByHour, clusterPosts } from '@/utils/dataProcessor';
import { useMemo } from 'react';
import { Lightbulb, Clock, Calendar, Video, FileText, TrendingUp, Target, Zap } from 'lucide-react';

interface InsightsTabProps {
  posts: InstagramPost[];
}

export function InsightsTab({ posts }: InsightsTabProps) {
  const insights = useMemo(() => generateInsights(posts), [posts]);
  
  const dayPerformance = useMemo(() => getPerformanceByDay(posts), [posts]);
  const hourPerformance = useMemo(() => getPerformanceByHour(posts), [posts]);
  const clusters = useMemo(() => clusterPosts(posts), [posts]);

  const bestDay = useMemo(() => {
    if (dayPerformance.length === 0) return null;
    return dayPerformance.reduce((best, day) => day.avgViews > best.avgViews ? day : best);
  }, [dayPerformance]);

  const bestHour = useMemo(() => {
    if (hourPerformance.length === 0) return null;
    return hourPerformance.reduce((best, hour) => hour.avgViews > best.avgViews ? hour : best);
  }, [hourPerformance]);

  const avgDuration = useMemo(() => {
    const videoPosts = posts.filter(p => p.duration > 0);
    if (videoPosts.length === 0) return 0;
    const topVideos = [...videoPosts].sort((a, b) => b.views - a.views).slice(0, Math.ceil(videoPosts.length / 3));
    return topVideos.reduce((sum, p) => sum + p.duration, 0) / topVideos.length;
  }, [posts]);

  const avgDescLength = useMemo(() => {
    const topPosts = [...posts].sort((a, b) => b.views - a.views).slice(0, Math.ceil(posts.length / 3));
    return topPosts.reduce((sum, p) => sum + p.descriptionLength, 0) / topPosts.length;
  }, [posts]);

  const recommendations = useMemo(() => [
    {
      icon: Calendar,
      title: 'Melhor Dia para Postar',
      value: bestDay?.day || 'N/A',
      description: `Posts de ${bestDay?.day} têm ${formatNumber(bestDay?.avgViews || 0)} views em média`,
      color: 'text-primary',
    },
    {
      icon: Clock,
      title: 'Melhor Horário',
      value: `${bestHour?.hour || 0}:00`,
      description: `Poste entre ${(bestHour?.hour || 0) - 1}h e ${(bestHour?.hour || 0) + 1}h para máximo alcance`,
      color: 'text-accent',
    },
    {
      icon: Video,
      title: 'Duração Ideal de Vídeo',
      value: `${Math.round(avgDuration)}s`,
      description: 'Duração média dos seus vídeos de maior sucesso',
      color: 'text-instagram-orange',
    },
    {
      icon: FileText,
      title: 'Tamanho de Legenda',
      value: `~${Math.round(avgDescLength)} chars`,
      description: 'Comprimento médio das legendas nos top posts',
      color: 'text-info',
    },
  ], [bestDay, bestHour, avgDuration, avgDescLength]);

  const checklistItems = useMemo(() => {
    const items = [];

    // Check posting frequency
    const uniqueDays = new Set(posts.map(p => p.publishedAt.toDateString())).size;
    const avgPostsPerDay = posts.length / uniqueDays;
    if (avgPostsPerDay < 2) {
      items.push({
        status: 'warning',
        text: 'Aumentar frequência de postagem (atual: ' + avgPostsPerDay.toFixed(1) + ' posts/dia)',
      });
    } else {
      items.push({
        status: 'success',
        text: 'Frequência de postagem adequada (' + avgPostsPerDay.toFixed(1) + ' posts/dia)',
      });
    }

    // Check emoji usage
    const emojiRate = posts.filter(p => p.hasEmoji).length / posts.length;
    if (emojiRate < 0.5) {
      items.push({
        status: 'warning',
        text: 'Considere usar mais emojis nas legendas (atual: ' + (emojiRate * 100).toFixed(0) + '%)',
      });
    } else {
      items.push({
        status: 'success',
        text: 'Bom uso de emojis nas legendas (' + (emojiRate * 100).toFixed(0) + '%)',
      });
    }

    // Check video duration variation
    const videoPosts = posts.filter(p => p.duration > 0);
    if (videoPosts.length > 0) {
      const avgDur = videoPosts.reduce((sum, p) => sum + p.duration, 0) / videoPosts.length;
      if (avgDur > 60) {
        items.push({
          status: 'warning',
          text: 'Considere vídeos mais curtos (média atual: ' + avgDur.toFixed(0) + 's)',
        });
      } else {
        items.push({
          status: 'success',
          text: 'Duração de vídeos está adequada (' + avgDur.toFixed(0) + 's em média)',
        });
      }
    }

    // Check engagement rate
    const avgEngagement = posts.reduce((sum, p) => sum + p.engagementRate, 0) / posts.length;
    if (avgEngagement < 3) {
      items.push({
        status: 'error',
        text: 'Taxa de engajamento baixa (' + avgEngagement.toFixed(2) + '%). Adicione CTAs às legendas.',
      });
    } else if (avgEngagement < 5) {
      items.push({
        status: 'warning',
        text: 'Taxa de engajamento pode melhorar (' + avgEngagement.toFixed(2) + '%)',
      });
    } else {
      items.push({
        status: 'success',
        text: 'Excelente taxa de engajamento (' + avgEngagement.toFixed(2) + '%)',
      });
    }

    return items;
  }, [posts]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {recommendations.map((rec, index) => (
          <div key={index} className="metric-card">
            <div className={`p-3 rounded-xl bg-secondary/50 w-fit mb-4 ${rec.color}`}>
              <rec.icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted-foreground">{rec.title}</p>
            <p className="text-2xl font-bold mt-1">{rec.value}</p>
            <p className="text-xs text-muted-foreground mt-2">{rec.description}</p>
          </div>
        ))}
      </div>

      {/* Insights */}
      <ChartCard 
        title="💡 Insights Detectados" 
        description="Padrões identificados automaticamente nos seus dados"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <InsightCard key={index} insight={insight} />
          ))}
        </div>
      </ChartCard>

      {/* Clusters Analysis */}
      {clusters.length > 0 && (
        <ChartCard 
          title="📊 Segmentação de Posts" 
          description="Seus posts agrupados por nível de performance"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clusters.map((cluster) => (
              <div 
                key={cluster.clusterId} 
                className={`p-4 rounded-xl border ${
                  cluster.clusterId === 2 
                    ? 'border-success/50 bg-success/10' 
                    : cluster.clusterId === 1 
                      ? 'border-warning/50 bg-warning/10'
                      : 'border-destructive/50 bg-destructive/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${
                    cluster.clusterId === 2 
                      ? 'bg-success' 
                      : cluster.clusterId === 1 
                        ? 'bg-warning'
                        : 'bg-destructive'
                  }`} />
                  <h4 className="font-semibold">{cluster.label}</h4>
                </div>
                <p className="text-3xl font-bold mb-2">{cluster.posts.length} posts</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Média Views: {formatNumber(cluster.centroid.views)}</p>
                  <p>Média Alcance: {formatNumber(cluster.centroid.reach)}</p>
                  <p>Média Curtidas: {formatNumber(cluster.centroid.likes)}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Optimization Checklist */}
      <ChartCard 
        title="✅ Checklist de Otimização" 
        description="Pontos de atenção para melhorar sua performance"
      >
        <div className="space-y-3">
          {checklistItems.map((item, index) => (
            <div 
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                item.status === 'success' 
                  ? 'bg-success/10 border border-success/30'
                  : item.status === 'warning'
                    ? 'bg-warning/10 border border-warning/30'
                    : 'bg-destructive/10 border border-destructive/30'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                item.status === 'success' 
                  ? 'bg-success text-success-foreground'
                  : item.status === 'warning'
                    ? 'bg-warning text-warning-foreground'
                    : 'bg-destructive text-destructive-foreground'
              }`}>
                {item.status === 'success' ? '✓' : item.status === 'warning' ? '!' : '✗'}
              </div>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Next Post Recommendation */}
      <ChartCard 
        title="🎯 Recomendação para Próximo Post" 
        description="Baseado na análise dos seus melhores conteúdos"
      >
        <div className="bg-gradient-to-r from-primary/20 via-accent/20 to-instagram-orange/20 rounded-xl p-6 border border-primary/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Quando postar</span>
              </div>
              <p className="text-xl font-bold">{bestDay?.day}, {bestHour?.hour}:00</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Video className="w-4 h-4" />
                <span className="text-sm">Formato</span>
              </div>
              <p className="text-xl font-bold">Reel ({Math.round(avgDuration)}s)</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span className="text-sm">Legenda</span>
              </div>
              <p className="text-xl font-bold">~{Math.round(avgDescLength)} caracteres</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4" />
                <span className="text-sm">Previsão</span>
              </div>
              <p className="text-xl font-bold">
                {formatNumber(posts.reduce((sum, p) => sum + p.views, 0) / posts.length * 1.2)} views
              </p>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
