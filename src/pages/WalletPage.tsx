
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Coins, ArrowUpRight, ArrowDownLeft, Gift, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const WalletPage = () => {
  const { profile, user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tipAmount, setTipAmount] = useState('');
  const [tipRecipient, setTipRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          from_user:from_user_id(display_name, user_number),
          to_user:to_user_id(display_name, user_number)
        `)
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const sendTip = async () => {
    if (!user || !profile || !tipAmount || !tipRecipient) return;

    const amount = parseInt(tipAmount);
    if (amount <= 0 || amount > profile.coin_balance) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Find recipient by user number
      const { data: recipient, error: recipientError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_number', tipRecipient)
        .single();

      if (recipientError || !recipient) {
        toast({
          title: "User not found",
          description: "Could not find user with that number",
          variant: "destructive",
        });
        return;
      }

      // Calculate fee (1%)
      const fee = Math.ceil(amount * 0.01);
      const finalAmount = amount - fee;

      // Create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          from_user_id: user.id,
          to_user_id: recipient.id,
          amount: finalAmount,
          transaction_type: 'tip',
          description: `Tip to ${recipient.display_name} (${fee} coin fee)`
        });

      if (transactionError) throw transactionError;

      // Update sender balance
      const { error: senderError } = await supabase
        .from('profiles')
        .update({ coin_balance: profile.coin_balance - amount })
        .eq('id', user.id);

      if (senderError) throw senderError;

      // Update recipient balance
      const { error: recipientUpdateError } = await supabase
        .from('profiles')
        .update({ coin_balance: recipient.coin_balance + finalAmount })
        .eq('id', recipient.id);

      if (recipientUpdateError) throw recipientUpdateError;

      toast({
        title: "Tip sent!",
        description: `${finalAmount} coins sent to ${recipient.display_name}`,
      });

      setTipAmount('');
      setTipRecipient('');
      fetchTransactions();
      
      // Refresh profile data
      window.location.reload();

    } catch (error: any) {
      toast({
        title: "Transaction failed",
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
      <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Coins className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">{profile.coin_balance}</h1>
          <p className="text-green-100">Total Coins</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Send Tip */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowUpRight className="w-5 h-5 mr-2" />
              Send Tip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient User Number
              </label>
              <Input
                placeholder="Enter 6-digit user number"
                value={tipRecipient}
                onChange={(e) => setTipRecipient(e.target.value)}
                maxLength={6}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (1% fee applies)
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                min="1"
                max={profile.coin_balance}
              />
            </div>
            
            <Button 
              onClick={sendTip} 
              disabled={loading || !tipAmount || !tipRecipient}
              className="w-full"
            >
              {loading ? 'Sending...' : 'Send Tip'}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {transaction.from_user_id === user?.id ? (
                        <ArrowUpRight className="w-5 h-5 text-red-500 mr-3" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5 text-green-500 mr-3" />
                      )}
                      <div>
                        <p className="font-medium">
                          {transaction.from_user_id === user?.id ? 'Sent' : 'Received'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {transaction.from_user_id === user?.id 
                            ? `To ${transaction.to_user?.display_name} (#${transaction.to_user?.user_number})`
                            : `From ${transaction.from_user?.display_name} (#${transaction.from_user?.user_number})`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${transaction.from_user_id === user?.id ? 'text-red-500' : 'text-green-500'}`}>
                        {transaction.from_user_id === user?.id ? '-' : '+'}{transaction.amount}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No transactions yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WalletPage;
