
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type: string;
  is_read?: boolean;
}

export interface ChatMember {
  user_id: string;
  profiles: {
    display_name: string;
    user_number: string;
    is_online: boolean;
  };
}
