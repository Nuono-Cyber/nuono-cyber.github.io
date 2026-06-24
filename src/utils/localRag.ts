import { InstagramPost } from '@/types/instagram';

export interface RagMessage {
  role: 'user' | 'assistant';
  content: string;
}

type MetricKey = 'views' | 'reach' | 'likes' | 'comments' | 'shares' | 'saves' | 'engagementRate';

const STOP_WORDS = new Set([
  'a', 'ao', 'aos', 'as', 'com', 'como', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'entre',
  'eu', 'foi', 'mais', 'mas', 'me', 'melhor', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou',
  'para', 'por', 'qual', 'quais', 'que', 'se', 'sobre', 'um', 'uma', 'vc', 'voce', 'voces',
]);

const METRIC_LABELS: Record<MetricKey, string> = {
  views: 'visualizações',
  reach: 'alcance',
  likes: 'curtidas',
  comments: 'comentários',
  shares: 'compartilhamentos',
  saves: 'salvamentos',
  engagementRate: 'taxa de engajamento',
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\w#]+/g, ' ')
    .trim();
}

function tokenize(text: string) {
  return normalize(text)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value || 0)}%`;
}

function truncate(text: string, size = 86) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Sem legenda';
  return clean.length > size ? `${clean.slice(0, size - 1).trim()}...` : clean;
}

function getMetricFromQuestion(question: string): MetricKey {
  const q = normalize(question);
  if (q.includes('alcance') || q.includes('reach')) return 'reach';
  if (q.includes('curtida') || q.includes('like')) return 'likes';
  if (q.includes('coment')) return 'comments';
  if (q.includes('compart')) return 'shares';
  if (q.includes('salv')) return 'saves';
  if (q.includes('engaj')) return 'engagementRate';
  return 'views';
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function groupBy<T>(items: T[], keyGetter: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = keyGetter(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function metricValue(post: InstagramPost, metric: MetricKey) {
  return post[metric] || 0;
}

function buildPostText(post: InstagramPost) {
  return [
    post.description,
    post.postType,
    post.dayName,
    `${post.hour}h`,
    `visualizacoes ${post.views}`,
    `alcance ${post.reach}`,
    `curtidas ${post.likes}`,
    `comentarios ${post.comments}`,
    `salvamentos ${post.saves}`,
    `compartilhamentos ${post.shares}`,
    `engajamento ${post.engagementRate.toFixed(2)}`,
  ].join(' ');
}

function cosineScore(queryTerms: string[], docTerms: string[], idf: Map<string, number>) {
  const queryCounts = new Map<string, number>();
  const docCounts = new Map<string, number>();

  queryTerms.forEach((term) => queryCounts.set(term, (queryCounts.get(term) || 0) + 1));
  docTerms.forEach((term) => docCounts.set(term, (docCounts.get(term) || 0) + 1));

  const terms = new Set([...queryCounts.keys(), ...docCounts.keys()]);
  let dot = 0;
  let queryNorm = 0;
  let docNorm = 0;

  terms.forEach((term) => {
    const weight = idf.get(term) || 1;
    const q = (queryCounts.get(term) || 0) * weight;
    const d = (docCounts.get(term) || 0) * weight;
    dot += q * d;
    queryNorm += q * q;
    docNorm += d * d;
  });

  if (!queryNorm || !docNorm) return 0;
  return dot / (Math.sqrt(queryNorm) * Math.sqrt(docNorm));
}

function semanticSearch(question: string, posts: InstagramPost[]) {
  const docs = posts.map((post) => ({ post, terms: tokenize(buildPostText(post)) }));
  const queryTerms = tokenize(question);
  const documentFrequency = new Map<string, number>();

  docs.forEach(({ terms }) => {
    new Set(terms).forEach((term) => documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1));
  });

  const idf = new Map<string, number>();
  documentFrequency.forEach((frequency, term) => {
    idf.set(term, Math.log((posts.length + 1) / (frequency + 1)) + 1);
  });

  return docs
    .map(({ post, terms }) => ({ post, score: cosineScore(queryTerms, terms, idf) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function answerSummary(posts: InstagramPost[]) {
  const totalViews = posts.reduce((sum, post) => sum + post.views, 0);
  const totalReach = posts.reduce((sum, post) => sum + post.reach, 0);
  const totalInteractions = posts.reduce((sum, post) => sum + post.engagementTotal, 0);
  const avgEngagement = average(posts.map((post) => post.engagementRate));
  const topPost = [...posts].sort((a, b) => b.views - a.views)[0];

  return [
    `Analisei ${posts.length} posts carregados no sistema.`,
    `O conjunto soma ${formatNumber(totalViews)} visualizações, ${formatNumber(totalReach)} de alcance e ${formatNumber(totalInteractions)} interações.`,
    `A taxa média de engajamento é ${formatPercent(avgEngagement)}.`,
    topPost ? `O post mais forte por visualizações foi "${truncate(topPost.description)}", com ${formatNumber(topPost.views)} views.` : '',
  ].filter(Boolean).join('\n\n');
}

function answerTopPosts(question: string, posts: InstagramPost[]) {
  const metric = getMetricFromQuestion(question);
  const top = [...posts].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)).slice(0, 3);
  const label = METRIC_LABELS[metric];

  return [
    `Os 3 melhores posts por ${label}:`,
    ...top.map((post, index) => {
      const value = metric === 'engagementRate' ? formatPercent(post.engagementRate) : formatNumber(metricValue(post, metric));
      return `${index + 1}. ${value} - ${truncate(post.description)}`;
    }),
    '',
    'Eu usaria esses posts como referência de formato, gancho inicial e tema para os próximos conteúdos.',
  ].join('\n');
}

function answerDayOrHour(question: string, posts: InstagramPost[]) {
  const metric = getMetricFromQuestion(question);
  const q = normalize(question);
  const byHour = q.includes('hora') || q.includes('horario') || q.includes('periodo');
  const grouped = groupBy(posts, (post) => (byHour ? String(post.hour).padStart(2, '0') : post.dayName));
  const ranking = Object.entries(grouped)
    .map(([label, items]) => ({
      label,
      count: items.length,
      avg: average(items.map((post) => metricValue(post, metric))),
      avgViews: average(items.map((post) => post.views)),
      avgEngagement: average(items.map((post) => post.engagementRate)),
    }))
    .sort((a, b) => b.avg - a.avg);

  const best = ranking[0];
  const second = ranking[1];
  if (!best) return 'Não encontrei posts suficientes para analisar dia ou horário.';

  const suffix = byHour ? 'h' : '';
  return [
    `O melhor ${byHour ? 'horário' : 'dia'} por ${METRIC_LABELS[metric]} é ${best.label}${suffix}, com média de ${metric === 'engagementRate' ? formatPercent(best.avg) : formatNumber(best.avg)} em ${best.count} posts.`,
    second ? `A segunda melhor faixa é ${second.label}${suffix}, com média de ${metric === 'engagementRate' ? formatPercent(second.avg) : formatNumber(second.avg)}.` : '',
    `Como leitura prática: priorize ${best.label}${suffix} para conteúdos importantes e valide por mais publicações antes de tornar isso uma regra fixa.`,
  ].filter(Boolean).join('\n\n');
}

function answerContentType(posts: InstagramPost[]) {
  const grouped = groupBy(posts, (post) => post.postType || 'Desconhecido');
  const ranking = Object.entries(grouped)
    .map(([label, items]) => ({
      label,
      count: items.length,
      avgViews: average(items.map((post) => post.views)),
      avgEngagement: average(items.map((post) => post.engagementRate)),
    }))
    .sort((a, b) => b.avgViews - a.avgViews);

  return [
    'Performance por tipo de conteúdo:',
    ...ranking.slice(0, 5).map((item) => (
      `- ${item.label}: ${formatNumber(item.avgViews)} views médias, ${formatPercent(item.avgEngagement)} de engajamento médio em ${item.count} posts`
    )),
    '',
    'O formato no topo merece mais testes, mas eu cruzaria isso com tema e horário antes de mudar toda a grade editorial.',
  ].join('\n');
}

function answerMetric(question: string, posts: InstagramPost[]) {
  const metric = getMetricFromQuestion(question);
  const values = posts.map((post) => metricValue(post, metric));
  const best = [...posts].sort((a, b) => metricValue(b, metric) - metricValue(a, metric))[0];

  return [
    `Para ${METRIC_LABELS[metric]}, a média atual é ${metric === 'engagementRate' ? formatPercent(average(values)) : formatNumber(average(values))}.`,
    best ? `O pico foi "${truncate(best.description)}", com ${metric === 'engagementRate' ? formatPercent(best.engagementRate) : formatNumber(metricValue(best, metric))}.` : '',
    'Se o objetivo for crescer essa métrica, eu começaria replicando tema, duração, CTA e horário dos posts acima da média.',
  ].filter(Boolean).join('\n\n');
}

function answerSemantic(question: string, posts: InstagramPost[]) {
  const results = semanticSearch(question, posts);
  if (!results.length) {
    return [
      'Não encontrei uma correspondência semântica forte nas legendas carregadas.',
      'Posso responder melhor se você perguntar por métrica, formato, dia, horário, melhores posts, engajamento ou palavras-chave específicas que aparecem nas legendas.',
    ].join('\n\n');
  }

  const metric = getMetricFromQuestion(question);
  const avgMetric = average(results.map(({ post }) => metricValue(post, metric)));
  const best = [...results].sort((a, b) => metricValue(b.post, metric) - metricValue(a.post, metric))[0];

  return [
    `Encontrei ${results.length} posts semanticamente próximos da sua pergunta.`,
    `Nesse grupo, a média de ${METRIC_LABELS[metric]} é ${metric === 'engagementRate' ? formatPercent(avgMetric) : formatNumber(avgMetric)}.`,
    best ? `O melhor exemplo é "${truncate(best.post.description)}", com ${metric === 'engagementRate' ? formatPercent(best.post.engagementRate) : formatNumber(metricValue(best.post, metric))}.` : '',
    '',
    'Evidências usadas:',
    ...results.slice(0, 3).map(({ post, score }, index) => (
      `${index + 1}. Similaridade ${(score * 100).toFixed(0)}% - ${truncate(post.description)}`
    )),
  ].filter(Boolean).join('\n');
}

export function answerWithLocalRag(question: string, posts: InstagramPost[], history: RagMessage[] = []) {
  const q = normalize(question);

  if (!posts.length) {
    return 'Ainda não há posts carregados para consulta. Importe um CSV/Excel ou aguarde o carregamento local para eu analisar os dados.';
  }

  if (/^(oi|ola|olá|bom dia|boa tarde|boa noite|help|ajuda)\b/.test(q)) {
    return [
      'Estou pronto. Eu respondo com RAG local usando os posts carregados no dashboard, sem depender do Supabase.',
      'Você pode perguntar coisas como: melhores posts, melhor horário, dia com mais engajamento, tipo de conteúdo, salvamentos, alcance, comentários ou qualquer tema das legendas.',
    ].join('\n\n');
  }

  if (q.includes('resumo') || q.includes('geral') || q.includes('performance')) return answerSummary(posts);
  if (q.includes('melhor horario') || q.includes('horario') || q.includes('hora') || q.includes('melhor dia') || q.includes('dia')) return answerDayOrHour(question, posts);
  if (q.includes('top') || q.includes('melhor post') || q.includes('maior') || q.includes('ranking')) return answerTopPosts(question, posts);
  if (q.includes('tipo') || q.includes('formato') || q.includes('reel') || q.includes('video') || q.includes('carrossel')) return answerContentType(posts);
  if (q.includes('engaj') || q.includes('alcance') || q.includes('curtida') || q.includes('like') || q.includes('coment') || q.includes('salv') || q.includes('compart') || q.includes('view') || q.includes('visualiz')) return answerMetric(question, posts);

  const lastUserQuestion = [...history].reverse().find((message) => message.role === 'user')?.content;
  const expandedQuestion = lastUserQuestion ? `${lastUserQuestion} ${question}` : question;
  return answerSemantic(expandedQuestion, posts);
}
