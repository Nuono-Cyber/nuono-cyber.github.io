import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { InstagramPost } from '@/types/instagram';
import { Heart, Smile, Meh, Frown, TrendingUp, TrendingDown, MessageCircle, Info } from 'lucide-react';
import { formatNumber } from '@/utils/dataProcessor';
import { 
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

interface SentimentTabProps {
  posts: InstagramPost[];
}

// Enhanced sentiment analysis using multiple signals
function analyzeSentiment(post: InstagramPost): { score: number; label: 'positive' | 'neutral' | 'negative'; confidence: number } {
  const text = (post.description || '').toLowerCase();
  
  // Empty/null text → use engagement as proxy
  if (!text || text.trim().length < 3) {
    // No text, classify by engagement performance
    return { score: 0, label: 'neutral', confidence: 0.2 };
  }

  let score = 0;
  let signals = 0;

  // 1. Positive keywords (PT-BR)
  const positiveWords = [
    'amor', 'incrível', 'maravilh', 'excelente', 'ótimo', 'lindo', 'perfeit', 'feliz', 
    'sucesso', 'parabéns', 'top', 'demais', 'sensacional', 'bom', 'melhor', 'obrigad',
    'conquista', 'orgulho', 'alegria', 'motivação', 'inspiração', 'gratidão', 'vamos',
    'gostei', 'valeu', 'show', 'pega visão', 'valorize', 'evolu', 'papo reto'
  ];
  
  const negativeWords = [
    'ruim', 'péssimo', 'horrível', 'triste', 'problema', 'erro', 'falha', 'nunca', 
    'pior', 'difícil', 'sem condições', 'entendi nada', 'entendi nd', 'não'
  ];

  // 2. Emoji-based sentiment (more comprehensive)
  // eslint-disable-next-line no-misleading-character-class
  const positiveEmojis = /[😍🥰😊😄😁🔥💪🎉🏆✨💯👏🙌❤️💖💕🤩😎👍🫶💫⭐🎯🚀]/gu;
  const negativeEmojis = /[😢😭😡😤😠👎💔😩😰🤦😱😕😞😒]/gu;
  const neutralEmojis = /[😅😂🤣🤷😂🤓]/gu;

  const posEmojiCount = (text.match(positiveEmojis) || []).length;
  const negEmojiCount = (text.match(negativeEmojis) || []).length;
  const neuEmojiCount = (text.match(neutralEmojis) || []).length;

  score += posEmojiCount * 1.5;
  score -= negEmojiCount * 1.5;
  signals += posEmojiCount + negEmojiCount + neuEmojiCount;

  // 3. Keyword matching
  positiveWords.forEach(word => {
    if (text.includes(word)) { score += 1; signals++; }
  });
  negativeWords.forEach(word => {
    if (text.includes(word)) { score -= 1; signals++; }
  });

  // 4. Exclamation marks suggest strong emotion (usually positive in social media)
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > 0) { score += 0.3 * exclamations; signals++; }

  // 5. Question marks suggest engagement/curiosity
  const questions = (text.match(/\?/g) || []).length;
  if (questions > 0) { signals++; }

  // Confidence based on number of signals
  const confidence = Math.min(1, signals / 5);

  if (score > 0.5) return { score, label: 'positive', confidence };
  if (score < -0.5) return { score, label: 'negative', confidence };
  return { score, label: 'neutral', confidence };
}

