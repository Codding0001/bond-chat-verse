
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Video, PhoneCall, VideoOff } from 'lucide-react';

const CallsPage = () => {
  const [activeCall, setActiveCall] = useState<string | null>(null);

  const callHistory = [
    { id: '1', name: 'Alice Johnson', type: 'video', duration: '12:34', time: '2h ago', status: 'answered' },
    { id: '2', name: 'Bob Smith', type: 'audio', duration: '5:23', time: '1d ago', status: 'missed' },
    { id: '3', name: 'Charlie Brown', type: 'audio', duration: '18:45', time: '2d ago', status: 'answered' },
  ];

  const contacts = [
    { id: '1', name: 'Alice Johnson', status: 'online', avatar: '👩' },
    { id: '2', name: 'Bob Smith', status: 'away', avatar: '👨' },
    { id: '3', name: 'Charlie Brown', status: 'offline', avatar: '👦' },
  ];

  const startCall = (contactId: string, type: 'audio' | 'video') => {
    setActiveCall(`${type}-${contactId}`);
    // Simulate call duration
    setTimeout(() => setActiveCall(null), 10000);
  };

  const endCall = () => {
    setActiveCall(null);
  };

  if (activeCall) {
    const isVideo = activeCall.includes('video');
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <div className="text-center mb-8">
          <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-4xl">👩</span>
          </div>
          <h2 className="text-2xl font-bold">Alice Johnson</h2>
          <p className="text-gray-400">Calling...</p>
        </div>
        
        <div className="flex space-x-6">
          <Button
            onClick={endCall}
            size="lg"
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
          >
            <Phone className="w-6 h-6" />
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
            <CardTitle>Quick Call</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-lg">{contact.avatar}</span>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        contact.status === 'online' ? 'bg-green-500' :
                        contact.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{contact.name}</p>
                      <p className="text-xs text-gray-600 capitalize">{contact.status}</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startCall(contact.id, 'audio')}
                      disabled={contact.status === 'offline'}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => startCall(contact.id, 'video')}
                      disabled={contact.status === 'offline'}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Call History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {callHistory.map((call) => (
                <div key={call.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    call.status === 'missed' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {call.type === 'video' ? (
                      <Video className="w-5 h-5" />
                    ) : (
                      <PhoneCall className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{call.name}</p>
                    <p className="text-xs text-gray-600">
                      {call.status === 'missed' ? 'Missed call' : `Duration: ${call.duration}`}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{call.time}</p>
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

export default CallsPage;
