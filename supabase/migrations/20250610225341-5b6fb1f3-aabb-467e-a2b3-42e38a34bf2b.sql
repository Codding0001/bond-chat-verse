
-- Create call_logs table for proper call tracking
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID REFERENCES public.profiles(id) NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'voice',
  call_status TEXT NOT NULL DEFAULT 'completed',
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on call_logs
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for call_logs
CREATE POLICY "Users can view their own call logs" 
  ON public.call_logs 
  FOR SELECT 
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create call logs" 
  ON public.call_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = caller_id);

-- Add legendary badge and gift exchange columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_legendary_badge BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS legendary_badge_color TEXT DEFAULT 'gold';

-- Add exchange rate and legendary status to gifts
ALTER TABLE public.gifts 
ADD COLUMN IF NOT EXISTS is_legendary BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_exchange BOOLEAN DEFAULT TRUE;
