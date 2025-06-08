
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import { User, Edit, LogOut, Gift, Settings } from 'lucide-react';

const ProfilePage = () => {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');

  const handleSave = () => {
    updateProfile({ displayName, bio });
    setIsEditing(false);
  };

  const receivedGifts = [
    { emoji: '💐', from: 'Alice', message: 'Thank you!', count: 3 },
    { emoji: '🌹', from: 'Bob', message: 'You\'re amazing!', count: 2 },
    { emoji: '🧸', from: 'Charlie', message: 'Hope you like this!', count: 1 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <User className="w-10 h-10" />
          </div>
          <h1 className="text-xl font-bold">{user?.displayName}</h1>
          <p className="text-purple-100">#{user?.userNumber}</p>
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
                  <p className="font-medium">{user?.displayName}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">User Number</p>
                  <p className="font-medium">#{user?.userNumber}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Bio</p>
                  <p className="font-medium">{user?.bio}</p>
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
            <div className="grid grid-cols-3 gap-4">
              {receivedGifts.map((gift, index) => (
                <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-1">{gift.emoji}</div>
                  <p className="text-xs text-gray-600">x{gift.count}</p>
                  <p className="text-xs text-gray-500 mt-1">From {gift.from}</p>
                </div>
              ))}
            </div>
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
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center justify-between">
                <span>Privacy Settings</span>
                <span className="text-gray-400">›</span>
              </button>
              
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center justify-between">
                <span>Notification Preferences</span>
                <span className="text-gray-400">›</span>
              </button>
              
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center justify-between">
                <span>Story Settings</span>
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
