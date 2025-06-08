
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Heart, Star, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const giftTypes = [
  { type: 'rose', name: 'Rose Bouquet', emoji: '💐', price: 10 },
  { type: 'flower', name: 'Flower', emoji: '🌹', price: 5 },
  { type: 'teddy', name: 'Teddy Bear', emoji: '🧸', price: 25 },
  { type: 'ring', name: 'Ring', emoji: '💍', price: 50 },
  { type: 'heart', name: 'Heart', emoji: '❤️', price: 3 },
  { type: 'star', name: 'Star', emoji: '⭐', price: 8 },
];

const GiftsPage = () => {
  const { user, profile } = useAuth();
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentGifts, setRecentGifts] = useState<any[]>([]);
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
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ coin_balance: profile.coin_balance - selectedGift.price })
        .eq('id', user.id);

      if (balanceError) throw balanceError;

      toast({
        title: "Gift sent!",
        description: `${selectedGift.name} sent to ${recipientData.display_name}`,
      });

      setSelectedGift(null);
      setRecipient('');
      setMessage('');
      fetchRecentGifts();
      
      // Refresh profile data
      window.location.reload();

    } catch (error: any) {
      toast({
        title: "Failed to send gift",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Gift className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">Gift Store</h1>
          <div className="flex items-center justify-center mt-2">
            <Coins className="w-4 h-4 mr-1" />
            <span className="font-medium">{profile.coin_balance} Coins</span>
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
                  className={`p-4 border rounded-lg text-center transition-colors ${
                    selectedGift?.type === gift.type
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{gift.emoji}</div>
                  <p className="font-medium">{gift.name}</p>
                  <p className="text-sm text-gray-600">{gift.price} coins</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Send Gift Form */}
        {selectedGift && (
          <Card>
            <CardHeader>
              <CardTitle>Send {selectedGift.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <Textarea
                  placeholder="Add a personal message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Cost: {selectedGift.price} coins
                </p>
                <p className="text-sm text-gray-600">
                  Your balance: {profile.coin_balance} coins
                </p>
              </div>
              
              <Button 
                onClick={sendGift} 
                disabled={loading || !recipient || profile.coin_balance < selectedGift.price}
                className="w-full"
              >
                {loading ? 'Sending...' : `Send ${selectedGift.name}`}
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
                  <div key={gift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{gift.gift_emoji}</span>
                      <div>
                        <p className="font-medium">{gift.gift_name}</p>
                        <p className="text-sm text-gray-600">
                          To {gift.receiver?.display_name} (#{gift.receiver?.user_number})
                        </p>
                        {gift.message && (
                          <p className="text-sm text-gray-500">"{gift.message}"</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-pink-500">{gift.price} coins</p>
                      <p className="text-xs text-gray-500">
                        {new Date(gift.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No gifts sent yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GiftsPage;
