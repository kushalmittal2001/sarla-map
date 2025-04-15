-- Add popularity column to routes table
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS popularity integer DEFAULT 0 NOT NULL;

-- Create index for popularity
CREATE INDEX IF NOT EXISTS routes_popularity_idx ON public.routes (popularity DESC); 