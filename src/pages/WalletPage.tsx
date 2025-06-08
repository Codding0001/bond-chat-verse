
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Gift } from 'lucide-react';

const WalletPage = () => {
  const { user, updateCoins } = useAuth();

  const transactions = [
    { id: '1', type: 'received', amount: 10, from: 'Alice', description: 'Tip received', time: '2h ago' },
    { id: '2', type: 'sent', amount: -5, to: 'Bob', description: 'Gift: Flower', time: '4h ago' },
    { id: '3', type: 'received', amount: 25, from: 'Charlie', description: 'Tip received', time: '1d ago' },
    { id: '4', type: 'sent', amount: -15, to: 'Alice', description: 'Gift: Teddy Bear', time: '2d ago' },
  ];

  const addCoins = (amount: number) => {
    updateCoins(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
        <div className="text-center">
          <Wallet className="w-12 h-12 mx-auto mb-2" />
          <h1 className="text-2xl font-bold">My Wallet</h1>
          <p className="text-3xl font-bold mt-2">{user?.coinBalance} Coins</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => addCoins(50)}
                className="flex flex-col items-center p-6 h-auto bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-6 h-6 mb-2" />
                Buy 50 Coins
                <span className="text-xs mt-1">$4.99</span>
              </Button>
              
              <Button
                onClick={() => addCoins(100)}
                className="flex flex-col items-center p-6 h-auto bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-6 h-6 mb-2" />
                Buy 100 Coins
                <span className="text-xs mt-1">$8.99</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'received' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'received' ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-gray-600">
                      {transaction.type === 'received' 
                        ? `From ${transaction.from}` 
                        : `To ${transaction.to}`
                      }
                    </p>
                    <p className="text-xs text-gray-400">{transaction.time}</p>
                  </div>
                  
                  <div className={`text-right ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <p className="font-medium">
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount} coins
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <ArrowUpRight className="w-8 h-8 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold text-red-600">35</p>
              <p className="text-sm text-gray-600">Coins Spent</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <ArrowDownLeft className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-600">85</p>
              <p className="text-sm text-gray-600">Coins Received</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
