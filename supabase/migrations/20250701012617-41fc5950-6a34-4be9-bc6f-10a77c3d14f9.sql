
-- Drop the problematic recursive policy on chat_members
DROP POLICY IF EXISTS "Users can view chat members for chats they belong to" ON public.chat_members;

-- Create new non-recursive policies for chat_members
CREATE POLICY "Users can view all chat members" 
  ON public.chat_members 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can join chats" 
  ON public.chat_members 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update their own chat member records" 
  ON public.chat_members 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Also ensure the messages policy doesn't cause issues by simplifying it
DROP POLICY IF EXISTS "Users can view messages in chats they belong to" ON public.messages;

CREATE POLICY "Users can view messages in chats they belong to" 
  ON public.messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members 
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );
