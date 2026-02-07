import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  const { user } = useAuth();
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null); // null = broadcast

  // Fetch all users for chat
  const fetchUsers = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .neq('user_id', user.id)
      .order('full_name');

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    setUsers(data || []);
  }, [user]);

  // Fetch messages for the current conversation
  const fetchMessages = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('internal_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (selectedUser) {
        // Direct messages between current user and selected user
        query = query.or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},recipient_id.eq.${user.id})`
        );
      } else {
        // Broadcast messages (recipient_id is null)
        query = query.is('recipient_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Enrich with sender info
      const enrichedMessages = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', msg.sender_id)
            .single();

          return {
            ...msg,
            sender_name: profile?.full_name || 'Usuário',
            sender_email: profile?.email || '',
          };
        })
      );

      setMessages(enrichedMessages);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedUser]);

  // Send a message
  const sendMessage = async (content: string) => {
    if (!user || !content.trim()) return false;

    const { error } = await supabase.from('internal_messages').insert({
      sender_id: user.id,
      recipient_id: selectedUser,
      content: content.trim(),
    });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      return false;
    }

    return true;
  };

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    if (!user) return;

    await supabase
      .from('internal_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('recipient_id', user.id)
      .is('read_at', null);
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('internal-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_messages',
        },
        async (payload) => {
          const newMsg = payload.new as InternalMessage;
          
          // Only add if it's relevant to current conversation
          const isRelevant = selectedUser
            ? (newMsg.sender_id === user.id && newMsg.recipient_id === selectedUser) ||
              (newMsg.sender_id === selectedUser && newMsg.recipient_id === user.id)
            : newMsg.recipient_id === null;

          if (isRelevant) {
            // Fetch sender info
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', newMsg.sender_id)
              .single();

            setMessages((prev) => [
              ...prev,
              {
                ...newMsg,
                sender_name: profile?.full_name || 'Usuário',
                sender_email: profile?.email || '',
              },
            ]);

            // Mark as read if it's for us
            if (newMsg.recipient_id === user.id) {
              markAsRead(newMsg.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUser]);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

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
