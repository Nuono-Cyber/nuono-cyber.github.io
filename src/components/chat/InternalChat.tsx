import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Send,
  X,
  Users,
  Loader2,
  Megaphone,
  Mail,
  UserCircle,
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
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
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
          'fixed z-50 bottom-6 right-4 sm:bottom-24 sm:right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 hover:scale-110 transition-transform',
          isOpen && 'hidden'
        )}
      >
        <MessageSquare className="h-6 w-6 text-primary-foreground" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed z-50 inset-x-4 bottom-6 sm:bottom-24 sm:left-auto sm:right-6 sm:w-[420px] max-w-[95vw] sm:h-[580px] h-auto min-h-[280px] max-h-[calc(100vh-6rem)] flex flex-col shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
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
                    {activeTab === 'users' 
                      ? `${users.length + 1} usuários cadastrados`
                      : selectedUser
                        ? selectedUserInfo?.full_name || selectedUserInfo?.email
                        : 'Canal Geral'}
                  </p>
                </div>
              </div>
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

          {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'users')} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2 mx-4 mt-3">
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Usuários
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden min-h-0">
              <div className="flex flex-1 overflow-hidden min-h-0">
                {/* User List Sidebar */}
                <div className="sm:w-28 w-20 border-r border-border/50 flex flex-col bg-secondary/20">
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
                    Direto
                  </div>
                  <ScrollArea className="flex-1 min-h-0">
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
                          <AvatarFallback className="text-xs bg-primary/20 text-primary">
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

                {/* Messages */}
                <div className="flex-1 flex flex-col min-h-0">
                  <ScrollArea className="flex-1 p-4 min-h-0" ref={scrollRef}>
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
                                <AvatarFallback className="text-xs bg-primary/20 text-primary">
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
                    className="p-4 border-t border-border/50 flex-shrink-0"
                  >
                    <div className="flex gap-2">
                        <Input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Digite sua mensagem..."
                          disabled={isSending}
                          className="flex-1 min-w-0 bg-secondary/50"
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
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {/* Current User */}
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {getInitials(null, user.email || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">Você</p>
                          <Badge variant="secondary" className="text-xs">Online</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground uppercase font-medium">
                      Outros Usuários ({users.length})
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Other Users */}
                  {users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        Nenhum outro usuário cadastrado.
                      </p>
                    </div>
                  ) : (
                    users.map((u) => (
                      <div
                        key={u.user_id}
                        className="p-4 rounded-lg bg-card border border-border hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-secondary text-secondary-foreground">
                              {getInitials(u.full_name, u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {u.full_name || 'Usuário'}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              {u.email}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u.user_id);
                              setActiveTab('chat');
                            }}
                            className="shrink-0"
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Chat
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </>
  );
}
