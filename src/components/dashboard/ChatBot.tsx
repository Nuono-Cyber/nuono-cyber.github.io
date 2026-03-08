import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { 
  MessageCircle, Send, X, Bot, User, Loader2, Sparkles,
  TrendingUp, Clock, HelpCircle, Target, Zap, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-chat`;

const suggestedQuestions = [
  { icon: Target, text: "Faça um diagnóstico completo do meu perfil" },
  { icon: Zap, text: "Crie uma estratégia semanal de postagem para mim" },
  { icon: TrendingUp, text: "Quais padrões meus posts virais têm em comum?" },
  { icon: BarChart3, text: "Compare meus formatos de conteúdo e diga onde investir" },
  { icon: Clock, text: "Qual o melhor horário e dia para eu postar?" },
  { icon: Sparkles, text: "O que posso melhorar para crescer mais rápido?" },
  { icon: HelpCircle, text: "Analise meus piores posts e diga o que evitar" },
];

export function ChatBot() {
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
      // Only send conversation messages, data is fetched server-side via RAG
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
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
          if (jsonStr === '[DONE]') { streamDone = true; break; }

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
          "fixed bottom-6 right-24 z-50 h-14 w-14 rounded-full shadow-lg instagram-gradient hover:scale-110 transition-transform",
          isOpen && "hidden"
        )}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-[460px] z-50 w-[420px] h-[650px] flex flex-col shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="p-4 border-b border-border/50 instagram-gradient">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Estrategista IA</h3>
                  <p className="text-xs text-white/80">Consultor de crescimento • RAG ativo</p>
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
                <div className="text-center py-3">
                  <Bot className="h-10 w-10 mx-auto text-primary/60 mb-2" />
                  <h4 className="font-medium text-foreground">Olá! 👋</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sou seu consultor de estratégia com acesso direto a <strong>todos seus dados</strong>. Posso analisar padrões, sugerir estratégias e diagnosticar seu perfil.
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                    Comece por aqui
                  </p>
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(question.text)}
                      disabled={isLoading}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors text-left group disabled:opacity-50"
                    >
                      <question.icon className="h-3.5 w-3.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-xs text-foreground">{question.text}</span>
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
                      "flex gap-2.5",
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded-lg shrink-0 h-fit",
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground'
                    )}>
                      {message.role === 'user' ? (
                        <User className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className={cn(
                      "py-2 px-3 rounded-lg max-w-[85%]",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-secondary text-secondary-foreground rounded-tl-none'
                    )}>
                      {message.role === 'assistant' ? (
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-medium [&_table]:text-xs [&_th]:px-2 [&_td]:px-2">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-2.5">
                    <div className="p-1.5 rounded-lg bg-secondary text-secondary-foreground">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="py-2 px-3 rounded-lg bg-secondary text-secondary-foreground rounded-tl-none flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="text-xs text-muted-foreground">Analisando seus dados...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border/50">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre estratégia, métricas..."
                disabled={isLoading}
                className="flex-1 bg-secondary/50 text-sm"
              />
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                size="icon"
                className="instagram-gradient shrink-0"
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
