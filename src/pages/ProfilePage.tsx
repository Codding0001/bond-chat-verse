
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Gift, LogOut, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';

interface GiftData {
  gift_name: string;
  gift_emoji: string;
  price: number;
  count: number;
  sender_name: string;
  is_legendary: boolean;
}

const ProfilePage = () => {
  const { user, profile, updateProfile, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [gifts, setGifts] = useState<GiftData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      fetchGifts();
    }
  }, [profile]);

  const fetchGifts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          gift_name,
          gift_emoji,
          price,
          is_legendary,
          profiles:sender_id (display_name)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const giftMap = new Map();
      
      (data || []).forEach((gift: any) => {
        const key = `${gift.gift_name}-${gift.gift_emoji}`;
        if (giftMap.has(key)) {
          const existing = giftMap.get(key);
          existing.count += 1;
        } else {
          giftMap.set(key, {
            gift_name: gift.gift_name,
            gift_emoji: gift.gift_emoji,
            price: gift.price,
            count: 1,
            sender_name: gift.profiles?.display_name || 'Unknown',
            is_legendary: gift.is_legendary
          });
        }
      });

      setGifts(Array.from(giftMap.values()));
    } catch (error) {
      console.error('Error fetching gifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      await updateProfile({
        display_name: displayName,
        bio: bio
      });

      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Profile</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <ProfilePictureUpload />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h2 className="text-xl font-bold">{profile?.display_name}</h2>
                  {profile?.has_legendary_badge && (
                    <Badge className="bg-yellow-500 text-black">
                      <Crown className="w-3 h-3 mr-1" />
                      Legendary
                    </Badge>
                  )}
                  {profile?.has_ultra_badge && (
                    <Badge className="bg-red-500 text-white animate-pulse">
                      <Zap className="w-3 h-3 mr-1" />
                      Ultra
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">#{profile?.user_number}</p>
                <p className="text-sm text-muted-foreground">
                  Coins: {profile?.coin_balance || 0}
                </p>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Display Name</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter display name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Bio</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSave} className="flex-1">
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(profile?.display_name || '');
                      setBio(profile?.bio || '');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Display Name</h3>
                  <p>{profile?.display_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p>{profile?.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">User Number</h3>
                  <p>#{profile?.user_number}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Bio</h3>
                  <p>{profile?.bio}</p>
                </div>
                <Button onClick={() => setIsEditing(true)} className="w-full">
                  Edit Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Settings & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/privacy')}
            >
              <Shield className="w-4 h-4 mr-2" />
              Privacy & Settings
            </Button>
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
            {gifts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {gifts.slice(0, 3).map((gift, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 flex items-center justify-between ${
                      gift.is_legendary 
                        ? 'border-yellow-400 bg-yellow-50' 
                        : 'border-red-400 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{gift.gift_emoji}</div>
                      <div>
                        <div className="font-medium">
                          {gift.count > 1 ? `${gift.count}x ` : ''}{gift.gift_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          From {gift.sender_name}
                        </div>
                      </div>
                    </div>
                    {gift.is_legendary && (
                      <Badge className="bg-yellow-500 text-black">
                        <Crown className="w-3 h-3 mr-1" />
                        Legendary
                      </Badge>
                    )}
                  </div>
                ))}
                
                {gifts.length > 3 && (
                  <div className="text-center p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                    <p className="text-muted-foreground">
                      +{gifts.length - 3} more gifts
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No gifts received yet</p>
                <p className="text-sm text-muted-foreground">
                  Gifts you receive will be displayed here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
