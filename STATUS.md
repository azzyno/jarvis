# JARVIS OMEGA · INFINITY OS — Bestandsaufnahme & Fahrplan

Stand: 28. November 2026 · Phase 1 abgeschlossen · Phase 2 (Gedächtnis) LIVE – Neon-Datenbank verbunden, Eigentümer per Face ID eingerichtet
Wiederherstellungspunkt: Branch `backup-vor-omega-phase1`

> Dieses Repository ist **öffentlich**. Hier stehen nie private Daten, Schlüssel, Beträge oder Vertragsnummern.
> Schlüssel liegen ausschliesslich als Umgebungsvariablen in Vercel.

## 1. Architektur heute

| Teil | Technik | Ort |
|---|---|---|
| Oberfläche (neu) | `index.html`, `v2/cosmos.js` (Three.js-Sonnensystem), `v2/app.js` (MapLibre-Erde), `v2/voice.js` | GitHub Pages |
| Oberfläche (klassisch) | `classic.html` + `os.js`, `atlas.js`, `omega.js`, `vision.js`, `office.js` … | GitHub Pages |
| Backend | 12 Serverless-Funktionen in `api/` (Limit des Gratis-Tarifs erreicht) | Vercel |
| KI-Gehirn | Google Gemini (gratis) → Groq → Pollinations als Ausweich | `api/chat.js` |
| Stimme & Ohr | Gemini-TTS (Stimme „Charon“) und Gemini-Spracherkennung | `api/tts.js` |

## 2. Was wirklich funktioniert

| Funktion | Status | Quelle |
|---|---|---|
| Gespräch per Text & Stimme, mit Werkzeugen | **LIVE** | Gemini |
| Wetter + 7-Tage-Prognose | **LIVE** | Open-Meteo |
| Weltlage / Brennpunkte / Nachrichtensuche | **LIVE** | GDELT |
| Erdbeben | **LIVE** | USGS |
| Flugverkehr | **LIVE** | adsb.lol / adsbdb |
| Öffentliche Webcams | **LIVE** | Windy (WINDY_KEY) |
| Verkehrskameras NYC/London | **LIVE** | NYC DOT, TfL |
| Satelliten | **LIVE** | CelesTrak |
| Börsenkurse | **LIVE** (bis 15 Min. verzögert) | Yahoo |
| Route & Verkehr | **LIVE** | TomTom (TOMTOM_KEY) |
| Planeten-Entfernungen | **LIVE** (Bahnberechnung, Näherung) | Keplerbahnen J2000 |
| Systemprüfung (Uranus) | **LIVE** | ruft jeden Dienst echt auf |
| Saxo-Depot | **VERBINDUNG ERFORDERLICH** (nur Simulation, Freigabe pflicht) | Saxo OpenAPI |
| ElevenLabs-Agent | **NICHT VERFÜGBAR** bis Guthaben erneuert (ca. 15.12.) | ElevenLabs |

## 3. Nur Darstellung / noch nicht echt

Onlyhair, AZZYNO, Budget/Rechnungen, Wohnung, Fahrzeuge, E-Mail/Kalender, Gedächtnis und Agenten-Team sind in der Oberfläche **ehrlich als VERBINDUNG ERFORDERLICH oder IN ENTWICKLUNG markiert**. Es werden keine erfundenen Zahlen angezeigt.

## 4. Sicherheit — gefunden und behoben (Phase 1)

| Problem | Massnahme |
|---|---|
| Diagnose-Adressen verrieten Länge und Anfang des Gemini-Schlüssels | entfernt |
| Jeder im Internet konnte Gemini (Ihr Kontingent) über `chat`/`tts` nutzen | Herkunftsprüfung (nur azzyno.github.io) + Mengenbegrenzung pro IP |
| Test-Abkürzungen `?ask=`, `?selftest`, `?models` | entfernt |
| Saxo-Token liegt im Browser-Speicher (`localStorage`) | **offen** – wird mit Anmeldung in Phase 2 serverseitig verschlüsselt |
| Keine Anmeldung: jeder mit dem Link sieht die Oberfläche | **offen** – Phase 2 (Passkey) |
| Schlüssel-Suche in allen Dateien und der gesamten Git-Historie | keine Funde |

