-- Removes the 5 TEST pros (and everything linked to them).
delete from auth.users where id::text like '7e570000-0000-4000-8000-00000000000_';
