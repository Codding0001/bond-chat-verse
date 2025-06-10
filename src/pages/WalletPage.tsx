
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Coins, CreditCard, DollarSign, Plus } from 'lucide-react';

const WalletPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [coinAmount, setCoinAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Exchange rate: 1 USD = 100 coins
  const exchangeRate = 100;
  const dollarValue = coinAmount ? (parseInt(coinAmount) / exchangeRate).toFixed(2) : '0.00';

  const addCoins = async () => {
    if (!user || !coinAmount || parseInt(coinAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid coin amount.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const newBalance = (profile?.coin_balance || 0) + parseInt(coinAmount);
      
      const { error } = await supabase
        .from('profiles')
        .update({ coin_balance: newBalance })
        .eq('id', user.id);

      if (error) throw error;

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          to_user_id: user.id,
          amount: parseInt(coinAmount),
          transaction_type: 'purchase',
          description: `Purchased ${coinAmount} coins for $${dollarValue}`
        });

      toast({
        title: "Coins added! 🪙",
        description: `${coinAmount} coins have been added to your wallet.`,
      });

      setCoinAmount('');
      // Refresh to show new balance
      window.location.reload();
    } catch (error) {
      console.error('Error adding coins:', error);
      toast({
        title: "Failed to add coins",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const coinPackages = [
    { coins: 1000, price: 10, bonus: 0 },
    { coins: 5000, price: 50, bonus: 500 },
    { coins: 10000, price: 100, bonus: 1500 },
    { coins: 50000, price: 500, bonus: 10000 },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Coins className="w-6 h-6 mr-2" />
          My Wallet
        </h1>
        <div className="mt-4 text-center">
          <div className="text-4xl font-bold mb-2">{profile?.coin_balance || 0}</div>
          <p className="text-green-100">Available Coins</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Custom Amount */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Add Custom Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Coin Amount</label>
              <Input
                type="number"
                placeholder="Enter coin amount"
                value={coinAmount}
                onChange={(e) => setCoinAmount(e.target.value)}
                min="1"
              />
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Coins:</span>
                <span className="font-medium">{coinAmount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">USD Equivalent:</span>
                <span className="font-medium text-green-600">${dollarValue}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Exchange Rate: 100 coins = $1.00
              </div>
            </div>

            <Button
              onClick={addCoins}
              disabled={loading || !coinAmount || parseInt(coinAmount) <= 0}
              className="w-full"
            >
              {loading ? 'Processing...' : `Add ${coinAmount || 0} Coins for $${dollarValue}`}
            </Button>
          </CardContent>
        </Card>

        {/* Coin Packages */}
        <Card>
          <CardHeader>
            <CardTitle>Coin Packages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coinPackages.map((pkg) => (
                <div
                  key={pkg.coins}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setCoinAmount((pkg.coins + pkg.bonus).toString());
                  }}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-2">
                      {(pkg.coins + pkg.bonus).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {pkg.coins.toLocaleString()} coins
                      {pkg.bonus > 0 && (
                        <span className="text-green-600 font-medium">
                          {' '}+ {pkg.bonus.toLocaleString()} bonus
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      ${pkg.price}
                    </div>
                    {pkg.bonus > 0 && (
                      <div className="mt-2 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                        Best Value!
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• This is a testing environment</p>
              <p>• No real payments will be processed</p>
              <p>• Coins are added instantly for testing purposes</p>
              <p>• Exchange rate: 100 coins = $1.00 USD</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WalletPage;
