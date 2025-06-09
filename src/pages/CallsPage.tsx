
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Phone, Video, PhoneCall, VideoOff, PhoneOff } from 'lucide-react';

interface CallLog {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: 'voice' | 'video';
  call_status: 'answered' | 'missed' | 'busy' | 'failed';
  duration: number;
  created_at: string;
  caller?: { display_name: string };
  receiver?: { display_name: string };
}

interface Contact {
  id: string;
  display_name: string;
  user_number: string;
  is_online: boolean;
}

const CallsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (user) {
      fetchCallLogs();
      fetchContacts();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall && callStartTime) {
      interval = setInterval(() => {
        const duration = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
        setCallDuration(duration);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall, callStartTime]);

  const fetchCallLogs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          *,
          caller:caller_id(display_name),
          receiver:receiver_id(display_name)
        `)
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCallLogs(data || []);
    } catch (error) {
      console.error('Error fetching call logs:', error);
    }
  };

  const fetchContacts = async () => {
    if (!user) return;

    try {
      // Get contacts from chat members (people user has chatted with)
      const { data: chatMembers, error } = await supabase
        .from('chat_members')
        .select(`
          user_id,
          profiles:user_id(id, display_name, user_number, is_online)
        `)
        .neq('user_id', user.id);

      if (error) throw error;

      // Remove duplicates and flatten
      const uniqueContacts = chatMembers
        ?.filter((member, index, self) => 
          self.findIndex(m => m.profiles?.id === member.profiles?.id) === index
        )
        .map(member => member.profiles)
        .filter(Boolean) || [];

      setContacts(uniqueContacts as Contact[]);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestMediaPermission = async (type: 'audio' | 'video') => {
    try {
      const constraints = {
        audio: true,
        video: type === 'video'
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('Media permission denied:', error);
      toast({
        title: "Permission Required",
        description: `Please allow ${type} access to make calls`,
        variant: "destructive",
      });
      return false;
    }
  };

  const startCall = async (contactId: string, type: 'voice' | 'video') => {
    if (!user) return;

    const hasPermission = await requestMediaPermission(type === 'video' ? 'video' : 'audio');
    if (!hasPermission) return;

    try {
      // Create call log
      const { data: callLog, error } = await supabase
        .from('call_logs')
        .insert({
          caller_id: user.id,
          receiver_id: contactId,
          call_type: type,
          call_status: 'missed', // Will be updated when call ends
        })
        .select()
        .single();

      if (error) throw error;

      setActiveCall(`${type}-${contactId}-${callLog.id}`);
      setCallStartTime(new Date());
      setCallDuration(0);

      // Simulate call ending after some time for demo
      setTimeout(() => {
        endCall('answered');
      }, 30000); // 30 seconds for demo

    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: "Unable to start the call",
        variant: "destructive",
      });
    }
  };

  const endCall = async (status: 'answered' | 'missed' | 'busy' = 'answered') => {
    if (!activeCall || !callStartTime) return;

    try {
      const callId = activeCall.split('-')[2];
      const duration = Math.floor((Date.now() - callStartTime.getTime()) / 1000);

      // Update call log
      await supabase
        .from('call_logs')
        .update({
          call_status: status,
          duration,
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      setActiveCall(null);
      setCallStartTime(null);
      setCallDuration(0);
      fetchCallLogs(); // Refresh call logs

    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatCallTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (activeCall) {
    const [callType, contactId] = activeCall.split('-');
    const contact = contacts.find(c => c.id === contactId);
    const isVideo = callType === 'video';

    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <div className="text-center mb-8">
          <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-4xl">👤</span>
          </div>
          <h2 className="text-2xl font-bold">{contact?.display_name || 'Unknown User'}</h2>
          <p className="text-gray-400">
            {callStartTime ? formatDuration(callDuration) : 'Calling...'}
          </p>
        </div>
        
        <div className="flex space-x-6">
          <Button
            onClick={() => endCall('answered')}
            size="lg"
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
          
          {isVideo && (
            <Button
              size="lg"
              className="w-16 h-16 rounded-full bg-gray-600 hover:bg-gray-700"
            >
              <VideoOff className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Calls</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Call */}
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length > 0 ? (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-lg">👤</span>
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                          contact.is_online ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{contact.display_name}</p>
                        <p className="text-xs text-gray-600">#{contact.user_number}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startCall(contact.id, 'voice')}
                        disabled={!contact.is_online}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => startCall(contact.id, 'video')}
                        disabled={!contact.is_online}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No contacts found. Start chatting with someone to make calls!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Call History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
          </CardHeader>
          <CardContent>
            {callLogs.length > 0 ? (
              <div className="space-y-3">
                {callLogs.map((call) => {
                  const isOutgoing = call.caller_id === user?.id;
                  const otherPerson = isOutgoing ? call.receiver : call.caller;
                  
                  return (
                    <div key={call.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        call.call_status === 'missed' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {call.call_type === 'video' ? (
                          <Video className="w-5 h-5" />
                        ) : (
                          <PhoneCall className="w-5 h-5" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {otherPerson?.display_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {isOutgoing ? 'Outgoing' : 'Incoming'} • {
                            call.call_status === 'missed' ? 'Missed call' : 
                            call.call_status === 'answered' ? `Duration: ${formatDuration(call.duration)}` :
                            call.call_status
                          }
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{formatCallTime(call.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No call history</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CallsPage;
