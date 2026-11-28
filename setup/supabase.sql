-- JARVIS OMEGA · Gedächtnis-Datenbank
-- Einmal im Supabase SQL Editor ausführen. Enthält keine privaten Daten.

create table if not exists public.memories (
  id            bigint generated always as identity primary key,
  kategorie     text not null default 'Sonstiges',
  thema         text not null,          -- verschlüsselt (AES-256-GCM)
  thema_tag     text not null,          -- Prüfsumme zum Erkennen von Widersprüchen
  inhalt        text not null,          -- verschlüsselt (AES-256-GCM)
  quelle        text default 'manuell',
  status        text not null default 'gueltig' check (status in ('gueltig','veraltet','ungueltig')),
  ersetzt_durch bigint references public.memories(id) on delete set null,
  erstellt      timestamptz not null default now(),
  aktualisiert  timestamptz not null default now()
);
create index if not exists memories_tag on public.memories (thema_tag, status);

create table if not exists public.audit (
  id     bigint generated always as identity primary key,
  zeit   timestamptz not null default now(),
  aktion text not null,
  detail text,
  ip     text
);

-- Niemand ausser dem Server (mit geheimem Schlüssel) darf lesen oder schreiben.
alter table public.memories enable row level security;
alter table public.audit    enable row level security;
revoke all on public.memories from anon, authenticated;
revoke all on public.audit    from anon, authenticated;
