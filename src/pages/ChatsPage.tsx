
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Plus, Search, Users, Crown, Zap, Check, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Chat {
  id: string;
  name: string;
  is_group: boolean;
  created_at: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
    sender_id: string;
    is_read: boolean;
  };
  unread_count: number;
  other_member?: {
    display_name: string;
    user_number: string;
    profile_picture: string;
    has_legendary_badge: boolean;
    has_ultra_badge: boolean;
  };
}

const ChatsPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatUser, setNewChatUser] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChats();
      
      const channel = supabase
        .channel('chats-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
          },
          () => {
            fetchChats();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_members',
          },
          () => {
            fetchChats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    if (newChatUser.length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [newChatUser]);

  const fetchChats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: memberships, error: memberError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          unread_count,
          last_read_at,
          chats (
            id,
            name,
            is_group,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error fetching memberships:', memberError);
        setChats([]);
        return;
      }

      if (memberships && memberships.length > 0) {
        const chatsWithDetails = await Promise.all(
          memberships.map(async (membership: any) => {
            const chat = membership.chats;
            
            const { data: messages } = await supabase
              .from('messages')
              .select(`
                content,
                created_at,
                sender_id,
                profiles:sender_id (display_name)
              `)
              .eq('chat_id', chat.id)
              .order('created_at', { ascending: false })
              .limit(1);

            let otherMember = null;
            if (!chat.is_group) {
              const { data: otherMembers } = await supabase
                .from('chat_members')
                .select(`
                  user_id,
                  profiles (
                    display_name,
                    user_number,
                    profile_picture,
                    has_legendary_badge,
                    has_ultra_badge
                  )
                `)
                .eq('chat_id', chat.id)
                .neq('user_id', user.id);

              if (otherMembers && otherMembers.length > 0) {
                otherMember = otherMembers[0].profiles;
              }
            }

            const lastMessage = messages?.[0];
            const isRead = lastMessage ? 
              (lastMessage.sender_id === user.id || 
               (membership.last_read_at && new Date(membership.last_read_at) >= new Date(lastMessage.created_at))) 
              : true;

            return {
              id: chat.id,
              name: chat.name || (otherMember?.display_name || 'Unknown User'),
              is_group: chat.is_group,
              created_at: chat.created_at,
              last_message: lastMessage ? {
                content: lastMessage.content,
                created_at: lastMessage.created_at,
                sender_name: lastMessage.profiles?.display_name || 'Unknown',
                sender_id: lastMessage.sender_id,
                is_read: isRead
              } : undefined,
              unread_count: membership.unread_count || 0,
              other_member: otherMember
            };
          })
        );

        chatsWithDetails.sort((a, b) => {
          const aTime = a.last_message?.created_at || a.created_at;
          const bTime = b.last_message?.created_at || b.created_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        setChats(chatsWithDetails);
      } else {
        setChats([]);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!newChatUser || newChatUser.length < 2) return;
    
    setSearchingUsers(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, display_name, user_number, profile_picture, has_legendary_badge, has_ultra_badge')
        .neq('id', user?.id);

      if (newChatUser.startsWith('#')) {
        const userNumber = newChatUser.substring(1);
        query = query.ilike('user_number', `%${userNumber}%`);
      } else {
        query = query.or(`display_name.ilike.%${newChatUser}%,user_number.ilike.%${newChatUser}%`);
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const createDirectChat = async (otherUserId: string) => {
    if (!user) return;

    try {
      console.log('Creating chat with user:', otherUserId);
      
      // Check if chat already exists between these two users
      const { data: existingChats, error: existingError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          chats!inner (
            id,
            is_group
          )
        `)
        .eq('user_id', user.id);

      if (existingError) {
        console.error('Error checking existing chats:', existingError);
        throw existingError;
      }

      if (existingChats && existingChats.length > 0) {
        for (const chatMember of existingChats) {
          const { data: otherMembers, error: otherError } = await supabase
            .from('chat_members')
            .select('user_id, chat_id')
            .eq('chat_id', chatMember.chat_id)
            .eq('user_id', otherUserId);

          if (otherError) {
            console.error('Error checking other members:', otherError);
            continue;
          }

          if (otherMembers && otherMembers.length > 0) {
            console.log('Chat already exists, navigating to:', chatMember.chat_id);
            navigate(`/chats/${chatMember.chat_id}`);
            setShowNewChatModal(false);
            setNewChatUser('');
            setUsers([]);
            return;
          }
        }
      }

      // Create new chat
      console.log('Creating new chat...');
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          is_group: false,
          created_by: user.id
        })
        .select()
        .single();

      if (chatError) {
        console.error('Error creating chat:', chatError);
        throw chatError;
      }

      console.log('Chat created successfully:', newChat.id);

      // Add both members to the chat
      const { error: memberError } = await supabase
        .from('chat_members')
        .insert([
          { 
            chat_id: newChat.id, 
            user_id: user.id,
            unread_count: 0,
            last_read_at: new Date().toISOString()
          },
          { 
            chat_id: newChat.id, 
            user_id: otherUserId,
            unread_count: 0,
            last_read_at: new Date().toISOString()
          }
        ]);

      if (memberError) {
        console.error('Error adding members:', memberError);
        throw memberError;
      }

      console.log('Members added successfully');
      
      navigate(`/chats/${newChat.id}`);
      setShowNewChatModal(false);
      setNewChatUser('');
      setUsers([]);
      
      toast({
        title: "Success",
        description: "Chat created successfully!",
      });
      
    } catch (error: any) {
      console.error('Error creating chat:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card p-4 border-b border-border flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Chats</h1>
        <Button
          onClick={() => setShowNewChatModal(true)}
          size="sm"
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <Card
                key={chat.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  chat.unread_count > 0 ? 'bg-green-50 border-green-200' : ''
                }`}
                onClick={() => navigate(`/chats/${chat.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                        {chat.is_group ? (
                          <Users className="w-6 h-6 text-primary" />
                        ) : chat.other_member?.profile_picture ? (
                          <img 
                            src={chat.other_member.profile_picture} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MessageCircle className="w-6 h-6 text-primary" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-foreground truncate">
                            {chat.name}
                          </h3>
                          {chat.other_member?.has_legendary_badge && (
                            <Badge className="bg-yellow-500 text-black">
                              <Crown className="w-3 h-3" />
                            </Badge>
                          )}
                          {chat.other_member?.has_ultra_badge && (
                            <Badge className="bg-red-500 text-white animate-pulse">
                              <Zap className="w-3 h-3" />
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {chat.last_message && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(chat.last_message.created_at).toLocaleDateString()}
                            </span>
                          )}
                          {chat.last_message && chat.last_message.sender_id === user?.id && (
                            <div className="flex">
                              {chat.last_message.is_read ? (
                                <CheckCheck className="w-4 h-4 text-blue-500" />
                              ) : (
                                <Check className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          {chat.last_message ? (
                            <p className={`text-sm truncate ${
                              chat.unread_count > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'
                            }`}>
                              {chat.last_message.sender_name}: {chat.last_message.content}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">No messages yet</p>
                          )}
                        </div>
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
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground">No chats found</p>
              <p className="text-sm text-muted-foreground">Start a new conversation!</p>
            </div>
          )}
        </div>
      </div>

      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-80 mx-4 max-h-96 overflow-hidden">
            <CardHeader>
              <CardTitle>Start New Chat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Search by name or #usernumber..."
                value={newChatUser}
                onChange={(e) => setNewChatUser(e.target.value)}
              />
              
              {searchingUsers && (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                </div>
              )}
              
              <div className="max-h-48 overflow-y-auto space-y-2">
                {users.map((searchUser) => (
                  <div
                    key={searchUser.id}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => createDirectChat(searchUser.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                          {searchUser.profile_picture ? (
                            <img 
                              src={searchUser.profile_picture} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs">{searchUser.display_name[0]}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{searchUser.display_name}</p>
                          {searchUser.has_legendary_badge && (
                            <Badge className="bg-yellow-500 text-black">
                              <Crown className="w-3 h-3" />
                            </Badge>
                          )}
                          {searchUser.has_ultra_badge && (
                            <Badge className="bg-red-500 text-white animate-pulse">
                              <Zap className="w-3 h-3" />
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">#{searchUser.user_number}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {newChatUser.length >= 2 && users.length === 0 && !searchingUsers && (
                  <p className="text-center text-muted-foreground py-4">No users found</p>
                )}
                {newChatUser.length < 2 && (
                  <p className="text-center text-muted-foreground py-4">Type at least 2 characters to search</p>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewChatModal(false);
                    setNewChatUser('');
                    setUsers([]);
                  }}
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

export default ChatsPage;
