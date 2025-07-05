import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, DollarSign, Paperclip, Crown, Zap, CheckCircle, User, Pin, PinOff, Image as ImageIcon } from 'lucide-react';
import VoiceRecorder from '@/components/VoiceRecorder';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type: string;
  file_url?: string;
}

interface ChatMember {
  user_id: string;
  is_pinned?: boolean;
  profiles: {
    display_name: string;
    user_number: string;
    profile_picture?: string;
    has_legendary_badge?: boolean;
    has_ultra_badge?: boolean;
    legendary_badge_color?: string;
    verification_badge_type?: string;
    verification_badge_expires_at?: string;
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
  const [uploading, setUploading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          is_pinned,
          profiles (
            display_name,
            user_number,
            profile_picture,
            has_legendary_badge,
            has_ultra_badge,
            legendary_badge_color,
            verification_badge_type,
            verification_badge_expires_at
          )
        `)
        .eq('chat_id', chatId);

      if (error) throw error;
      setChatMembers(data || []);
      
      // Check if current user has pinned this chat
      const currentUserMember = data?.find(m => m.user_id === user?.id);
      setIsPinned(currentUserMember?.is_pinned || false);
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

  const togglePinChat = async () => {
    if (!chatId || !user) return;

    try {
      const { error } = await supabase
        .from('chat_members')
        .update({ is_pinned: !isPinned })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setIsPinned(!isPinned);
      toast({
        title: isPinned ? "Chat unpinned" : "Chat pinned",
        description: isPinned ? "Removed from pinned chats" : "Added to pinned chats",
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Error",
        description: "Failed to update pin status",
        variant: "destructive",
      });
    }
  };

  const uploadFile = async (file: File) => {
    if (!user || !chatId) return null;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleVoiceMessage = async (audioBlob: Blob) => {
    if (!user || !chatId) return;

    try {
      const fileName = `${user.id}/${Date.now()}.webm`;
      
      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(fileName, audioBlob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      await supabase
        .from('messages')
        .insert({
          content: 'Voice message',
          sender_id: user.id,
          chat_id: chatId,
          message_type: 'voice',
          file_url: publicUrl
        });

      toast({
        title: "Voice message sent",
        description: "Your voice message has been sent",
      });
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({
        title: "Error",
        description: "Failed to send voice message",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileUrl = await uploadFile(file);
    if (fileUrl) {
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';
      
      await supabase
        .from('messages')
        .insert({
          content: file.name,
          sender_id: user?.id,
          chat_id: chatId,
          message_type: messageType,
          file_url: fileUrl
        });
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
      const otherMember = chatMembers.find(m => m.user_id !== user.id);
      if (!otherMember) return;

      await supabase
        .from('messages')
        .insert({
          content: `💰 Sent ${amount} coins as a tip!`,
          sender_id: user.id,
          chat_id: chatId,
          message_type: 'tip'
        });

      await updateCoins(-amount);

      const { data: receiverProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', otherMember.user_id)
        .single();

      if (fetchError) throw fetchError;

      const newBalance = (receiverProfile.coin_balance || 0) + amount;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coin_balance: newBalance })
        .eq('id', otherMember.user_id);

      if (updateError) throw updateError;

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

  const getOtherMember = () => {
    return chatMembers.find(m => m.user_id !== user?.id);
  };

  const renderVerificationBadge = (member: ChatMember) => {
    if (!member.profiles.verification_badge_type) return null;
    
    const isExpired = member.profiles.verification_badge_expires_at && 
      new Date(member.profiles.verification_badge_expires_at) < new Date();
    
    if (isExpired) return null;

    return (
      <Badge variant="secondary" className="bg-blue-500 text-white">
        <CheckCircle className="w-3 h-3" />
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const otherMember = getOtherMember();

  return (
    <div className="min-h-screen bg-background flex flex-col" 
         style={{ backgroundColor: settings?.chat_wallpaper_color || undefined }}>
      {/* Enhanced Header */}
      <div className="bg-card p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/chats')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          {otherMember && (
            <div 
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => navigate(`/profile/${otherMember.user_id}`)}
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={otherMember.profiles.profile_picture || ''} />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-semibold text-foreground">
                    {otherMember.profiles.display_name}
                  </h1>
                  
                  {otherMember.profiles.has_legendary_badge && (
                    <Badge 
                      className="text-black"
                      style={{ backgroundColor: otherMember.profiles.legendary_badge_color || 'gold' }}
                    >
                      <Crown className="w-3 h-3" />
                    </Badge>
                  )}
                  
                  {otherMember.profiles.has_ultra_badge && (
                    <Badge className="bg-red-500 text-white animate-pulse">
                      <Zap className="w-3 h-3" />
                    </Badge>
                  )}
                  
                  {renderVerificationBadge(otherMember)}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  #{otherMember.profiles.user_number}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePinChat}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTipModal(true)}
          >
            <DollarSign className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto" style={{ paddingBottom: '100px' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-xs ${
              message.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-card'
            }`}>
              <CardContent className="p-3">
                {message.message_type === 'image' && message.file_url && (
                  <div className="mb-2">
                    <img 
                      src={message.file_url} 
                      alt={message.content}
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                )}
                
                {message.message_type === 'file' && message.file_url && (
                  <div className="mb-2 p-2 bg-muted rounded flex items-center space-x-2">
                    <Paperclip className="w-4 h-4" />
                    <a 
                      href={message.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm underline"
                    >
                      {message.content}
                    </a>
                  </div>
                )}
                
                {message.message_type === 'voice' && message.file_url && (
                  <div className="mb-2">
                    <audio controls className="max-w-full">
                      <source src={message.file_url} type="audio/webm" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Enhanced visibility */}
      <div className="bg-background border-t border-border fixed bottom-0 left-0 right-0 z-[100] p-4 shadow-lg">
        <div className="flex items-center space-x-3 max-w-full">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx"
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0"
          >
            {uploading ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </Button>
          
          <div className="flex-1 flex items-center space-x-2 bg-muted rounded-full px-4 py-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            
            <VoiceRecorder onSendVoiceMessage={handleVoiceMessage} disabled={uploading} />
            
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim()}
              size="icon"
              className="rounded-full flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tip Modal */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-80 mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4">Send Tip</h3>
              <p className="text-sm text-muted-foreground mb-4">
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