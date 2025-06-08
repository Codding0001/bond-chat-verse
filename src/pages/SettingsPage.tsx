
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useSettings } from '../contexts/SettingsContext';
import { ArrowLeft, Moon, Sun, Palette, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const [wallpaperColor, setWallpaperColor] = useState(settings?.chat_wallpaper_color || 'rgba(255, 255, 255, 1)');

  const predefinedColors = [
    'rgba(255, 255, 255, 1)', // White
    'rgba(243, 244, 246, 1)', // Light Gray
    'rgba(219, 234, 254, 1)', // Light Blue
    'rgba(220, 252, 231, 1)', // Light Green
    'rgba(254, 226, 226, 1)', // Light Red
    'rgba(253, 230, 138, 1)', // Light Yellow
    'rgba(237, 233, 254, 1)', // Light Purple
    'rgba(255, 228, 230, 1)', // Light Pink
  ];

  const handleColorChange = (color: string) => {
    setWallpaperColor(color);
    updateSettings({ chat_wallpaper_color: color });
  };

  const parseRgba = (rgba: string) => {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] ? parseFloat(match[4]) : 1
      };
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  const rgbaToString = (r: number, g: number, b: number, a: number) => {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  const handleCustomColorChange = (component: 'r' | 'g' | 'b' | 'a', value: string) => {
    const current = parseRgba(wallpaperColor);
    const numValue = component === 'a' ? parseFloat(value) : parseInt(value);
    
    const newColor = rgbaToString(
      component === 'r' ? numValue : current.r,
      component === 'g' ? numValue : current.g,
      component === 'b' ? numValue : current.b,
      component === 'a' ? numValue : current.a
    );
    
    setWallpaperColor(newColor);
    updateSettings({ chat_wallpaper_color: newColor });
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentRgba = parseRgba(wallpaperColor);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/profile')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {settings.theme === 'dark' ? <Moon className="w-5 h-5 mr-2" /> : <Sun className="w-5 h-5 mr-2" />}
              Theme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-gray-600">Switch between light and dark theme</p>
              </div>
              <Switch
                checked={settings.theme === 'dark'}
                onCheckedChange={(checked) => updateSettings({ theme: checked ? 'dark' : 'light' })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Chat Wallpaper */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Chat Wallpaper
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium mb-3">Predefined Colors</p>
              <div className="grid grid-cols-4 gap-3">
                {predefinedColors.map((color, index) => (
                  <button
                    key={index}
                    className={`w-12 h-12 rounded-lg border-2 ${
                      wallpaperColor === color ? 'border-blue-500' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="font-medium mb-3">Custom Color (RGBA)</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Red (0-255)</label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={currentRgba.r}
                      onChange={(e) => handleCustomColorChange('r', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Green (0-255)</label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={currentRgba.g}
                      onChange={(e) => handleCustomColorChange('g', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Blue (0-255)</label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={currentRgba.b}
                      onChange={(e) => handleCustomColorChange('b', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Alpha (0-1)</label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={currentRgba.a}
                      onChange={(e) => handleCustomColorChange('a', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium">Preview:</span>
                  <div 
                    className="w-16 h-8 rounded border"
                    style={{ backgroundColor: wallpaperColor }}
                  />
                  <span className="text-xs text-gray-500">{wallpaperColor}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {settings.notification_sound ? <Volume2 className="w-5 h-5 mr-2" /> : <VolumeX className="w-5 h-5 mr-2" />}
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Message Sounds</p>
                <p className="text-sm text-gray-600">Play sound when receiving messages</p>
              </div>
              <Switch
                checked={settings.notification_sound}
                onCheckedChange={(checked) => updateSettings({ notification_sound: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
