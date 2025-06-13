
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gift, Search, Send, Crown, Zap, Coins, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface UserProfile {
  id: string;
  display_name: string;
  user_number: string;
  profile_picture: string;
  has_legendary_badge: boolean;
  has_ultra_badge: boolean;
}

interface SentGift {
  id: string;
  gift_emoji: string;
  gift_name: string;
  price: number;
  receiver: {
    display_name: string;
  };
}

const GiftsPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [giftQuantity, setGiftQuantity] = useState(1);
  const [myGifts, setMyGifts] = useState<SentGift[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      fetchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery, user]);

  useEffect(() => {
    fetchMyGifts();
  }, [user]);

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, display_name, user_number, profile_picture, has_legendary_badge, has_ultra_badge');

      // Check if searching by user number (starts with #)
      if (searchQuery.startsWith('#')) {
        const userNumber = searchQuery.substring(1);
        query = query.eq('user_number', userNumber);
      } else {
        // Search by display name (case insensitive)
        query = query.ilike('display_name', `%${searchQuery}%`);
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;

      // Include current user in results for self-gifting
      let filteredData = data || [];
      if (profile && !filteredData.find(u => u.id === profile.id)) {
        const currentUserMatches = searchQuery.startsWith('#') 
          ? profile.user_number === searchQuery.substring(1)
          : profile.display_name.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (currentUserMatches) {
          filteredData = [{
            id: profile.id,
            display_name: profile.display_name,
            user_number: profile.user_number,
            profile_picture: profile.profile_picture,
            has_legendary_badge: profile.has_legendary_badge,
            has_ultra_badge: profile.has_ultra_badge
          }, ...filteredData];
        }
      }

      setUsers(filteredData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchMyGifts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          id,
          gift_emoji,
          gift_name,
          price,
          profiles!gifts_receiver_id_fkey(display_name)
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      
      // Transform the data to match the expected interface
      const transformedData = data?.map(gift => ({
        id: gift.id,
        gift_emoji: gift.gift_emoji,
        gift_name: gift.gift_name,
        price: gift.price,
        receiver: {
          display_name: gift.profiles?.display_name || 'Unknown'
        }
      })) || [];
      
      setMyGifts(transformedData);
    } catch (error) {
      console.error('Error fetching my gifts:', error);
    }
  };

  const checkAndUpdateBadges = async (userId: string) => {
    try {
      // Count legendary and ultra gifts received
      const { data: legendaryGifts } = await supabase
        .from('gifts')
        .select('*')
        .eq('receiver_id', userId)
        .eq('is_legendary', true);

      const { data: ultraGifts } = await supabase
        .from('gifts')
        .select('*')
        .eq('receiver_id', userId)
        .eq('gift_type', 'ultra');

      const hasLegendary = (legendaryGifts?.length || 0) > 0;
      const hasUltra = (ultraGifts?.length || 0) > 0;

      // Update profile badges
      await supabase
        .from('profiles')
        .update({ 
          has_legendary_badge: hasLegendary,
          has_ultra_badge: hasUltra
        })
        .eq('id', userId);

    } catch (error) {
      console.error('Error updating badges:', error);
    }
  };

  const sendGift = async () => {
    if (!user || !selectedUser || !selectedGift || giftQuantity < 1) {
      toast({
        title: "Invalid selection",
        description: "Please select a user, gift, and valid quantity.",
        variant: "destructive",
      });
      return;
    }

    const totalCost = selectedGift.price * giftQuantity;
    if ((profile?.coin_balance || 0) < totalCost) {
      toast({
        title: "Insufficient coins",
        description: `You need ${totalCost} coins to send ${giftQuantity} ${selectedGift.name}(s).`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Send gifts in a loop for the specified quantity
      for (let i = 0; i < giftQuantity; i++) {
        await supabase
          .from('gifts')
          .insert({
            sender_id: user.id,
            receiver_id: selectedUser.id,
            gift_emoji: selectedGift.emoji,
            gift_name: selectedGift.name,
            price: selectedGift.price,
            gift_type: selectedGift.type,
            is_legendary: selectedGift.type === 'legendary',
            can_exchange: true
          });
      }

      // Update sender's coin balance
      const newBalance = (profile?.coin_balance || 0) - totalCost;
      await supabase
        .from('profiles')
        .update({ coin_balance: newBalance })
        .eq('id', user.id);

      // Update badges for receiver
      await checkAndUpdateBadges(selectedUser.id);

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          from_user_id: user.id,
          to_user_id: selectedUser.id,
          amount: totalCost,
          transaction_type: 'gift',
          description: `Sent ${giftQuantity}x ${selectedGift.name} to ${selectedUser.display_name}`
        });

      toast({
        title: "Gift sent! 🎁",
        description: `${giftQuantity}x ${selectedGift.name} sent to ${selectedUser.display_name}`,
      });

      setSelectedUser(null);
      setSelectedGift(null);
      setGiftQuantity(1);
      setSearchQuery('');
      fetchMyGifts();
      // Refresh to show new balance
      window.location.reload();
    } catch (error) {
      console.error('Error sending gift:', error);
      toast({
        title: "Failed to send gift",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const availableGifts = [
    // Common gifts (100-500 coins)
    { id: 'gift_heart', name: 'Heart', emoji: '❤️', price: 100, type: 'common', description: 'A small token of affection' },
    { id: 'gift_star', name: 'Star', emoji: '⭐', price: 150, type: 'common', description: 'A symbol of admiration' },
    { id: 'gift_rose', name: 'Rose', emoji: '🌹', price: 200, type: 'common', description: 'A classic romantic gesture' },
    { id: 'gift_balloon', name: 'Balloon', emoji: '🎈', price: 250, type: 'common', description: 'A cheerful and fun gift' },
    { id: 'gift_cake', name: 'Cake', emoji: '🎂', price: 300, type: 'common', description: 'A sweet treat for any occasion' },
    { id: 'gift_clink', name: 'Clink Glasses', emoji: '🥂', price: 350, type: 'common', description: 'Celebrate good times' },

    // Rare gifts (1k-5k coins)
    { id: 'rare_gem', name: 'Gem', emoji: '💎', price: 1000, type: 'rare', description: 'A valuable and precious gift' },
    { id: 'rare_trophy', name: 'Trophy', emoji: '🏆', price: 1500, type: 'rare', description: 'A symbol of achievement' },
    { id: 'rare_guitar', name: 'Guitar', emoji: '🎸', price: 2000, type: 'rare', description: 'For the music lover' },
    { id: 'rare_camera', name: 'Camera', emoji: '📷', price: 2500, type: 'rare', description: 'Capture special moments' },
    { id: 'rare_book', name: 'Book', emoji: '📚', price: 3000, type: 'rare', description: 'A gift of knowledge and wisdom' },
    { id: 'rare_ticket', name: 'Ticket', emoji: '🎫', price: 3500, type: 'rare', description: 'An invitation to adventure' },

    // Legendary gifts (10k+ coins) - with golden background
    { 
      id: 'legendary_dragon', 
      name: 'Legendary Dragon', 
      emoji: '🐉', 
      price: 10000, 
      type: 'legendary',
      description: 'A symbol of power and good fortune'
    },
    { 
      id: 'legendary_unicorn', 
      name: 'Legendary Unicorn', 
      emoji: '🦄', 
      price: 15000, 
      type: 'legendary',
      description: 'A magical and enchanting gift'
    },
    { 
      id: 'legendary_phoenix', 
      name: 'Legendary Phoenix', 
      emoji: '🔥', 
      price: 20000, 
      type: 'legendary',
      description: 'A symbol of rebirth and renewal'
    },
    { 
      id: 'legendary_castle', 
      name: 'Legendary Castle', 
      emoji: '🏰', 
      price: 25000, 
      type: 'legendary',
      description: 'A majestic and grand gesture'
    },
    { 
      id: 'legendary_comet', 
      name: 'Legendary Comet', 
      emoji: '☄️', 
      price: 30000, 
      type: 'legendary',
      description: 'A rare and spectacular gift'
    },
    { 
      id: 'legendary_treasure', 
      name: 'Legendary Treasure', 
      emoji: '💰', 
      price: 35000, 
      type: 'legendary',
      description: 'A gift of untold riches'
    },

    // Ultra gifts (500k+ coins) - with red glowing background
    { 
      id: 'ultra_diamond', 
      name: 'Ultra Diamond', 
      emoji: '💎', 
      price: 500000, 
      type: 'ultra',
      description: 'The ultimate gift of luxury and prestige'
    },
    { 
      id: 'ultra_crown', 
      name: 'Ultra Crown', 
      emoji: '👑', 
      price: 750000, 
      type: 'ultra',
      description: 'Fit for digital royalty'
    },
    { 
      id: 'ultra_phoenix', 
      name: 'Ultra Phoenix', 
      emoji: '🔥', 
      price: 1000000, 
      type: 'ultra',
      description: 'Rise from the ashes with ultimate power'
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white p-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Gift className="w-6 h-6 mr-2" />
          Send a Gift
        </h1>
        <div className="mt-4 text-center">
          <div className="text-4xl font-bold mb-2">{profile?.coin_balance || 0}</div>
          <p className="text-orange-100">Available Coins</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* User Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Select User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder="Search by name or #user_number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            {users.length > 0 ? (
              <div className="space-y-2">
                {users.map((userItem) => (
                  <button
                    key={userItem.id}
                    className={`w-full text-left p-3 rounded-lg hover:bg-muted transition-colors ${
                      selectedUser?.id === userItem.id ? 'bg-secondary' : ''
                    }`}
                    onClick={() => setSelectedUser(userItem)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Avatar className="w-8 h-8 mr-3">
                          <AvatarImage src={userItem.profile_picture} alt={userItem.display_name} />
                          <AvatarFallback>
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium">{userItem.display_name}</span>
                            {userItem.has_legendary_badge && (
                              <Crown className="w-4 h-4 ml-2 text-yellow-600" />
                            )}
                            {userItem.has_ultra_badge && (
                              <Zap className="w-4 h-4 ml-2 text-red-600" />
                            )}
                            {userItem.id === user?.id && (
                              <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">#{userItem.user_number}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <p className="text-muted-foreground text-center py-4">No users found</p>
            ) : (
              <p className="text-muted-foreground text-center py-4">Start typing to search for users</p>
            )}
          </CardContent>
        </Card>

        {/* Gift Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gift className="w-5 h-5 mr-2" />
              Select Gift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {availableGifts.map((gift) => (
                <div
                  key={gift.id}
                  className={`text-center p-3 rounded-lg hover:shadow-md transition-all cursor-pointer relative ${
                    selectedGift?.id === gift.id ? 'ring-2 ring-primary' : ''
                  } ${
                    gift.type === 'legendary'
                      ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 border-2 border-yellow-400'
                      : gift.type === 'ultra'
                      ? 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 border-2 border-red-500 shadow-lg shadow-red-500/25'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => setSelectedGift(gift)}
                >
                  {gift.type === 'legendary' && (
                    <div className="absolute -top-1 -right-1 text-xs">
                      <Crown className="w-3 h-3 text-yellow-600" />
                    </div>
                  )}
                  {gift.type === 'ultra' && (
                    <div className="absolute -top-1 -right-1 text-xs">
                      <Zap className="w-3 h-3 text-red-600 animate-pulse" />
                    </div>
                  )}
                  <div 
                    className={`text-2xl mb-1 ${
                      gift.type === 'legendary' ? 'animate-pulse' : gift.type === 'ultra' ? 'animate-bounce' : ''
                    }`}
                  >
                    {gift.emoji}
                  </div>
                  <p className="text-sm font-medium">{gift.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gift.description}</p>
                  <div className="mt-2 flex items-center justify-center">
                    <Coins className="w-3 h-3 mr-1" />
                    <span className="text-xs font-bold">{gift.price.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quantity and Send */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="w-5 h-5 mr-2" />
              Send Gift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <Input
                type="number"
                placeholder="Enter quantity"
                value={giftQuantity}
                onChange={(e) => setGiftQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
              />
            </div>
            
            {selectedUser && selectedGift && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Total Cost:</strong> {(selectedGift.price * giftQuantity).toLocaleString()} coins
                </p>
                <p className="text-sm">
                  <strong>Sending to:</strong> {selectedUser.display_name}
                  {selectedUser.id === user?.id && ' (yourself)'}
                </p>
              </div>
            )}
            
            <Button
              onClick={sendGift}
              disabled={loading || !selectedUser || !selectedGift || giftQuantity < 1}
              className="w-full"
            >
              {loading
                ? 'Sending...'
                : selectedUser && selectedGift
                ? `Send ${giftQuantity}x ${selectedGift.name} to ${selectedUser.display_name}`
                : 'Select user and gift to send'}
            </Button>
          </CardContent>
        </Card>

        {/* My Recent Gifts */}
        <Card>
          <CardHeader>
            <CardTitle>My Recent Gifts</CardTitle>
          </CardHeader>
          <CardContent>
            {myGifts.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {myGifts.map((gift) => (
                  <div key={gift.id} className="text-center p-3 rounded-lg bg-muted">
                    <div className="text-2xl mb-1">{gift.gift_emoji}</div>
                    <p className="text-sm font-medium">{gift.gift_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      To: {gift.receiver?.display_name || 'Unknown'}
                    </p>
                    <div className="mt-1 flex items-center justify-center">
                      <Coins className="w-3 h-3 mr-1" />
                      <span className="text-xs">{gift.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No gifts sent yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GiftsPage;
