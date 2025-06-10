
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gift, Coins, Search, Star, Crown, Flame } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const GiftsPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchUser, setSearchUser] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [receivedGifts, setReceivedGifts] = useState<any[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryUser, setGalleryUser] = useState<any>(null);
  const [galleryGifts, setGalleryGifts] = useState<any[]>([]);

  const giftCategories = [
    {
      name: "Basic Gifts",
      gifts: [
        { emoji: "🌹", name: "Rose", price: 10, type: "flower" },
        { emoji: "💎", name: "Diamond", price: 50, type: "jewelry" },
        { emoji: "🎁", name: "Gift Box", price: 25, type: "surprise" },
        { emoji: "🍰", name: "Cake", price: 15, type: "food" },
        { emoji: "🌟", name: "Star", price: 30, type: "celestial" },
      ]
    },
    {
      name: "Premium Gifts",
      gifts: [
        { emoji: "💝", name: "Love Gift", price: 100, type: "love" },
        { emoji: "👑", name: "Crown", price: 200, type: "royal" },
        { emoji: "🚗", name: "Car", price: 500, type: "luxury" },
        { emoji: "🏠", name: "House", price: 1000, type: "property" },
        { emoji: "✈️", name: "Airplane", price: 2000, type: "travel" },
      ]
    },
    {
      name: "Legendary Gifts",
      gifts: [
        { emoji: "👽", name: "Dancing Alien", price: 100000, type: "legendary", isLegendary: true, animation: "bounce" },
        { emoji: "🦁", name: "Golden Lion", price: 150000, type: "legendary", isLegendary: true, animation: "pulse" },
        { emoji: "🐉", name: "Mystic Dragon", price: 200000, type: "legendary", isLegendary: true, animation: "bounce" },
        { emoji: "🦄", name: "Rainbow Unicorn", price: 250000, type: "legendary", isLegendary: true, animation: "pulse" },
        { emoji: "👑", name: "Emperor Crown", price: 300000, type: "legendary", isLegendary: true, animation: "bounce" },
      ]
    }
  ];

  useEffect(() => {
    fetchReceivedGifts();
    if (searchUser.length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchUser]);

  const searchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, user_number, is_online, has_legendary_badge')
        .or(`display_name.ilike.%${searchUser}%,user_number.ilike.%${searchUser}%`)
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const fetchReceivedGifts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          *,
          sender:sender_id(display_name, has_legendary_badge)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceivedGifts(data || []);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    }
  };

  const sendGift = async (gift: any) => {
    if (!selectedUser || !user) {
      toast({
        title: "Select a recipient",
        description: "Please select someone to send the gift to.",
        variant: "destructive",
      });
      return;
    }

    if ((profile?.coin_balance || 0) < gift.price) {
      toast({
        title: "Insufficient coins",
        description: "You don't have enough coins for this gift.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Deduct coins from sender
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coin_balance: (profile?.coin_balance || 0) - gift.price })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Send gift
      const { error: giftError } = await supabase
        .from('gifts')
        .insert({
          sender_id: user.id,
          receiver_id: selectedUser.id,
          gift_name: gift.name,
          gift_emoji: gift.emoji,
          gift_type: gift.type,
          price: gift.price,
          message: message || null,
          is_legendary: gift.isLegendary || false,
          can_exchange: true
        });

      if (giftError) throw giftError;

      // If legendary gift, give sender legendary badge
      if (gift.isLegendary) {
        await supabase
          .from('profiles')
          .update({ has_legendary_badge: true })
          .eq('id', user.id);
      }

      toast({
        title: "Gift sent! 🎉",
        description: `${gift.name} sent to ${selectedUser.display_name}`,
      });

      setMessage('');
      // Refresh user's coin balance
      window.location.reload();
    } catch (error) {
      console.error('Error sending gift:', error);
      toast({
        title: "Failed to send gift",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const exchangeGift = async (gift: any) => {
    if (!user || !gift.can_exchange) return;

    try {
      const exchangeValue = Math.floor(gift.price * 0.95); // 5% fee

      // Add coins to user
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coin_balance: (profile?.coin_balance || 0) + exchangeValue })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Mark gift as exchanged
      const { error: giftError } = await supabase
        .from('gifts')
        .update({ can_exchange: false })
        .eq('id', gift.id);

      if (giftError) throw giftError;

      toast({
        title: "Gift exchanged! 💰",
        description: `Received ${exchangeValue} coins (5% fee applied)`,
      });

      fetchReceivedGifts();
      // Refresh user's coin balance
      window.location.reload();
    } catch (error) {
      console.error('Error exchanging gift:', error);
      toast({
        title: "Failed to exchange",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const viewUserGallery = async (user: any) => {
    try {
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          *,
          sender:sender_id(display_name)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleryGifts(data || []);
      setGalleryUser(user);
      setShowGallery(true);
    } catch (error) {
      console.error('Error fetching user gifts:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Gift className="w-6 h-6 mr-2" />
          Gift Store
        </h1>
        <div className="flex items-center mt-2">
          <Coins className="w-4 h-4 mr-1" />
          <span className="font-medium">{profile?.coin_balance || 0} Coins</span>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* User Search */}
        <Card>
          <CardHeader>
            <CardTitle>Send Gift To</CardTitle>
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

            {selectedUser && (
              <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{selectedUser.display_name}</span>
                  {selectedUser.has_legendary_badge && (
                    <div className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full text-xs font-bold text-black">
                      ✨ LEGENDARY
                    </div>
                  )}
                  {selectedUser.is_online && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewUserGallery(selectedUser)}
                >
                  View Gallery
                </Button>
              </div>
            )}

            {users.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{user.display_name}</span>
                      {user.has_legendary_badge && (
                        <div className="px-1 py-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded text-xs font-bold text-black">
                          ✨
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground">#{user.user_number}</span>
                    </div>
                    {user.is_online && (
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <Textarea
              placeholder="Add a message (optional)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
            />
          </CardContent>
        </Card>

        {/* Gift Categories */}
        {giftCategories.map((category) => (
          <Card key={category.name}>
            <CardHeader>
              <CardTitle className="flex items-center">
                {category.name}
                {category.name === "Legendary Gifts" && (
                  <Crown className="w-5 h-5 ml-2 text-yellow-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {category.gifts.map((gift) => (
                  <div
                    key={gift.name}
                    className={`p-4 border rounded-lg text-center cursor-pointer transition-all hover:scale-105 ${
                      gift.isLegendary
                        ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-400 dark:from-yellow-900 dark:to-yellow-800'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => sendGift(gift)}
                  >
                    {gift.isLegendary && (
                      <div className="mb-2 flex justify-center">
                        <div className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full text-xs font-bold text-black flex items-center">
                          <Crown className="w-3 h-3 mr-1" />
                          LEGENDARY
                        </div>
                      </div>
                    )}
                    <div 
                      className={`text-4xl mb-2 ${
                        gift.animation === 'bounce' ? 'animate-bounce-gift' : 
                        gift.animation === 'pulse' ? 'animate-pulse-soft' : ''
                      }`}
                    >
                      {gift.emoji}
                    </div>
                    <h3 className="font-medium text-sm">{gift.name}</h3>
                    <div className="flex items-center justify-center mt-2">
                      <Coins className="w-3 h-3 mr-1" />
                      <span className="text-sm font-bold">{gift.price.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Received Gifts */}
        <Card>
          <CardHeader>
            <CardTitle>My Gift Collection</CardTitle>
          </CardHeader>
          <CardContent>
            {receivedGifts.length > 0 ? (
              <div className="space-y-4">
                {/* Museum Display Cases */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {receivedGifts.slice(0, 6).map((gift) => (
                    <div
                      key={gift.id}
                      className={`relative p-4 rounded-lg border-2 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 ${
                        gift.is_legendary
                          ? 'border-yellow-400 shadow-lg shadow-yellow-200 dark:shadow-yellow-900'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{
                        background: gift.is_legendary
                          ? 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,193,7,0.05) 100%)'
                          : undefined
                      }}
                    >
                      {/* Glass Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg pointer-events-none" />
                      
                      {/* Legendary Badge */}
                      {gift.is_legendary && (
                        <div className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full text-xs font-bold text-black flex items-center animate-pulse-soft">
                          <Crown className="w-3 h-3 mr-1" />
                          LEGENDARY
                        </div>
                      )}

                      <div className="text-center relative z-10">
                        <div 
                          className={`text-3xl mb-2 ${
                            gift.is_legendary ? 'animate-bounce-gift' : ''
                          }`}
                        >
                          {gift.gift_emoji}
                        </div>
                        <h3 className="font-medium text-sm">{gift.gift_name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          From: {gift.sender?.display_name}
                        </p>
                        <div className="mt-2 flex items-center justify-center">
                          <Coins className="w-3 h-3 mr-1" />
                          <span className="text-xs">{gift.price.toLocaleString()}</span>
                        </div>
                        
                        {gift.can_exchange && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              exchangeGift(gift);
                            }}
                          >
                            Exchange (-5%)
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {receivedGifts.length > 6 && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      And {receivedGifts.length - 6} more gifts in your collection...
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No gifts received yet. Send yourself a gift to get started!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{galleryUser?.display_name}'s Gift Gallery</span>
                <Button variant="outline" size="sm" onClick={() => setShowGallery(false)}>
                  Close
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              {galleryGifts.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {galleryGifts.map((gift) => (
                    <div
                      key={gift.id}
                      className={`p-3 rounded-lg border text-center ${
                        gift.is_legendary
                          ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-400 dark:from-yellow-900 dark:to-yellow-800'
                          : 'bg-muted'
                      }`}
                    >
                      {gift.is_legendary && (
                        <div className="mb-1 flex justify-center">
                          <Crown className="w-3 h-3 text-yellow-600" />
                        </div>
                      )}
                      <div 
                        className={`text-2xl mb-1 ${
                          gift.is_legendary ? 'animate-bounce-gift' : ''
                        }`}
                      >
                        {gift.gift_emoji}
                      </div>
                      <p className="text-xs font-medium">{gift.gift_name}</p>
                      <p className="text-xs text-muted-foreground">
                        From: {gift.sender?.display_name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No gifts in gallery yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GiftsPage;
