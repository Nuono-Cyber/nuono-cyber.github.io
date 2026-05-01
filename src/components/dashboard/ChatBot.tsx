import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBotProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  otherIsOpen: boolean;
}

export function ChatBot({ isOpen, onOpenChange, otherIsOpen }: ChatBotProps) {
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
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const { message } = await api.ai.chat([...messages, userMsg]);
      setMessages((prev) => [...prev, { role: 'assistant', content: message }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Erro: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const windowRight = otherIsOpen ? 'right-[440px]' : 'right-6';

  return (
    <>
      <Button onClick={() => onOpenChange(true)} className={cn('fixed bottom-6 right-24 z-50 h-14 w-14 rounded-full', isOpen && 'hidden')}>
        <MessageCircle className="h-6 w-6" />
      </Button>
      {isOpen && (
        <Card className={cn('fixed bottom-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-6rem)] flex flex-col', windowRight)}>
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2"><Bot className="h-4 w-4" /><h3 className="font-semibold">Assistente IA</h3></div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></Button>
          </div>
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'flex-row-reverse' : '')}>
                  <div className="p-1.5 rounded bg-secondary">{m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}</div>
                  <div className={cn('py-2 px-3 rounded-lg max-w-[85%] text-sm', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && <div className="flex gap-2 items-center"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Analisando...</span></div>}
            </div>
          </ScrollArea>
          <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte algo..." disabled={isLoading} />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </Card>
      )}
    </>
  );
}
