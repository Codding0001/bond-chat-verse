
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Users, Search, Crown, Zap, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OnlineUser {
  id: string;
  display_name: string;
  user_number: string;
  is_online: boolean;
  profile_picture: string;
  has_legendary_badge: boolean;
  has_ultra_badge: boolean;
  coin_balance: number;
}

interface RecentChat {
  id: string;
  name: string;
  last_message: string;
  unread_count: number;
  other_member?: {
    display_name: string;
    profile_picture: string;
    is_online: boolean;
  };
}

const HomePage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<OnlineUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOnlineUsers();
      fetchRecentChats();
      updateUserOnlineStatus(true);
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const updateUserOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, user_number, is_online, profile_picture, has_legendary_badge, has_ultra_badge, coin_balance')
        .neq('id', user?.id)
        .eq('is_online', true)
        .limit(10);

      if (error) throw error;
      setOnlineUsers(data || []);
    } catch (error) {
      console.error('Error fetching online users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentChats = async () => {
    if (!user) return;

    try {
      const { data: memberships, error } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          unread_count,
          chats (
            id,
            name,
            is_group
          )
        `)
        .eq('user_id', user.id)
        .limit(5);

      if (error) throw error;

      if (memberships) {
        const chatsWithDetails = await Promise.all(
          memberships.map(async (membership: any) => {
            const chat = membership.chats;
            
            // Get last message
            const { data: messages } = await supabase
              .from('messages')
              .select('content')
              .eq('chat_id', chat.id)
              .order('created_at', { ascending: false })
              .limit(1);

            // Get other member for direct chats
            let otherMember = null;
            if (!chat.is_group) {
              const { data: otherMembers } = await supabase
                .from('chat_members')
                .select(`
                  profiles (
                    display_name,
                    profile_picture,
                    is_online
                  )
                `)
                .eq('chat_id', chat.id)
                .neq('user_id', user.id)
                .limit(1);

              if (otherMembers && otherMembers.length > 0) {
                otherMember = otherMembers[0].profiles;
              }
            }

            return {
              id: chat.id,
              name: chat.name || (otherMember?.display_name || 'Unknown User'),
              last_message: messages?.[0]?.content || 'No messages yet',
              unread_count: membership.unread_count || 0,
              other_member: otherMember
            };
          })
        );

        setRecentChats(chatsWithDetails);
      }
    } catch (error) {
      console.error('Error fetching recent chats:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm || searchTerm.length < 2) return;
    
    try {
      let query = supabase
        .from('profiles')
        .select('id, display_name, user_number, is_online, profile_picture, has_legendary_badge, has_ultra_badge, coin_balance')
        .neq('id', user?.id);

      // Check if search term starts with # for user number search
      if (searchTerm.startsWith('#')) {
        const userNumber = searchTerm.substring(1);
        query = query.ilike('user_number', `%${userNumber}%`);
      } else {
        query = query.or(`display_name.ilike.%${searchTerm}%,user_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  const createDirectChat = async (otherUserId: string) => {
    if (!user) return;

    try {
      // Check if chat already exists
      const { data: existingMemberships } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.id);

      if (existingMemberships) {
        for (const membership of existingMemberships) {
          const { data: otherMemberships } = await supabase
            .from('chat_members')
            .select('user_id')
            .eq('chat_id', membership.chat_id)
            .eq('user_id', otherUserId);

          if (otherMemberships && otherMemberships.length > 0) {
            navigate(`/chats/${membership.chat_id}`);
            return;
          }
        }
      }

      // Create new chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          is_group: false,
          created_by: user.id
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add members
      const { error: memberError } = await supabase
        .from('chat_members')
        .insert([
          { chat_id: newChat.id, user_id: user.id },
          { chat_id: newChat.id, user_id: otherUserId }
        ]);

      if (memberError) throw memberError;

      navigate(`/chats/${newChat.id}`);
      
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: "Error",
        description: "Failed to create chat. Please try again.",
        variant: "destructive",
      });
    }
  };

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back!</h1>
            <p className="text-muted-foreground">
              {profile?.display_name} • {profile?.coin_balance || 0} coins
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/wallet')}
            >
              <DollarSign className="w-4 h-4 mr-1" />
              {profile?.coin_balance || 0}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or #usernumber..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card className="mt-2">
            <CardContent className="p-2">
              <div className="space-y-1">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => createDirectChat(user.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                          {user.profile_picture ? (
                            <img 
                              src={user.profile_picture} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium">{user.display_name[0]}</span>
                          )}
                        </div>
                        {user.is_online && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{user.display_name}</p>
                          {user.has_legendary_badge && (
                            <Badge className="bg-yellow-500 text-black">
                              <Crown className="w-3 h-3" />
                            </Badge>
                          )}
                          {user.has_ultra_badge && (
                            <Badge className="bg-red-500 text-white animate-pulse">
                              <Zap className="w-3 h-3" />
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">#{user.user_number}</p>
                      </div>
                    </div>
                    <MessageCircle className="w-4 h-4 text-primary" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Recent Chats */}
        {recentChats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Recent Chats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentChats.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-3 hover:bg-muted rounded cursor-pointer"
                  onClick={() => navigate(`/chats/${chat.id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                        {chat.other_member?.profile_picture ? (
                          <img 
                            src={chat.other_member.profile_picture} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MessageCircle className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      {chat.other_member?.is_online && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{chat.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{chat.last_message}</p>
                    </div>
                  </div>
                  {chat.unread_count > 0 && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-xs text-primary-foreground font-medium">
                        {chat.unread_count > 9 ? '9+' : chat.unread_count}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full mt-3"
                onClick={() => navigate('/chats')}
              >
                View All Chats
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Online Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Online Users ({onlineUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onlineUsers.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {onlineUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-3 hover:bg-muted rounded cursor-pointer"
                    onClick={() => createDirectChat(user.id)}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                        {user.profile_picture ? (
                          <img 
                            src={user.profile_picture} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium">{user.display_name[0]}</span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1">
                        <p className="font-medium truncate text-sm">{user.display_name}</p>
                        {user.has_legendary_badge && (
                          <Crown className="w-3 h-3 text-yellow-500" />
                        )}
                        {user.has_ultra_badge && (
                          <Zap className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">#{user.user_number}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No users online</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            className="h-20"
            onClick={() => navigate('/chats')}
          >
            <div className="text-center">
              <MessageCircle className="w-6 h-6 mx-auto mb-1" />
              <span className="text-sm">All Chats</span>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="h-20"
            onClick={() => navigate('/gifts')}
          >
            <div className="text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-1" />
              <span className="text-sm">Gifts</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
