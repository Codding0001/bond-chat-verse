
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
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const commonEmojis = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎'];

  useEffect(() => {
    return () => {
      if (longPressTimer) clearTimeout(longPressTimer);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, []);

  // Enhanced long press for reactions (2 seconds)
  const handleMouseDown = () => {
    const timer = setTimeout(() => {
      setShowReactions(true);
    }, 2000);
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Enhanced voice message playback with speed control
  const handleVoicePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.play();
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Create audio element for voice messages
  useEffect(() => {
    if (message.message_type === 'voice' && message.file_url && !audioRef.current) {
      const audio = new Audio(message.file_url);
      audioRef.current = audio;
      
      audio.onloadedmetadata = () => {
        setDuration(Math.floor(audio.duration));
      };
      
      audio.onplay = () => {
        setIsPlaying(true);
        playbackTimerRef.current = setInterval(() => {
          setPlaybackTime(Math.floor(audio.currentTime));
        }, 100);
      };
      
      audio.onpause = () => {
        setIsPlaying(false);
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current);
        }
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current);
        }
      };
    }
  }, [message.file_url, message.message_type]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
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

            {/* Enhanced voice message with speed controls */}
            {message.message_type === 'voice' && message.file_url && (
              <div className="mb-2 p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full p-2 h-10 w-10"
                    onClick={handleVoicePlay}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  
                  {/* Waveform visualization */}
                  <div className="flex-1 h-8 flex items-center space-x-1">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-100 ${
                          isPlaying 
                            ? 'bg-primary animate-pulse' 
                            : 'bg-muted-foreground/50'
                        }`}
                        style={{
                          height: `${Math.random() * 24 + 8}px`,
                          animationDelay: `${i * 50}ms`
                        }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span>{formatTime(playbackTime)} / {formatTime(duration)}</span>
                  
                  {/* Speed selector */}
                  <select 
                    className="bg-transparent border-0 text-xs focus:outline-none"
                    value={playbackRate}
                    onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  >
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>
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
            
            {(message.message_type === 'text' || message.message_type === 'tip') && (
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
                    className="text-xs cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => onReaction(message.id, reaction.emoji)}
                  >
                    {reaction.emoji} {reaction.count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced options menu */}
        {showOptions && (
          <div className="absolute top-0 right-0 bg-popover border rounded-md shadow-lg p-1 z-10 min-w-40">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onReply(message.id);
                setShowOptions(false);
              }}
              className="w-full justify-start text-sm"
            >
              <Reply className="w-4 h-4 mr-2" />
              Reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onDelete(message.id, false);
                setShowOptions(false);
              }}
              className="w-full justify-start text-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete for me
            </Button>
            {isOwnMessage && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onDelete(message.id, true);
                  setShowOptions(false);
                }}
                className="w-full justify-start text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete for everyone
              </Button>
            )}
          </div>
        )}

        {/* Enhanced reaction picker */}
        {showReactions && (
          <div className="absolute -top-16 left-0 bg-popover border rounded-full shadow-lg p-2 z-20">
            <div className="flex space-x-1">
              {commonEmojis.map((emoji) => (
                <Button
                  key={emoji}
                  size="sm"
                  variant="ghost"
                  className="text-lg p-1 h-10 w-10 hover:scale-125 transition-transform"
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

        {/* Click to show options */}
        <Button
          size="sm"
          variant="ghost"
          className="absolute -top-2 -right-2 opacity-0 hover:opacity-100 transition-opacity"
          onClick={() => setShowOptions(!showOptions)}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageItem;
