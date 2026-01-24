import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, postsData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Received chat request with", messages.length, "messages");
    console.log("Posts data summary:", postsData ? `${postsData.totalPosts} posts` : "No data");

    // Create a comprehensive system prompt with the Instagram data context
    const systemPrompt = `Você é um assistente especializado em análise de dados de Instagram. Você tem acesso aos dados de performance do perfil @nadsongl e deve ajudar o usuário a entender suas métricas e melhorar sua estratégia de conteúdo.

## DADOS DO PERFIL

Resumo Geral:
- Total de posts analisados: ${postsData?.totalPosts || 0}
- Total de visualizações: ${postsData?.totalViews?.toLocaleString('pt-BR') || 0}
- Total de alcance: ${postsData?.totalReach?.toLocaleString('pt-BR') || 0}
- Total de curtidas: ${postsData?.totalLikes?.toLocaleString('pt-BR') || 0}
- Total de comentários: ${postsData?.totalComments?.toLocaleString('pt-BR') || 0}
- Total de compartilhamentos: ${postsData?.totalShares?.toLocaleString('pt-BR') || 0}
- Total de salvamentos: ${postsData?.totalSaves?.toLocaleString('pt-BR') || 0}
- Novos seguidores gerados: ${postsData?.totalFollows?.toLocaleString('pt-BR') || 0}
- Taxa de engajamento média: ${postsData?.avgEngagement?.toFixed(2) || 0}%
- Média de visualizações por post: ${postsData?.avgViews?.toFixed(0) || 0}
- Média de alcance por post: ${postsData?.avgReach?.toFixed(0) || 0}

## DETALHES DOS POSTS (últimos posts)

${postsData?.posts?.slice(0, 20).map((post: any, index: number) => `
Post ${index + 1}:
- Tipo: ${post.type}
- Data: ${post.publishedAt}
- Visualizações: ${post.views?.toLocaleString('pt-BR')}
- Alcance: ${post.reach?.toLocaleString('pt-BR')}
- Curtidas: ${post.likes}
- Comentários: ${post.comments}
- Compartilhamentos: ${post.shares}
- Salvamentos: ${post.saves}
- Novos seguidores: ${post.follows}
- Taxa de engajamento: ${post.engagementRate?.toFixed(2)}%
- Duração: ${post.duration ? post.duration + 's' : 'N/A'}
- Período: ${post.period}
- Dia da semana: ${post.dayOfWeek}
- Hora: ${post.hour}:00
- Descrição: ${post.description?.substring(0, 100)}...
`).join('') || 'Sem dados disponíveis'}

## ANÁLISES ESTATÍSTICAS

Performance por Tipo de Conteúdo:
${postsData?.typeStats ? Object.entries(postsData.typeStats).map(([type, stats]: [string, any]) => 
  `- ${type}: ${stats.count} posts, média ${stats.avgViews?.toFixed(0)} views, ${stats.avgEngagement?.toFixed(2)}% engajamento`
).join('\n') : 'Dados não disponíveis'}

Melhores Dias para Postar:
${postsData?.dayStats ? Object.entries(postsData.dayStats)
  .sort((a: any, b: any) => b[1].avgViews - a[1].avgViews)
  .slice(0, 3)
  .map(([day, stats]: [string, any]) => `- ${day}: média ${stats.avgViews?.toFixed(0)} views`)
  .join('\n') : 'Dados não disponíveis'}

Melhores Horários:
${postsData?.hourStats ? Object.entries(postsData.hourStats)
  .sort((a: any, b: any) => b[1].avgViews - a[1].avgViews)
  .slice(0, 5)
  .map(([hour, stats]: [string, any]) => `- ${hour}:00: média ${stats.avgViews?.toFixed(0)} views`)
  .join('\n') : 'Dados não disponíveis'}

Posts com Menor Performance (para aprendizado):
${postsData?.posts?.slice().sort((a: any, b: any) => a.views - b.views).slice(0, 3).map((post: any) => 
  `- ${post.type} (${post.publishedAt}): ${post.views} views, ${post.engagementRate?.toFixed(2)}% engajamento`
).join('\n') || 'Dados não disponíveis'}

Posts com Maior Performance:
${postsData?.posts?.slice().sort((a: any, b: any) => b.views - a.views).slice(0, 3).map((post: any) => 
  `- ${post.type} (${post.publishedAt}): ${post.views?.toLocaleString('pt-BR')} views, ${post.engagementRate?.toFixed(2)}% engajamento`
).join('\n') || 'Dados não disponíveis'}

## INSTRUÇÕES

1. Responda sempre em português brasileiro, de forma clara e amigável
2. Baseie suas respostas nos dados fornecidos acima
3. Seja específico com números e datas quando possível
4. Forneça insights acionáveis e recomendações práticas
5. Se o usuário perguntar algo que não está nos dados, explique o que você pode analisar
6. Use emojis ocasionalmente para tornar a conversa mais agradável
7. Quando falar sobre performance ruim, seja construtivo e sugira melhorias
8. Compare métricas entre diferentes tipos de conteúdo quando relevante
9. Destaque padrões e tendências que você identificar nos dados

Exemplos de perguntas que você pode responder:
- "Qual meu melhor tipo de conteúdo?"
- "Qual o melhor horário para postar?"
- "Onde eu poderia melhorar?"
- "Quais posts tiveram pior performance e por quê?"
- "Como está minha taxa de engajamento?"
- "Quantos seguidores eu ganhei?"
- "Qual dia da semana performa melhor?"`;

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
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione mais créditos ao seu workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar sua pergunta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Streaming response from AI gateway");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat function error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
