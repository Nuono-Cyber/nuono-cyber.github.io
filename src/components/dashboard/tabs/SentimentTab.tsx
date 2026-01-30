import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { InstagramPost } from '@/types/instagram';
import { Heart, Smile, Meh, Frown, TrendingUp, TrendingDown, MessageCircle } from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface SentimentTabProps {
  posts: InstagramPost[];
}

// Simple sentiment analysis based on keywords
function analyzeSentiment(text: string): { score: number; label: 'positive' | 'neutral' | 'negative' } {
  const positiveWords = ['amor', 'incrível', 'maravilhoso', 'excelente', 'ótimo', 'lindo', 'perfeito', 'feliz', 'sucesso', 'parabéns', '❤️', '🔥', '👏', '💪', '🎉', '😍', '🥰', '💯'];
  const negativeWords = ['ruim', 'péssimo', 'horrível', 'triste', 'problema', 'erro', 'falha', 'nunca', 'pior', '😢', '😭', '😡', '👎'];
  
  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word.toLowerCase())) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word.toLowerCase())) negativeCount++;
  });
  
  const score = positiveCount - negativeCount;
  
  if (score > 0) return { score, label: 'positive' };
  if (score < 0) return { score, label: 'negative' };
  return { score: 0, label: 'neutral' };
}

export function SentimentTab({ posts }: SentimentTabProps) {
  const sentimentAnalysis = useMemo(() => {
    const results = posts.map(post => {
      const sentiment = analyzeSentiment(post.description || '');
      return {
        ...post,
        sentiment: sentiment.label,
        sentimentScore: sentiment.score
      };
    });
    
    const positive = results.filter(p => p.sentiment === 'positive').length;
    const neutral = results.filter(p => p.sentiment === 'neutral').length;
    const negative = results.filter(p => p.sentiment === 'negative').length;
    
    // Calculate average engagement by sentiment
    const avgEngagementBySentiment = {
      positive: results.filter(p => p.sentiment === 'positive').reduce((acc, p) => acc + p.engagementTotal, 0) / (positive || 1),
      neutral: results.filter(p => p.sentiment === 'neutral').reduce((acc, p) => acc + p.engagementTotal, 0) / (neutral || 1),
      negative: results.filter(p => p.sentiment === 'negative').reduce((acc, p) => acc + p.engagementTotal, 0) / (negative || 1),
    };
    
    return {
      distribution: { positive, neutral, negative },
      avgEngagement: avgEngagementBySentiment,
      results
    };
  }, [posts]);

  const pieData = [
    { name: 'Positivo', value: sentimentAnalysis.distribution.positive, color: 'hsl(var(--success))' },
    { name: 'Neutro', value: sentimentAnalysis.distribution.neutral, color: 'hsl(var(--muted-foreground))' },
    { name: 'Negativo', value: sentimentAnalysis.distribution.negative, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  const engagementData = [
    { name: 'Positivo', engagement: Math.round(sentimentAnalysis.avgEngagement.positive), fill: 'hsl(var(--success))' },
    { name: 'Neutro', engagement: Math.round(sentimentAnalysis.avgEngagement.neutral), fill: 'hsl(var(--muted-foreground))' },
    { name: 'Negativo', engagement: Math.round(sentimentAnalysis.avgEngagement.negative), fill: 'hsl(var(--destructive))' },
  ];

  const total = posts.length;
  const positivePercent = total > 0 ? (sentimentAnalysis.distribution.positive / total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500">
          <Heart className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Análise de Sentimento</h2>
          <p className="text-muted-foreground">Entenda o tom emocional das suas legendas</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Positivo</p>
                <p className="text-3xl font-bold text-green-500">{sentimentAnalysis.distribution.positive}</p>
              </div>
              <Smile className="w-10 h-10 text-green-500 opacity-50" />
            </div>
            <Progress value={(sentimentAnalysis.distribution.positive / total) * 100} className="mt-3" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Neutro</p>
                <p className="text-3xl font-bold text-muted-foreground">{sentimentAnalysis.distribution.neutral}</p>
              </div>
              <Meh className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
            <Progress value={(sentimentAnalysis.distribution.neutral / total) * 100} className="mt-3" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Negativo</p>
                <p className="text-3xl font-bold text-red-500">{sentimentAnalysis.distribution.negative}</p>
              </div>
              <Frown className="w-10 h-10 text-red-500 opacity-50" />
            </div>
            <Progress value={(sentimentAnalysis.distribution.negative / total) * 100} className="mt-3" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Distribuição de Sentimentos</CardTitle>
            <CardDescription>Análise baseada em palavras-chave e emojis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Engajamento por Sentimento</CardTitle>
            <CardDescription>Média de interações por tipo de conteúdo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="engagement" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Insights de Sentimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
              {positivePercent >= 60 ? (
                <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <TrendingDown className="w-5 h-5 text-yellow-500 mt-0.5" />
              )}
              <div>
                <p className="font-medium">
                  {positivePercent >= 60 
                    ? 'Excelente positividade!' 
                    : 'Oportunidade de melhorar o tom'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {positivePercent.toFixed(0)}% das suas legendas têm tom positivo. 
                  {positivePercent >= 60 
                    ? ' Continue mantendo esse padrão para melhor engajamento.'
                    : ' Considere usar mais palavras positivas e emojis para aumentar o engajamento.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
              <Heart className="w-5 h-5 text-pink-500 mt-0.5" />
              <div>
                <p className="font-medium">Dica de Performance</p>
                <p className="text-sm text-muted-foreground">
                  Posts com sentimento positivo geram em média{' '}
                  <span className="font-medium text-foreground">
                    {((sentimentAnalysis.avgEngagement.positive / sentimentAnalysis.avgEngagement.neutral - 1) * 100).toFixed(0)}%
                  </span>{' '}
                  mais engajamento que posts neutros.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
