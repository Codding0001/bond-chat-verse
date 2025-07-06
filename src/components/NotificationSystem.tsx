
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, User, Video } from 'lucide-react';

interface IncomingCall {
  id: string;
  caller_name: string;
  caller_picture?: string;
  call_type: 'voice' | 'video';
  caller_id: string;
}

interface IncomingMessage {
  id: string;
  sender_name: string;
  sender_picture?: string;
  content: string;
  chat_id: string;
}

const NotificationSystem: React.FC = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [incomingMessages, setIncomingMessages] = useState<IncomingMessage[]>([]);
  const [callTimeout, setCallTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listen for real-time call notifications
    const callChannel = supabase
      .channel('call_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_logs',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          handleIncomingCall(payload.new);
        }
      )
      .subscribe();

    // Listen for real-time message notifications
    const messageChannel = supabase
      .channel('message_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          await handleIncomingMessage(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(callChannel);
      supabase.removeChannel(messageChannel);
      if (callTimeout) clearTimeout(callTimeout);
    };
  }, [user]);

  const handleIncomingCall = async (callData: any) => {
    try {
      // Get caller profile
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('display_name, profile_picture')
        .eq('id', callData.caller_id)
        .single();

      if (callerProfile) {
        const call: IncomingCall = {
          id: callData.id,
          caller_name: callerProfile.display_name,
          caller_picture: callerProfile.profile_picture,
          call_type: callData.call_type,
          caller_id: callData.caller_id
        };

        setIncomingCall(call);

        // Play ringtone
        const ringtone = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceBjiS2PzMeCwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceBjiS2PzMeCwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceBjiS2PzMeCwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceBjiS2PzMeCwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceBjiS2PzMeCwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceBjiS2PzMeCwF');
        ringtone.loop = true;
        ringtone.play().catch(e => console.log('Could not play ringtone:', e));

        // Auto-dismiss after 72 seconds (1.2 minutes)
        const timeout = setTimeout(() => {
          setIncomingCall(null);
          ringtone.pause();
        }, 72000);
        
        setCallTimeout(timeout);
      }
    } catch (error) {
      console.error('Error handling incoming call:', error);
    }
  };

  const handleIncomingMessage = async (messageData: any) => {
    // Only show notification if message is not from current user
    if (messageData.sender_id === user?.id) return;

    try {
      // Get sender profile
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('display_name, profile_picture')
        .eq('id', messageData.sender_id)
        .single();

      // Check if user is currently in this chat
      const currentPath = window.location.pathname;
      const isInChat = currentPath.includes(`/chats/${messageData.chat_id}`);

      if (senderProfile && !isInChat) {
        const message: IncomingMessage = {
          id: messageData.id,
          sender_name: senderProfile.display_name,
          sender_picture: senderProfile.profile_picture,
          content: messageData.content,
          chat_id: messageData.chat_id
        };

        setIncomingMessages(prev => [...prev, message]);

        // Auto-remove message notification after 5 seconds
        setTimeout(() => {
          setIncomingMessages(prev => prev.filter(m => m.id !== message.id));
        }, 5000);
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  };

  const answerCall = () => {
    if (incomingCall) {
      console.log('Answering call from:', incomingCall.caller_name);
      
      // Clear timeout and call
      if (callTimeout) clearTimeout(callTimeout);
      setIncomingCall(null);
      
      // Navigate to call interface (would implement actual call handling)
      window.location.href = `/call/${incomingCall.caller_id}`;
    }
  };

  const declineCall = async () => {
    if (incomingCall) {
      console.log('Declining call from:', incomingCall.caller_name);
      
      // Update call log status to declined
      await supabase
        .from('call_logs')
        .update({ call_status: 'declined' })
        .eq('id', incomingCall.id);
      
      // Clear timeout and call
      if (callTimeout) clearTimeout(callTimeout);
      setIncomingCall(null);
    }
  };

  const openChat = (chatId: string) => {
    window.location.href = `/chats/${chatId}`;
  };

  const dismissMessage = (messageId: string) => {
    setIncomingMessages(prev => prev.filter(m => m.id !== messageId));
  };

  return (
    <>
      {/* Incoming Call Notification */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]">
          <div className="bg-background rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="mb-6">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={incomingCall.caller_picture || ''} />
                <AvatarFallback>
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              
              <h2 className="text-xl font-bold text-foreground mb-2">
                {incomingCall.caller_name}
              </h2>
              
              <p className="text-muted-foreground flex items-center justify-center space-x-2">
                {incomingCall.call_type === 'video' ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                <span>Incoming {incomingCall.call_type} call...</span>
              </p>
            </div>
            
            <div className="flex space-x-6 justify-center">
              <Button
                onClick={declineCall}
                size="lg"
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              
              <Button
                onClick={answerCall}
                size="lg"
                className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700"
              >
                <Phone className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Message Notifications */}
      <div className="fixed top-4 right-4 z-[150] space-y-2">
        {incomingMessages.map((message) => (
          <div
            key={message.id}
            className="bg-background border rounded-lg shadow-lg p-4 max-w-80 cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => openChat(message.chat_id)}
          >
            <div className="flex items-start space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={message.sender_picture || ''} />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-foreground truncate">
                    {message.sender_name}
                  </h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissMessage(message.id);
                    }}
                    className="p-1 h-6 w-6"
                  >
                    ×
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {message.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default NotificationSystem;
