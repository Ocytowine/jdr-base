import fs from 'node:fs';
import path from 'node:path';

import BetterSqlite from 'better-sqlite3';
import type { Database as BetterSqliteDatabase } from 'better-sqlite3';

type Migration = {
  id: number;
  name: string;
  sql: string;
};

const ISO_NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'init-core-schema',
    sql: `
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id TEXT UNIQUE,
        email TEXT UNIQUE,
        display_name TEXT,
        password_hash TEXT,
        preferences TEXT,
        created_at TEXT NOT NULL DEFAULT ${ISO_NOW},
        updated_at TEXT NOT NULL DEFAULT ${ISO_NOW}
      );

      CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        summary TEXT,
        level INTEGER NOT NULL DEFAULT 1,
        ancestry TEXT,
        class_id TEXT,
        background TEXT,
        attributes TEXT,
        state TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT ${ISO_NOW},
        updated_at TEXT NOT NULL DEFAULT ${ISO_NOW},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);

      CREATE TABLE IF NOT EXISTS character_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        stat_key TEXT NOT NULL,
        stat_value TEXT NOT NULL,
        source TEXT,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT ${ISO_NOW},
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        UNIQUE (character_id, stat_key, COALESCE(source, ''))
      );

      CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE,
        name TEXT NOT NULL,
        item_type TEXT,
        description TEXT,
        weight REAL NOT NULL DEFAULT 0,
        base_value_copper INTEGER NOT NULL DEFAULT 0,
        tags TEXT,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS character_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        item_id INTEGER,
        custom_name TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        state TEXT,
        location TEXT,
        is_equipped INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT ${ISO_NOW},
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_character_inventory_character ON character_inventory(character_id);

      CREATE TABLE IF NOT EXISTS quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        quest_type TEXT,
        rewards TEXT,
        tags TEXT,
        origin TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT ${ISO_NOW}
      );

      CREATE TABLE IF NOT EXISTS character_quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        quest_id INTEGER,
        title_override TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        progress TEXT,
        notes TEXT,
        started_at TEXT,
        completed_at TEXT,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE SET NULL,
        CHECK (status IN ('pending','active','succeeded','failed','abandoned'))
      );

      CREATE INDEX IF NOT EXISTS idx_character_quests_character ON character_quests(character_id);

      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        batch_id TEXT,
        title TEXT,
        content TEXT NOT NULL,
        tags TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT ${ISO_NOW},
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_journal_entries_character ON journal_entries(character_id);
      CREATE INDEX IF NOT EXISTS idx_journal_entries_batch ON journal_entries(batch_id);

      CREATE TABLE IF NOT EXISTS combat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id TEXT,
        user_id INTEGER,
        character_id INTEGER,
        started_at TEXT NOT NULL DEFAULT ${ISO_NOW},
        ended_at TEXT,
        location TEXT,
        summary TEXT,
        result TEXT,
        notes TEXT,
        metadata TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_combat_sessions_batch ON combat_sessions(batch_id);

      CREATE TABLE IF NOT EXISTS combat_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        combat_session_id INTEGER NOT NULL,
        entity_type TEXT NOT NULL,
        entity_ref TEXT,
        name TEXT NOT NULL,
        role TEXT,
        initiative REAL,
        hit_points_start INTEGER,
        hit_points_end INTEGER,
        data TEXT,
        FOREIGN KEY (combat_session_id) REFERENCES combat_sessions(id) ON DELETE CASCADE,
        CHECK (entity_type IN ('character','npc','monster','ally','other'))
      );

      CREATE INDEX IF NOT EXISTS idx_combat_participants_session ON combat_participants(combat_session_id);

      CREATE TABLE IF NOT EXISTS batched_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id TEXT NOT NULL,
        owner_type TEXT NOT NULL,
        owner_id INTEGER,
        action_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        occurred_at TEXT NOT NULL DEFAULT ${ISO_NOW},
        FOREIGN KEY (owner_id) REFERENCES characters(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_batched_actions_batch ON batched_actions(batch_id);
      CREATE INDEX IF NOT EXISTS idx_batched_actions_owner ON batched_actions(owner_type, owner_id);

      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_type TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        label TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT ${ISO_NOW},
        FOREIGN KEY (owner_id) REFERENCES characters(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_attachments_owner ON attachments(owner_type, owner_id);
    `
  }
];

const DEFAULT_DB_DIR = process.env.LOCAL_DB_DIR || path.resolve(process.cwd(), 'tmp', 'data');
const DEFAULT_DB_FILE = process.env.LOCAL_DB_FILE || path.join(DEFAULT_DB_DIR, 'jdr.sqlite');

type Nullable<T> = T | null;

class LocalPersistence {
  private static instance: Nullable<LocalPersistence> = null;
  private readonly db: BetterSqliteDatabase;

  private constructor(dbFile: string) {
    this.ensureDirectory(dbFile);
    this.db = new BetterSqlite(dbFile);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    this.runMigrations();
  }

