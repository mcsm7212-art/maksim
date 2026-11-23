-- A quote can say about how long the job takes ("2-3 hours", "1 day"): the client sees it before picking a time.
alter table public.quotes add column if not exists duration text check (duration is null or char_length(duration) <= 60);
create or replace function public.set_quote_duration(q_id uuid, d text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.non_latin(d) or public.bad_text(d) then raise exception 'english only: duration'; end if;
  update public.quotes set duration = nullif(btrim(left(d, 60)), '') where id = q_id and pro_id = auth.uid() and status = 'sent';
end;
$$;
grant execute on function public.set_quote_duration(uuid, text) to authenticated;
