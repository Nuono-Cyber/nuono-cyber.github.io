import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Send, 
  X, 
  Bot, 
  User,
  Loader2,
  Sparkles,
  TrendingUp,
  Clock,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InstagramPost } from '@/types/instagram';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBotProps {
  posts: InstagramPost[];
  summary: {
    totalPosts: number;
    totalViews: number;
    totalReach: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalSaves: number;
    totalFollows: number;
    avgViews: number;
    avgReach: number;
    avgLikes: number;
    avgEngagement: number;
  } | null;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-chat`;

const suggestedQuestions = [
  { icon: TrendingUp, text: "Qual meu melhor tipo de conteúdo?" },
  { icon: Clock, text: "Qual o melhor horário para postar?" },
  { icon: Sparkles, text: "Onde posso melhorar minha estratégia?" },
  { icon: HelpCircle, text: "Quais posts performaram mal e por quê?" },
];

export function ChatBot({ posts, summary }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Prepare stats for the API
  const preparePostsData = () => {
    const typeStats: Record<string, { count: number; avgViews: number; avgEngagement: number }> = {};
    const dayStats: Record<string, { count: number; avgViews: number }> = {};
    const hourStats: Record<number, { count: number; avgViews: number }> = {};

    posts.forEach(post => {
      // Type stats
      if (!typeStats[post.postType]) {
        typeStats[post.postType] = { count: 0, avgViews: 0, avgEngagement: 0 };
      }
      typeStats[post.postType].count++;
      typeStats[post.postType].avgViews += post.views;
      typeStats[post.postType].avgEngagement += post.engagementRate;

      // Day stats
      if (!dayStats[post.dayName]) {
        dayStats[post.dayName] = { count: 0, avgViews: 0 };
      }
      dayStats[post.dayName].count++;
      dayStats[post.dayName].avgViews += post.views;

      // Hour stats
      if (!hourStats[post.hour]) {
        hourStats[post.hour] = { count: 0, avgViews: 0 };
      }
      hourStats[post.hour].count++;
      hourStats[post.hour].avgViews += post.views;
    });

    // Calculate averages
    Object.keys(typeStats).forEach(type => {
      typeStats[type].avgViews = typeStats[type].avgViews / typeStats[type].count;
      typeStats[type].avgEngagement = typeStats[type].avgEngagement / typeStats[type].count;
    });

    Object.keys(dayStats).forEach(day => {
      dayStats[day].avgViews = dayStats[day].avgViews / dayStats[day].count;
    });

    Object.keys(hourStats).forEach(hour => {
      hourStats[Number(hour)].avgViews = hourStats[Number(hour)].avgViews / hourStats[Number(hour)].count;
    });

    return {
      ...summary,
      posts: posts.map(p => ({
        type: p.postType,
        publishedAt: p.publishedAt.toLocaleDateString('pt-BR'),
        views: p.views,
        reach: p.reach,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        saves: p.saves,
        follows: p.follows,
        engagementRate: p.engagementRate,
        duration: p.duration,
        period: p.period,
        dayOfWeek: p.dayName,
        hour: p.hour,
        description: p.description,
      })),
      typeStats,
      dayStats,
      hourStats,
    };
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    
    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const postsData = preparePostsData();
      
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMsg],
          postsData,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao enviar mensagem');
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error('Chat error:', e);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Desculpe, ocorreu um erro: ${e instanceof Error ? e.message : 'Erro desconhecido'}. Tente novamente.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg instagram-gradient hover:scale-110 transition-transform",
          isOpen && "hidden"
        )}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] flex flex-col shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="p-4 border-b border-border/50 instagram-gradient">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Assistente Analytics</h3>
                  <p className="text-xs text-white/80">Pergunte sobre seus dados</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <Bot className="h-12 w-12 mx-auto text-primary/60 mb-3" />
                  <h4 className="font-medium text-foreground">Olá! 👋</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sou seu assistente de analytics. Pergunte qualquer coisa sobre seus dados do Instagram!
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Sugestões
                  </p>
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(question.text)}
                      disabled={isLoading}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors text-left group disabled:opacity-50"
                    >
                      <question.icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-foreground">{question.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground'
                    )}>
                      {message.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div className={cn(
                      "py-2 px-3 rounded-lg max-w-[80%]",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-secondary text-secondary-foreground rounded-tl-none'
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3">
                    <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="py-2 px-3 rounded-lg bg-secondary text-secondary-foreground rounded-tl-none">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua pergunta..."
                disabled={isLoading}
                className="flex-1 bg-secondary/50"
              />
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                size="icon"
                className="instagram-gradient"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
