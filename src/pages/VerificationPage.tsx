import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Crown, Zap } from 'lucide-react';

const VerificationPage = () => {
  const navigate = useNavigate();
  const { user, profile, updateCoins } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const verificationOptions = [
    {
      type: 'weekly',
      duration: '1 Week',
      cost: 500,
      description: 'Verification badge for 7 days'
    },
    {
      type: 'monthly',
      duration: '1 Month',
      cost: 1600,
      description: 'Verification badge for 30 days'
    },
    {
      type: 'lifetime',
      duration: 'Lifetime',
      cost: 50000,
      description: 'Permanent verification badge'
    }
  ];

  const purchaseVerification = async (option: typeof verificationOptions[0]) => {
    if (!user || !profile) return;

    if (profile.coin_balance < option.cost) {
      toast({
        title: "Insufficient coins",
        description: `You need ${option.cost} coins to purchase this verification badge`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Calculate expiry date
      let expiresAt: Date | null = null;
      if (option.type === 'weekly') {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
      } else if (option.type === 'monthly') {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
      }
      // lifetime doesn't have expiry

      // Update user profile with verification badge
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          verification_badge_type: option.type,
          verification_badge_expires_at: expiresAt?.toISOString() || null
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Deduct coins
      await updateCoins(-option.cost);

      // Record the purchase
      const { error: purchaseError } = await supabase
        .from('verification_purchases')
        .insert({
          user_id: user.id,
          badge_type: option.type,
          cost: option.cost,
          expires_at: expiresAt?.toISOString() || null
        });

      if (purchaseError) throw purchaseError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          from_user_id: user.id,
          to_user_id: null,
          amount: option.cost,
          transaction_type: 'verification_purchase',
          description: `${option.duration} verification badge`
        });

      if (transactionError) throw transactionError;

      toast({
        title: "Verification purchased!",
        description: `You now have a ${option.duration.toLowerCase()} verification badge`,
      });

      navigate('/profile');
    } catch (error) {
      console.error('Error purchasing verification:', error);
      toast({
        title: "Purchase failed",
        description: "Failed to purchase verification badge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasActiveVerification = () => {
    const verificationBadgeType = (profile as any)?.verification_badge_type;
    if (!verificationBadgeType) return false;
    
    if (verificationBadgeType === 'lifetime') return true;
    
    const expiresAt = (profile as any)?.verification_badge_expires_at;
    if (expiresAt) {
      return new Date(expiresAt) > new Date();
    }
    
    return false;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card p-4 border-b border-border flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/profile')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Verification Badge</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <span>Current Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasActiveVerification() ? (
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-blue-500 text-white">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Verified
                </Badge>
                <div>
                  <p className="font-medium">You have an active verification badge</p>
                  <p className="text-sm text-muted-foreground">
                    {(profile as any)?.verification_badge_type === 'lifetime' 
                      ? 'Lifetime verification'
                      : `Expires: ${new Date((profile as any)?.verification_badge_expires_at || '').toLocaleDateString()}`
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">You don't have a verification badge</p>
                <p className="text-sm text-muted-foreground">Purchase one below to get verified</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-2xl font-bold text-foreground">
                {profile?.coin_balance?.toLocaleString() || 0} coins
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Verification Options */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Purchase Verification</h2>
          
          {verificationOptions.map((option) => (
            <Card key={option.type} className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-blue-500 text-white">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {option.duration}
                      </Badge>
                      {option.type === 'lifetime' && (
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                    </div>
                    
                    <p className="font-medium text-foreground">{option.description}</p>
                    <p className="text-2xl font-bold text-primary">
                      {option.cost.toLocaleString()} coins
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => purchaseVerification(option)}
                    disabled={loading || (profile?.coin_balance || 0) < option.cost}
                    className="min-w-[100px]"
                  >
                    {loading ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      'Purchase'
                    )}
                  </Button>
                </div>
                
                {(profile?.coin_balance || 0) < option.cost && (
                  <p className="text-sm text-destructive mt-2">
                    Insufficient coins (need {(option.cost - (profile?.coin_balance || 0)).toLocaleString()} more)
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Benefits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Blue Verification Badge</p>
                <p className="text-sm text-muted-foreground">Stand out with a blue checkmark next to your name</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Enhanced Trust</p>
                <p className="text-sm text-muted-foreground">Other users will know you're verified and trustworthy</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Priority Support</p>
                <p className="text-sm text-muted-foreground">Get faster response times from our support team</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerificationPage;