
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ChatsPage = () => {
  const chats = [
    {
      id: '1',
      name: 'Alice Johnson',
      lastMessage: 'Thanks for the gift! 🌹',
      time: '2m ago',
      unread: 2,
      isGroup: false,
      avatar: '👩',
    },
    {
      id: '2',
      name: 'Tech Group',
      lastMessage: 'Bob: Any updates on the project?',
      time: '1h ago',
      unread: 0,
      isGroup: true,
      avatar: '💻',
    },
    {
      id: '3',
      name: 'Mike Chen',
      lastMessage: 'Let\'s schedule a call tomorrow',
      time: '3h ago',
      unread: 1,
      isGroup: false,
      avatar: '👨',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Chats</h1>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search chats..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-2">
          {chats.map((chat) => (
            <Card key={chat.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                      {chat.avatar}
                    </div>
                    {chat.isGroup && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <Users className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">{chat.name}</h3>
                      <span className="text-xs text-gray-500">{chat.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                  </div>
                  
                  {chat.unread > 0 && (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">{chat.unread}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatsPage;
