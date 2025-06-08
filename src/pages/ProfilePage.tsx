
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Edit, LogOut, Gift, Settings, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, profile, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [receivedGifts, setReceivedGifts] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio);
      fetchReceivedGifts();
    }
  }, [profile]);

  const fetchReceivedGifts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          *,
          sender:sender_id(display_name)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setReceivedGifts(data || []);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    }
  };

  const handleSave = async () => {
    await updateProfile({ display_name: displayName, bio });
    setIsEditing(false);
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <User className="w-10 h-10" />
          </div>
          <h1 className="text-xl font-bold">{profile.display_name}</h1>
          <p className="text-purple-100">#{profile.user_number}</p>
          <div className="flex items-center justify-center mt-2">
            <Coins className="w-4 h-4 mr-1" />
            <span className="font-medium">{profile.coin_balance} Coins</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Profile Information</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit className="w-4 h-4 mr-2" />
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    rows={3}
                  />
                </div>
                
                <Button onClick={handleSave} className="w-full">
                  Save Changes
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Display Name</p>
                  <p className="font-medium">{profile.display_name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">User Number</p>
                  <p className="font-medium">#{profile.user_number}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Bio</p>
                  <p className="font-medium">{profile.bio}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gift Showcase */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gift className="w-5 h-5 mr-2" />
              Gift Showcase
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receivedGifts.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {receivedGifts.map((gift) => (
                  <div key={gift.id} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl mb-1">{gift.gift_emoji}</div>
                    <p className="text-xs text-gray-600">{gift.gift_name}</p>
                    <p className="text-xs text-gray-500 mt-1">From {gift.sender?.display_name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No gifts received yet</p>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button 
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center justify-between"
                onClick={() => navigate('/settings')}
              >
                <span>App Settings</span>
                <span className="text-gray-400">›</span>
              </button>
              
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center justify-between">
                <span>Privacy Settings</span>
                <span className="text-gray-400">›</span>
              </button>
              
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center justify-between">
                <span>Notification Preferences</span>
                <span className="text-gray-400">›</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          onClick={logout}
          variant="destructive"
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default ProfilePage;
