
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';

const PrivacyPage = () => {
  const navigate = useNavigate();

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
          <h1 className="text-xl font-bold text-foreground">Privacy Settings</h1>
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
                  <h3 className="font-medium">Online Status</h3>
                  <p className="text-sm text-muted-foreground">Show when you're online</p>
                </div>
                <Button variant="outline" size="sm">
                  Visible
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
