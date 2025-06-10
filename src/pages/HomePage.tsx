
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Phone, Users, Gift, Coins, TrendingUp } from 'lucide-react';

const HomePage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalChats: 0,
    unreadMessages: 0,
    totalCalls: 0,
    onlineUsers: 0
  });
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch chat statistics
      const { data: chatMembers } = await supabase
        .from('chat_members')
        .select('chat_id, unread_count')
        .eq('user_id', user.id);

      const totalChats = chatMembers?.length || 0;
      const unreadMessages = chatMembers?.reduce((sum, member) => sum + (member.unread_count || 0), 0) || 0;

      // Get call logs from localStorage for now
      const savedLogs = localStorage.getItem(`call_logs_${user.id}`);
      const callLogs = savedLogs ? JSON.parse(savedLogs) : [];
      const totalCalls = callLogs.length;

      // Fetch online users count
      const { data: onlineProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_online', true);

      const onlineUsers = onlineProfiles?.length || 0;

      setStats({ totalChats, unreadMessages, totalCalls, onlineUsers });

      // Fetch recent chats
      const { data: recentChatData } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          chats (
            id,
            name,
            is_group,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(5);

      if (recentChatData) {
        const chatsWithDetails = await Promise.all(
          recentChatData.map(async (item: any) => {
            const chat = item.chats;
            
            // Get other member for direct chats
            if (!chat.is_group) {
              const { data: otherMembers } = await supabase
                .from('chat_members')
                .select(`
                  user_id,
                  profiles (display_name, is_online)
                `)
                .eq('chat_id', chat.id)
                .neq('user_id', user.id);

              if (otherMembers && otherMembers.length > 0) {
                chat.other_member = otherMembers[0].profiles;
                chat.name = chat.other_member.display_name;
              }
            }

            return chat;
          })
        );

        setRecentChats(chatsWithDetails);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-blue-100">{profile?.display_name}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center">
              <Coins className="w-5 h-5 mr-2" />
              <span className="text-xl font-bold">{profile?.coin_balance || 0}</span>
            </div>
            <p className="text-blue-100 text-sm">Coins</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/chats')}>
            <CardContent className="p-4 text-center">
              <MessageCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalChats}</p>
              <p className="text-sm text-gray-600">Total Chats</p>
              {stats.unreadMessages > 0 && (
                <p className="text-xs text-red-600">{stats.unreadMessages} unread</p>
              )}
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/calls')}>
            <CardContent className="p-4 text-center">
              <Phone className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
              <p className="text-sm text-gray-600">Total Calls</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.onlineUsers}</p>
              <p className="text-sm text-gray-600">Online Users</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/gifts')}>
            <CardContent className="p-4 text-center">
              <Gift className="w-8 h-8 text-pink-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">🎁</p>
              <p className="text-sm text-gray-600">Send Gifts</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => navigate('/chats')} 
              className="w-full justify-start"
              variant="outline"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Start New Chat
            </Button>
            <Button 
              onClick={() => navigate('/calls')} 
              className="w-full justify-start"
              variant="outline"
            >
              <Phone className="w-4 h-4 mr-2" />
              Make a Call
            </Button>
            <Button 
              onClick={() => navigate('/wallet')} 
              className="w-full justify-start"
              variant="outline"
            >
              <Coins className="w-4 h-4 mr-2" />
              View Wallet
            </Button>
          </CardContent>
        </Card>

        {/* Recent Chats */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Chats</CardTitle>
          </CardHeader>
          <CardContent>
            {recentChats.length > 0 ? (
              <div className="space-y-3">
                {recentChats.map((chat) => (
                  <div
                    key={chat.id}
                    className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                    onClick={() => navigate(`/chats/${chat.id}`)}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        {chat.is_group ? (
                          <Users className="w-5 h-5 text-blue-600" />
                        ) : (
                          <MessageCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      {chat.other_member?.is_online && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{chat.name || 'Unnamed Chat'}</p>
                      <p className="text-sm text-gray-600">
                        {chat.is_group ? 'Group Chat' : 'Direct Message'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent chats</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
