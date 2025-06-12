
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/hooks/useChat';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import TipModal from '@/components/chat/TipModal';

const ChatDetailPage = () => {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [showTipModal, setShowTipModal] = useState(false);
  
  const { messages, loading, sendMessage, getOtherMember } = useChat(chatId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const otherMember = getOtherMember();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" 
         style={{ backgroundColor: settings?.chat_wallpaper_color || 'rgba(255, 255, 255, 1)' }}>
      
      <ChatHeader 
        otherMember={otherMember}
        onTipClick={() => setShowTipModal(true)}
      />

      <MessageList 
        messages={messages}
        currentUserId={user?.id}
      />

      <MessageInput onSendMessage={sendMessage} />

      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        otherMember={otherMember}
        chatId={chatId!}
      />
    </div>
  );
};

export default ChatDetailPage;
