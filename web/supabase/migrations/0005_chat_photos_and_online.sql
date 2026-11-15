-- Photos in chat: a message can be a photo with an optional caption.
alter table public.messages add column if not exists photo_url text;
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) <= 4000 and (char_length(body) >= 1 or photo_url is not null));
