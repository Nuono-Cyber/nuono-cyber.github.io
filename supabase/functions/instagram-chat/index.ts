import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeMessages(input: unknown) {
  if (!Array.isArray(input)) return null;

  const messages = input.slice(-MAX_MESSAGES).map((message) => {
    if (!message || typeof message !== "object") return null;

    const record = message as Record<string, unknown>;
    const role = record.role;
    const content = record.content;

    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;

    return {
      role,
      content: content.slice(0, MAX_MESSAGE_LENGTH),
    };
  });

  if (messages.some((message) => message === null)) return null;
  return messages;
}

// Advanced analytics computations on the full dataset
function computeAdvancedAnalytics(posts: any[]) {
  if (!posts || posts.length === 0) return null;

  const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // Enrich posts with derived fields
  const enriched = posts.map(p => {
    const publishedAt = p.published_at ? new Date(p.published_at) : null;
    const views = p.views || 0;
    const reach = p.reach || 0;
    const likes = p.likes || 0;
    const comments = p.comments || 0;
    const shares = p.shares || 0;
    const saves = p.saves || 0;
    const follows = p.follows || 0;
    const duration = p.duration || 0;
    const description = p.description || '';
    const engagementTotal = likes + comments + shares + saves;
    const engagementRate = reach > 0 ? (engagementTotal / reach) * 100 : 0;
    const reachRate = views > 0 ? (reach / views) * 100 : 0;
    const followerConversion = reach > 0 ? (follows / reach) * 100 : 0;

    return {
      ...p,
      views, reach, likes, comments, shares, saves, follows, duration, description,
      engagementTotal, engagementRate, reachRate, followerConversion,
      publishedAt,
      dayOfWeek: publishedAt ? publishedAt.getDay() : 0,
      dayName: publishedAt ? DAY_NAMES[publishedAt.getDay()] : 'N/A',
      hour: publishedAt ? publishedAt.getHours() : 0,
      postType: p.post_type || 'Desconhecido',
      hashtagCount: (description.match(/#\w+/g) || []).length,
      descriptionLength: description.length,
      hasEmoji: /[\u{1F300}-\u{1F9FF}]/u.test(description),
    };
  }).filter(p => p.publishedAt);

  // Sort by date desc
  enriched.sort((a: any, b: any) => b.publishedAt.getTime() - a.publishedAt.getTime());

  const totalPosts = enriched.length;
  const totalViews = enriched.reduce((s: number, p: any) => s + p.views, 0);
  const totalReach = enriched.reduce((s: number, p: any) => s + p.reach, 0);
  const totalLikes = enriched.reduce((s: number, p: any) => s + p.likes, 0);
  const totalComments = enriched.reduce((s: number, p: any) => s + p.comments, 0);
  const totalShares = enriched.reduce((s: number, p: any) => s + p.shares, 0);
  const totalSaves = enriched.reduce((s: number, p: any) => s + p.saves, 0);
  const totalFollows = enriched.reduce((s: number, p: any) => s + p.follows, 0);
  const avgEngagement = enriched.reduce((s: number, p: any) => s + p.engagementRate, 0) / totalPosts;
  const avgViews = totalViews / totalPosts;
  const avgReach = totalReach / totalPosts;

  // Date range
  const firstDate = enriched[enriched.length - 1]?.publishedAt;
  const lastDate = enriched[0]?.publishedAt;
  const dayRange = firstDate && lastDate ? Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / 86400000)) : 1;
  const postsPerWeek = (totalPosts / dayRange) * 7;

  // Performance by type
  const typeMap: Record<string, any[]> = {};
  enriched.forEach((p: any) => {
    if (!typeMap[p.postType]) typeMap[p.postType] = [];
    typeMap[p.postType].push(p);
  });
  const typeStats = Object.entries(typeMap).map(([type, posts]: [string, any[]]) => ({
    type,
    count: posts.length,
    avgViews: posts.reduce((s, p) => s + p.views, 0) / posts.length,
    avgReach: posts.reduce((s, p) => s + p.reach, 0) / posts.length,
    avgEngagement: posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length,
    avgLikes: posts.reduce((s, p) => s + p.likes, 0) / posts.length,
    avgShares: posts.reduce((s, p) => s + p.shares, 0) / posts.length,
    avgSaves: posts.reduce((s, p) => s + p.saves, 0) / posts.length,
    avgFollows: posts.reduce((s, p) => s + p.follows, 0) / posts.length,
    avgFollowerConversion: posts.reduce((s, p) => s + p.followerConversion, 0) / posts.length,
  })).sort((a, b) => b.avgViews - a.avgViews);

  // Performance by day
  const dayMap: Record<string, any[]> = {};
  enriched.forEach((p: any) => {
    if (!dayMap[p.dayName]) dayMap[p.dayName] = [];
    dayMap[p.dayName].push(p);
  });
  const dayStats = Object.entries(dayMap).map(([day, posts]: [string, any[]]) => ({
    day,
    count: posts.length,
    avgViews: posts.reduce((s, p) => s + p.views, 0) / posts.length,
    avgEngagement: posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length,
    avgFollows: posts.reduce((s, p) => s + p.follows, 0) / posts.length,
  })).sort((a, b) => b.avgViews - a.avgViews);

  // Performance by hour
  const hourMap: Record<number, any[]> = {};
  enriched.forEach((p: any) => {
    if (!hourMap[p.hour]) hourMap[p.hour] = [];
    hourMap[p.hour].push(p);
  });
  const hourStats = Object.entries(hourMap).map(([hour, posts]: [string, any[]]) => ({
    hour: Number(hour),
    count: posts.length,
    avgViews: posts.reduce((s, p) => s + p.views, 0) / posts.length,
    avgEngagement: posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length,
  })).sort((a, b) => b.avgViews - a.avgViews);

  // Top and bottom posts
  const topByViews = [...enriched].sort((a: any, b: any) => b.views - a.views).slice(0, 5);
  const bottomByViews = [...enriched].sort((a: any, b: any) => a.views - b.views).slice(0, 5);
  const topByEngagement = [...enriched].sort((a: any, b: any) => b.engagementRate - a.engagementRate).slice(0, 5);
  const topByFollows = [...enriched].sort((a: any, b: any) => b.follows - a.follows).slice(0, 5);
  const topByShares = [...enriched].sort((a: any, b: any) => b.shares - a.shares).slice(0, 5);

  // Content patterns
  const withEmoji = enriched.filter((p: any) => p.hasEmoji);
  const withoutEmoji = enriched.filter((p: any) => !p.hasEmoji);
  const emojiImpact = withEmoji.length > 0 && withoutEmoji.length > 0 ? {
    withEmojiAvgViews: withEmoji.reduce((s: number, p: any) => s + p.views, 0) / withEmoji.length,
    withoutEmojiAvgViews: withoutEmoji.reduce((s: number, p: any) => s + p.views, 0) / withoutEmoji.length,
  } : null;

  // Duration analysis (for videos)
  const videoPosts = enriched.filter((p: any) => p.duration > 0);
  let durationAnalysis = null;
  if (videoPosts.length >= 4) {
    const shortPosts = videoPosts.filter((p: any) => p.duration <= 15);
    const medPosts = videoPosts.filter((p: any) => p.duration > 15 && p.duration <= 30);
    const longPosts = videoPosts.filter((p: any) => p.duration > 30 && p.duration <= 60);
    const veryLongPosts = videoPosts.filter((p: any) => p.duration > 60);
    durationAnalysis = {
      '0-15s': shortPosts.length > 0 ? { count: shortPosts.length, avgViews: shortPosts.reduce((s: number, p: any) => s + p.views, 0) / shortPosts.length } : null,
      '16-30s': medPosts.length > 0 ? { count: medPosts.length, avgViews: medPosts.reduce((s: number, p: any) => s + p.views, 0) / medPosts.length } : null,
      '31-60s': longPosts.length > 0 ? { count: longPosts.length, avgViews: longPosts.reduce((s: number, p: any) => s + p.views, 0) / longPosts.length } : null,
      '60s+': veryLongPosts.length > 0 ? { count: veryLongPosts.length, avgViews: veryLongPosts.reduce((s: number, p: any) => s + p.views, 0) / veryLongPosts.length } : null,
    };
  }

  // Hashtag analysis
  const withHashtags = enriched.filter((p: any) => p.hashtagCount > 0);
  const withoutHashtags = enriched.filter((p: any) => p.hashtagCount === 0);
  const hashtagImpact = withHashtags.length > 0 && withoutHashtags.length > 0 ? {
    withHashtagAvgViews: withHashtags.reduce((s: number, p: any) => s + p.views, 0) / withHashtags.length,
    withoutHashtagAvgViews: withoutHashtags.reduce((s: number, p: any) => s + p.views, 0) / withoutHashtags.length,
    avgHashtagCount: withHashtags.reduce((s: number, p: any) => s + p.hashtagCount, 0) / withHashtags.length,
  } : null;

  // Caption length analysis
  const shortCaptions = enriched.filter((p: any) => p.descriptionLength <= 100);
  const medCaptions = enriched.filter((p: any) => p.descriptionLength > 100 && p.descriptionLength <= 300);
  const longCaptions = enriched.filter((p: any) => p.descriptionLength > 300);
  const captionLengthAnalysis = {
    short: shortCaptions.length > 0 ? { count: shortCaptions.length, avgViews: shortCaptions.reduce((s: number, p: any) => s + p.views, 0) / shortCaptions.length } : null,
    medium: medCaptions.length > 0 ? { count: medCaptions.length, avgViews: medCaptions.reduce((s: number, p: any) => s + p.views, 0) / medCaptions.length } : null,
    long: longCaptions.length > 0 ? { count: longCaptions.length, avgViews: longCaptions.reduce((s: number, p: any) => s + p.views, 0) / longCaptions.length } : null,
  };

  // Recent trend (last 10 vs previous 10)
  let recentTrend = null;
  if (enriched.length >= 20) {
    const recent = enriched.slice(0, 10);
    const previous = enriched.slice(10, 20);
    recentTrend = {
      recentAvgViews: recent.reduce((s: number, p: any) => s + p.views, 0) / 10,
      previousAvgViews: previous.reduce((s: number, p: any) => s + p.views, 0) / 10,
      recentAvgEngagement: recent.reduce((s: number, p: any) => s + p.engagementRate, 0) / 10,
      previousAvgEngagement: previous.reduce((s: number, p: any) => s + p.engagementRate, 0) / 10,
    };
  }

  // Build post details for context (ALL posts, not just 20)
  const postDetails = enriched.map((p: any) => ({
    type: p.postType,
    date: p.publishedAt?.toLocaleDateString('pt-BR'),
    hour: p.hour,
    day: p.dayName,
    views: p.views,
    reach: p.reach,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    saves: p.saves,
    follows: p.follows,
    engagementRate: p.engagementRate.toFixed(2),
    followerConversion: p.followerConversion.toFixed(3),
    duration: p.duration,
    descriptionLength: p.descriptionLength,
    hashtagCount: p.hashtagCount,
    hasEmoji: p.hasEmoji,
    descriptionPreview: p.description?.substring(0, 150),
  }));

  return {
    summary: {
      totalPosts, totalViews, totalReach, totalLikes, totalComments,
      totalShares, totalSaves, totalFollows, avgViews: avgViews.toFixed(0),
      avgReach: avgReach.toFixed(0), avgEngagement: avgEngagement.toFixed(2),
      postsPerWeek: postsPerWeek.toFixed(1), dayRange,
      dateRange: `${firstDate?.toLocaleDateString('pt-BR')} - ${lastDate?.toLocaleDateString('pt-BR')}`,
    },
    typeStats,
    dayStats,
    hourStats: hourStats.slice(0, 8), // top 8 hours
    topByViews: topByViews.map(p => ({ type: p.postType, date: p.publishedAt?.toLocaleDateString('pt-BR'), views: p.views, engagement: p.engagementRate.toFixed(2), desc: p.description?.substring(0, 80) })),
    bottomByViews: bottomByViews.map(p => ({ type: p.postType, date: p.publishedAt?.toLocaleDateString('pt-BR'), views: p.views, engagement: p.engagementRate.toFixed(2), desc: p.description?.substring(0, 80) })),
    topByEngagement: topByEngagement.map(p => ({ type: p.postType, date: p.publishedAt?.toLocaleDateString('pt-BR'), views: p.views, engagement: p.engagementRate.toFixed(2), desc: p.description?.substring(0, 80) })),
    topByFollows: topByFollows.map(p => ({ type: p.postType, date: p.publishedAt?.toLocaleDateString('pt-BR'), follows: p.follows, views: p.views, desc: p.description?.substring(0, 80) })),
    topByShares: topByShares.map(p => ({ type: p.postType, date: p.publishedAt?.toLocaleDateString('pt-BR'), shares: p.shares, views: p.views, desc: p.description?.substring(0, 80) })),
    emojiImpact,
    hashtagImpact,
    captionLengthAnalysis,
    durationAnalysis,
    recentTrend,
    allPosts: postDetails,
  };
}

