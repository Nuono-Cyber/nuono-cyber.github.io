import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare,
  Send,
  X,
  Users,
  User,
  Loader2,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInternalChat, ChatUser } from '@/hooks/useInternalChat';
import { useAuth } from '@/hooks/useAuth';

export function InternalChat() {
  const { user } = useAuth();
  const {
    messages,
    users,
    isLoading,
    selectedUser,
    setSelectedUser,
    sendMessage,
  } = useInternalChat();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showUserList, setShowUserList] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    setIsSending(true);
    const success = await sendMessage(input);
    if (success) {
      setInput('');
    }
    setIsSending(false);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const selectedUserInfo = users.find((u) => u.user_id === selectedUser);

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 hover:scale-110 transition-transform',
          isOpen && 'hidden'
        )}
      >
        <MessageSquare className="h-6 w-6 text-primary-foreground" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-[400px] h-[550px] flex flex-col shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="p-4 border-b border-border/50 bg-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-foreground/20 rounded-lg">
                  <Users className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-foreground">
                    Chat Interno
                  </h3>
                  <p className="text-xs text-primary-foreground/80">
                    {selectedUser
                      ? selectedUserInfo?.full_name || selectedUserInfo?.email
                      : 'Canal Geral'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowUserList(!showUserList)}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <Users className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* User List Sidebar */}
            {showUserList && (
              <div className="w-32 border-r border-border/50 flex flex-col">
                <div className="p-2 text-xs font-medium text-muted-foreground uppercase">
                  Canais
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 transition-colors',
                    selectedUser === null && 'bg-secondary'
                  )}
                >
                  <Megaphone className="h-4 w-4" />
                  <span className="truncate">Geral</span>
                </button>

                <div className="p-2 text-xs font-medium text-muted-foreground uppercase mt-2">
                  Usuários
                </div>
                <ScrollArea className="flex-1">
                  {users.map((u) => (
                    <button
                      key={u.user_id}
                      onClick={() => setSelectedUser(u.user_id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 transition-colors w-full',
                        selectedUser === u.user_id && 'bg-secondary'
                      )}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(u.full_name, u.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs">
                        {u.full_name?.split(' ')[0] || u.email.split('@')[0]}
                      </span>
                    </button>
                  ))}
                </ScrollArea>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      Nenhuma mensagem ainda.
                      <br />
                      Comece a conversa!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.sender_id === user.id;
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            'flex gap-2',
                            isOwn ? 'flex-row-reverse' : ''
                          )}
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs">
                              {getInitials(
                                message.sender_name || null,
                                message.sender_email || ''
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={cn(
                              'flex flex-col max-w-[70%]',
                              isOwn ? 'items-end' : 'items-start'
                            )}
                          >
                            <span className="text-xs text-muted-foreground mb-1">
                              {isOwn ? 'Você' : message.sender_name}
                            </span>
                            <div
                              className={cn(
                                'py-2 px-3 rounded-lg',
                                isOwn
                                  ? 'bg-primary text-primary-foreground rounded-tr-none'
                                  : 'bg-secondary text-secondary-foreground rounded-tl-none'
                              )}
                            >
                              <p className="text-sm whitespace-pre-wrap">
                                {message.content}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1">
                              {new Date(message.created_at).toLocaleTimeString(
                                'pt-BR',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className="p-4 border-t border-border/50"
              >
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    disabled={isSending}
                    className="flex-1 bg-secondary/50"
                  />
                  <Button
                    type="submit"
                    disabled={isSending || !input.trim()}
                    size="icon"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
