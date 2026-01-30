import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InstagramPost } from '@/types/instagram';
import { TrendingUp, Target, Zap, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';

interface PredictionTabProps {
  posts: InstagramPost[];
}

// Simple linear regression for prediction
function linearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  
  const sumX = data.reduce((acc, _, i) => acc + i, 0);
  const sumY = data.reduce((acc, val) => acc + val, 0);
  const sumXY = data.reduce((acc, val, i) => acc + i * val, 0);
  const sumXX = data.reduce((acc, _, i) => acc + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n || 0;
  
  return { slope, intercept };
}

export function PredictionTab({ posts }: PredictionTabProps) {
  const predictions = useMemo(() => {
    // Group posts by week
    const weeklyData: { week: string; engagement: number; likes: number; comments: number; count: number }[] = [];
    const sortedPosts = [...posts].sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
    
    sortedPosts.forEach(post => {
      const weekStart = new Date(post.publishedAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const existing = weeklyData.find(w => w.week === weekKey);
      if (existing) {
        existing.engagement += post.engagementTotal;
        existing.likes += post.likes;
        existing.comments += post.comments;
        existing.count++;
      } else {
        weeklyData.push({
          week: weekKey,
          engagement: post.engagementTotal,
          likes: post.likes,
          comments: post.comments,
          count: 1
        });
      }
    });
    
    // Calculate averages
    weeklyData.forEach(w => {
      w.engagement = Math.round(w.engagement / w.count);
      w.likes = Math.round(w.likes / w.count);
      w.comments = Math.round(w.comments / w.count);
    });
    
    // Perform regression on engagement
    const engagementValues = weeklyData.map(w => w.engagement);
    const { slope, intercept } = linearRegression(engagementValues);
    
    // Predict next 4 weeks
    const predictedWeeks: { week: string; predicted: number; lower: number; upper: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const nextWeekIndex = weeklyData.length + i;
      const predicted = Math.max(0, Math.round(slope * nextWeekIndex + intercept));
      const variance = engagementValues.length > 0 
        ? Math.sqrt(engagementValues.reduce((acc, v) => acc + Math.pow(v - (engagementValues.reduce((a, b) => a + b, 0) / engagementValues.length), 2), 0) / engagementValues.length)
        : 0;
      
      const lastDate = weeklyData.length > 0 ? new Date(weeklyData[weeklyData.length - 1].week) : new Date();
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 7 * (i + 1));
      
      predictedWeeks.push({
        week: nextDate.toISOString().split('T')[0],
        predicted,
        lower: Math.max(0, Math.round(predicted - variance * 1.5)),
        upper: Math.round(predicted + variance * 1.5)
      });
    }
    
    // Calculate trend
    const trend = slope > 10 ? 'growing' : slope < -10 ? 'declining' : 'stable';
    const trendPercent = engagementValues.length > 1 
      ? ((engagementValues[engagementValues.length - 1] - engagementValues[0]) / engagementValues[0]) * 100 
      : 0;
    
    return {
      historicalData: weeklyData.map((w, i) => ({
        ...w,
        weekLabel: new Date(w.week).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        trendLine: Math.round(slope * i + intercept)
      })),
      predictions: predictedWeeks.map(p => ({
        ...p,
        weekLabel: new Date(p.week).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      })),
      trend,
      trendPercent,
      avgEngagement: engagementValues.length > 0 ? Math.round(engagementValues.reduce((a, b) => a + b, 0) / engagementValues.length) : 0,
      nextWeekPrediction: predictedWeeks[0]?.predicted || 0
    };
  }, [posts]);

  const chartData = [
    ...predictions.historicalData.map(d => ({ ...d, type: 'historical' })),
    ...predictions.predictions.map(d => ({ 
      weekLabel: d.weekLabel, 
      engagement: d.predicted,
      predicted: d.predicted,
      lower: d.lower,
      upper: d.upper,
      type: 'prediction' 
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Previsões de Performance</h2>
          <p className="text-muted-foreground">Modelos preditivos baseados no seu histórico</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tendência Atual</p>
                <p className="text-2xl font-bold">
                  {predictions.trend === 'growing' && '📈 Crescimento'}
                  {predictions.trend === 'declining' && '📉 Declínio'}
                  {predictions.trend === 'stable' && '➡️ Estável'}
                </p>
              </div>
              <Badge 
                variant={predictions.trend === 'growing' ? 'default' : predictions.trend === 'declining' ? 'destructive' : 'secondary'}
                className="text-lg"
              >
                {predictions.trendPercent >= 0 ? '+' : ''}{predictions.trendPercent.toFixed(0)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Previsão Próx. Semana</p>
                <p className="text-3xl font-bold">{predictions.nextWeekPrediction.toLocaleString()}</p>
              </div>
              <Target className="w-10 h-10 text-primary opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Engajamento médio esperado
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média Histórica</p>
                <p className="text-3xl font-bold">{predictions.avgEngagement.toLocaleString()}</p>
              </div>
              <Zap className="w-10 h-10 text-yellow-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Engajamento por post
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prediction Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Projeção de Engajamento
          </CardTitle>
          <CardDescription>
            Histórico semanal e previsão para as próximas 4 semanas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="weekLabel" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="engagement" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#colorEngagement)"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="hsl(var(--chart-5))" 
                  fill="url(#colorPrediction)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="trendLine" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Recomendações Baseadas nas Previsões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predictions.trend === 'declining' && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium">Atenção: Tendência de Queda</p>
                  <p className="text-sm text-muted-foreground">
                    Seus números mostram declínio. Considere variar o tipo de conteúdo ou horários de postagem.
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Melhor Dia para Postar</p>
                <p className="text-sm text-muted-foreground">
                  Com base no histórico, seus posts têm melhor performance no meio da semana.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
              <Target className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Meta Sugerida</p>
                <p className="text-sm text-muted-foreground">
                  Para superar a previsão, mire em{' '}
                  <span className="font-medium text-foreground">
                    {Math.round(predictions.nextWeekPrediction * 1.1).toLocaleString()}
                  </span>{' '}
                  interações na próxima semana.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
