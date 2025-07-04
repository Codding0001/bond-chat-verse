-- Add verification badges system
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_badge_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_badge_type TEXT CHECK (verification_badge_type IN ('weekly', 'monthly', 'lifetime'));

-- Add pinned chats
ALTER TABLE public.chat_members ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat files
CREATE POLICY "Users can upload chat files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Chat members can view chat files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-files' AND
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      JOIN public.messages m ON m.chat_id = cm.chat_id
      WHERE cm.user_id = auth.uid() AND m.file_url LIKE '%' || name || '%'
    )
  );

-- Add verification badge purchase transactions
CREATE TABLE IF NOT EXISTS public.verification_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('weekly', 'monthly', 'lifetime')),
  cost INTEGER NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.verification_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification purchases" ON public.verification_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create verification purchases" ON public.verification_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);