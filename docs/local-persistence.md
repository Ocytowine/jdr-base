# Local Persistence Layer

This repository now ships with a standalone SQLite persistence service that keeps campaign data on disk while we iterate locally.

## Storage Layout

- **Database file**: `tmp/data/jdr.sqlite` (override with `LOCAL_DB_DIR` or `LOCAL_DB_FILE`).
- **Migrations**: defined inline in `server/persistence/localDb.ts` and tracked in the `_migrations` table.
- **Engine**: `better-sqlite3` for synchronous, server-side access without an ORM.

## Schema Highlights (v1)

- `users`: account envelope with optional external id, email, hashed secret, and JSON preferences.
- `characters`: one row per sheet linked to `users`, stores core identity, class/race, JSON blobs for attributes/state/metadata.
- `character_stats`: sparse key/value store to log derived stats and their sources.
- `inventory_items`: shared catalog of items (slug-able) with weight/value metadata.
- `character_inventory`: junction storing quantity, state JSON, equip flag, and notes per character item.
- `quests` + `character_quests`: base quest records and per-character status (`pending`, `active`, `succeeded`, `failed`, `abandoned`).
- `journal_entries`: narrative log entries per character, batchable by session id.
- `combat_sessions` + `combat_participants`: track encounters, participants, hp deltas, initiatives, and free-form metadata.
- `batched_actions`: generic event log tied to a batch id and owner type (currently cascades for character owners).
- `attachments`: optional files linked to characters (extendable later for other owner types).

Every foreign key cascades when a character is deleted so all dependent data clears automatically.

## Runtime API

`server/persistence/localDb.ts` exposes a singleton via `useLocalPersistence()`:

```
const persistence = useLocalPersistence();
const userId = persistence.createUser({ email: 'player@example.test' });
const characterId = persistence.createCharacter({
  userId,
  name: 'Morgane',
  level: 3,
  classId: 'wizard',
  ancestry: 'elf'
});

const itemId = persistence.upsertInventoryItem({
  slug: 'rope-hempen',
  name: 'Hemp Rope',
  weight: 4,
  baseValueCopper: 100
});

persistence.linkInventoryItem({ characterId, itemId, quantity: 1, isEquipped: false });
persistence.assignQuest({ characterId, status: 'active', notes: 'Spoke with the guild master.' });
persistence.appendJournalEntry({ characterId, content: 'Entered the Whispering Woods.' });
```

All inputs accept optional JSON payloads (`Record<string, unknown>`); the service serialises them transparently. Timestamps default to SQLite UTC strings via `strftime('%Y-%m-%dT%H:%M:%fZ','now')` but can be overridden when necessary.

## Next Steps

- Wire the persistence service into Nitro API routes (`server/api/...`) when we are ready to save previews or final sheets.
- Expand migrations as we discover new data domains (crafting, relationships, etc.). Add incremental entries to the `MIGRATIONS` array.
- Add read/query helpers (list characters per user, load inventory, etc.) once the consumer code needs them.