  static getInstance(): LocalPersistence {
    if (!LocalPersistence.instance) {
      LocalPersistence.instance = new LocalPersistence(DEFAULT_DB_FILE);
    }
    return LocalPersistence.instance;
  }

  get connection(): BetterSqliteDatabase {
    return this.db;
  }

  private ensureDirectory(dbFile: string) {
    const dir = path.dirname(dbFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private runMigrations() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT ${ISO_NOW}
      );
    `);

    const applied = new Map<number, string>();
    const rows = this.db.prepare('SELECT id, name FROM _migrations ORDER BY id').all();
    for (const row of rows) {
      applied.set(row.id as number, row.name as string);
    }

    const applyMigration = this.db.transaction((migration: Migration) => {
      this.db.exec(migration.sql);
      this.db.prepare('INSERT INTO _migrations (id, name) VALUES (?, ?)').run(migration.id, migration.name);
    });

    for (const migration of MIGRATIONS) {
      if (!applied.has(migration.id)) {
        applyMigration(migration);
      }
    }
  }

  createUser(input: {
    externalId?: string;
    email?: string;
    displayName?: string;
    passwordHash?: string;
    preferences?: Record<string, unknown> | null;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO users (external_id, email, display_name, password_hash, preferences)
      VALUES (@externalId, @email, @displayName, @passwordHash, @preferences)
    `);
    const result = stmt.run({
      externalId: input.externalId ?? null,
      email: input.email ?? null,
      displayName: input.displayName ?? null,
      passwordHash: input.passwordHash ?? null,
      preferences: input.preferences ? JSON.stringify(input.preferences) : null
    });
    return Number(result.lastInsertRowid);
  }

  createCharacter(input: {
    userId: number;
    name: string;
    summary?: string;
    level?: number;
    ancestry?: string;
    classId?: string;
    background?: string;
    attributes?: Record<string, unknown> | null;
    state?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO characters (
        user_id, name, summary, level, ancestry, class_id, background, attributes, state, metadata
      ) VALUES (
        @userId, @name, @summary, @level, @ancestry, @classId, @background, @attributes, @state, @metadata
      )
    `);
    const result = stmt.run({
      userId: input.userId,
      name: input.name,
      summary: input.summary ?? null,
      level: input.level ?? 1,
      ancestry: input.ancestry ?? null,
      classId: input.classId ?? null,
      background: input.background ?? null,
      attributes: input.attributes ? JSON.stringify(input.attributes) : null,
      state: input.state ? JSON.stringify(input.state) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null
    });
    return Number(result.lastInsertRowid);
  }

  upsertInventoryItem(input: {
    slug?: string;
    name: string;
    itemType?: string;
    description?: string;
    weight?: number;
    baseValueCopper?: number;
    tags?: string[];
    metadata?: Record<string, unknown> | null;
  }): number {
    const existing = input.slug
      ? this.db.prepare('SELECT id FROM inventory_items WHERE slug = ?').get(input.slug)
      : null;

    if (existing?.id) {
      this.db.prepare(`
        UPDATE inventory_items
        SET name = @name,
            item_type = @itemType,
            description = @description,
            weight = @weight,
            base_value_copper = @baseValueCopper,
            tags = @tags,
            metadata = @metadata
        WHERE id = @id
      `).run({
        id: existing.id,
        name: input.name,
        itemType: input.itemType ?? null,
        description: input.description ?? null,
        weight: input.weight ?? 0,
        baseValueCopper: input.baseValueCopper ?? 0,
        tags: input.tags?.length ? JSON.stringify(input.tags) : null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null
      });
      return Number(existing.id);
    }

    const result = this.db.prepare(`
      INSERT INTO inventory_items (slug, name, item_type, description, weight, base_value_copper, tags, metadata)
      VALUES (@slug, @name, @itemType, @description, @weight, @baseValueCopper, @tags, @metadata)
    `).run({
      slug: input.slug ?? null,
      name: input.name,
      itemType: input.itemType ?? null,
      description: input.description ?? null,
      weight: input.weight ?? 0,
      baseValueCopper: input.baseValueCopper ?? 0,
      tags: input.tags?.length ? JSON.stringify(input.tags) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null
    });

    return Number(result.lastInsertRowid);
  }

  linkInventoryItem(input: {
    characterId: number;
    itemId?: number;
    customName?: string;
    quantity?: number;
    state?: Record<string, unknown> | null;
    location?: string;
    isEquipped?: boolean;
    notes?: string;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO character_inventory (
        character_id, item_id, custom_name, quantity, state, location, is_equipped, notes
      ) VALUES (
        @characterId, @itemId, @customName, @quantity, @state, @location, @isEquipped, @notes
      )
    `);
    const result = stmt.run({
      characterId: input.characterId,
      itemId: input.itemId ?? null,
      customName: input.customName ?? null,
      quantity: input.quantity ?? 1,
      state: input.state ? JSON.stringify(input.state) : null,
      location: input.location ?? null,
      isEquipped: input.isEquipped ? 1 : 0,
      notes: input.notes ?? null
    });
    return Number(result.lastInsertRowid);
  }

  assignQuest(input: {
    characterId: number;
    questId?: number;
    titleOverride?: string;
    status?: 'pending' | 'active' | 'succeeded' | 'failed' | 'abandoned';
    progress?: Record<string, unknown> | null;
    notes?: string;
    startedAt?: string;
    completedAt?: string;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO character_quests (
        character_id, quest_id, title_override, status, progress, notes, started_at, completed_at
      ) VALUES (
        @characterId, @questId, @titleOverride, @status, @progress, @notes, @startedAt, @completedAt
      )
    `);
    const result = stmt.run({
      characterId: input.characterId,
      questId: input.questId ?? null,
      titleOverride: input.titleOverride ?? null,
      status: input.status ?? 'pending',
      progress: input.progress ? JSON.stringify(input.progress) : null,
      notes: input.notes ?? null,
      startedAt: input.startedAt ?? null,
      completedAt: input.completedAt ?? null
    });
    return Number(result.lastInsertRowid);
  }

  appendJournalEntry(input: {
    characterId: number;
    batchId?: string;
    title?: string;
    content: string;
    tags?: string[];
    metadata?: Record<string, unknown> | null;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO journal_entries (character_id, batch_id, title, content, tags, metadata)
      VALUES (@characterId, @batchId, @title, @content, @tags, @metadata)
    `);
    const result = stmt.run({
      characterId: input.characterId,
      batchId: input.batchId ?? null,
      title: input.title ?? null,
      content: input.content,
      tags: input.tags?.length ? JSON.stringify(input.tags) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null
    });
    return Number(result.lastInsertRowid);
  }

  createCombatSession(input: {
    batchId?: string;
    userId?: number;
    characterId?: number;
    startedAt?: string;
    endedAt?: string;
    location?: string;
    summary?: string;
    result?: string;
    notes?: string;
    metadata?: Record<string, unknown> | null;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO combat_sessions (
        batch_id, user_id, character_id, started_at, ended_at, location, summary, result, notes, metadata
      ) VALUES (
        @batchId, @userId, @characterId, @startedAt, @endedAt, @location, @summary, @result, @notes, @metadata
      )
    `);
    const result = stmt.run({
      batchId: input.batchId ?? null,
      userId: input.userId ?? null,
      characterId: input.characterId ?? null,
      startedAt: input.startedAt ?? null,
      endedAt: input.endedAt ?? null,
      location: input.location ?? null,
      summary: input.summary ?? null,
      result: input.result ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null
    });
    return Number(result.lastInsertRowid);
  }

  addCombatParticipant(input: {
    combatSessionId: number;
    entityType: 'character' | 'npc' | 'monster' | 'ally' | 'other';
    entityRef?: string;
    name: string;
    role?: string;
    initiative?: number;
    hitPointsStart?: number;
    hitPointsEnd?: number;
    data?: Record<string, unknown> | null;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO combat_participants (
        combat_session_id, entity_type, entity_ref, name, role, initiative, hit_points_start, hit_points_end, data
      ) VALUES (
        @combatSessionId, @entityType, @entityRef, @name, @role, @initiative, @hitPointsStart, @hitPointsEnd, @data
      )
    `);
    const result = stmt.run({
      combatSessionId: input.combatSessionId,
      entityType: input.entityType,
      entityRef: input.entityRef ?? null,
      name: input.name,
      role: input.role ?? null,
      initiative: input.initiative ?? null,
      hitPointsStart: input.hitPointsStart ?? null,
      hitPointsEnd: input.hitPointsEnd ?? null,
      data: input.data ? JSON.stringify(input.data) : null
    });
    return Number(result.lastInsertRowid);
  }

  recordBatchedAction(input: {
    batchId: string;
    ownerType: string;
    ownerId?: number;
    actionType: string;
    payload: Record<string, unknown>;
    occurredAt?: string;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO batched_actions (batch_id, owner_type, owner_id, action_type, payload, occurred_at)
      VALUES (@batchId, @ownerType, @ownerId, @actionType, @payload, COALESCE(@occurredAt, ${ISO_NOW}))
    `);
    const result = stmt.run({
      batchId: input.batchId,
      ownerType: input.ownerType,
      ownerId: input.ownerId ?? null,
      actionType: input.actionType,
      payload: JSON.stringify(input.payload),
      occurredAt: input.occurredAt ?? null
    });
    return Number(result.lastInsertRowid);
  }

  attachFile(input: {
    ownerType: string;
    ownerId: number;
    filePath: string;
    label?: string;
    metadata?: Record<string, unknown> | null;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO attachments (owner_type, owner_id, file_path, label, metadata)
      VALUES (@ownerType, @ownerId, @filePath, @label, @metadata)
    `);
    const result = stmt.run({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      filePath: input.filePath,
      label: input.label ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null
    });
    return Number(result.lastInsertRowid);
  }
}

export function useLocalPersistence(): LocalPersistence {
  return LocalPersistence.getInstance();
}

export type { LocalPersistence };
