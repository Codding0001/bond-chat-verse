-- Clean up ALL existing problematic policies completely
DROP POLICY IF EXISTS "Users can view chat members for chats they belong to" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view all chat members" ON public.chat_members;
DROP POLICY IF EXISTS "Users can join chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can insert chat members" ON public.chat_members;
DROP POLICY IF EXISTS "Users can update their own chat member records" ON public.chat_members;
DROP POLICY IF EXISTS "Users can delete their own chat member records" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view chat members for chats they are in" ON public.chat_members;
DROP POLICY IF EXISTS "Users can add members to chats they created" ON public.chat_members;

-- Also clean up messages policies that might be causing issues
DROP POLICY IF EXISTS "Users can view messages in chats they belong to" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to chats they are members of" ON public.messages;

-- Create completely clean, simple policies for chat_members
CREATE POLICY "Enable all access for chat_members" 
  ON public.chat_members 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create clean policies for messages using the security definer function
CREATE POLICY "Users can access messages in their chats" 
  ON public.messages 
  FOR ALL 
  USING (public.user_is_chat_member(chat_id, auth.uid()))
  WITH CHECK (public.user_is_chat_member(chat_id, auth.uid()) AND auth.uid() = sender_id);