Grenze: Die Herkunftsprüfung hält Fremdseiten und einfache Skripte ab, ist aber kein Ersatz für eine Anmeldung.

## 5. Was für die nächsten Phasen gebraucht wird

| Phase | Inhalt | Benötigt von Ihnen |
|---|---|---|
| 2 | Anmeldung (Passkey), verschlüsselte Datenbank, Gedächtnis, Connector-Zentrale | Gratis-Konto bei einer Datenbank (z. B. Supabase oder Neon) – Schlüssel nur in Vercel |
| 2 | Mehr Serverfunktionen | Funktionen werden zusammengelegt (Vercel-Gratis-Limit 12) |
| 3 | Agenten-Orchestrierung, Hintergrund-Aufgaben, Morgen-Briefing | Vercel Cron (gratis, 1× täglich) oder externer Scheduler |
| 4 | Onlyhair | Datenexport aus Salonkee (CSV) oder offizieller API-Zugang |
| 4 | AZZYNO | Spotify for Artists hat keine öffentliche API → CSV-Export; YouTube/Instagram per OAuth |
| 4 | Fahrzeuge | myAudi / BMW ConnectedDrive bieten keine offene API für Private → Smartcar/High Mobility (kostenpflichtig) |
| 4 | Finanzen | CSV/PDF-Import der Kontoauszüge; Open Banking nur über lizenzierte Anbieter |
| 5 | Kurdistan-Zentrum, mehr Weltdaten | grösstenteils gratis (GDELT, RSS von Rudaw/Kurdistan24/ANF) |
| 6 | Desktop-Agent, Smart Home | Home Assistant im Heimnetz; lokales Programm auf Ihrem Computer |

## 5b. Phase 2 – was gebaut ist

| Teil | Status | Datei |
|---|---|---|
| Anmeldung nur für den Eigentümer mit Passkey (Face ID), erstes Gerät = Eigentümer | gebaut + getestet (virtueller Authenticator) | `api/os.js`, `v2/vault.js` |
| Gedächtnis mit Kategorie, Quelle, Datum, Status (gültig/veraltet/ungültig) | gebaut | `api/os.js` |
| Verschlüsselung AES-256-GCM auf dem Server (VAULT_KEY optional, sonst aus DB-Passwort abgeleitet) | gebaut + getestet mit echter Postgres | `api/os.js` |
| Widerspruchserkennung: gleiches Thema, anderer Inhalt → Rückfrage, alter Eintrag wird „veraltet“ | gebaut + getestet | `api/os.js` |
| Import (Notizen, Text, exportierte KI-Erinnerungen, JSON) und Export | gebaut | `v2/vault.js` |
| Verbindungszentrale (echt geprüft) und Zugriffsprotokoll | gebaut | `api/os.js` |
| JARVIS kann sich per Stimme erinnern und Neues merken | gebaut | `jarvis_memory_search/save` |
| Datenbank: jede Postgres (Vercel Storage → Neon/Supabase), Tabellen legt JARVIS selbst an | gebaut + getestet | `api/os.js` |
| Einrichtungsseite mit Live-Prüfung | gebaut | `setup.html` |
| Weitere Geräte per Passkey hinzufügen | gebaut | `v2/vault.js` |
| Notfall: Passkey verloren → Tabelle `jv_keys` in der Datenbank leeren, dann neu einrichten | dokumentiert | – |

## 6. Regeln, die fest eingebaut bleiben

- Keine Käufe, Zahlungen, Veröffentlichungen, Vertragsänderungen oder Löschungen ohne ausdrückliche Freigabe.
- Börsenhandel nur Simulation; echte Orders nur mit Eintippen von KAUFEN/VERKAUFEN.
- Keine Gesichtserkennung fremder Personen, keine heimliche Überwachung.
- JARVIS behauptet nie, etwas getan zu haben, das er nicht mit einem Werkzeug getan hat.
