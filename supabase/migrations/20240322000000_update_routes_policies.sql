-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON public.routes;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.routes;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON public.routes;

-- Create new policies
CREATE POLICY "Enable read access for all users" ON public.routes
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.routes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.routes
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Drop existing indexes
DROP INDEX IF EXISTS routes_location_idx;
DROP INDEX IF EXISTS routes_popularity_created_idx;
DROP INDEX IF EXISTS routes_from_lat_idx;
DROP INDEX IF EXISTS routes_from_lng_idx;
DROP INDEX IF EXISTS routes_to_lat_idx;
DROP INDEX IF EXISTS routes_to_lng_idx;
DROP INDEX IF EXISTS routes_popularity_idx;
DROP INDEX IF EXISTS routes_created_at_idx;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS routes_from_lat_idx ON public.routes (("from"->>'lat'));
CREATE INDEX IF NOT EXISTS routes_from_lng_idx ON public.routes (("from"->>'lng'));
CREATE INDEX IF NOT EXISTS routes_to_lat_idx ON public.routes (("to"->>'lat'));
CREATE INDEX IF NOT EXISTS routes_to_lng_idx ON public.routes (("to"->>'lng'));
CREATE INDEX IF NOT EXISTS routes_popularity_idx ON public.routes (popularity DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS routes_created_at_idx ON public.routes (created_at DESC);

-- Ensure popularity is never null
UPDATE public.routes SET popularity = 0 WHERE popularity IS NULL;
ALTER TABLE public.routes ALTER COLUMN popularity SET DEFAULT 0;
ALTER TABLE public.routes ALTER COLUMN popularity SET NOT NULL; 