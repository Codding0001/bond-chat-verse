-- Add message status and reply functionality
ALTER TABLE public.messages 
ADD COLUMN reply_to_message_id uuid REFERENCES public.messages(id),
ADD COLUMN message_status text DEFAULT 'sent',
ADD COLUMN edited_at timestamp with time zone,
ADD COLUMN deleted_for_sender boolean DEFAULT false,
ADD COLUMN deleted_for_everyone boolean DEFAULT false;

-- Create message reactions table
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on message_reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for message_reactions
CREATE POLICY "Users can view reactions in their chats" 
ON public.message_reactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.messages m 
    JOIN public.chat_members cm ON m.chat_id = cm.chat_id 
    WHERE m.id = message_reactions.message_id 
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add reactions to messages in their chats" 
ON public.message_reactions 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.messages m 
    JOIN public.chat_members cm ON m.chat_id = cm.chat_id 
    WHERE m.id = message_reactions.message_id 
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove their own reactions" 
ON public.message_reactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create typing indicators table
CREATE TABLE public.typing_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Enable RLS on typing_indicators
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Create policies for typing_indicators
CREATE POLICY "Users can view typing indicators in their chats" 
ON public.typing_indicators 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_members cm 
    WHERE cm.chat_id = typing_indicators.chat_id 
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own typing indicators" 
ON public.typing_indicators 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Create function to clean up old typing indicators
CREATE OR REPLACE FUNCTION public.cleanup_typing_indicators()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.typing_indicators 
  WHERE updated_at < NOW() - INTERVAL '5 seconds';
END;
$$;

-- Add indexes for better performance
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_typing_indicators_chat_id ON public.typing_indicators(chat_id);
CREATE INDEX idx_messages_reply_to ON public.messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;