// File: app/electron/db-supabase.ts
// Supabase-Datenbank-Adapter (ersetzt db.ts für Supabase)

import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabase-config';
import type {
  Prompt,
  CreatePromptPayload,
  UpdatePromptPayload,
  ListPromptsParams,
  SearchPromptsParams,
  Category,
  Group,
  ManagementPrompt,
  PromptResult,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CreateGroupPayload,
  UpdateGroupPayload,
  CreateManagementPromptPayload,
  UpdateManagementPromptPayload,
  CreatePromptResultPayload,
  UpdatePromptResultPayload,
  ReorderItemsPayload,
} from './ipc';

/**
 * Gibt den Pfad zur Datenbank zurück (für Kompatibilität, nicht verwendet bei Supabase)
 */
export function getDbPath(): string {
  return 'supabase://cloud';
}

// ============================================================================
// PROMPTS - Hauptfunktionen
// ============================================================================

/**
 * Erstellt einen neuen Prompt
 */
export async function createPrompt(payload: CreatePromptPayload): Promise<Prompt> {
  console.log('[DB] Creating prompt:', { title: payload.title, category: payload.category });
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const uuid = uuidv4();

  // Validierung
  if (!payload.title?.trim()) {
    console.warn('[DB] Validation failed: empty title');
    throw new Error('VALIDATION_ERROR: Title is required');
  }
  if (!payload.content?.trim()) {
    console.warn('[DB] Validation failed: empty content');
    throw new Error('VALIDATION_ERROR: Content is required');
  }

  const { data, error } = await supabase
    .from('prompts')
    .insert({
      uuid,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      content: payload.content.trim(),
      tags: payload.tags?.trim() || null,
      category: payload.category?.trim() || null,
      language: payload.language?.trim() || null,
      is_favorite: false,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating prompt:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  console.log('[DB] Prompt created:', { uuid, title: payload.title });
  return convertPromptFromSupabase(data);
}

/**
 * Aktualisiert einen vorhandenen Prompt
 */
export async function updatePrompt(uuid: string, payload: UpdatePromptPayload): Promise<Prompt> {
  console.log('[DB] Updating prompt:', { uuid, changes: Object.keys(payload) });
  const supabase = getSupabaseClient();

  // Validierung
  if (payload.title !== undefined && !payload.title?.trim()) {
    console.warn('[DB] Validation failed: empty title');
    throw new Error('VALIDATION_ERROR: Title cannot be empty');
  }
  if (payload.content !== undefined && !payload.content?.trim()) {
    console.warn('[DB] Validation failed: empty content');
    throw new Error('VALIDATION_ERROR: Content cannot be empty');
  }

  const updates: any = {};

  if (payload.title !== undefined) updates.title = payload.title.trim();
  if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
  if (payload.content !== undefined) updates.content = payload.content.trim();
  if (payload.tags !== undefined) updates.tags = payload.tags?.trim() || null;
  if (payload.category !== undefined) updates.category = payload.category?.trim() || null;
  if (payload.language !== undefined) updates.language = payload.language?.trim() || null;
  if (payload.is_favorite !== undefined) updates.is_favorite = payload.is_favorite;

  if (Object.keys(updates).length === 0) {
    console.debug('[DB] No changes to update for prompt:', uuid);
    const existing = await getPrompt(uuid);
    if (!existing) {
      throw new Error('NOT_FOUND: Prompt not found');
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('prompts')
    .update(updates)
    .eq('uuid', uuid)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    console.error('[DB] Error updating prompt:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  if (!data) {
    console.warn('[DB] Update failed - prompt not found:', uuid);
    throw new Error('NOT_FOUND: Prompt not found');
  }

  console.log('[DB] Prompt updated:', { uuid });
  return convertPromptFromSupabase(data);
}

/**
 * Löscht einen Prompt (hard delete)
 */
export async function deletePrompt(uuid: string): Promise<boolean> {
  console.warn('[DB] Deleting prompt:', { uuid });
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('prompts')
    .delete()
    .eq('uuid', uuid);

  if (error) {
    console.error('[DB] Error deleting prompt:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  console.warn('[DB] Prompt deleted:', { uuid });
  return true;
}

/**
 * Lädt einen einzelnen Prompt anhand der UUID
 */
export async function getPrompt(uuid: string): Promise<Prompt | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('uuid', uuid)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('[DB] Error getting prompt:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  return data ? convertPromptFromSupabase(data) : null;
}

/**
 * Listet Prompts mit optionaler Sortierung und Pagination
 */
export async function listPrompts(params: ListPromptsParams = {}): Promise<Prompt[]> {
  const startTime = Date.now();
  const supabase = getSupabaseClient();
  const { limit = 100, offset = 0, sort = 'updated_at', order = 'desc' } = params;

  const validSorts = ['updated_at', 'created_at', 'title'];
  const validOrders = ['asc', 'desc'];

  const sortColumn = validSorts.includes(sort) ? sort : 'updated_at';
  const sortOrder = validOrders.includes(order) ? order : 'desc';

  console.debug('[DB] Listing prompts:', { limit, offset, sort: sortColumn, order: sortOrder });

  let query = supabase
    .from('prompts')
    .select('*')
    .is('deleted_at', null)
    .order(sortColumn, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error('[DB] Error listing prompts:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  const duration = Date.now() - startTime;
  console.debug('[DB] Prompts listed:', { count: data?.length || 0, duration: `${duration}ms`, params });
  
  return (data || []).map(convertPromptFromSupabase);
}

/**
 * Sucht Prompts mit PostgreSQL Volltextsuche
 */
export async function searchPrompts(params: SearchPromptsParams): Promise<Prompt[]> {
  const startTime = Date.now();
  const supabase = getSupabaseClient();
  const { q, category, tag, limit = 100, offset = 0 } = params;

  console.debug('[DB] Searching prompts:', { query: q, category, tag, limit, offset });

  // Wenn keine Suchkriterien, gebe alle zurück
  if (!q && !category && !tag) {
    return await listPrompts({ limit, offset });
  }

  let query = supabase
    .from('prompts')
    .select('*')
    .is('deleted_at', null);

  // Volltextsuche mit PostgreSQL
  if (q && q.trim()) {
    const searchTerms = q.trim().split(/\s+/).join(' & ');
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,content.ilike.%${q}%`);
  }

  // Filter
  if (category) {
    query = query.eq('category', category);
  }
  if (tag) {
    query = query.ilike('tags', `%${tag}%`);
  }

  query = query
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error('[DB] Error searching prompts:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  const duration = Date.now() - startTime;
  console.debug('[DB] Search completed:', { count: data?.length || 0, duration: `${duration}ms`, query: q });
  
  return (data || []).map(convertPromptFromSupabase);
}

/**
 * Exportiert alle Prompts als JSON-Array
 */
export async function exportAllPrompts(): Promise<Prompt[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('prompts')
    .select('uuid, title, description, content, tags, category, language, is_favorite, created_at, updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[DB] Error exporting prompts:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  return (data || []).map(convertPromptFromSupabase);
}

/**
 * Importiert Prompts aus JSON-Array mit Merge-Logik
 */
export async function importPrompts(prompts: Partial<Prompt>[]): Promise<{ imported: number; updated: number; skipped: number }> {
  const supabase = getSupabaseClient();
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of prompts) {
    // Validierung
    if (!item.uuid || !item.title || !item.content) {
      skipped++;
      continue;
    }

    // Prüfen ob UUID existiert
    const existing = await getPrompt(item.uuid);

    if (existing) {
      // Update nur wenn imported.updated_at neuer ist
      const existingDate = new Date(existing.updated_at);
      const importDate = new Date(item.updated_at || new Date().toISOString());

      if (importDate > existingDate) {
        await updatePrompt(item.uuid, {
          title: item.title,
          description: item.description,
          content: item.content,
          tags: item.tags,
          category: item.category,
          language: item.language,
          is_favorite: item.is_favorite,
        });
        updated++;
      } else {
        skipped++;
      }
    } else {
      // Neuer Prompt
      const { error } = await supabase.from('prompts').insert({
        uuid: item.uuid,
        title: item.title,
        description: item.description || null,
        content: item.content,
        tags: item.tags || null,
        category: item.category || null,
        language: item.language || null,
        is_favorite: item.is_favorite || false,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
      });

      if (!error) {
        imported++;
      } else {
        skipped++;
      }
    }
  }

  return { imported, updated, skipped };
}

// ============================================================================
// PROMPT MANAGEMENT MODULE - Categories
// ============================================================================

export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
  console.log('[DB] Creating category:', { name: payload.name });
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const uuid = uuidv4();

  if (!payload.name?.trim()) {
    throw new Error('VALIDATION_ERROR: Category name is required');
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      uuid,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating category:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  console.log('[DB] Category created:', { uuid, name: payload.name });
  return convertCategoryFromSupabase(data);
}

export async function updateCategory(uuid: string, payload: UpdateCategoryPayload): Promise<Category> {
  console.log('[DB] Updating category:', { uuid, changes: Object.keys(payload) });
  const supabase = getSupabaseClient();

  if (payload.name !== undefined && !payload.name?.trim()) {
    throw new Error('VALIDATION_ERROR: Category name cannot be empty');
  }

  const updates: any = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.description !== undefined) updates.description = payload.description?.trim() || null;

  if (Object.keys(updates).length === 0) {
    const existing = await getCategory(uuid);
    if (!existing) {
      throw new Error('NOT_FOUND: Category not found');
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('uuid', uuid)
    .select()
    .single();

  if (error) {
    console.error('[DB] Error updating category:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  if (!data) {
    console.warn('[DB] Update failed - category not found:', uuid);
    throw new Error('NOT_FOUND: Category not found');
  }

  console.log('[DB] Category updated:', { uuid });
  return convertCategoryFromSupabase(data);
}

export async function deleteCategory(uuid: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('uuid', uuid);

  if (error) {
    console.error('[DB] Error deleting category:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  console.warn('[DB] Category deleted:', { uuid });
  return true;
}

export async function getCategory(uuid: string): Promise<Category | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('uuid', uuid)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[DB] Error getting category:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  return data ? convertCategoryFromSupabase(data) : null;
}

export async function listCategories(): Promise<Category[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[DB] Error listing categories:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  return (data || []).map(convertCategoryFromSupabase);
}

// ============================================================================
// PROMPT MANAGEMENT MODULE - Groups
// ============================================================================

export async function createGroup(payload: CreateGroupPayload): Promise<Group> {
  console.log('[DB] Creating group:', { name: payload.name, category_uuid: payload.category_uuid });
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const uuid = uuidv4();

  if (!payload.name?.trim()) {
    throw new Error('VALIDATION_ERROR: Group name is required');
  }
  if (!payload.category_uuid) {
    throw new Error('VALIDATION_ERROR: Category UUID is required');
  }

  // Prüfe ob Category existiert
  const category = await getCategory(payload.category_uuid);
  if (!category) {
    throw new Error('NOT_FOUND: Category not found');
  }

  // Bestimme display_order wenn nicht angegeben
  let displayOrder = payload.display_order;
  if (displayOrder === undefined) {
    const { data: maxData } = await supabase
      .from('groups')
      .select('display_order')
      .eq('category_uuid', payload.category_uuid)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    displayOrder = (maxData?.display_order ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from('groups')
    .insert({
      uuid,
      category_uuid: payload.category_uuid,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      display_order: displayOrder,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating group:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  console.log('[DB] Group created:', { uuid, name: payload.name });
  return convertGroupFromSupabase(data);
}

export async function updateGroup(uuid: string, payload: UpdateGroupPayload): Promise<Group> {
  const supabase = getSupabaseClient();

  if (payload.name !== undefined && !payload.name?.trim()) {
    throw new Error('VALIDATION_ERROR: Group name cannot be empty');
  }

  const updates: any = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
  if (payload.display_order !== undefined) updates.display_order = payload.display_order;

  if (Object.keys(updates).length === 0) {
    const existing = await getGroup(uuid);
    if (!existing) {
      throw new Error('NOT_FOUND: Group not found');
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('uuid', uuid)
    .select()
    .single();

  if (error) {
    console.error('[DB] Error updating group:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  if (!data) {
    throw new Error('NOT_FOUND: Group not found');
  }

  return convertGroupFromSupabase(data);
}

export async function deleteGroup(uuid: string): Promise<boolean> {
  console.warn('[DB] Deleting group:', { uuid });
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('uuid', uuid);

  if (error) {
    console.error('[DB] Error deleting group:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  console.warn('[DB] Group deleted:', { uuid });
  return true;
}

export async function getGroup(uuid: string): Promise<Group | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('uuid', uuid)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[DB] Error getting group:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  return data ? convertGroupFromSupabase(data) : null;
}

export async function listGroups(category_uuid: string): Promise<Group[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('category_uuid', category_uuid)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[DB] Error listing groups:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  return (data || []).map(convertGroupFromSupabase);
}

export async function reorderGroups(payload: ReorderItemsPayload): Promise<boolean> {
  const supabase = getSupabaseClient();

  // Bulk update mit Promise.all
  await Promise.all(
    payload.items.map((item) =>
      supabase
        .from('groups')
        .update({ display_order: item.display_order })
        .eq('uuid', item.uuid)
    )
  );

  return true;
}

// ============================================================================
// PROMPT MANAGEMENT MODULE - ManagementPrompts
// ============================================================================

export async function createManagementPrompt(payload: CreateManagementPromptPayload): Promise<ManagementPrompt> {
  console.log('[DB] Creating management prompt:', { name: payload.name, group_uuid: payload.group_uuid });
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const uuid = uuidv4();

  if (!payload.name?.trim()) {
    throw new Error('VALIDATION_ERROR: Prompt name is required');
  }
  if (!payload.content?.trim()) {
    throw new Error('VALIDATION_ERROR: Prompt content is required');
  }
  if (!payload.group_uuid) {
    throw new Error('VALIDATION_ERROR: Group UUID is required');
  }

  // Prüfe ob Group existiert
  const group = await getGroup(payload.group_uuid);
  if (!group) {
    throw new Error('NOT_FOUND: Group not found');
  }

  // Bestimme display_order wenn nicht angegeben
  let displayOrder = payload.display_order;
  if (displayOrder === undefined) {
    const { data: maxData } = await supabase
      .from('management_prompts')
      .select('display_order')
      .eq('group_uuid', payload.group_uuid)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    displayOrder = (maxData?.display_order ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from('management_prompts')
    .insert({
      uuid,
      group_uuid: payload.group_uuid,
      name: payload.name.trim(),
      content: payload.content.trim(),
      display_order: displayOrder,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating management prompt:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  console.log('[DB] Management prompt created:', { uuid, name: payload.name });
  return convertManagementPromptFromSupabase(data);
}

export async function updateManagementPrompt(uuid: string, payload: UpdateManagementPromptPayload): Promise<ManagementPrompt> {
  const supabase = getSupabaseClient();

  if (payload.name !== undefined && !payload.name?.trim()) {
    throw new Error('VALIDATION_ERROR: Prompt name cannot be empty');
  }
  if (payload.content !== undefined && !payload.content?.trim()) {
    throw new Error('VALIDATION_ERROR: Prompt content cannot be empty');
  }

  // Wenn group_uuid geändert wird, prüfe ob neue Group existiert
  if (payload.group_uuid !== undefined) {
    const group = await getGroup(payload.group_uuid);
    if (!group) {
      throw new Error('NOT_FOUND: Target group not found');
    }
  }

  const updates: any = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.content !== undefined) updates.content = payload.content.trim();
  if (payload.display_order !== undefined) updates.display_order = payload.display_order;
  if (payload.group_uuid !== undefined) updates.group_uuid = payload.group_uuid;

  if (Object.keys(updates).length === 0) {
    const existing = await getManagementPrompt(uuid);
    if (!existing) {
      throw new Error('NOT_FOUND: ManagementPrompt not found');
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('management_prompts')
    .update(updates)
    .eq('uuid', uuid)
    .select()
    .single();

  if (error) {
    console.error('[DB] Error updating management prompt:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  if (!data) {
    throw new Error('NOT_FOUND: ManagementPrompt not found');
  }

  return convertManagementPromptFromSupabase(data);
}

export async function deleteManagementPrompt(uuid: string): Promise<boolean> {
  console.warn('[DB] Deleting management prompt:', { uuid });
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('management_prompts')
    .delete()
    .eq('uuid', uuid);

  if (error) {
    console.error('[DB] Error deleting management prompt:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  console.warn('[DB] Management prompt deleted:', { uuid });
  return true;
}

export async function getManagementPrompt(uuid: string): Promise<ManagementPrompt | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('management_prompts')
    .select('*')
    .eq('uuid', uuid)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[DB] Error getting management prompt:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  return data ? convertManagementPromptFromSupabase(data) : null;
}

export async function listManagementPrompts(group_uuid: string): Promise<ManagementPrompt[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('management_prompts')
    .select('*')
    .eq('group_uuid', group_uuid)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[DB] Error listing management prompts:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  return (data || []).map(convertManagementPromptFromSupabase);
}

export async function reorderManagementPrompts(payload: ReorderItemsPayload): Promise<boolean> {
  const supabase = getSupabaseClient();

  await Promise.all(
    payload.items.map((item) =>
      supabase
        .from('management_prompts')
        .update({ display_order: item.display_order })
        .eq('uuid', item.uuid)
    )
  );

  return true;
}

// ============================================================================
// PROMPT MANAGEMENT MODULE - PromptResults
// ============================================================================

export async function createPromptResult(payload: CreatePromptResultPayload): Promise<PromptResult> {
  console.log('[DB] Creating prompt result:', { prompt_uuid: payload.prompt_uuid, contentLength: payload.content?.length });
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const uuid = uuidv4();

  if (!payload.content?.trim()) {
    throw new Error('VALIDATION_ERROR: Result content is required');
  }
  if (!payload.prompt_uuid) {
    throw new Error('VALIDATION_ERROR: Prompt UUID is required');
  }

  // Prüfe ob Prompt existiert
  const prompt = await getManagementPrompt(payload.prompt_uuid);
  if (!prompt) {
    throw new Error('NOT_FOUND: ManagementPrompt not found');
  }

  const { data, error } = await supabase
    .from('prompt_results')
    .insert({
      uuid,
      prompt_uuid: payload.prompt_uuid,
      content: payload.content.trim(),
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating prompt result:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  console.log('[DB] Prompt result created:', { uuid, prompt_uuid: payload.prompt_uuid });
  return convertPromptResultFromSupabase(data);
}

export async function updatePromptResult(uuid: string, payload: UpdatePromptResultPayload): Promise<PromptResult> {
  const supabase = getSupabaseClient();

  if (payload.content !== undefined && !payload.content?.trim()) {
    throw new Error('VALIDATION_ERROR: Result content cannot be empty');
  }

  const updates: any = {};
  if (payload.content !== undefined) updates.content = payload.content.trim();

  if (Object.keys(updates).length === 0) {
    const existing = await getPromptResult(uuid);
    if (!existing) {
      throw new Error('NOT_FOUND: PromptResult not found');
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('prompt_results')
    .update(updates)
    .eq('uuid', uuid)
    .select()
    .single();

  if (error) {
    console.error('[DB] Error updating prompt result:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  if (!data) {
    throw new Error('NOT_FOUND: PromptResult not found');
  }

  return convertPromptResultFromSupabase(data);
}

export async function deletePromptResult(uuid: string): Promise<boolean> {
  console.warn('[DB] Deleting prompt result:', { uuid });
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('prompt_results')
    .delete()
    .eq('uuid', uuid);

  if (error) {
    console.error('[DB] Error deleting prompt result:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  console.warn('[DB] Prompt result deleted:', { uuid });
  return true;
}

export async function getPromptResult(uuid: string): Promise<PromptResult | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('prompt_results')
    .select('*')
    .eq('uuid', uuid)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[DB] Error getting prompt result:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  return data ? convertPromptResultFromSupabase(data) : null;
}

export async function listPromptResults(prompt_uuid: string): Promise<PromptResult[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('prompt_results')
    .select('*')
    .eq('prompt_uuid', prompt_uuid)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DB] Error listing prompt results:', error);
    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  return (data || []).map(convertPromptResultFromSupabase);
}

// ============================================================================
// HELPER FUNCTIONS - Datenkonvertierung
// ============================================================================

function convertPromptFromSupabase(data: any): Prompt {
  return {
    id: data.id,
    uuid: data.uuid,
    title: data.title,
    description: data.description,
    content: data.content,
    tags: data.tags,
    category: data.category,
    language: data.language,
    is_favorite: data.is_favorite ? 1 : 0, // Konvertiere boolean zu integer für Kompatibilität
    created_at: data.created_at,
    updated_at: data.updated_at,
    deleted_at: data.deleted_at,
  };
}

function convertCategoryFromSupabase(data: any): Category {
  return {
    id: data.id,
    uuid: data.uuid,
    name: data.name,
    description: data.description,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function convertGroupFromSupabase(data: any): Group {
  return {
    id: data.id,
    uuid: data.uuid,
    category_uuid: data.category_uuid,
    name: data.name,
    description: data.description,
    display_order: data.display_order,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function convertManagementPromptFromSupabase(data: any): ManagementPrompt {
  return {
    id: data.id,
    uuid: data.uuid,
    group_uuid: data.group_uuid,
    name: data.name,
    content: data.content,
    display_order: data.display_order,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function convertPromptResultFromSupabase(data: any): PromptResult {
  return {
    id: data.id,
    uuid: data.uuid,
    prompt_uuid: data.prompt_uuid,
    content: data.content,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}
