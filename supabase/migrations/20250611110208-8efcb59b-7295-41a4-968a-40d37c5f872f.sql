
-- Add the missing has_ultra_badge column to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN has_ultra_badge boolean DEFAULT false;
