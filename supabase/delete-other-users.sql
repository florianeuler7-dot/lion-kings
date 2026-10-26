-- WinterArc 26/27 – alle Nutzer außer einem löschen
--
-- So geht's:
--   1. Supabase-Dashboard → Projekt öffnen → links "SQL Editor" → "New query"
--   2. Diesen Text einfügen
--   3. Überall 'Flo' durch deinen Namen ersetzen (so wie er in der App steht,
--      Groß-/Kleinschreibung egal)
--   4. "Run" klicken
--
-- ACHTUNG: Löscht die anderen Nutzer samt Workouts, Reaktionen, Kommentaren und
-- Live-Status unwiderruflich. Vorher ggf. Backup anlegen (Database → Backups).

begin;

-- Kontrolle: Wer bleibt? (muss genau eine Zeile liefern)
select id, name from users where name ilike 'Flo';

-- Abhängige Daten der anderen Nutzer entfernen
delete from reactions   where workout_id in (select id from workouts where user_id in (select id from users where name not ilike 'Flo'));
delete from reactions   where user_id    in (select id from users where name not ilike 'Flo');
delete from comments    where workout_id in (select id from workouts where user_id in (select id from users where name not ilike 'Flo'));
delete from comments    where user_id    in (select id from users where name not ilike 'Flo');
delete from live_status where user_id    in (select id from users where name not ilike 'Flo');
delete from daily_steps where user_id    in (select id from users where name not ilike 'Flo');
delete from workouts    where user_id    in (select id from users where name not ilike 'Flo');

-- Die Nutzer selbst
delete from users where name not ilike 'Flo';

-- Kontrolle: Übrige Nutzer
select id, name, created_at from users;

commit;
