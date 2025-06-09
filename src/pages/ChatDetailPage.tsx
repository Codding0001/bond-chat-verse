
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Send, DollarSign } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type: string;
}

interface ChatMember {
  user_id: string;
  profiles: {
    display_name: string;
    user_number: string;
  };
}

const ChatDetailPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user, profile, updateCoins } = useAuth();
  const { settings, playNotificationSound } = useSettings();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatMembers, setChatMembers] = useState<ChatMember[]>([]);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatId) {
      fetchMessages();
      fetchChatMembers();
      markMessagesAsRead();
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user?.id, playNotificationSound]);

  const fetchMessages = async () => {
    if (!chatId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
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

  const fetchChatMembers = async () => {
    if (!chatId) return;

    try {
      const { data, error } = await supabase
        .from('chat_members')
        .select(`
          user_id,
          profiles (
            display_name,
            user_number
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          sender_id: user.id,
          chat_id: chatId,
          message_type: 'text'
        });

      if (error) throw error;

      // Update unread count for other members
      await supabase
        .from('chat_members')
        .update({ unread_count: supabase.sql`unread_count + 1` })
        .eq('chat_id', chatId)
        .neq('user_id', user.id);

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const sendTip = async () => {
    const amount = parseInt(tipAmount);
    if (!amount || amount <= 0 || !chatId || !user || !profile) return;

    if (profile.coin_balance < amount) {
      toast({
        title: "Insufficient coins",
        description: "You don't have enough coins for this tip",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get other chat member
      const otherMember = chatMembers.find(m => m.user_id !== user.id);
      if (!otherMember) return;

      // Send tip message
      await supabase
        .from('messages')
        .insert({
          content: `💰 Sent ${amount} coins as a tip!`,
          sender_id: user.id,
          chat_id: chatId,
          message_type: 'tip'
        });

      // Update coin balances
      await updateCoins(-amount);

      // Add coins to receiver
      await supabase.sql`
        UPDATE profiles 
        SET coin_balance = coin_balance + ${amount}
        WHERE id = ${otherMember.user_id}
      `;

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          from_user_id: user.id,
          to_user_id: otherMember.user_id,
          amount: amount,
          transaction_type: 'tip',
          description: 'Chat tip'
        });

      setTipAmount('');
      setShowTipModal(false);
      
      toast({
        title: "Tip sent!",
        description: `You sent ${amount} coins to ${otherMember.profiles.display_name}`,
      });
    } catch (error) {
      console.error('Error sending tip:', error);
      toast({
        title: "Error",
        description: "Failed to send tip",
        variant: "destructive",
      });
    }
  };

  const getOtherMemberName = () => {
    const otherMember = chatMembers.find(m => m.user_id !== user?.id);
    return otherMember?.profiles.display_name || 'Chat';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" 
         style={{ backgroundColor: settings?.chat_wallpaper_color || 'rgba(255, 255, 255, 1)' }}>
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/chats')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold">{getOtherMemberName()}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTipModal(true)}
        >
          <DollarSign className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-xs ${
              message.sender_id === user?.id ? 'bg-blue-500 text-white' : 'bg-white'
            }`}>
              <CardContent className="p-3">
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white p-4 border-t border-gray-200 fixed bottom-0 left-0 right-0">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1"
          />
          <Button onClick={sendMessage}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tip Modal */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-80 mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4">Send Tip</h3>
              <p className="text-sm text-gray-600 mb-4">
                Your balance: {profile?.coin_balance || 0} coins
              </p>
              <Input
                type="number"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                placeholder="Enter amount"
                className="mb-4"
              />
              <div className="flex space-x-2">
                <Button onClick={sendTip} className="flex-1">
                  Send Tip
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowTipModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChatDetailPage;
