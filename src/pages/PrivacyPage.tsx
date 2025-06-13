
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Camera, Settings, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';

const PrivacyPage = () => {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const [profileBgColor, setProfileBgColor] = useState(settings?.profile_bg_color || '#8B5CF6');

  const profileBackgroundColors = [
    '#8B5CF6', // Purple (default like the image)
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#EC4899', // Pink
    '#8B5A2B', // Brown
    '#6B7280', // Gray
    '#000000', // Black
    '#FF6B6B', // Coral
    '#4ECDC4', // Teal
    '#45B7D1', // Sky Blue
  ];

  const handleProfileBgChange = (color: string) => {
    setProfileBgColor(color);
    updateSettings({ profile_bg_color: color });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card p-4 border-b border-border flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/profile')}
          className="mr-3"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          <h1 className="text-xl font-bold text-foreground">Privacy & Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Picture Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Profile Picture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfilePictureUpload />
          </CardContent>
        </Card>

        {/* Profile Background Color */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Profile Background
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium mb-3">Choose your profile background color</p>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {profileBackgroundColors.map((color, index) => (
                  <button
                    key={index}
                    className={`w-12 h-12 rounded-lg border-2 ${
                      profileBgColor === color ? 'border-white ring-2 ring-blue-500' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleProfileBgChange(color)}
                  />
                ))}
              </div>
              
              {/* Preview */}
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <div 
                  className="w-full h-32 rounded-lg flex items-center justify-center text-white font-bold text-lg relative overflow-hidden"
                  style={{ 
                    background: `linear-gradient(135deg, ${profileBgColor}, ${profileBgColor}CC)`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20"></div>
                  <div className="relative z-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 mx-auto mb-2 flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-sm">Your Name</p>
                    <p className="text-xs opacity-80">#123456</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              App Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/settings')}
            >
              Theme & Notifications
            </Button>
          </CardContent>
        </Card>

        {/* Privacy Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <h3 className="font-medium">Profile Visibility</h3>
                  <p className="text-sm text-muted-foreground">Who can see your profile information</p>
                </div>
                <Button variant="outline" size="sm">
                  Everyone
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <h3 className="font-medium">Gift Privacy</h3>
                  <p className="text-sm text-muted-foreground">Who can send you gifts</p>
                </div>
                <Button variant="outline" size="sm">
                  Everyone
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data & Security */}
        <Card>
          <CardHeader>
            <CardTitle>Data & Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="w-full text-left p-3 hover:bg-muted rounded-lg flex items-center justify-between">
                <span>Download My Data</span>
                <span className="text-muted-foreground">›</span>
              </button>
              
              <button className="w-full text-left p-3 hover:bg-muted rounded-lg flex items-center justify-between">
                <span>Change Password</span>
                <span className="text-muted-foreground">›</span>
              </button>
              
              <button className="w-full text-left p-3 hover:bg-muted rounded-lg flex items-center justify-between text-destructive">
                <span>Delete Account</span>
                <span className="text-muted-foreground">›</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPage;
