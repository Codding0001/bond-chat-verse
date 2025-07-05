import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, User } from 'lucide-react';

interface IncomingCall {
  id: string;
  caller_name: string;
  caller_picture?: string;
  call_type: 'voice' | 'video';
}

const NotificationSystem: React.FC = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listen for incoming calls (this would be implemented with real-time subscriptions)
    // For now, this is a placeholder structure
    const handleIncomingCall = (call: IncomingCall) => {
      setIncomingCall(call);
      
      // Play ringtone sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceBjiS2PzMeCwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceBjiS2PzMeCwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceBjiS2PzMeCwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceBjiS2PzMeCwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceBjiS2PzMeCwF');
      audio.loop = true;
      audio.play().catch(e => console.log('Could not play ringtone:', e));
    };

    // Auto-dismiss call after 72 seconds
    let dismissTimer: NodeJS.Timeout;
    if (incomingCall) {
      dismissTimer = setTimeout(() => {
        setIncomingCall(null);
      }, 72000);
    }

    return () => {
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [user, incomingCall]);

  const answerCall = () => {
    if (incomingCall) {
      // Handle call answer logic
      console.log('Answering call from:', incomingCall.caller_name);
      setIncomingCall(null);
    }
  };

  const declineCall = () => {
    if (incomingCall) {
      // Handle call decline logic
      console.log('Declining call from:', incomingCall.caller_name);
      setIncomingCall(null);
    }
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-4 min-w-80">
      <div className="flex items-center space-x-3 mb-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={incomingCall.caller_picture || ''} />
          <AvatarFallback>
            <User className="w-6 h-6" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium text-foreground">{incomingCall.caller_name}</h3>
          <p className="text-sm text-muted-foreground">
            Incoming {incomingCall.call_type} call...
          </p>
        </div>
      </div>
      
      <div className="flex space-x-3">
        <Button
          onClick={declineCall}
          variant="destructive"
          className="flex-1"
        >
          <PhoneOff className="w-4 h-4 mr-2" />
          Decline
        </Button>
        <Button
          onClick={answerCall}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <Phone className="w-4 h-4 mr-2" />
          Answer
        </Button>
      </div>
    </div>
  );
};

export default NotificationSystem;