import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ContactNicknameProps {
  contactId: string;
  contactName: string;
  onNicknameChange: (nickname: string) => void;
}

const ContactNickname: React.FC<ContactNicknameProps> = ({
  contactId,
  contactName,
  onNicknameChange
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [nickname, setNickname] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadNickname();
  }, [contactId, user]);

  const loadNickname = () => {
    if (!user) return;
    
    const savedNicknames = localStorage.getItem(`nicknames_${user.id}`);
    if (savedNicknames) {
      const nicknames = JSON.parse(savedNicknames);
      setNickname(nicknames[contactId] || '');
    }
  };

  const saveNickname = () => {
    if (!user) return;

    const savedNicknames = localStorage.getItem(`nicknames_${user.id}`);
    const nicknames = savedNicknames ? JSON.parse(savedNicknames) : {};
    
    if (nickname.trim()) {
      nicknames[contactId] = nickname.trim();
    } else {
      delete nicknames[contactId];
    }
    
    localStorage.setItem(`nicknames_${user.id}`, JSON.stringify(nicknames));
    onNicknameChange(nickname.trim() || contactName);
    setIsEditing(false);
    
    toast({
      title: "Nickname updated",
      description: nickname.trim() ? `Set nickname to "${nickname.trim()}"` : "Nickname removed",
    });
  };

  if (!isEditing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsEditing(true)}
        className="text-xs"
      >
        {nickname ? `"${nickname}"` : "Set nickname"}
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder={contactName}
        className="text-xs h-8"
        maxLength={20}
      />
      <Button size="sm" onClick={saveNickname} className="h-8">
        Save
      </Button>
      <Button 
        size="sm" 
        variant="outline" 
        onClick={() => {
          setIsEditing(false);
          loadNickname();
        }}
        className="h-8"
      >
        Cancel
      </Button>
    </div>
  );
};

export default ContactNickname;