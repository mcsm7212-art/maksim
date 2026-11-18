-- Full-height photo of the pro on a transparent background, shown big on their page with a glow in their clothing colour.
alter table public.pros add column if not exists figure_url text check (figure_url is null or char_length(figure_url) <= 500);
