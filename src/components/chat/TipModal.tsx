
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ChatMember } from '@/types/chat';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  otherMember: ChatMember | undefined;
  chatId: string;
}

const TipModal = ({ isOpen, onClose, otherMember, chatId }: TipModalProps) => {
  const { user, profile, updateCoins } = useAuth();
  const { toast } = useToast();
  const [tipAmount, setTipAmount] = useState('');

  const sendTip = async () => {
    const amount = parseInt(tipAmount);
    if (!amount || amount <= 0 || !user || !profile || !otherMember) return;

    if (profile.coin_balance < amount) {
      toast({
        title: "Insufficient coins",
        description: "You don't have enough coins for this tip",
        variant: "destructive",
      });
      return;
    }

    try {
      // Send tip message
      await supabase
        .from('messages')
        .insert({
          content: `💰 Sent ${amount} coins as a tip!`,
          sender_id: user.id,
          chat_id: chatId,
          message_type: 'tip'
        });

      // Update coin balances
      await updateCoins(-amount);

      // Get receiver's current balance and update it
      const { data: receiverProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', otherMember.user_id)
        .single();

      if (fetchError) throw fetchError;

      const newBalance = (receiverProfile.coin_balance || 0) + amount;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coin_balance: newBalance })
        .eq('id', otherMember.user_id);

      if (updateError) throw updateError;

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          from_user_id: user.id,
          to_user_id: otherMember.user_id,
          amount: amount,
          transaction_type: 'tip',
          description: 'Chat tip'
        });

      setTipAmount('');
      onClose();
      
      toast({
        title: "Tip sent!",
        description: `You sent ${amount} coins to ${otherMember.profiles.display_name}`,
      });
    } catch (error) {
      console.error('Error sending tip:', error);
      toast({
        title: "Error",
        description: "Failed to send tip",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-80 mx-4">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4">Send Tip</h3>
          <p className="text-sm text-gray-600 mb-4">
            Your balance: {profile?.coin_balance || 0} coins
          </p>
          <Input
            type="number"
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
            placeholder="Enter amount"
            className="mb-4"
          />
          <div className="flex space-x-2">
            <Button onClick={sendTip} className="flex-1">
              Send Tip
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TipModal;
