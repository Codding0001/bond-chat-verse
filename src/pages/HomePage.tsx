
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, Gift, Phone, User, Coins, Crown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const HomePage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden">
            {profile.profile_picture ? (
              <img 
                src={profile.profile_picture} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10" />
            )}
          </div>
          <h1 className="text-xl font-bold flex items-center justify-center">
            Welcome, {profile.display_name}!
            {profile.has_legendary_badge && (
              <Badge className="ml-2 bg-yellow-500 text-black animate-pulse">
                <Crown className="w-3 h-3 mr-1" />
                LEGENDARY
              </Badge>
            )}
            {profile.has_ultra_badge && (
              <Badge className="ml-2 bg-red-500 text-white animate-pulse">
                <Zap className="w-3 h-3 mr-1" />
                ULTRA
              </Badge>
            )}
          </h1>
          <p className="text-blue-100">#{profile.user_number}</p>
          <div className="flex items-center justify-center mt-2">
            <Coins className="w-4 h-4 mr-1" />
            <span className="font-medium">{profile.coin_balance} Coins</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/chats')}
                className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <MessageCircle className="w-8 h-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium">Chats</span>
              </button>
              
              <button
                onClick={() => navigate('/gifts')}
                className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
              >
                <Gift className="w-8 h-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium">Send Gifts</span>
              </button>
              
              <button
                onClick={() => navigate('/calls')}
                className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <Phone className="w-8 h-8 text-green-600 mb-2" />
                <span className="text-sm font-medium">Calls</span>
              </button>
              
              <button
                onClick={() => navigate('/profile')}
                className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <User className="w-8 h-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium">Profile</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle>ChatApp Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <MessageCircle className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium">Real-time Messaging</p>
                  <p className="text-sm text-muted-foreground">Chat with friends instantly</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Gift className="w-5 h-5 text-orange-600 mr-3" />
                <div>
                  <p className="font-medium">Gift System</p>
                  <p className="text-sm text-muted-foreground">Send virtual gifts to show appreciation</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="font-medium">Voice & Video Calls</p>
                  <p className="text-sm text-muted-foreground">Connect through high-quality calls</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Coins className="w-5 h-5 text-yellow-600 mr-3" />
                <div>
                  <p className="font-medium">Coin System</p>
                  <p className="text-sm text-muted-foreground">Earn and spend coins on gifts and features</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
