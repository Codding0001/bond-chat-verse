import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

interface TypingIndicatorProps {
  typingUsers: Array<{
    display_name: string;
    profile_picture?: string;
  }>;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].display_name} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].display_name} and ${typingUsers[1].display_name} are typing...`;
    } else {
      return `${typingUsers[0].display_name} and ${typingUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div className="flex items-center space-x-2 p-3 bg-muted/20 rounded-lg mb-2">
      <div className="flex -space-x-1">
        {typingUsers.slice(0, 2).map((user, index) => (
          <Avatar key={index} className="w-6 h-6 border-2 border-background">
            <AvatarImage src={user.profile_picture || ''} />
            <AvatarFallback className="text-xs">
              <User className="w-3 h-3" />
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      
      <div className="flex items-center space-x-1">
        <span className="text-sm text-muted-foreground">{getTypingText()}</span>
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;