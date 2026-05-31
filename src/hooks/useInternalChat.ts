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

export function useInternalChat() {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
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
