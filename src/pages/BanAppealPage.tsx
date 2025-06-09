
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

interface UserBan {
  id: string;
  reason: string;
  ban_type: string;
  ban_start: string;
  ban_end: string;
  is_active: boolean;
}

interface BanAppeal {
  id: string;
  appeal_reason: string;
  status: string;
  created_at: string;
  admin_response: string;
}

const BanAppealPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [userBan, setUserBan] = useState<UserBan | null>(null);
  const [existingAppeal, setExistingAppeal] = useState<BanAppeal | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserBan();
      fetchExistingAppeal();
    }
  }, [user]);

  const fetchUserBan = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_bans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setUserBan(data);
    } catch (error) {
      console.error('Error fetching user ban:', error);
    }
  };

  const fetchExistingAppeal = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ban_appeals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setExistingAppeal(data);
    } catch (error) {
      console.error('Error fetching existing appeal:', error);
    }
  };

  const submitAppeal = async () => {
    if (!appealReason.trim() || !userBan || !user) {
      toast({
        title: "Missing information",
        description: "Please provide a reason for your appeal",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ban_appeals')
        .insert({
          ban_id: userBan.id,
          user_id: user.id,
          appeal_reason: appealReason.trim()
        });

      if (error) throw error;

      toast({
        title: "Appeal submitted",
        description: "Your ban appeal has been submitted for review",
      });

      setAppealReason('');
      fetchExistingAppeal();
    } catch (error) {
      console.error('Error submitting appeal:', error);
      toast({
        title: "Error",
        description: "Failed to submit appeal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatBanType = (banType: string) => {
    switch (banType) {
      case 'temp_24h': return '24 Hours';
      case 'temp_7d': return '7 Days';
      case 'temp_1m': return '1 Month';
      case 'temp_6m': return '6 Months';
      case 'permanent': return 'Permanent';
      default: return banType;
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'approved': return 'default';
      case 'denied': return 'destructive';
      default: return 'secondary';
    }
  };

  if (!userBan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-bold mb-2">No Active Ban</h2>
            <p className="text-gray-600">You don't have any active bans</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Account Banned
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong>Ban Type:</strong> {formatBanType(userBan.ban_type)}
            </div>
            <div>
              <strong>Reason:</strong> {userBan.reason}
            </div>
            <div>
              <strong>Start Date:</strong> {new Date(userBan.ban_start).toLocaleDateString()}
            </div>
            {userBan.ban_end && (
              <div>
                <strong>End Date:</strong> {new Date(userBan.ban_end).toLocaleDateString()}
              </div>
            )}
          </CardContent>
        </Card>

        {existingAppeal ? (
          <Card>
            <CardHeader>
              <CardTitle>Your Appeal Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <strong>Status:</strong>
                <Badge variant={getBadgeVariant(existingAppeal.status)}>
                  {existingAppeal.status.charAt(0).toUpperCase() + existingAppeal.status.slice(1)}
                </Badge>
              </div>
              <div>
                <strong>Your Appeal:</strong>
                <p className="mt-1 text-gray-600">{existingAppeal.appeal_reason}</p>
              </div>
              <div>
                <strong>Submitted:</strong> {new Date(existingAppeal.created_at).toLocaleDateString()}
              </div>
              {existingAppeal.admin_response && (
                <div>
                  <strong>Admin Response:</strong>
                  <p className="mt-1 text-gray-600">{existingAppeal.admin_response}</p>
                </div>
              )}
              {existingAppeal.status === 'pending' && (
                <p className="text-blue-600 text-sm">
                  Your appeal is being reviewed. Please be patient.
                </p>
              )}
              {existingAppeal.status === 'denied' && (
                <p className="text-red-600 text-sm">
                  Your appeal has been denied. You may submit a new appeal if you have additional information.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Submit Ban Appeal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Why should your ban be removed? *
                </label>
                <Textarea
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Please explain why you believe your ban should be lifted. Be honest and provide any relevant details..."
                  rows={6}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Please be respectful and honest in your appeal. 
                  False information may result in your appeal being denied and could 
                  affect future appeals.
                </p>
              </div>

              <Button
                onClick={submitAppeal}
                disabled={loading || !appealReason.trim()}
                className="w-full"
              >
                {loading ? 'Submitting...' : 'Submit Appeal'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BanAppealPage;
