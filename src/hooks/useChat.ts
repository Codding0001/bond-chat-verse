
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Message, ChatMember } from '@/types/chat';

export const useChat = (chatId: string | undefined) => {
  const { user } = useAuth();
  const { playNotificationSound } = useSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatMembers, setChatMembers] = useState<ChatMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    if (!chatId || !user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get the last read timestamp for the other user
      const { data: otherMemberData } = await supabase
        .from('chat_members')
        .select('last_read_at, user_id')
        .eq('chat_id', chatId)
        .neq('user_id', user.id)
        .single();

      const otherUserLastRead = otherMemberData?.last_read_at;

      // Mark messages as read based on timestamps
      const messagesWithReadStatus = (data || []).map(message => ({
        ...message,
        is_read: message.sender_id === user.id && otherUserLastRead ? 
          new Date(message.created_at) <= new Date(otherUserLastRead) : false
      }));

      setMessages(messagesWithReadStatus);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatMembers = async () => {
    if (!chatId) return;

    try {
      const { data, error } = await supabase
        .from('chat_members')
        .select(`
          user_id,
          profiles (
            display_name,
            user_number,
            is_online
          )
        `)
        .eq('chat_id', chatId);

      if (error) throw error;
      setChatMembers(data || []);
    } catch (error) {
      console.error('Error fetching chat members:', error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!chatId || !user) return;

    try {
      await supabase
        .from('chat_members')
        .update({ 
          last_read_at: new Date().toISOString(),
          unread_count: 0 
        })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !chatId || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content,
          sender_id: user.id,
          chat_id: chatId,
          message_type: 'text'
        });

      if (error) throw error;

      // Update unread count for other members
      const { data: otherMembers } = await supabase
        .from('chat_members')
        .select('user_id, unread_count')
        .eq('chat_id', chatId)
        .neq('user_id', user.id);

      if (otherMembers) {
        for (const member of otherMembers) {
          await supabase
            .from('chat_members')
            .update({ unread_count: (member.unread_count || 0) + 1 })
            .eq('chat_id', chatId)
            .eq('user_id', member.user_id);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (chatId) {
      fetchMessages();
      fetchChatMembers();
      markMessagesAsRead();
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          // Play sound if message is from another user
          if (newMessage.sender_id !== user?.id) {
            playNotificationSound();
            markMessagesAsRead();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_members',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user?.id, playNotificationSound]);

  const getOtherMember = () => {
    return chatMembers.find(m => m.user_id !== user?.id);
  };

  return {
    messages,
    chatMembers,
    loading,
    sendMessage,
    getOtherMember,
  };
};
