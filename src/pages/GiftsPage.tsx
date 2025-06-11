
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Gift, Crown, Zap, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GiftType {
  id: string;
  name: string;
  emoji: string;
  price: number;
  type: 'normal' | 'legendary' | 'ultra';
  description: string;
}

const giftTypes: GiftType[] = [
  { id: '1', name: 'Rose', emoji: '🌹', price: 10, type: 'normal', description: 'A beautiful rose' },
  { id: '2', name: 'Heart', emoji: '❤️', price: 25, type: 'normal', description: 'Love and affection' },
  { id: '3', name: 'Diamond', emoji: '💎', price: 100, type: 'normal', description: 'Precious and rare' },
  { id: '4', name: 'Crown', emoji: '👑', price: 50000, type: 'legendary', description: 'Royal treatment - Grants Legendary Badge!' },
  { id: '5', name: 'Golden Star', emoji: '⭐', price: 75000, type: 'legendary', description: 'Shining bright - Grants Legendary Badge!' },
  { id: '6', name: 'Fire Phoenix', emoji: '🔥', price: 500000, type: 'ultra', description: 'Ultimate power - Grants Ultra Badge!' },
  { id: '7', name: 'Lightning Bolt', emoji: '⚡', price: 750000, type: 'ultra', description: 'Electric energy - Grants Ultra Badge!' }
];

