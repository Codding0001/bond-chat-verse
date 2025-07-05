import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Reply, 
  MoreHorizontal, 
  Check, 
  CheckCheck, 
  User,
  Paperclip,
  Play,
  Pause
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MessageItemProps {
  message: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    message_type: string;
    file_url?: string;
    message_status?: string;
    deleted_for_everyone?: boolean;
    deleted_for_sender?: boolean;
    reply_to_message_id?: string;
    edited_at?: string;
  };
  senderProfile?: {
    display_name: string;
    profile_picture?: string;
  };
  replyToMessage?: {
    content: string;
    sender_name: string;
  };
  reactions: Array<{
    emoji: string;
    count: number;
    users: string[];
    hasUserReacted: boolean;
  }>;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
  onDelete: (messageId: string, deleteForEveryone: boolean) => void;
  isOwnMessage: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  senderProfile,
  replyToMessage,
  reactions,
  onReaction,
  onReply,
  onDelete,
  isOwnMessage
}) => {
  const { user } = useAuth();
  const [showOptions, setShowOptions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const commonEmojis = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎'];

  // Handle swipe for reply
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = Math.abs(touchStartY.current - touchEndY);

    // Swipe right to reply (only if horizontal swipe is significant and vertical is minimal)
    if (diffX > 50 && diffY < 30) {
      onReply(message.id);
    }
  };

  // Handle long press for reactions
  const handleMouseDown = () => {
    const timer = setTimeout(() => {
      setShowReactions(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleVoicePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const renderMessageStatus = () => {
    if (!isOwnMessage) return null;
    
    const status = message.message_status || 'sent';
    
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  if (message.deleted_for_everyone) {
    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className="bg-muted rounded-lg p-3 max-w-xs">
          <p className="text-sm text-muted-foreground italic">🚫 This message was deleted</p>
        </div>
      </div>
    );
  }

  if (message.deleted_for_sender && isOwnMessage) {
    return (
      <div className="flex justify-end mb-2">
        <div className="bg-muted rounded-lg p-3 max-w-xs">
          <p className="text-sm text-muted-foreground italic">🗑️ You deleted this message</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2 relative`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="relative">
        <Card className={`max-w-xs ${
          isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-card'
        }`}>
          <CardContent className="p-3">
            {/* Reply indicator */}
            {replyToMessage && (
              <div className="mb-2 p-2 bg-muted/50 rounded border-l-2 border-primary">
                <p className="text-xs font-semibold text-muted-foreground">
                  {replyToMessage.sender_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {replyToMessage.content}
                </p>
              </div>
            )}

            {/* Message content */}
            {message.message_type === 'image' && message.file_url && (
              <div className="mb-2">
                <img 
                  src={message.file_url} 
                  alt={message.content}
                  className="max-w-full h-auto rounded"
                />
              </div>
            )}
            
            {message.message_type === 'voice' && message.file_url && (
              <div className="mb-2 flex items-center space-x-2 bg-muted/20 rounded-full p-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full p-1 h-8 w-8"
                  onClick={handleVoicePlay}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <div className="flex-1 h-1 bg-muted rounded-full">
                  <div className="h-1 bg-primary rounded-full w-1/3"></div>
                </div>
                <span className="text-xs">0:30</span>
                <audio
                  ref={audioRef}
                  src={message.file_url}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            )}
            
            {message.message_type === 'file' && message.file_url && (
              <div className="mb-2 p-2 bg-muted/20 rounded flex items-center space-x-2">
                <Paperclip className="w-4 h-4" />
                <a 
                  href={message.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm underline truncate"
                >
                  {message.content}
                </a>
              </div>
            )}
            
            {message.message_type === 'text' && (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}

            {/* Message footer */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-1">
                <p className={`text-xs ${
                  isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                  {message.edited_at && ' (edited)'}
                </p>
                {renderMessageStatus()}
              </div>
            </div>

            {/* Reactions */}
            {reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {reactions.map((reaction, index) => (
                  <Badge
                    key={index}
                    variant={reaction.hasUserReacted ? "default" : "secondary"}
                    className="text-xs cursor-pointer"
                    onClick={() => onReaction(message.id, reaction.emoji)}
                  >
                    {reaction.emoji} {reaction.count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message options */}
        {showOptions && (
          <div className="absolute top-0 right-0 bg-popover border rounded-md shadow-md p-1 z-10">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReply(message.id)}
              className="w-full justify-start"
            >
              <Reply className="w-4 h-4 mr-2" />
              Reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(message.id, false)}
              className="w-full justify-start"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete for me
            </Button>
            {isOwnMessage && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(message.id, true)}
                className="w-full justify-start"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete for everyone
              </Button>
            )}
          </div>
        )}

        {/* Reaction picker */}
        {showReactions && (
          <div className="absolute -top-12 left-0 bg-popover border rounded-full shadow-lg p-2 z-20">
            <div className="flex space-x-1">
              {commonEmojis.map((emoji) => (
                <Button
                  key={emoji}
                  size="sm"
                  variant="ghost"
                  className="text-lg p-1 h-8 w-8"
                  onClick={() => {
                    onReaction(message.id, emoji);
                    setShowReactions(false);
                  }}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;