
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Plus, Search, Users } from 'lucide-react';

interface Chat {
  id: string;
  name: string;
  is_group: boolean;
  created_at: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
  unread_count: number;
  other_member?: {
    display_name: string;
    user_number: string;
    is_online: boolean;
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

  useEffect(() => {
    if (user) {
      fetchChats();
      fetchUsers();
    }
  }, [user]);

  const fetchChats = async () => {
    if (!user) return;

    try {
      // Get user's chat memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          unread_count,
          chats (
            id,
            name,
            is_group,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      // For each chat, get the latest message and other member info
      const chatsWithDetails = await Promise.all(
        (memberships || []).map(async (membership: any) => {
          const chat = membership.chats;
          
          // Get latest message
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

          // Get other member for direct chats
          let otherMember = null;
          if (!chat.is_group) {
            const { data: otherMembers } = await supabase
              .from('chat_members')
              .select(`
                user_id,
                profiles (
                  display_name,
                  user_number,
                  is_online
                )
              `)
              .eq('chat_id', chat.id)
              .neq('user_id', user.id);

            if (otherMembers && otherMembers.length > 0) {
              otherMember = otherMembers[0].profiles;
            }
          }

          return {
            id: chat.id,
            name: chat.name || (otherMember?.display_name || 'Unknown User'),
            is_group: chat.is_group,
            created_at: chat.created_at,
            last_message: messages?.[0] ? {
              content: messages[0].content,
              created_at: messages[0].created_at,
              sender_name: messages[0].profiles?.display_name || 'Unknown'
            } : undefined,
            unread_count: membership.unread_count || 0,
            other_member: otherMember
          };
        })
      );

      setChats(chatsWithDetails);
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

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, user_number, is_online')
        .neq('id', user?.id)
        .order('display_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
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
            // Chat already exists
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

      // Add both users to the chat
      const { error: memberError } = await supabase
        .from('chat_members')
        .insert([
          { chat_id: newChat.id, user_id: user.id },
          { chat_id: newChat.id, user_id: otherUserId }
        ]);

      if (memberError) throw memberError;

      navigate(`/chats/${newChat.id}`);
      setShowNewChatModal(false);
      
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive",
      });
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.display_name.toLowerCase().includes(newChatUser.toLowerCase()) ||
    user.user_number.includes(newChatUser)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Chats</h1>
        <Button
          onClick={() => setShowNewChatModal(true)}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Chats List */}
        <div className="space-y-2">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <Card
                key={chat.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/chats/${chat.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        {chat.is_group ? (
                          <Users className="w-6 h-6 text-blue-600" />
                        ) : (
                          <MessageCircle className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      {chat.other_member?.is_online && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {chat.name}
                        </h3>
                        {chat.last_message && (
                          <span className="text-xs text-gray-500">
                            {new Date(chat.last_message.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      {chat.last_message ? (
                        <p className="text-sm text-gray-600 truncate">
                          {chat.last_message.sender_name}: {chat.last_message.content}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">No messages yet</p>
                      )}
                    </div>
                    
                    {chat.unread_count > 0 && (
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
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
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No chats found</p>
              <p className="text-sm text-gray-500">Start a new conversation!</p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-80 mx-4 max-h-96 overflow-hidden">
            <CardHeader>
              <CardTitle>Start New Chat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Search users by name or number..."
                value={newChatUser}
                onChange={(e) => setNewChatUser(e.target.value)}
              />
              
              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => createDirectChat(user.id)}
                  >
                    <div>
                      <p className="font-medium">{user.display_name}</p>
                      <p className="text-sm text-gray-600">#{user.user_number}</p>
                    </div>
                    {user.is_online && (
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewChatModal(false)}
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
