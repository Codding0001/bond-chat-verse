
-- First, let's drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view chat members for chats they belong to" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view all chat members" ON public.chat_members;
DROP POLICY IF EXISTS "Users can join chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can update their own chat member records" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view messages in chats they belong to" ON public.messages;

-- Drop existing policies for chats and messages to avoid conflicts
DROP POLICY IF EXISTS "Users can view all chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.messages;

-- Create a security definer function to check chat membership without recursion
CREATE OR REPLACE FUNCTION public.user_is_chat_member(chat_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members 
    WHERE chat_id = chat_id_param AND user_id = user_id_param
  );
$$;

-- Enable RLS on all tables if not already enabled
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create non-recursive policies for chat_members
CREATE POLICY "Users can view all chat members" 
  ON public.chat_members 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert chat members" 
  ON public.chat_members 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update their own chat member records" 
  ON public.chat_members 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat member records" 
  ON public.chat_members 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create policies for chats table
CREATE POLICY "Users can view all chats" 
  ON public.chats 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create chats" 
  ON public.chats 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

-- Create simple non-recursive policies for messages
CREATE POLICY "Users can view messages in their chats" 
  ON public.messages 
  FOR SELECT 
  USING (public.user_is_chat_member(chat_id, auth.uid()));

CREATE POLICY "Users can insert messages in their chats" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (public.user_is_chat_member(chat_id, auth.uid()));
