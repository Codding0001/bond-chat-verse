
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload } from 'lucide-react';

const ProfilePictureUpload = () => {
  const { profile, updateProfile } = useAuth();
  const [imageUrl, setImageUrl] = useState(profile?.profile_picture || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, we'll just create a local URL
    // In a real app, you'd upload to a cloud storage service
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  const saveProfilePicture = async () => {
    if (!imageUrl) return;

    setLoading(true);
    try {
      await updateProfile({ profile_picture: imageUrl });
      toast({
        title: "Profile picture updated!",
        description: "Your profile picture has been saved.",
      });
    } catch (error) {
      toast({
        title: "Failed to update",
        description: "Could not save profile picture.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="flex flex-col space-y-2 w-full max-w-xs">
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="profile-picture-input"
          />
          <label htmlFor="profile-picture-input">
            <Button variant="outline" className="w-full cursor-pointer" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Choose Photo
              </span>
            </Button>
          </label>

          <Input
            placeholder="Or paste image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <Button
            onClick={saveProfilePicture}
            disabled={!imageUrl || loading}
            className="w-full"
          >
            {loading ? 'Saving...' : 'Save Picture'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureUpload;
