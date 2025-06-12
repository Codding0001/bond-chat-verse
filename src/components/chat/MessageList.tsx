
import React, { useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, CheckCheck } from 'lucide-react';
import { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
  currentUserId: string | undefined;
}

const MessageList = ({ messages, currentUserId }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
      {messages.map((message, index) => {
        const isCurrentUser = message.sender_id === currentUserId;
        const showStatus = isCurrentUser && index === messages.length - 1;
        
        return (
          <div
            key={message.id}
            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-xs ${
              isCurrentUser ? 'bg-blue-500 text-white' : 'bg-white'
            }`}>
              <CardContent className="p-3">
                <p className="text-sm">{message.content}</p>
                <div className={`flex items-center justify-between mt-1 ${
                  isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <p className="text-xs">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                  {showStatus && isCurrentUser && (
                    <div className="ml-2">
                      {message.is_read ? (
                        <CheckCheck className="w-3 h-3 text-blue-200" />
                      ) : (
                        <Check className="w-3 h-3 text-blue-300" />
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
