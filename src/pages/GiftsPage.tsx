
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Heart, Star, Coins, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const giftTypes = [
  { type: 'rose', name: 'Rose Bouquet', emoji: '💐', price: 10 },
  { type: 'flower', name: 'Flower', emoji: '🌹', price: 5 },
  { type: 'teddy', name: 'Teddy Bear', emoji: '🧸', price: 25 },
  { type: 'ring', name: 'Ring', emoji: '💍', price: 50 },
  { type: 'heart', name: 'Heart', emoji: '❤️', price: 3 },
  { type: 'star', name: 'Star', emoji: '⭐', price: 8 },
  { type: 'cat', name: 'Cute Cat', emoji: '🐱', price: 100 },
  { type: 'dog', name: 'Loyal Dog', emoji: '🐶', price: 120 },
  { type: 'car', name: 'Sports Car', emoji: '🏎️', price: 500 },
  { type: 'house', name: 'Dream House', emoji: '🏠', price: 1000 },
  { type: 'yacht', name: 'Luxury Yacht', emoji: '🛥️', price: 2500 },
  { type: 'diamond', name: 'Diamond', emoji: '💎', price: 800 },
];

const GiftsPage = () => {
  const { user, profile, updateCoins } = useAuth();
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentGifts, setRecentGifts] = useState<any[]>([]);
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [coinAmount, setCoinAmount] = useState('');
  const [sendingGift, setSendingGift] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRecentGifts();
    }
  }, [user]);

  const fetchRecentGifts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          *,
          sender:sender_id(display_name, user_number),
          receiver:receiver_id(display_name, user_number)
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentGifts(data || []);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    }
  };

  const sendGift = async () => {
    if (!user || !profile || !selectedGift || !recipient) return;

    if (profile.coin_balance < selectedGift.price) {
      toast({
        title: "Insufficient coins",
        description: "You don't have enough coins for this gift",
        variant: "destructive",
      });
      return;
    }

    setSendingGift(true);
    setLoading(true);

    try {
      // Find recipient
      const { data: recipientData, error: recipientError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_number', recipient)
        .single();

      if (recipientError || !recipientData) {
        toast({
          title: "User not found",
          description: "Could not find user with that number",
          variant: "destructive",
        });
        return;
      }

      if (recipientData.id === user.id) {
        toast({
          title: "Cannot send to yourself",
          description: "You cannot send gifts to yourself",
          variant: "destructive",
        });
        return;
      }

      // Create gift record
      const { error: giftError } = await supabase
        .from('gifts')
        .insert({
          sender_id: user.id,
          receiver_id: recipientData.id,
          gift_type: selectedGift.type,
          gift_name: selectedGift.name,
          gift_emoji: selectedGift.emoji,
          price: selectedGift.price,
          message: message || null
        });

      if (giftError) throw giftError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          from_user_id: user.id,
          to_user_id: recipientData.id,
          amount: selectedGift.price,
          transaction_type: 'gift',
          description: `${selectedGift.name} gift to ${recipientData.display_name}`
        });

      if (transactionError) throw transactionError;

      // Update sender balance
      await updateCoins(-selectedGift.price);

      // Show success animation
      setTimeout(() => {
        toast({
          title: "Gift sent! 🎉",
          description: `${selectedGift.name} sent to ${recipientData.display_name}`,
        });
      }, 1000);

      setSelectedGift(null);
      setRecipient('');
      setMessage('');
      fetchRecentGifts();

    } catch (error: any) {
      toast({
        title: "Failed to send gift",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setLoading(false);
        setSendingGift(false);
      }, 1500);
    }
  };

  const addCoins = async () => {
    if (!coinAmount || !user) return;

    const amount = parseInt(coinAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid coin amount",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateCoins(amount);
      
      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          from_user_id: null,
          to_user_id: user.id,
          amount: amount,
          transaction_type: 'purchase',
          description: `Coin purchase: ${amount} coins`
        });

      toast({
        title: "Coins added!",
        description: `${amount} coins added to your account`,
      });

      setCoinAmount('');
      setShowCoinModal(false);
    } catch (error: any) {
      toast({
        title: "Failed to add coins",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Gift className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">Gift Store</h1>
          <div className="flex items-center justify-center mt-2 space-x-4">
            <div className="flex items-center">
              <Coins className="w-4 h-4 mr-1" />
              <span className="font-medium">{profile.coin_balance} Coins</span>
            </div>
            <Button
              onClick={() => setShowCoinModal(true)}
              size="sm"
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-purple-600"
            >
              <DollarSign className="w-4 h-4 mr-1" />
              Buy Coins
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Gift Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose a Gift</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {giftTypes.map((gift) => (
                <button
                  key={gift.type}
                  onClick={() => setSelectedGift(gift)}
                  className={`p-4 border rounded-lg text-center transition-all duration-300 transform hover:scale-105 ${
                    selectedGift?.type === gift.type
                      ? 'border-pink-500 bg-pink-50 dark:bg-pink-950 scale-105 shadow-lg'
                      : 'border-border hover:border-muted-foreground hover:shadow-md'
                  }`}
                >
                  <div className={`text-3xl mb-2 transition-transform duration-300 ${
                    selectedGift?.type === gift.type ? 'animate-bounce' : ''
                  }`}>
                    {gift.emoji}
                  </div>
                  <p className="font-medium text-foreground">{gift.name}</p>
                  <p className="text-sm text-muted-foreground">{gift.price} coins</p>
                  {gift.price >= 100 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">✨ Premium</p>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Send Gift Form */}
        {selectedGift && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">Send {selectedGift.name}</span>
                {sendingGift && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Recipient User Number
                </label>
                <Input
                  placeholder="Enter 6-digit user number"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  maxLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Message (Optional)
                </label>
                <Textarea
                  placeholder="Add a personal message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-foreground">
                  Cost: {selectedGift.price} coins
                </p>
                <p className="text-sm text-foreground">
                  Your balance: {profile.coin_balance} coins
                </p>
              </div>
              
              <Button 
                onClick={sendGift} 
                disabled={loading || !recipient || profile.coin_balance < selectedGift.price}
                className={`w-full transition-all duration-300 ${
                  sendingGift ? 'animate-pulse' : 'hover:scale-105'
                }`}
              >
                {sendingGift ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Gift... ✨
                  </span>
                ) : loading ? 'Sending...' : `Send ${selectedGift.name}`}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Gifts */}
        <Card>
          <CardHeader>
            <CardTitle>Gifts Sent</CardTitle>
          </CardHeader>
          <CardContent>
            {recentGifts.length > 0 ? (
              <div className="space-y-3">
                {recentGifts.map((gift) => (
                  <div key={gift.id} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3 animate-pulse">{gift.gift_emoji}</span>
                      <div>
                        <p className="font-medium text-foreground">{gift.gift_name}</p>
                        <p className="text-sm text-muted-foreground">
                          To {gift.receiver?.display_name} (#{gift.receiver?.user_number})
                        </p>
                        {gift.message && (
                          <p className="text-sm text-muted-foreground">"{gift.message}"</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-pink-500">{gift.price} coins</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(gift.created_at).toLocaleDateString()}
                      </p>
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

      {/* Coin Purchase Modal */}
      {showCoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-80 mx-4">
            <CardHeader>
              <CardTitle>Buy Coins</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Coin Amount
                </label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(e.target.value)}
                  min="1"
                />
              </div>
              
              {coinAmount && !isNaN(parseInt(coinAmount)) && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-foreground">
                    Cost: ${(parseInt(coinAmount) * 0.01).toFixed(2)} USD
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rate: 1 coin = $0.01
                  </p>
                </div>
              )}
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCoinModal(false);
                    setCoinAmount('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={addCoins}
                  disabled={!coinAmount || isNaN(parseInt(coinAmount)) || parseInt(coinAmount) <= 0}
                  className="flex-1"
                >
                  Add Coins
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GiftsPage;
