
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Users, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Chat {
  id: string;
  name: string;
  is_group: boolean;
  created_at: string;
  last_message?: {
    content: string;
    created_at: string;
    sender: {
      display_name: string;
    };
  };
  unread_count: number;
}

const ChatsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newChatUserNumber, setNewChatUserNumber] = useState('');
  const [showNewChatInput, setShowNewChatInput] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChats();
      
      // Set up real-time chat updates
      const channel = supabase
        .channel('chats-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages'
        }, () => {
          fetchChats();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchChats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_members')
        .select(`
          unread_count,
          chat_id,
          chats!inner(
            id,
            name,
            is_group,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const chatList = await Promise.all(
        (data || []).map(async (member) => {
          const chat = member.chats;
          
          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select(`
              content,
              created_at,
              sender:sender_id(display_name)
            `)
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...chat,
            last_message: lastMessage,
            unread_count: member.unread_count || 0
          };
        })
      );

      setChats(chatList);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDirectChat = async () => {
    if (!newChatUserNumber || !user) return;

    try {
      // Find user by user number
      const { data: recipient, error: recipientError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_number', newChatUserNumber)
        .single();

      if (recipientError || !recipient) {
        toast({
          title: "User not found",
          description: "Could not find user with that number",
          variant: "destructive",
        });
        return;
      }

      if (recipient.id === user.id) {
        toast({
          title: "Cannot chat with yourself",
          description: "You cannot create a chat with yourself",
          variant: "destructive",
        });
        return;
      }

      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          chats!inner(id, is_group)
        `)
        .eq('user_id', user.id);

      const existingDirectChat = await Promise.all(
        (existingChat || []).map(async (member) => {
          if (!member.chats.is_group) {
            const { data: otherMembers } = await supabase
              .from('chat_members')
              .select('user_id')
              .eq('chat_id', member.chat_id)
              .neq('user_id', user.id);

            if (otherMembers?.some(m => m.user_id === recipient.id)) {
              return member.chat_id;
            }
          }
          return null;
        })
      );

      const existingChatId = existingDirectChat.find(id => id !== null);

      if (existingChatId) {
        navigate(`/chats/${existingChatId}`);
        setNewChatUserNumber('');
        setShowNewChatInput(false);
        return;
      }

      // Create new chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: `${recipient.display_name}`,
          is_group: false,
          created_by: user.id
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add both users as members
      const { error: membersError } = await supabase
        .from('chat_members')
        .insert([
          { chat_id: newChat.id, user_id: user.id },
          { chat_id: newChat.id, user_id: recipient.id }
        ]);

      if (membersError) throw membersError;

      navigate(`/chats/${newChat.id}`);
      setNewChatUserNumber('');
      setShowNewChatInput(false);

    } catch (error: any) {
      toast({
        title: "Failed to create chat",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Chats</h1>
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowNewChatInput(!showNewChatInput)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search chats..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {showNewChatInput && (
          <div className="flex space-x-2">
            <Input
              placeholder="Enter user number (e.g. 123456)"
              value={newChatUserNumber}
              onChange={(e) => setNewChatUserNumber(e.target.value)}
              maxLength={6}
              className="flex-1"
            />
            <Button onClick={createDirectChat} size="sm">
              Start Chat
            </Button>
          </div>
        )}
      </div>

      <div className="p-4">
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
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                        {chat.is_group ? (
                          <Users className="w-6 h-6 text-gray-600" />
                        ) : (
                          chat.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {chat.is_group && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <Users className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">{chat.name}</h3>
                        <span className="text-xs text-gray-500">
                          {chat.last_message ? 
                            new Date(chat.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                            new Date(chat.created_at).toLocaleDateString()
                          }
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {chat.last_message ? 
                          `${chat.last_message.sender.display_name}: ${chat.last_message.content}` :
                          'No messages yet'
                        }
                      </p>
                    </div>
                    
                    {chat.unread_count > 0 && (
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">{chat.unread_count}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No chats yet</p>
              <p className="text-sm text-gray-400">Start a new chat by clicking the + button</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatsPage;
