-- Featured = the single hero article for its vertical (the `category` column).
-- Featuring a new article demotes the previously featured one in that vertical,
-- so there is at most one featured article per vertical at any time.
--
-- Runs for both save paths (quick-save and full-save) since it lives in the DB.

create or replace function public.demote_prior_featured()
returns trigger
language plpgsql
as $$
begin
  -- Only act when this row is (being) featured and has a vertical.
  if new.featured is true and new.category is not null then
    update public.articles
       set featured = false
     where category = new.category
       and featured is true
       and id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_demote_prior_featured on public.articles;

create trigger trg_demote_prior_featured
  after insert or update of featured, category on public.articles
  for each row
  when (new.featured is true)
  execute function public.demote_prior_featured();
