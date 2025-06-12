
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { ChatMember } from '@/types/chat';

interface ChatHeaderProps {
  otherMember: ChatMember | undefined;
  onTipClick: () => void;
}

const ChatHeader = ({ otherMember, onTipClick }: ChatHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/chats')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">
            {otherMember?.profiles.display_name || 'Chat'}
          </h1>
          <p className="text-sm text-gray-500">Offline</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onTipClick}
      >
        <DollarSign className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ChatHeader;
