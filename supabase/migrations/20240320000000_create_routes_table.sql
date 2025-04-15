create table public.routes (
  id uuid default gen_random_uuid() primary key,
  from_location text not null,
  to_location text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  popularity integer default 0 not null
);

-- Enable RLS
alter table public.routes enable row level security;

-- Create policy to allow public read access
create policy "Allow public read access"
  on public.routes for select
  using (true);

-- Create policy to allow authenticated users to insert
create policy "Allow authenticated users to insert"
  on public.routes for insert
  to authenticated
  with check (true);

-- Create policy to allow authenticated users to update
create policy "Allow authenticated users to update"
  on public.routes for update
  to authenticated
  using (true);

-- Create index for popularity
create index routes_popularity_idx on public.routes (popularity desc); 