import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gift, Search, Send, Crown, Zap, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const GiftsPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [giftQuantity, setGiftQuantity] = useState(1);
  const [myGifts, setMyGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchMyGifts();
  }, [user]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id)
        .ilike('display_name', `%${searchQuery}%`)
        .limit(5);

      if (error) throw error;
      setUsers(data || []);
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
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setMyGifts(data || []);
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
        .eq('is_legendary', true)
        .eq('can_exchange', true);

      const { data: ultraGifts } = await supabase
        .from('gifts')
        .select('*')
        .eq('receiver_id', userId)
        .eq('gift_type', 'ultra')
        .eq('can_exchange', true);

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
            gift_value: selectedGift.price,
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

  const exchangeGift = async (giftId: string, giftValue: number, giftType: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Mark gift as exchanged
      await supabase
        .from('gifts')
        .update({ can_exchange: false })
        .eq('id', giftId);

      // Add coins to user's balance (50% of gift value)
      const exchangeValue = Math.floor(giftValue * 0.5);
      const newBalance = (profile?.coin_balance || 0) + exchangeValue;
      
      await supabase
        .from('profiles')
        .update({ coin_balance: newBalance })
        .eq('id', user.id);

      // Update badges after exchange
      await checkAndUpdateBadges(user.id);

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          to_user_id: user.id,
          amount: exchangeValue,
          transaction_type: 'gift_exchange',
          description: `Exchanged gift for ${exchangeValue} coins`
        });

      toast({
        title: "Gift exchanged! 🪙",
        description: `You received ${exchangeValue} coins`,
      });

      fetchMyGifts();
      // Refresh to show new balance and badges
      window.location.reload();
    } catch (error) {
      console.error('Error exchanging gift:', error);
      toast({
        title: "Failed to exchange gift",
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

    // Legendary gifts (10k+ coins)
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

    // Ultra gifts (500k+ coins)
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
              placeholder="Search for a user"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchUsers();
              }}
            />
            
            {users.length > 0 ? (
              <div className="space-y-2">
                {users.map((userItem) => (
                  <button
                    key={userItem.id}
                    className={`w-full text-left p-3 rounded-lg hover:bg-muted ${
                      selectedUser?.id === userItem.id ? 'bg-secondary' : ''
                    }`}
                    onClick={() => setSelectedUser(userItem)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        {userItem.display_name}
                      </div>
                      <span className="text-xs text-muted-foreground">#{userItem.user_number}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No users found</p>
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
                  className={`text-center p-3 rounded-lg hover:shadow-md transition-shadow cursor-pointer relative ${
                    selectedGift?.id === gift.id ? 'bg-secondary' : 'bg-muted'
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
                      <Zap className="w-3 h-3 text-red-600" />
                    </div>
                  )}
                  <div className="text-2xl mb-1">{gift.emoji}</div>
                  <p className="text-sm font-medium">{gift.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{gift.description}</p>
                  <div className="mt-2">
                    <Coins className="w-4 h-4 inline-block mr-1" />
                    {gift.price.toLocaleString()}
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
                onChange={(e) => setGiftQuantity(parseInt(e.target.value))}
                min="1"
              />
            </div>
            
            <Button
              onClick={sendGift}
              disabled={loading || !selectedUser || !selectedGift || giftQuantity < 1}
              className="w-full"
            >
              {loading
                ? 'Sending...'
                : `Send ${giftQuantity} ${selectedGift?.name}(s) to ${selectedUser?.display_name}`}
            </Button>
          </CardContent>
        </Card>

        {/* My Gifts */}
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
                      To {gift.receiver_id}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No gifts sent yet</p>
            )}
          </CardContent>
        </Card>

        {/* Exchange Gifts */}
        <Card>
          <CardHeader>
            <CardTitle>Exchange Gifts</CardTitle>
          </CardHeader>
          <CardContent>
            {/* List of received gifts that can be exchanged */}
            {profile && (
              availableGifts.map((gift) => (
                <div key={gift.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <div className="text-2xl">{gift.emoji}</div>
                    <p className="text-sm font-medium">{gift.name}</p>
                    <p className="text-xs text-muted-foreground">Value: {gift.price} coins</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exchangeGift(gift.id, gift.price, gift.type)}
                    disabled={loading}
                  >
                    Exchange
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GiftsPage;
