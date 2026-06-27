import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InstagramPost } from '@/types/instagram';
import { answerWithLocalRag } from '@/utils/localRag';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBotProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  posts: InstagramPost[];
}

const suggestedPrompts = [
  'Quais os melhores posts?',
  'Qual melhor horário?',
  'O que devo melhorar?',
];

export function ChatBot({ isOpen, onOpenChange, posts }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá. Eu analiso os posts carregados com busca semântica local. Pergunte por melhores posts, horários, formatos, engajamento ou temas das legendas.',
    },
  ]);
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
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    window.setTimeout(() => {
      const answer = answerWithLocalRag(messageText, posts, nextMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
      setIsLoading(false);
    }, 220);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      <Button
        aria-label="Abrir assistente IA"
        onClick={() => onOpenChange(true)}
        className={cn(
          'fixed z-50 h-14 w-14 rounded-full shadow-lg transition-[opacity,transform,box-shadow] duration-300 ease-out',
          'bottom-24 right-[5.5rem] sm:bottom-6 sm:right-24',
          'hover:scale-105 focus-visible:scale-105',
          isOpen ? 'pointer-events-none scale-90 opacity-0' : 'opacity-100'
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
      {isOpen && (
        <Card className="fixed inset-x-4 bottom-20 z-50 flex h-[calc(100svh-6rem)] flex-col overflow-hidden border-border/60 bg-background/96 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[620px] sm:max-h-[calc(100vh-3rem)] sm:w-[420px]">
          <div className="border-b border-border/60 bg-secondary/35 p-4 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold leading-tight">Assistente IA</h3>
                <p className="truncate text-xs text-muted-foreground">RAG local sobre {posts.length} posts carregados</p>
              </div>
            </div>
            <Button aria-label="Fechar assistente IA" variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></Button>
          </div>
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'flex-row-reverse' : '')}>
                  <div className="h-7 w-7 shrink-0 rounded bg-secondary grid place-items-center">{m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}</div>
                  <div className={cn('py-2 px-3 rounded-lg max-w-[84%] whitespace-pre-wrap break-words text-sm leading-relaxed', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && <div className="flex gap-2 items-center"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Analisando...</span></div>}
            </div>
          </ScrollArea>
          <div className="border-t border-border/60 px-3 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {suggestedPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => sendMessage(prompt)}
                  className="h-8 shrink-0 rounded-md px-3 text-xs"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
          <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte algo..." disabled={isLoading} />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </Card>
      )}
    </>
  );
}
