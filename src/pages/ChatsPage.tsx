
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Search, MessageSquare, User, Pin, Crown, Zap, CheckCircle } from 'lucide-react';
import ContactNickname from '@/components/ContactNickname';

interface Chat {
  id: string;
  name?: string;
  is_group: boolean;
  created_at: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  is_pinned: boolean;
  other_member?: {
    id: string;
    display_name: string;
    user_number: string;
    profile_picture?: string;
    is_online: boolean;
    has_legendary_badge?: boolean;
    has_ultra_badge?: boolean;
    legendary_badge_color?: string;
    verification_badge_type?: string;
    verification_badge_expires_at?: string;
  };
}

const ChatsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [contactNicknames, setContactNicknames] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (user) {
      fetchChats();
      loadContactNicknames();
      
      // Real-time subscription for new messages
      const messageChannel = supabase
        .channel('chat-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          () => {
            fetchChats(); // Refresh chats when new messages arrive
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
      };
    }
  }, [user]);

  const loadContactNicknames = () => {
    if (!user) return;
    
    const savedNicknames = localStorage.getItem(`nicknames_${user.id}`);
    if (savedNicknames) {
      setContactNicknames(JSON.parse(savedNicknames));
    }
  };

  const fetchChats = async () => {
    if (!user) return;

    try {
      // Get chats with enhanced data including unread counts and online status
      const { data: chatMembers, error } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          unread_count,
          is_pinned,
          last_read_at,
          chats!inner(
            id,
            name,
            is_group,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Get other members for each chat
      const chatIds = chatMembers?.map(cm => cm.chat_id) || [];
      const { data: otherMembers, error: membersError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          profiles!inner(
            id,
            display_name,
            user_number,
            profile_picture,
            is_online,
            has_legendary_badge,
            has_ultra_badge,
            legendary_badge_color,
            verification_badge_type,
            verification_badge_expires_at
          )
        `)
        .in('chat_id', chatIds)
        .neq('user_id', user.id);

      if (membersError) throw membersError;

      // Get last messages for each chat
      const { data: lastMessages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          chat_id,
          content,
          created_at,
          message_type,
          sender_id
        `)
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Combine all data
      const enhancedChats: Chat[] = chatMembers?.map(cm => {
        const otherMember = otherMembers?.find(om => om.chat_id === cm.chat_id);
        const lastMessage = lastMessages?.find(lm => lm.chat_id === cm.chat_id);
        
        return {
          id: cm.chats.id,
          name: cm.chats.name,
          is_group: cm.chats.is_group,
          created_at: cm.chats.created_at,
          unread_count: cm.unread_count || 0,
          is_pinned: cm.is_pinned || false,
          last_message: lastMessage?.content || '',
          last_message_time: lastMessage?.created_at || cm.chats.created_at,
          other_member: otherMember ? {
            id: otherMember.profiles.id,
            display_name: otherMember.profiles.display_name,
            user_number: otherMember.profiles.user_number,
            profile_picture: otherMember.profiles.profile_picture,
            is_online: otherMember.profiles.is_online,
            has_legendary_badge: otherMember.profiles.has_legendary_badge,
            has_ultra_badge: otherMember.profiles.has_ultra_badge,
            legendary_badge_color: otherMember.profiles.legendary_badge_color,
            verification_badge_type: otherMember.profiles.verification_badge_type,
            verification_badge_expires_at: otherMember.profiles.verification_badge_expires_at,
          } : undefined
        };
      }) || [];

      // Sort: pinned first, then by last message time
      enhancedChats.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.last_message_time!).getTime() - new Date(a.last_message_time!).getTime();
      });

      setChats(enhancedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast({
        title: "Error",
        description: "Failed to load chats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (chat: Chat) => {
    if (!chat.other_member) return chat.name || 'Unknown';
    const nickname = contactNicknames[chat.other_member.id];
    return nickname || chat.other_member.display_name;
  };

  const handleNicknameChange = (contactId: string, nickname: string) => {
    const updatedNicknames = { ...contactNicknames };
    if (nickname) {
      updatedNicknames[contactId] = nickname;
    } else {
      delete updatedNicknames[contactId];
    }
    setContactNicknames(updatedNicknames);
    
    if (user) {
      localStorage.setItem(`nicknames_${user.id}`, JSON.stringify(updatedNicknames));
    }
  };

  const renderVerificationBadge = (member: any) => {
    if (!member.verification_badge_type) return null;
    
    const isExpired = member.verification_badge_expires_at && 
      new Date(member.verification_badge_expires_at) < new Date();
    
    if (isExpired) return null;

    return (
      <Badge variant="secondary" className="bg-blue-500 text-white">
        <CheckCircle className="w-3 h-3" />
      </Badge>
    );
  };

  const filteredChats = chats.filter(chat => {
    const displayName = getDisplayName(chat);
    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card p-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground mb-4">Chats</h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="p-4 space-y-2">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <Card 
              key={chat.id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/chats/${chat.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={chat.other_member?.profile_picture || ''} />
                      <AvatarFallback>
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Enhanced online status indicator */}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                      chat.other_member?.is_online ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    
                    {/* Pin indicator */}
                    {chat.is_pinned && (
                      <div className="absolute -top-1 -left-1 bg-primary rounded-full p-1">
                        <Pin className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {getDisplayName(chat)}
                          {chat.unread_count > 0 && (
                            <span className="ml-2 text-green-600 font-bold">
                              ({chat.unread_count})
                            </span>
                          )}
                        </h3>
                        
                        {/* Badges */}
                        {chat.other_member?.has_legendary_badge && (
                          <Badge 
                            className="text-black"
                            style={{ backgroundColor: chat.other_member.legendary_badge_color || 'gold' }}
                          >
                            <Crown className="w-3 h-3" />
                          </Badge>
                        )}
                        
                        {chat.other_member?.has_ultra_badge && (
                          <Badge className="bg-red-500 text-white animate-pulse">
                            <Zap className="w-3 h-3" />
                          </Badge>
                        )}
                        
                        {chat.other_member && renderVerificationBadge(chat.other_member)}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(chat.last_message_time!).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        
                        {chat.unread_count > 0 && (
                          <Badge className="bg-green-600 text-white min-w-5 h-5 flex items-center justify-center">
                            {chat.unread_count > 99 ? '99+' : chat.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate flex-1">
                        {chat.last_message || 'No messages yet'}
                      </p>
                      
                      {chat.other_member && (
                        <ContactNickname
                          contactId={chat.other_member.id}
                          contactName={chat.other_member.display_name}
                          onNicknameChange={(nickname) => handleNicknameChange(chat.other_member!.id, nickname)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No chats found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'Start a conversation to see your chats here'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatsPage;