const GiftsPage = () => {
  const { user, profile, updateCoins } = useAuth();
  const { toast } = useToast();
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [receivedGifts, setReceivedGifts] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchReceivedGifts();
    }
  }, [user]);

  useEffect(() => {
    if (searchUser.length >= 3) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchUser]);

  const fetchReceivedGifts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          *,
          sender:sender_id(display_name, profile_picture)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceivedGifts(data || []);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchUser || searchUser.length < 3) return;
    
    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, user_number, is_online, profile_picture, has_legendary_badge, has_ultra_badge')
        .neq('id', user?.id)
        .or(`display_name.ilike.%${searchUser}%,user_number.ilike.%${searchUser}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const sendGift = async () => {
    if (!selectedGift || !selectedUser || !user || !profile) return;

    const totalCost = selectedGift.price * quantity;
    
    if (profile.coin_balance < totalCost) {
      toast({
        title: "Insufficient coins",
        description: `You need ${totalCost} coins but only have ${profile.coin_balance}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Send multiple gifts based on quantity
      const gifts = Array.from({ length: quantity }, () => ({
        sender_id: user.id,
        receiver_id: selectedUser.id,
        gift_name: selectedGift.name,
        gift_emoji: selectedGift.emoji,
        gift_type: selectedGift.type,
        price: selectedGift.price,
        message: message || null,
        is_legendary: selectedGift.type === 'legendary',
        can_exchange: true
      }));

      const { error: giftError } = await supabase
        .from('gifts')
        .insert(gifts);

      if (giftError) throw giftError;

      // Deduct coins from sender
      await updateCoins(-totalCost);

      // If legendary or ultra gift, update receiver's badge
      if (selectedGift.type === 'legendary') {
        await supabase
          .from('profiles')
          .update({ has_legendary_badge: true })
          .eq('id', selectedUser.id);
      } else if (selectedGift.type === 'ultra') {
        await supabase
          .from('profiles')
          .update({ has_ultra_badge: true })
          .eq('id', selectedUser.id);
      }

      toast({
        title: "Gift sent!",
        description: `${quantity}x ${selectedGift.name} sent to ${selectedUser.display_name}`,
      });

      setSelectedGift(null);
      setSelectedUser(null);
      setMessage('');
      setQuantity(1);
      setSearchUser('');
      setSearchResults([]);
      fetchReceivedGifts();
    } catch (error: any) {
      toast({
        title: "Failed to send gift",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exchangeGift = async (giftId: string, giftPrice: number, giftType: string) => {
    try {
      const { error } = await supabase
        .from('gifts')
        .update({ can_exchange: false })
        .eq('id', giftId);

      if (error) throw error;

      await updateCoins(Math.floor(giftPrice * 0.5));

      // Check if user should lose badges after exchange
      if (giftType === 'legendary' || giftType === 'ultra') {
        const { data: remainingGifts } = await supabase
          .from('gifts')
          .select('gift_type')
          .eq('receiver_id', user?.id)
          .eq('can_exchange', true)
          .in('gift_type', ['legendary', 'ultra']);

        const hasLegendary = remainingGifts?.some(g => g.gift_type === 'legendary');
        const hasUltra = remainingGifts?.some(g => g.gift_type === 'ultra');

        await supabase
          .from('profiles')
          .update({ 
            has_legendary_badge: hasLegendary || false,
            has_ultra_badge: hasUltra || false
          })
          .eq('id', user?.id);
      }

      toast({
        title: "Gift exchanged!",
        description: `Received ${Math.floor(giftPrice * 0.5)} coins`,
      });

      fetchReceivedGifts();
    } catch (error: any) {
      toast({
        title: "Exchange failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getGiftCardStyle = (type: string) => {
    switch (type) {
      case 'legendary':
        return 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 border-yellow-400';
      case 'ultra':
        return 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 border-red-500 animate-pulse';
      default:
        return 'bg-card border-border';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
        <div className="text-center">
          <Gift className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Gifts</h1>
          <p className="text-pink-100">Send amazing gifts to your friends</p>
          <div className="flex items-center justify-center mt-2">
            <Coins className="w-4 h-4 mr-1" />
            <span className="font-medium">{profile?.coin_balance || 0} Coins</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Gift Types */}
        <Card>
          <CardHeader>
            <CardTitle>Choose a Gift</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {giftTypes.map((gift) => (
                <Card
                  key={gift.id}
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    selectedGift?.id === gift.id ? 'ring-2 ring-primary' : ''
                  } ${getGiftCardStyle(gift.type)}`}
                  onClick={() => setSelectedGift(gift)}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`text-3xl mb-2 ${gift.type === 'ultra' ? 'animate-bounce' : ''}`}>
                      {gift.emoji}
                    </div>
                    <h3 className="font-medium">{gift.name}</h3>
                    <div className="flex items-center justify-center mt-1">
                      <Coins className="w-3 h-3 mr-1" />
                      <span className="text-sm font-medium">{gift.price.toLocaleString()}</span>
                    </div>
                    {gift.type === 'legendary' && (
                      <Badge className="mt-1 bg-yellow-500 text-black">
                        <Crown className="w-3 h-3 mr-1" />
                        Legendary
                      </Badge>
                    )}
                    {gift.type === 'ultra' && (
                      <Badge className="mt-1 bg-red-500 text-white animate-pulse">
                        <Zap className="w-3 h-3 mr-1" />
                        Ultra
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{gift.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quantity Selection */}
        {selectedGift && (
          <Card>
            <CardHeader>
              <CardTitle>Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                  min="1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
                <div className="text-sm text-muted-foreground">
                  Total: {((selectedGift?.price || 0) * quantity).toLocaleString()} coins
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Search */}
        {selectedGift && (
          <Card>
            <CardHeader>
              <CardTitle>Send to User</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or user number..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {searchingUsers && (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                </div>
              )}
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.id === user.id ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                        {user.profile_picture ? (
                          <img 
                            src={user.profile_picture} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs">{user.display_name[0]}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{user.display_name}</p>
                          {user.has_legendary_badge && (
                            <Badge className="bg-yellow-500 text-black">
                              <Crown className="w-3 h-3 mr-1" />
                              Legendary
                            </Badge>
                          )}
                          {user.has_ultra_badge && (
                            <Badge className="bg-red-500 text-white animate-pulse">
                              <Zap className="w-3 h-3 mr-1" />
                              Ultra
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">#{user.user_number}</p>
                      </div>
                    </div>
                    {user.is_online && (
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
              
              {selectedUser && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a message (optional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                  />
                  
                  <Button
                    onClick={sendGift}
                    className="w-full"
                    disabled={!profile || profile.coin_balance < ((selectedGift?.price || 0) * quantity)}
                  >
                    Send {quantity}x {selectedGift?.name} to {selectedUser.display_name}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Received Gifts */}
        <Card>
          <CardHeader>
            <CardTitle>Your Gifts</CardTitle>
          </CardHeader>
          <CardContent>
            {receivedGifts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {receivedGifts.map((gift) => (
                  <Card key={gift.id} className={getGiftCardStyle(gift.gift_type)}>
                    <CardContent className="p-3">
                      <div className="text-center">
                        <div className={`text-2xl mb-1 ${gift.gift_type === 'ultra' ? 'animate-bounce' : ''}`}>
                          {gift.gift_emoji}
                        </div>
                        <h4 className="font-medium text-sm">{gift.gift_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          From {gift.sender?.display_name}
                        </p>
                        {gift.message && (
                          <p className="text-xs italic mt-1">"{gift.message}"</p>
                        )}
                        {gift.can_exchange && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 text-xs"
                            onClick={() => exchangeGift(gift.id, gift.price, gift.gift_type)}
                          >
                            Exchange for {Math.floor(gift.price * 0.5)} coins
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No gifts received yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GiftsPage;
