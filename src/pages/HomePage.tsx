
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Gift, Wallet, Phone, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    { icon: MessageSquare, label: 'New Chat', action: () => navigate('/chats') },
    { icon: Phone, label: 'Make Call', action: () => navigate('/calls') },
    { icon: Gift, label: 'Send Gift', action: () => navigate('/gifts') },
    { icon: Camera, label: 'Add Story', action: () => console.log('Add story') },
  ];

  const stats = [
    { label: 'Coin Balance', value: user?.coinBalance || 0, icon: Wallet },
    { label: 'User Number', value: `#${user?.userNumber}`, icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold">
              {user?.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold">Welcome back, {user?.displayName}!</h1>
            <p className="text-blue-100">#{user?.userNumber}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="p-4">
                <stat.icon className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <action.icon className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">{action.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Gift className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Gift received</p>
                  <p className="text-xs text-gray-500">Rose Bouquet from Alice</p>
                </div>
                <span className="text-xs text-gray-400">2h ago</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New message</p>
                  <p className="text-xs text-gray-500">From Bob in Tech Group</p>
                </div>
                <span className="text-xs text-gray-400">1h ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
