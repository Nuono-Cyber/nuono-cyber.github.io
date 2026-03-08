import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InstagramPost } from '@/types/instagram';
import { formatNumber } from '@/utils/dataProcessor';
import { TrendingUp, Target, Zap, Calendar, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, Line, Legend
} from 'recharts';

interface PredictionTabProps {
  posts: InstagramPost[];
}

// Kernel Ridge Regression (RBF kernel) - better for small datasets than linear regression
function kernelRidgePredict(data: number[], futureSteps: number): { predictions: number[]; confidence: number } {
  const n = data.length;
  if (n === 0) return { predictions: Array(futureSteps).fill(0), confidence: 0 };
  if (n === 1) return { predictions: Array(futureSteps).fill(data[0]), confidence: 0.1 };

  // RBF kernel: K(x, x') = exp(-gamma * ||x - x'||^2)
  const gamma = 0.5 / n; // Adaptive gamma
  const lambda = 0.1; // Regularization

  // Build kernel matrix
  const K: number[][] = [];
  for (let i = 0; i < n; i++) {
    K[i] = [];
    for (let j = 0; j < n; j++) {
      K[i][j] = Math.exp(-gamma * Math.pow(i - j, 2));
    }
    K[i][i] += lambda; // Ridge regularization
  }

  // Solve (K + λI)α = y using simple Gauss elimination
  const augmented = K.map((row, i) => [...row, data[i]]);
  const size = augmented.length;
  
  for (let i = 0; i < size; i++) {
    let maxRow = i;
    for (let k = i + 1; k < size; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) maxRow = k;
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    if (Math.abs(augmented[i][i]) < 1e-10) continue;
    
    for (let k = i + 1; k < size; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= size; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  const alpha = new Array(size).fill(0);
  for (let i = size - 1; i >= 0; i--) {
    if (Math.abs(augmented[i][i]) < 1e-10) continue;
    alpha[i] = augmented[i][size];
    for (let j = i + 1; j < size; j++) {
      alpha[i] -= augmented[i][j] * alpha[j];
    }
    alpha[i] /= augmented[i][i];
  }

  // Predict future
  const predictions: number[] = [];
  for (let t = 0; t < futureSteps; t++) {
    const futureIdx = n + t;
    let pred = 0;
    for (let i = 0; i < n; i++) {
      pred += alpha[i] * Math.exp(-gamma * Math.pow(futureIdx - i, 2));
    }
    predictions.push(Math.max(0, Math.round(pred)));
  }

  // Confidence based on data consistency (CV of recent data)
  const recentData = data.slice(-Math.min(5, n));
  const mean = recentData.reduce((a, b) => a + b, 0) / recentData.length;
  const cv = mean > 0 ? Math.sqrt(recentData.reduce((s, v) => s + (v - mean) ** 2, 0) / recentData.length) / mean : 1;
  const confidence = Math.max(0.1, Math.min(0.95, 1 - cv));

  return { predictions, confidence };
}

export function PredictionTab({ posts }: PredictionTabProps) {
  const predictions = useMemo(() => {
    if (posts.length < 2) return null;

    // Group by week
    const sortedPosts = [...posts].sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
    const weeklyMap = new Map<string, { engagement: number; views: number; likes: number; count: number }>();
    
    sortedPosts.forEach(post => {
      const weekStart = new Date(post.publishedAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const existing = weeklyMap.get(weekKey) || { engagement: 0, views: 0, likes: 0, count: 0 };
      existing.engagement += post.engagementTotal;
      existing.views += post.views;
      existing.likes += post.likes;
      existing.count++;
      weeklyMap.set(weekKey, existing);
    });

    const weeklyData = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week,
        engagement: Math.round(data.engagement / data.count),
        views: Math.round(data.views / data.count),
        likes: Math.round(data.likes / data.count),
        count: data.count,
      }));

    if (weeklyData.length < 2) return null;

    // Predict with kernel ridge regression
    const engagementSeries = weeklyData.map(w => w.engagement);
    const viewsSeries = weeklyData.map(w => w.views);
    
    const engPred = kernelRidgePredict(engagementSeries, 4);
    const viewsPred = kernelRidgePredict(viewsSeries, 4);

    // Compute variance for confidence bands
    const engMean = engagementSeries.reduce((a, b) => a + b, 0) / engagementSeries.length;
    const engStd = Math.sqrt(engagementSeries.reduce((s, v) => s + (v - engMean) ** 2, 0) / engagementSeries.length);

    // Build prediction weeks
    const lastDate = new Date(weeklyData[weeklyData.length - 1].week);
    const predictionWeeks = engPred.predictions.map((eng, i) => {
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 7 * (i + 1));
      return {
        week: nextDate.toISOString().split('T')[0],
        weekLabel: nextDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        predicted: eng,
        predictedViews: viewsPred.predictions[i],
        lower: Math.max(0, Math.round(eng - engStd * 1.2)),
        upper: Math.round(eng + engStd * 1.2),
      };
    });

    // Trend analysis
    const recentWeeks = weeklyData.slice(-4);
    const olderWeeks = weeklyData.slice(-8, -4);
    const recentAvg = recentWeeks.reduce((s, w) => s + w.engagement, 0) / Math.max(1, recentWeeks.length);
    const olderAvg = olderWeeks.length > 0 
      ? olderWeeks.reduce((s, w) => s + w.engagement, 0) / olderWeeks.length 
      : recentAvg;
    
    const trendPercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    const trend = trendPercent > 10 ? 'growing' : trendPercent < -10 ? 'declining' : 'stable';

    return {
      historicalData: weeklyData.map(w => ({
        ...w,
        weekLabel: new Date(w.week).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      })),
      predictionWeeks,
      trend,
      trendPercent,
      confidence: engPred.confidence,
      avgEngagement: Math.round(engMean),
      nextWeekPrediction: engPred.predictions[0] || 0,
      nextWeekViews: viewsPred.predictions[0] || 0,
    };
  }, [posts]);

  if (!predictions) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Info className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          São necessários pelo menos 2 posts em semanas diferentes para gerar previsões.
        </p>
      </div>
    );
  }

  const chartData = [
    ...predictions.historicalData.map(d => ({
      weekLabel: d.weekLabel,
      engagement: d.engagement,
      views: d.views,
      type: 'historical',
    })),
    ...predictions.predictionWeeks.map(d => ({
      weekLabel: d.weekLabel,
      predicted: d.predicted,
      predictedViews: d.predictedViews,
      lower: d.lower,
      upper: d.upper,
      type: 'prediction',
    })),
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
          <p className="text-muted-foreground">Modelo preditivo (Kernel Ridge Regression) com {posts.length} posts</p>
        </div>
      </div>

      {/* Method info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Usando regressão com kernel RBF, ideal para poucos dados. 
          Confiança do modelo: <strong>{(predictions.confidence * 100).toFixed(0)}%</strong>
          {predictions.confidence < 0.5 && ' — adicione mais dados para melhorar a precisão.'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tendência</p>
            <p className="text-xl font-bold mt-1">
              {predictions.trend === 'growing' && '📈 Crescimento'}
              {predictions.trend === 'declining' && '📉 Declínio'}
              {predictions.trend === 'stable' && '➡️ Estável'}
            </p>
            <Badge 
              variant={predictions.trend === 'growing' ? 'default' : predictions.trend === 'declining' ? 'destructive' : 'secondary'}
              className="mt-2"
            >
              {predictions.trendPercent >= 0 ? '+' : ''}{predictions.trendPercent.toFixed(0)}%
            </Badge>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Engajamento Próx. Semana</p>
            <p className="text-2xl font-bold mt-1">{predictions.nextWeekPrediction.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">interações/post</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Views Próx. Semana</p>
            <p className="text-2xl font-bold mt-1">{formatNumber(predictions.nextWeekViews)}</p>
            <p className="text-xs text-muted-foreground mt-1">visualizações/post</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Média Histórica</p>
            <p className="text-2xl font-bold mt-1">{predictions.avgEngagement.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">engajamento/post</p>
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
            Histórico semanal + previsão 4 semanas (área tracejada = previsão)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
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
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      engagement: 'Engajamento Real',
                      predicted: 'Previsão',
                      lower: 'Limite Inferior',
                      upper: 'Limite Superior',
                    };
                    return [value.toLocaleString(), labels[name] || name];
                  }}
                />
                <Legend formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    engagement: 'Engajamento Real',
                    predicted: 'Previsão',
                    upper: 'Intervalo Confiança',
                  };
                  return labels[value] || value;
                }} />
                <Area 
                  type="monotone" dataKey="engagement" 
                  stroke="hsl(var(--primary))" fill="url(#colorEng)" strokeWidth={2}
                  connectNulls={false}
                />
                <Area 
                  type="monotone" dataKey="upper" 
                  stroke="transparent" fill="hsl(var(--chart-5))" fillOpacity={0.1}
                  connectNulls={false}
                />
                <Area 
                  type="monotone" dataKey="predicted" 
                  stroke="hsl(var(--chart-5))" fill="url(#colorPred)" strokeWidth={2}
                  strokeDasharray="5 5" connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Recomendações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predictions.trend === 'declining' && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Tendência de Queda</p>
                  <p className="text-sm text-muted-foreground">
                    O engajamento recente caiu {Math.abs(predictions.trendPercent).toFixed(0)}%. Varie o conteúdo ou horários.
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
              <Target className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Meta Sugerida</p>
                <p className="text-sm text-muted-foreground">
                  Para superar a previsão, mire em{' '}
                  <strong>{Math.round(predictions.nextWeekPrediction * 1.15).toLocaleString()}</strong>{' '}
                  interações na próxima semana (+15%).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Precisão do Modelo</p>
                <p className="text-sm text-muted-foreground">
                  Com {posts.length} posts, a confiança é de {(predictions.confidence * 100).toFixed(0)}%.
                  {posts.length < 30 && ' Mais dados melhorarão significativamente a precisão.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