export function SentimentTab({ posts }: SentimentTabProps) {
  const sentimentAnalysis = useMemo(() => {
    const results = posts.map(post => {
      const sentiment = analyzeSentiment(post);
      return { ...post, sentiment: sentiment.label, sentimentScore: sentiment.score, confidence: sentiment.confidence };
    });
    
    const positive = results.filter(p => p.sentiment === 'positive');
    const neutral = results.filter(p => p.sentiment === 'neutral');
    const negative = results.filter(p => p.sentiment === 'negative');
    
    const safeAvg = (arr: typeof results) => arr.length > 0
      ? arr.reduce((acc, p) => acc + p.engagementTotal, 0) / arr.length : 0;
    const safeAvgViews = (arr: typeof results) => arr.length > 0
      ? arr.reduce((acc, p) => acc + p.views, 0) / arr.length : 0;

    return {
      distribution: { positive: positive.length, neutral: neutral.length, negative: negative.length },
      avgEngagement: { positive: safeAvg(positive), neutral: safeAvg(neutral), negative: safeAvg(negative) },
      avgViews: { positive: safeAvgViews(positive), neutral: safeAvgViews(neutral), negative: safeAvgViews(negative) },
      avgConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / Math.max(1, results.length),
      results,
    };
  }, [posts]);

  const total = posts.length;
  const { distribution } = sentimentAnalysis;

  const pieData = [
    { name: 'Positivo', value: distribution.positive, color: 'hsl(142, 71%, 45%)' },
    { name: 'Neutro', value: distribution.neutral, color: 'hsl(var(--muted-foreground))' },
    { name: 'Negativo', value: distribution.negative, color: 'hsl(0, 72%, 51%)' },
  ].filter(d => d.value > 0);

  const comparisonData = [
    { 
      name: 'Positivo', 
      engajamento: Math.round(sentimentAnalysis.avgEngagement.positive),
      views: Math.round(sentimentAnalysis.avgViews.positive),
    },
    { 
      name: 'Neutro', 
      engajamento: Math.round(sentimentAnalysis.avgEngagement.neutral),
      views: Math.round(sentimentAnalysis.avgViews.neutral),
    },
    { 
      name: 'Negativo', 
      engajamento: Math.round(sentimentAnalysis.avgEngagement.negative),
      views: Math.round(sentimentAnalysis.avgViews.negative),
    },
  ];

  const positivePercent = total > 0 ? (distribution.positive / total) * 100 : 0;
  
  // Find which sentiment performs best
  const bestSentiment = Object.entries(sentimentAnalysis.avgViews)
    .sort(([, a], [, b]) => b - a)[0];
  const sentimentLabels: Record<string, string> = { positive: 'positivo', neutral: 'neutro', negative: 'negativo' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500">
          <Heart className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Análise de Sentimento</h2>
          <p className="text-muted-foreground">Tom emocional das legendas e impacto na performance</p>
        </div>
      </div>

      {/* Method disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>Análise baseada em palavras-chave, emojis e padrões de texto em português. Confiança média: {(sentimentAnalysis.avgConfidence * 100).toFixed(0)}%</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Positivo</p>
                <p className="text-3xl font-bold text-green-500">{distribution.positive}</p>
                <p className="text-xs text-muted-foreground">{total > 0 ? ((distribution.positive / total) * 100).toFixed(0) : 0}% dos posts</p>
              </div>
              <Smile className="w-10 h-10 text-green-500 opacity-50" />
            </div>
            <Progress value={total > 0 ? (distribution.positive / total) * 100 : 0} className="mt-3" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Neutro</p>
                <p className="text-3xl font-bold text-muted-foreground">{distribution.neutral}</p>
                <p className="text-xs text-muted-foreground">{total > 0 ? ((distribution.neutral / total) * 100).toFixed(0) : 0}% dos posts</p>
              </div>
              <Meh className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
            <Progress value={total > 0 ? (distribution.neutral / total) * 100 : 0} className="mt-3" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Negativo</p>
                <p className="text-3xl font-bold text-red-500">{distribution.negative}</p>
                <p className="text-xs text-muted-foreground">{total > 0 ? ((distribution.negative / total) * 100).toFixed(0) : 0}% dos posts</p>
              </div>
              <Frown className="w-10 h-10 text-red-500 opacity-50" />
            </div>
            <Progress value={total > 0 ? (distribution.negative / total) * 100 : 0} className="mt-3" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Distribuição de Sentimentos</CardTitle>
            <CardDescription>Classificação por palavras-chave, emojis e padrões</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData} cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
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
            <CardTitle>Performance por Sentimento</CardTitle>
            <CardDescription>Média de views e engajamento por tom</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={formatNumber} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatNumber(value)]}
                  />
                  <Legend />
                  <Bar dataKey="views" name="Views Médios" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="engajamento" name="Engajamento Médio" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
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
              {positivePercent >= 50 ? (
                <TrendingUp className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <TrendingDown className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">
                  {positivePercent >= 50 ? 'Tom predominantemente positivo' : 'Oportunidade de ajustar o tom'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {positivePercent.toFixed(0)}% das legendas têm tom positivo. 
                  {positivePercent >= 50 
                    ? ' Continue usando emojis e palavras de incentivo.'
                    : ' Experimente adicionar mais emojis positivos e CTAs motivacionais.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
              <Heart className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Sentimento com melhor performance</p>
                <p className="text-sm text-muted-foreground">
                  Posts com tom <strong>{sentimentLabels[bestSentiment[0]]}</strong> têm a maior média de views ({formatNumber(bestSentiment[1])}).
                  {bestSentiment[0] !== 'positive' && ' Considere que isso pode refletir conteúdo polêmico ou humorístico que gera curiosidade.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
