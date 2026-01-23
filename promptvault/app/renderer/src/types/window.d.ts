// Type declarations for window.promptVault API

interface Prompt {
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

interface CreatePromptPayload {
  title: string;
  description?: string;
  content: string;
  tags?: string;
  category?: string;
  language?: string;
}

interface UpdatePromptPayload {
  title?: string;
  description?: string;
  content?: string;
  tags?: string;
  category?: string;
  language?: string;
  is_favorite?: number;
}

interface ListPromptsParams {
  limit?: number;
  offset?: number;
  sort?: 'updated_at' | 'created_at' | 'title';
  order?: 'asc' | 'desc';
}

interface SearchPromptsParams {
  q?: string;
  category?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Prompt Management Module Types
interface Category {
  id?: number;
  uuid: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface Group {
  id?: number;
  uuid: string;
  category_uuid: string;
  name: string;
  description?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface ManagementPrompt {
  id?: number;
  uuid: string;
  group_uuid: string;
  name: string;
  content: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface PromptResult {
  id?: number;
  uuid: string;
  prompt_uuid: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface CreateCategoryPayload {
  name: string;
  description?: string;
}

interface UpdateCategoryPayload {
  name?: string;
  description?: string;
}

interface CreateGroupPayload {
  category_uuid: string;
  name: string;
  description?: string;
  display_order?: number;
}

interface UpdateGroupPayload {
  name?: string;
  description?: string;
  display_order?: number;
}

interface CreateManagementPromptPayload {
  group_uuid: string;
  name: string;
  content: string;
  display_order?: number;
}

interface UpdateManagementPromptPayload {
  name?: string;
  content?: string;
  display_order?: number;
  group_uuid?: string;
}

interface CreatePromptResultPayload {
  prompt_uuid: string;
  content: string;
}

interface UpdatePromptResultPayload {
  content?: string;
}

interface ReorderItemsPayload {
  items: Array<{ uuid: string; display_order: number }>;
}

interface PromptVaultAPI {
  // Existing App APIs
  createPrompt: (payload: CreatePromptPayload) => Promise<ApiResponse<Prompt>>;
  updatePrompt: (uuid: string, payload: UpdatePromptPayload) => Promise<ApiResponse<Prompt>>;
  deletePrompt: (uuid: string) => Promise<ApiResponse<boolean>>;
  getPrompt: (uuid: string) => Promise<ApiResponse<Prompt>>;
  listPrompts: (params?: ListPromptsParams) => Promise<ApiResponse<Prompt[]>>;
  searchPrompts: (params: SearchPromptsParams) => Promise<ApiResponse<Prompt[]>>;
  exportPromptsToJson: () => Promise<ApiResponse<boolean>>;
  importPromptsFromJson: () => Promise<ApiResponse<{ imported: number; updated: number; skipped: number }>>;
  revealDbLocation: () => Promise<ApiResponse<string>>;
  
  // Prompt Management Module APIs - Categories
  createCategory: (payload: CreateCategoryPayload) => Promise<ApiResponse<Category>>;
  updateCategory: (uuid: string, payload: UpdateCategoryPayload) => Promise<ApiResponse<Category>>;
  deleteCategory: (uuid: string) => Promise<ApiResponse<boolean>>;
  getCategory: (uuid: string) => Promise<ApiResponse<Category>>;
  listCategories: () => Promise<ApiResponse<Category[]>>;
  
  // Prompt Management Module APIs - Groups
  createGroup: (payload: CreateGroupPayload) => Promise<ApiResponse<Group>>;
  updateGroup: (uuid: string, payload: UpdateGroupPayload) => Promise<ApiResponse<Group>>;
  deleteGroup: (uuid: string) => Promise<ApiResponse<boolean>>;
  getGroup: (uuid: string) => Promise<ApiResponse<Group>>;
  listGroups: (category_uuid: string) => Promise<ApiResponse<Group[]>>;
  reorderGroups: (payload: ReorderItemsPayload) => Promise<ApiResponse<boolean>>;
  
  // Prompt Management Module APIs - ManagementPrompts
  createManagementPrompt: (payload: CreateManagementPromptPayload) => Promise<ApiResponse<ManagementPrompt>>;
  updateManagementPrompt: (uuid: string, payload: UpdateManagementPromptPayload) => Promise<ApiResponse<ManagementPrompt>>;
  deleteManagementPrompt: (uuid: string) => Promise<ApiResponse<boolean>>;
  getManagementPrompt: (uuid: string) => Promise<ApiResponse<ManagementPrompt>>;
  listManagementPrompts: (group_uuid: string) => Promise<ApiResponse<ManagementPrompt[]>>;
  reorderManagementPrompts: (payload: ReorderItemsPayload) => Promise<ApiResponse<boolean>>;
  
  // Prompt Management Module APIs - PromptResults
  createPromptResult: (payload: CreatePromptResultPayload) => Promise<ApiResponse<PromptResult>>;
  updatePromptResult: (uuid: string, payload: UpdatePromptResultPayload) => Promise<ApiResponse<PromptResult>>;
  deletePromptResult: (uuid: string) => Promise<ApiResponse<boolean>>;
  getPromptResult: (uuid: string) => Promise<ApiResponse<PromptResult>>;
  listPromptResults: (prompt_uuid: string) => Promise<ApiResponse<PromptResult[]>>;
}

declare global {
  interface Window {
    promptVault: PromptVaultAPI;
  }
}

export {};