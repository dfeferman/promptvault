// File: app/renderer/src/types.ts

/**
 * Typdefinitionen für den Renderer Process
 * Importiert Typen aus dem Electron-Teil
 */

export interface Prompt {
  id?: number;
  uuid: string;
  title: string;
  description?: string;
  content: string;
  tags?: string;
  category?: string;
  language?: string;
  is_favorite?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CreatePromptPayload {
  title: string;
  description?: string;
  content: string;
  tags?: string;
  category?: string;
  language?: string;
}

export interface UpdatePromptPayload {
  title?: string;
  description?: string;
  content?: string;
  tags?: string;
  category?: string;
  language?: string;
  is_favorite?: number;
}

export interface ListPromptsParams {
  limit?: number;
  offset?: number;
  sort?: 'updated_at' | 'created_at' | 'title';
  order?: 'asc' | 'desc';
}

export interface SearchPromptsParams {
  q?: string;
  category?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Prompt Management Module Types
export interface Category {
  id?: number;
  uuid: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id?: number;
  uuid: string;
  category_uuid: string;
  name: string;
  description?: string;
  display_order: number;
  global_variables?: string; // JSON string: Record<string, string>
  created_at: string;
  updated_at: string;
}

export interface ManagementPrompt {
  id?: number;
  uuid: string;
  group_uuid: string;
  name: string;
  content: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PromptResult {
  id?: number;
  uuid: string;
  prompt_uuid: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
}

export interface CreateGroupPayload {
  category_uuid: string;
  name: string;
  description?: string;
  display_order?: number;
  global_variables?: Record<string, string>; // Key-Value Paare für globale Variablen
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
  display_order?: number;
  global_variables?: Record<string, string>; // Key-Value Paare für globale Variablen
}

export interface CreateManagementPromptPayload {
  group_uuid: string;
  name: string;
  content: string;
  display_order?: number;
}

export interface UpdateManagementPromptPayload {
  name?: string;
  content?: string;
  display_order?: number;
  group_uuid?: string; // For moving between groups
}

export interface CreatePromptResultPayload {
  prompt_uuid: string;
  content: string;
}

export interface UpdatePromptResultPayload {
  content?: string;
}

export interface ReorderItemsPayload {
  items: Array<{ uuid: string; display_order: number }>;
}
