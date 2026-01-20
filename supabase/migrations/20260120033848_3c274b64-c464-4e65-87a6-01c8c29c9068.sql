-- Add boost columns to posts table
ALTER TABLE public.posts
ADD COLUMN boost_until timestamp with time zone DEFAULT NULL,
ADD COLUMN boost_level integer DEFAULT NULL;

-- Create index for efficient querying of boosted posts
CREATE INDEX idx_posts_boost_until ON public.posts (boost_until DESC NULLS LAST);