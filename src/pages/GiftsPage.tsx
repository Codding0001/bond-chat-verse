
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { Gift, Wallet } from 'lucide-react';

const GiftsPage = () => {
  const { user, updateCoins } = useAuth();
  const [selectedGift, setSelectedGift] = useState<string | null>(null);

  const gifts = [
    { id: 'rose', name: 'Rose Bouquet', emoji: '💐', price: 10 },
    { id: 'flower', name: 'Flower', emoji: '🌹', price: 5 },
    { id: 'teddy', name: 'Teddy Bear', emoji: '🧸', price: 15 },
    { id: 'ring', name: 'Ring', emoji: '💍', price: 25 },
    { id: 'heart', name: 'Heart', emoji: '💖', price: 8 },
    { id: 'star', name: 'Star', emoji: '⭐', price: 12 },
  ];

  const recentGifts = [
    { from: 'Alice', gift: '💐', message: 'Thank you for being amazing!', time: '2h ago' },
    { from: 'Bob', gift: '🌹', message: 'Hope you like this!', time: '1d ago' },
  ];

  const sendGift = (giftId: string, price: number) => {
    if (user && user.coinBalance >= price) {
      updateCoins(-price);
      console.log(`Sent ${giftId} for ${price} coins`);
      setSelectedGift(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4">
        <h1 className="text-xl font-bold">Gifts & Tips</h1>
        <div className="flex items-center mt-2">
          <Wallet className="w-4 h-4 mr-2" />
          <span className="text-sm">{user?.coinBalance} Coins</span>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Gift Store */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gift className="w-5 h-5 mr-2" />
              Gift Store
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {gifts.map((gift) => (
                <div
                  key={gift.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedGift === gift.id
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedGift(gift.id)}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">{gift.emoji}</div>
                    <p className="text-sm font-medium text-gray-900">{gift.name}</p>
                    <p className="text-xs text-gray-600">{gift.price} coins</p>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedGift && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Send {gifts.find(g => g.id === selectedGift)?.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Cost: {gifts.find(g => g.id === selectedGift)?.price} coins
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const gift = gifts.find(g => g.id === selectedGift);
                      if (gift) sendGift(gift.id, gift.price);
                    }}
                    disabled={!user || user.coinBalance < (gifts.find(g => g.id === selectedGift)?.price || 0)}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    Send Gift
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Received Gifts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Gifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentGifts.map((gift, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl">{gift.gift}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">From {gift.from}</p>
                    <p className="text-xs text-gray-600 italic">"{gift.message}"</p>
                    <p className="text-xs text-gray-400 mt-1">{gift.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GiftsPage;
