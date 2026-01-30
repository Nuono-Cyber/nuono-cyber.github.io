import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InstagramPost } from '@/types/instagram';
import { LineChart, TrendingUp, TrendingDown, Calendar, Flame, Clock, Hash } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface TrendsTabProps {
  posts: InstagramPost[];
}

export function TrendsTab({ posts }: TrendsTabProps) {
  const trends = useMemo(() => {
    if (posts.length === 0) return null;
    
    const sortedPosts = [...posts].sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
    
    // Monthly trends
    const monthlyData: Record<string, { likes: number; comments: number; count: number; month: string }> = {};
    sortedPosts.forEach(post => {
      const monthKey = `${post.publishedAt.getFullYear()}-${String(post.publishedAt.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = post.publishedAt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { likes: 0, comments: 0, count: 0, month: monthLabel };
      }
      monthlyData[monthKey].likes += post.likes;
      monthlyData[monthKey].comments += post.comments;
      monthlyData[monthKey].count++;
    });
    
    const monthlyTrends = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({
        month: data.month,
        likes: Math.round(data.likes / data.count),
        comments: Math.round(data.comments / data.count),
        engagement: Math.round((data.likes + data.comments) / data.count),
        posts: data.count
      }));
    
    // Day of week trends
    const dayOfWeekData: Record<number, { engagement: number; count: number }> = {};
    sortedPosts.forEach(post => {
      const day = post.publishedAt.getDay();
      if (!dayOfWeekData[day]) {
        dayOfWeekData[day] = { engagement: 0, count: 0 };
      }
      dayOfWeekData[day].engagement += post.engagementTotal;
      dayOfWeekData[day].count++;
    });
    
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayOfWeekTrends = Object.entries(dayOfWeekData)
      .map(([day, data]) => ({
        day: dayNames[parseInt(day)],
        dayNum: parseInt(day),
        avgEngagement: Math.round(data.engagement / data.count),
        posts: data.count
      }))
      .sort((a, b) => a.dayNum - b.dayNum);
    
    // Hour trends
    const hourData: Record<number, { engagement: number; count: number }> = {};
    sortedPosts.forEach(post => {
      const hour = post.publishedAt.getHours();
      if (!hourData[hour]) {
        hourData[hour] = { engagement: 0, count: 0 };
      }
      hourData[hour].engagement += post.engagementTotal;
      hourData[hour].count++;
    });
    
    const hourTrends = Object.entries(hourData)
      .map(([hour, data]) => ({
        hour: `${hour.padStart(2, '0')}:00`,
        hourNum: parseInt(hour),
        avgEngagement: Math.round(data.engagement / data.count),
        posts: data.count
      }))
      .sort((a, b) => a.hourNum - b.hourNum);
    
    // Find best performing patterns
    const bestDay = dayOfWeekTrends.reduce((best, current) => 
      current.avgEngagement > best.avgEngagement ? current : best, dayOfWeekTrends[0]);
    const bestHour = hourTrends.reduce((best, current) => 
      current.avgEngagement > best.avgEngagement ? current : best, hourTrends[0]);
    
    // Calculate growth trend
    const firstMonth = monthlyTrends[0];
    const lastMonth = monthlyTrends[monthlyTrends.length - 1];
    const growthPercent = firstMonth && lastMonth && firstMonth.engagement > 0
      ? ((lastMonth.engagement - firstMonth.engagement) / firstMonth.engagement) * 100
      : 0;
    
    // Content type trends over time
    const contentByMonth: Record<string, { video: number; image: number; carousel: number }> = {};
    sortedPosts.forEach(post => {
      const monthKey = post.publishedAt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!contentByMonth[monthKey]) {
        contentByMonth[monthKey] = { video: 0, image: 0, carousel: 0 };
      }
      if (post.postType === 'Vídeo' || post.postType === 'Reels') {
        contentByMonth[monthKey].video++;
      } else if (post.postType === 'Imagem') {
        contentByMonth[monthKey].image++;
      } else {
        contentByMonth[monthKey].carousel++;
      }
    });
    
    return {
      monthlyTrends,
      dayOfWeekTrends,
      hourTrends,
      bestDay,
      bestHour,
      growthPercent,
      totalPosts: posts.length
    };
  }, [posts]);

  if (!trends) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Sem dados para análise de tendências</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500">
          <LineChart className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Análise de Tendências</h2>
          <p className="text-muted-foreground">Padrões e evolução do seu conteúdo</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Crescimento</p>
                <p className="text-2xl font-bold">
                  {trends.growthPercent >= 0 ? '+' : ''}{trends.growthPercent.toFixed(0)}%
                </p>
              </div>
              {trends.growthPercent >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Período analisado</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Melhor Dia</p>
                <p className="text-2xl font-bold">{trends.bestDay?.day}</p>
              </div>
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {trends.bestDay?.avgEngagement.toLocaleString()} eng. médio
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Melhor Horário</p>
                <p className="text-2xl font-bold">{trends.bestHour?.hour}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {trends.bestHour?.avgEngagement.toLocaleString()} eng. médio
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Posts Analisados</p>
                <p className="text-2xl font-bold">{trends.totalPosts}</p>
              </div>
              <Hash className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {trends.monthlyTrends.length} meses de dados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Evolution */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Evolução Mensal
          </CardTitle>
          <CardDescription>Engajamento médio por mês</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends.monthlyTrends}>
                <defs>
                  <linearGradient id="colorEngTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="engagement" 
                  name="Engajamento Médio"
                  stroke="hsl(var(--primary))" 
                  fill="url(#colorEngTrend)"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="posts" 
                  name="Qtd Posts"
                  stroke="hsl(var(--chart-5))" 
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Day and Hour Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Performance por Dia da Semana</CardTitle>
            <CardDescription>Quando seu conteúdo performa melhor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.dayOfWeekTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar 
                    dataKey="avgEngagement" 
                    name="Engajamento Médio"
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Performance por Horário</CardTitle>
            <CardDescription>Melhores horários para postar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.hourTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar 
                    dataKey="avgEngagement" 
                    name="Engajamento Médio"
                    fill="hsl(var(--chart-3))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Insights */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Insights de Tendências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
              <Calendar className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Padrão Semanal Identificado</p>
                <p className="text-sm text-muted-foreground">
                  Seus posts de <span className="font-medium text-foreground">{trends.bestDay?.day}</span> têm{' '}
                  {((trends.bestDay?.avgEngagement || 0) / (trends.dayOfWeekTrends.reduce((acc, d) => acc + d.avgEngagement, 0) / 7) * 100 - 100).toFixed(0)}% mais engajamento que a média.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
              <Clock className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Janela de Ouro</p>
                <p className="text-sm text-muted-foreground">
                  O horário das <span className="font-medium text-foreground">{trends.bestHour?.hour}</span> é o mais eficaz para alcançar sua audiência.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
              <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Tendência de Longo Prazo</p>
                <p className="text-sm text-muted-foreground">
                  {trends.growthPercent > 0 
                    ? `Seu engajamento cresceu ${trends.growthPercent.toFixed(0)}% no período analisado. Continue assim!`
                    : trends.growthPercent < 0
                      ? `Houve uma queda de ${Math.abs(trends.growthPercent).toFixed(0)}% no período. Considere revisar sua estratégia.`
                      : 'Seu engajamento permaneceu estável no período analisado.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
              <Flame className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium">Recomendação</p>
                <p className="text-sm text-muted-foreground">
                  Para maximizar resultados, poste às <span className="font-medium text-foreground">{trends.bestHour?.hour}</span> de{' '}
                  <span className="font-medium text-foreground">{trends.bestDay?.day}</span>.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
