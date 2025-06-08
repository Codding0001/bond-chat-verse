
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Send, DollarSign, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type: string;
  sender?: {
    display_name: string;
    user_number: string;
  };
}

interface Chat {
  id: string;
  name: string;
  is_group: boolean;
}

const ChatDetailPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { settings, playNotificationSound } = useSettings();
  const { toast } = useToast();
  
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [showTipInput, setShowTipInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (chatId && user) {
      fetchChat();
      fetchMessages();
      markMessagesAsRead();
      
      // Set up real-time message listener
      const channel = supabase
        .channel(`chat-${chatId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        }, (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.sender_id !== user.id) {
            playNotificationSound();
          }
          fetchMessages();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [chatId, user]);

  const fetchChat = async () => {
    if (!chatId) return;

    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (error) throw error;
      setChat(data);
    } catch (error) {
      console.error('Error fetching chat:', error);
      navigate('/chats');
    }
  };

  const fetchMessages = async () => {
    if (!chatId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(display_name, user_number)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: newMessage,
          message_type: 'text'
        });

      if (error) throw error;
      setNewMessage('');
      
      // Update unread count for other members
      await supabase
        .from('chat_members')
        .update({ unread_count: supabase.sql`unread_count + 1` })
        .eq('chat_id', chatId)
        .neq('user_id', user.id);

    } catch (error: any) {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendTip = async () => {
    if (!tipAmount || !chatId || !user || !profile) return;

    const amount = parseInt(tipAmount);
    if (amount <= 0 || amount > profile.coin_balance) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get other chat members to tip
      const { data: members, error: membersError } = await supabase
        .from('chat_members')
        .select('user_id')
        .eq('chat_id', chatId)
        .neq('user_id', user.id);

      if (membersError || !members || members.length === 0) {
        toast({
          title: "No recipients",
          description: "No one to tip in this chat",
          variant: "destructive",
        });
        return;
      }

      const tipPerPerson = Math.floor(amount / members.length);
      
      // Send tip message
      await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: `💰 Tipped ${tipPerPerson} coins to everyone!`,
          message_type: 'tip'
        });

      // Update sender balance
      await supabase
        .from('profiles')
        .update({ coin_balance: profile.coin_balance - amount })
        .eq('id', user.id);

      // Update recipients' balances and create transactions
      for (const member of members) {
        await supabase
          .from('profiles')
          .update({ coin_balance: supabase.sql`coin_balance + ${tipPerPerson}` })
          .eq('id', member.user_id);

        await supabase
          .from('transactions')
          .insert({
            from_user_id: user.id,
            to_user_id: member.user_id,
            amount: tipPerPerson,
            transaction_type: 'tip',
            description: `Tip in chat`
          });
      }

      toast({
        title: "Tip sent!",
        description: `${tipPerPerson} coins sent to each member`,
      });

      setTipAmount('');
      setShowTipInput(false);
      
      // Refresh profile data
      window.location.reload();

    } catch (error: any) {
      toast({
        title: "Failed to send tip",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getWallpaperStyle = () => {
    if (settings?.chat_wallpaper_color) {
      return { backgroundColor: settings.chat_wallpaper_color };
    }
    return { backgroundColor: 'rgba(249, 250, 251, 1)' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={getWallpaperStyle()}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/chats')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">{chat?.name || 'Chat'}</h1>
              <p className="text-sm text-gray-500">
                {chat?.is_group ? 'Group Chat' : 'Direct Message'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTipInput(!showTipInput)}
          >
            <DollarSign className="w-4 h-4" />
          </Button>
        </div>
        
        {showTipInput && (
          <div className="mt-3 flex space-x-2">
            <Input
              type="number"
              placeholder="Enter tip amount"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              className="flex-1"
            />
            <Button onClick={sendTip} size="sm">
              Send Tip
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.sender_id === user?.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-900 border'
            } ${message.message_type === 'tip' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}`}>
              {message.sender_id !== user?.id && (
                <p className="text-xs font-medium mb-1">
                  {message.sender?.display_name}
                </p>
              )}
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatDetailPage;
