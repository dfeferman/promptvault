-- File: app/electron/migrations/003_add_group_global_variables.sql
-- Migration: Fügt global_variables Feld zur groups Tabelle hinzu

-- Prüfe ob Spalte bereits existiert und füge sie nur hinzu, wenn sie nicht existiert
-- SQLite unterstützt kein IF NOT EXISTS für ALTER TABLE, daher verwenden wir einen Workaround
-- Versuche die Spalte hinzuzufügen (wird fehlschlagen, wenn sie bereits existiert, aber das ignorieren wir)

-- Füge global_variables Spalte hinzu (als JSON TEXT)
-- Wenn die Spalte bereits existiert, wird ein Fehler geworfen, aber das ist OK
-- Wir fangen den Fehler ab und ignorieren ihn
ALTER TABLE groups ADD COLUMN global_variables TEXT DEFAULT '{}';

-- Aktualisiere bestehende Einträge, die NULL haben, auf '{}'
UPDATE groups SET global_variables = '{}' WHERE global_variables IS NULL;

-- Schema Version aktualisieren
INSERT INTO schema_version (version, applied_at) VALUES (3, datetime('now'));