function buildSystemPrompt(analytics: any) {
  const s = analytics.summary;
  return `Você é um consultor de estratégia de Instagram altamente especializado. Você tem acesso COMPLETO e em tempo real a todos os dados de performance do perfil do usuário, direto do banco de dados.

## SEU PAPEL
- Você é um estrategista digital com expertise em crescimento orgânico no Instagram
- Você dá conselhos práticos, acionáveis e baseados nos dados REAIS do usuário
- Você faz análises profundas cruzando múltiplas variáveis
- Você sugere estratégias de conteúdo, frequência, horários e formatos

## DADOS COMPLETOS DO PERFIL

### Resumo Geral
- Total de posts: ${s.totalPosts}
- Período: ${s.dateRange} (${s.dayRange} dias)
- Frequência: ~${s.postsPerWeek} posts/semana
- Views totais: ${Number(s.totalViews).toLocaleString('pt-BR')}
- Alcance total: ${Number(s.totalReach).toLocaleString('pt-BR')}
- Curtidas totais: ${Number(s.totalLikes).toLocaleString('pt-BR')}
- Comentários totais: ${Number(s.totalComments).toLocaleString('pt-BR')}
- Compartilhamentos totais: ${Number(s.totalShares).toLocaleString('pt-BR')}
- Salvamentos totais: ${Number(s.totalSaves).toLocaleString('pt-BR')}
- Seguidores ganhos: ${Number(s.totalFollows).toLocaleString('pt-BR')}
- Média views/post: ${Number(s.avgViews).toLocaleString('pt-BR')}
- Média alcance/post: ${Number(s.avgReach).toLocaleString('pt-BR')}
- Taxa engajamento média: ${s.avgEngagement}%

### Performance por Tipo de Conteúdo
${analytics.typeStats.map((t: any) => `- **${t.type}** (${t.count} posts): Média ${t.avgViews.toFixed(0)} views, ${t.avgEngagement.toFixed(2)}% engajamento, ${t.avgFollows.toFixed(1)} seguidores/post, ${t.avgShares.toFixed(1)} compartilhamentos/post`).join('\n')}

### Melhores Dias (por views)
${analytics.dayStats.map((d: any) => `- **${d.day}**: ${d.count} posts, média ${d.avgViews.toFixed(0)} views, ${d.avgEngagement.toFixed(2)}% engajamento`).join('\n')}

### Melhores Horários (por views)
${analytics.hourStats.map((h: any) => `- **${h.hour}h**: ${h.count} posts, média ${h.avgViews.toFixed(0)} views, ${h.avgEngagement.toFixed(2)}% engajamento`).join('\n')}

### Top 5 Posts (por Views)
${analytics.topByViews.map((p: any, i: number) => `${i+1}. ${p.type} (${p.date}): ${Number(p.views).toLocaleString('pt-BR')} views, ${p.engagement}% eng. "${p.desc}..."`).join('\n')}

### Top 5 Posts (por Engajamento)
${analytics.topByEngagement.map((p: any, i: number) => `${i+1}. ${p.type} (${p.date}): ${p.engagement}% engajamento, ${Number(p.views).toLocaleString('pt-BR')} views. "${p.desc}..."`).join('\n')}

### Top 5 Posts (por Seguidores Ganhos)
${analytics.topByFollows.map((p: any, i: number) => `${i+1}. ${p.type} (${p.date}): ${p.follows} seguidores, ${Number(p.views).toLocaleString('pt-BR')} views. "${p.desc}..."`).join('\n')}

### Top 5 Posts (por Compartilhamentos)
${analytics.topByShares.map((p: any, i: number) => `${i+1}. ${p.type} (${p.date}): ${p.shares} shares, ${Number(p.views).toLocaleString('pt-BR')} views. "${p.desc}..."`).join('\n')}

### Posts com Pior Performance
${analytics.bottomByViews.map((p: any, i: number) => `${i+1}. ${p.type} (${p.date}): ${Number(p.views).toLocaleString('pt-BR')} views, ${p.engagement}% eng. "${p.desc}..."`).join('\n')}

### Análise de Emojis
${analytics.emojiImpact ? `- Com emoji: média ${analytics.emojiImpact.withEmojiAvgViews.toFixed(0)} views\n- Sem emoji: média ${analytics.emojiImpact.withoutEmojiAvgViews.toFixed(0)} views\n- Diferença: ${((analytics.emojiImpact.withEmojiAvgViews / analytics.emojiImpact.withoutEmojiAvgViews - 1) * 100).toFixed(0)}%` : 'Dados insuficientes'}

### Análise de Hashtags
${analytics.hashtagImpact ? `- Com hashtags: média ${analytics.hashtagImpact.withHashtagAvgViews.toFixed(0)} views (média ${analytics.hashtagImpact.avgHashtagCount.toFixed(1)} hashtags)\n- Sem hashtags: média ${analytics.hashtagImpact.withoutHashtagAvgViews.toFixed(0)} views` : 'Dados insuficientes'}

### Análise de Tamanho de Legenda
${analytics.captionLengthAnalysis.short ? `- Curta (≤100 chars): ${analytics.captionLengthAnalysis.short.count} posts, média ${analytics.captionLengthAnalysis.short.avgViews.toFixed(0)} views` : ''}
${analytics.captionLengthAnalysis.medium ? `- Média (101-300 chars): ${analytics.captionLengthAnalysis.medium.count} posts, média ${analytics.captionLengthAnalysis.medium.avgViews.toFixed(0)} views` : ''}
${analytics.captionLengthAnalysis.long ? `- Longa (300+ chars): ${analytics.captionLengthAnalysis.long.count} posts, média ${analytics.captionLengthAnalysis.long.avgViews.toFixed(0)} views` : ''}

### Análise de Duração (Vídeos)
${analytics.durationAnalysis ? Object.entries(analytics.durationAnalysis).filter(([_, v]) => v !== null).map(([k, v]: [string, any]) => `- ${k}: ${v.count} posts, média ${v.avgViews.toFixed(0)} views`).join('\n') : 'Dados insuficientes'}

### Tendência Recente
${analytics.recentTrend ? `- Últimos 10 posts: média ${analytics.recentTrend.recentAvgViews.toFixed(0)} views, ${analytics.recentTrend.recentAvgEngagement.toFixed(2)}% eng.\n- 10 anteriores: média ${analytics.recentTrend.previousAvgViews.toFixed(0)} views, ${analytics.recentTrend.previousAvgEngagement.toFixed(2)}% eng.\n- Tendência de views: ${analytics.recentTrend.recentAvgViews > analytics.recentTrend.previousAvgViews ? '📈 Crescendo' : '📉 Caindo'} (${((analytics.recentTrend.recentAvgViews / analytics.recentTrend.previousAvgViews - 1) * 100).toFixed(0)}%)` : 'Menos de 20 posts para comparar tendências'}

## DETALHES DE CADA POST (${analytics.allPosts.length} posts)
${analytics.allPosts.map((p: any, i: number) => `[${i+1}] ${p.type} | ${p.date} ${p.day} ${p.hour}h | ${p.views} views | ${p.reach} alcance | ❤️${p.likes} 💬${p.comments} 🔄${p.shares} 💾${p.saves} ➕${p.follows} | Eng:${p.engagementRate}% | Dur:${p.duration}s | #${p.hashtagCount} | ${p.hasEmoji ? '😀' : '❌emoji'} | "${p.descriptionPreview}"`).join('\n')}

## INSTRUÇÕES DE COMPORTAMENTO

1. **Sempre responda em português brasileiro**, de forma profissional mas acessível
2. **Baseie TUDO nos dados acima** - nunca invente métricas
3. **Seja estratégico**: não apenas descreva os dados, INTERPRETE-os e dê recomendações acionáveis
4. **Use formatação markdown**: títulos, listas, **negrito**, tabelas quando útil
5. **Quando o usuário perguntar sobre estratégia**: cruze dados de tipo de conteúdo + horário + dia + elementos textuais para dar recomendações completas
6. **Se perguntar "o que postar"**: sugira tipo, horário, dia, duração, estilo de legenda, baseado nos dados de melhor performance
7. **Compare padrões**: identifique o que posts de sucesso têm em comum vs posts fracos
8. **Identifique oportunidades**: dias/horários pouco explorados com alto potencial
9. **Use emojis moderadamente** para tornar a conversa agradável
10. **Quando relevante, sugira testes A/B** e experimentos baseados nos dados
11. **Dê diagnósticos honestos**: se algo vai mal, explique por quê e como melhorar

## EXEMPLOS DE ANÁLISES QUE VOCÊ PODE FAZER
- Diagnóstico completo do perfil com pontos fortes e fracos
- Estratégia semanal personalizada (quando postar, qual formato, que tipo de legenda)
- Análise de por que um post específico viralizou ou flopou
- Comparação entre formatos de conteúdo com recomendações
- Sugestões de otimização de legenda baseada nos dados
- Previsão de tendências e o que pode funcionar no futuro
- Auditoria de frequência de postagem`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || '';
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || '';
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment is not configured");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { messages: rawMessages } = await req.json();
    const messages = sanitizeMessages(rawMessages);
    if (!messages) {
      return jsonResponse({ error: "Invalid messages payload" }, 400);
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log("RAG Chat: Fetching all posts from database...");

    // Fetch posts with the caller's JWT so database RLS is enforced.
    const { data: posts, error: dbError } = await supabase
      .from('instagram_posts')
      .select('*')
      .order('published_at', { ascending: false });

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Erro ao buscar dados do banco");
    }

    console.log(`RAG Chat: Fetched ${posts?.length || 0} posts, computing analytics...`);

    const analytics = computeAdvancedAnalytics(posts || []);
    if (!analytics) {
      return jsonResponse({ error: "Nenhum dado encontrado no banco de dados." }, 400);
    }

    const systemPrompt = buildSystemPrompt(analytics);
    console.log(`RAG Chat: System prompt built (${systemPrompt.length} chars), calling AI...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }, 429);
      }
      if (response.status === 402) {
        return jsonResponse({ error: "Créditos de IA esgotados. Adicione mais créditos." }, 402);
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return jsonResponse({ error: "Erro ao processar sua pergunta" }, 500);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat function error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
