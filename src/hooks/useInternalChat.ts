import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface InternalMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  content: string;
  created_at: string;
  read_at: string | null;
  sender_name?: string;
  sender_email?: string;
}

export interface ChatUser {
  user_id: string;
  full_name: string | null;
  email: string;
}

const LOCAL_MESSAGES_KEY = 'internal_chat_messages_v1';

function readLocalMessages() {
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as InternalMessage[] : [];
  } catch {
    return [];
  }
}

function writeLocalMessages(messages: InternalMessage[]) {
  localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
}

export function useInternalChat() {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    if (api.isLocalToken()) {
      const rows = api.getLocalUsers()
        .filter((localUser) => localUser.id !== user.id)
        .map((localUser) => ({
          user_id: localUser.id,
          full_name: localUser.full_name || null,
          email: localUser.email,
        }));
      setUsers(rows);
      return;
    }

    try {
      const { rows } = await api.chat.users();
      setUsers(rows || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    if (api.isLocalToken()) {
      const rows = readLocalMessages()
        .filter((message) => {
          if (selectedUser === null) return message.recipient_id === null;
          return (
            (message.sender_id === user.id && message.recipient_id === selectedUser) ||
            (message.sender_id === selectedUser && message.recipient_id === user.id)
          );
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(rows);
      setIsLoading(false);
      return;
    }

    try {
      const { rows } = await api.chat.messages(selectedUser);
      setMessages(rows || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedUser]);

  const sendMessage = async (content: string) => {
    if (!user || !content.trim()) return false;
    if (api.isLocalToken()) {
      const nextMessage: InternalMessage = {
        id: crypto.randomUUID(),
        sender_id: user.id,
        recipient_id: selectedUser,
        content: content.trim(),
        created_at: new Date().toISOString(),
        read_at: null,
        sender_name: user.full_name || user.email?.split('@')[0] || 'Usuário',
        sender_email: user.email,
      };
      writeLocalMessages([...readLocalMessages(), nextMessage]);
      await fetchMessages();
      return true;
    }

    try {
      await api.chat.send(content.trim(), selectedUser);
      await fetchMessages();
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      return false;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!user) return;
    if (api.isLocalToken()) return;
    const timer = setInterval(() => {
      fetchMessages();
    }, 4000);
    return () => clearInterval(timer);
  }, [user, fetchMessages]);

  return {
    messages,
    users,
    isLoading,
    selectedUser,
    setSelectedUser,
    sendMessage,
    refreshMessages: fetchMessages,
  };
}
