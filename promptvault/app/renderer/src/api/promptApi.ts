// File: app/renderer/src/api/promptApi.ts

import type {
  Prompt,
  CreatePromptPayload,
  UpdatePromptPayload,
  ListPromptsParams,
  SearchPromptsParams,
  ApiResponse,
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
} from '../types';

/**
 * API-Wrapper für die IPC-Kommunikation mit dem Main Process
 * Alle Funktionen werfen Fehler bei nicht-erfolgreichen Responses
 */

class PromptAPI {
  private get api() {
    if (!window.promptVault) {
      throw new Error('PromptVault API not available');
    }
    return window.promptVault;
  }

  async createPrompt(payload: CreatePromptPayload): Promise<Prompt> {
    console.log('[API] Creating prompt:', { title: payload.title, category: payload.category });
    const response = await this.api.createPrompt(payload);
    if (!response.success || !response.data) {
      console.error('[API] Failed to create prompt:', { error: response.error, payload: { title: payload.title } });
      throw new Error(response.error?.message || 'Failed to create prompt');
    }
    console.log('[API] Prompt created successfully:', { uuid: response.data.uuid, title: response.data.title });
    return response.data;
  }

  async updatePrompt(uuid: string, payload: UpdatePromptPayload): Promise<Prompt> {
    console.log('[API] Updating prompt:', { uuid, fields: Object.keys(payload) });
    const response = await this.api.updatePrompt(uuid, payload);
    if (!response.success || !response.data) {
      console.error('[API] Failed to update prompt:', { uuid, error: response.error });
      throw new Error(response.error?.message || 'Failed to update prompt');
    }
    console.log('[API] Prompt updated successfully:', { uuid: response.data.uuid });
    return response.data;
  }

  async deletePrompt(uuid: string): Promise<boolean> {
    console.warn('[API] Deleting prompt:', { uuid });
    const response = await this.api.deletePrompt(uuid);
    if (!response.success) {
      console.error('[API] Failed to delete prompt:', { uuid, error: response.error });
      throw new Error(response.error?.message || 'Failed to delete prompt');
    }
    console.warn('[API] Prompt deleted successfully:', { uuid });
    return true;
  }

  async getPrompt(uuid: string): Promise<Prompt> {
    const response = await this.api.getPrompt(uuid);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get prompt');
    }
    return response.data;
  }

  async listPrompts(params?: ListPromptsParams): Promise<Prompt[]> {
    const startTime = Date.now();
    console.debug('[API] Listing prompts:', { params });
    const response = await this.api.listPrompts(params);
    if (!response.success || !response.data) {
      console.error('[API] Failed to list prompts:', { error: response.error, params });
      throw new Error(response.error?.message || 'Failed to list prompts');
    }
    const duration = Date.now() - startTime;
    console.log('[API] Prompts listed:', { count: response.data.length, duration: `${duration}ms`, params });
    return response.data;
  }

  async searchPrompts(params: SearchPromptsParams): Promise<Prompt[]> {
    const startTime = Date.now();
    console.debug('[API] Searching prompts:', { query: params.q, filters: { category: params.category, tag: params.tag } });
    const response = await this.api.searchPrompts(params);
    if (!response.success || !response.data) {
      console.error('[API] Failed to search prompts:', { error: response.error, params });
      throw new Error(response.error?.message || 'Failed to search prompts');
    }
    const duration = Date.now() - startTime;
    console.debug('[API] Search completed:', { count: response.data.length, duration: `${duration}ms`, query: params.q });
    return response.data;
  }

  async exportPromptsToJson(): Promise<void> {
    console.log('[API] Exporting prompts to JSON');
    const response = await this.api.exportPromptsToJson();
    if (!response.success) {
      if (response.error?.code === 'CANCELLED') {
        console.log('[API] Export cancelled by user');
        return; // User cancelled, nicht als Fehler behandeln
      }
      console.error('[API] Failed to export prompts:', { error: response.error });
      throw new Error(response.error?.message || 'Failed to export prompts');
    }
    console.log('[API] Prompts exported successfully');
  }

  async importPromptsFromJson(): Promise<{ imported: number; updated: number; skipped: number }> {
    console.log('[API] Importing prompts from JSON');
    const response = await this.api.importPromptsFromJson();
    if (!response.success || !response.data) {
      if (response.error?.code === 'CANCELLED') {
        console.log('[API] Import cancelled by user');
        return { imported: 0, updated: 0, skipped: 0 }; // User cancelled
      }
      console.error('[API] Failed to import prompts:', { error: response.error });
      throw new Error(response.error?.message || 'Failed to import prompts');
    }
    console.log('[API] Prompts imported successfully:', response.data);
    return response.data;
  }

  async revealDbLocation(): Promise<string> {
    const response = await this.api.revealDbLocation();
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to reveal database location');
    }
    return response.data;
  }

  // ============================================================================
  // PROMPT MANAGEMENT MODULE - Categories
  // ============================================================================

  async createCategory(payload: CreateCategoryPayload): Promise<Category> {
    console.log('[API] Creating category:', { name: payload.name });
    const response = await this.api.createCategory(payload);
    if (!response.success || !response.data) {
      console.error('[API] Failed to create category:', { error: response.error, payload: { name: payload.name } });
      throw new Error(response.error?.message || 'Failed to create category');
    }
    console.log('[API] Category created successfully:', { uuid: response.data.uuid, name: response.data.name });
    return response.data;
  }

  async updateCategory(uuid: string, payload: UpdateCategoryPayload): Promise<Category> {
    console.log('[API] Updating category:', { uuid, fields: Object.keys(payload) });
    const response = await this.api.updateCategory(uuid, payload);
    if (!response.success || !response.data) {
      console.error('[API] Failed to update category:', { uuid, error: response.error });
      throw new Error(response.error?.message || 'Failed to update category');
    }
    console.log('[API] Category updated successfully:', { uuid: response.data.uuid });
    return response.data;
  }

  async deleteCategory(uuid: string): Promise<boolean> {
    console.warn('[API] Deleting category:', { uuid });
    const response = await this.api.deleteCategory(uuid);
    if (!response.success) {
      console.error('[API] Failed to delete category:', { uuid, error: response.error });
      throw new Error(response.error?.message || 'Failed to delete category');
    }
    console.warn('[API] Category deleted successfully:', { uuid });
    return true;
  }

  async getCategory(uuid: string): Promise<Category> {
    const response = await this.api.getCategory(uuid);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get category');
    }
    return response.data;
  }

  async listCategories(): Promise<Category[]> {
    const response = await this.api.listCategories();
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to list categories');
    }
    return response.data;
  }

  // ============================================================================
  // PROMPT MANAGEMENT MODULE - Groups
  // ============================================================================

  async createGroup(payload: CreateGroupPayload): Promise<Group> {
    console.log('[API] Creating group:', { name: payload.name, category_uuid: payload.category_uuid });
    const response = await this.api.createGroup(payload);
    if (!response.success || !response.data) {
      console.error('[API] Failed to create group:', { error: response.error, payload: { name: payload.name } });
      throw new Error(response.error?.message || 'Failed to create group');
    }
    console.log('[API] Group created successfully:', { uuid: response.data.uuid, name: response.data.name });
    return response.data;
  }

  async updateGroup(uuid: string, payload: UpdateGroupPayload): Promise<Group> {
    console.log('[API] Updating group:', { uuid, fields: Object.keys(payload) });
    const response = await this.api.updateGroup(uuid, payload);
    if (!response.success || !response.data) {
      console.error('[API] Failed to update group:', { uuid, error: response.error });
      throw new Error(response.error?.message || 'Failed to update group');
    }
    console.log('[API] Group updated successfully:', { uuid: response.data.uuid });
    return response.data;
  }

  async deleteGroup(uuid: string): Promise<boolean> {
    console.warn('[API] Deleting group:', { uuid });
    const response = await this.api.deleteGroup(uuid);
    if (!response.success) {
      console.error('[API] Failed to delete group:', { uuid, error: response.error });
      throw new Error(response.error?.message || 'Failed to delete group');
    }
    console.warn('[API] Group deleted successfully:', { uuid });
    return true;
  }

  async getGroup(uuid: string): Promise<Group> {
    const response = await this.api.getGroup(uuid);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get group');
    }
    return response.data;
  }

  async listGroups(category_uuid: string): Promise<Group[]> {
    const response = await this.api.listGroups(category_uuid);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to list groups');
    }
    return response.data;
  }

  async reorderGroups(payload: ReorderItemsPayload): Promise<boolean> {
    const response = await this.api.reorderGroups(payload);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to reorder groups');
    }
    return true;
  }

  // ============================================================================
  // PROMPT MANAGEMENT MODULE - ManagementPrompts
  // ============================================================================

  async createManagementPrompt(payload: CreateManagementPromptPayload): Promise<ManagementPrompt> {
    console.log('[API] Creating management prompt:', { name: payload.name, group_uuid: payload.group_uuid });
    const response = await this.api.createManagementPrompt(payload);
    if (!response.success || !response.data) {
      console.error('[API] Failed to create management prompt:', { error: response.error, payload: { name: payload.name } });
      throw new Error(response.error?.message || 'Failed to create management prompt');
    }
    console.log('[API] Management prompt created successfully:', { uuid: response.data.uuid, name: response.data.name });
    return response.data;
  }

  async updateManagementPrompt(uuid: string, payload: UpdateManagementPromptPayload): Promise<ManagementPrompt> {
    console.log('[API] Updating management prompt:', { uuid, fields: Object.keys(payload) });
    const response = await this.api.updateManagementPrompt(uuid, payload);
    if (!response.success || !response.data) {
      console.error('[API] Failed to update management prompt:', { uuid, error: response.error });
      throw new Error(response.error?.message || 'Failed to update management prompt');
    }
    console.log('[API] Management prompt updated successfully:', { uuid: response.data.uuid });
    return response.data;
  }

  async deleteManagementPrompt(uuid: string): Promise<boolean> {
    console.warn('[API] Deleting management prompt:', { uuid });
    const response = await this.api.deleteManagementPrompt(uuid);
    if (!response.success) {
      console.error('[API] Failed to delete management prompt:', { uuid, error: response.error });
      throw new Error(response.error?.message || 'Failed to delete management prompt');
    }
    console.warn('[API] Management prompt deleted successfully:', { uuid });
    return true;
  }

  async getManagementPrompt(uuid: string): Promise<ManagementPrompt> {
    const response = await this.api.getManagementPrompt(uuid);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get management prompt');
    }
    return response.data;
  }

  async listManagementPrompts(group_uuid: string): Promise<ManagementPrompt[]> {
    const response = await this.api.listManagementPrompts(group_uuid);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to list management prompts');
    }
    return response.data;
  }

  async reorderManagementPrompts(payload: ReorderItemsPayload): Promise<boolean> {
    const response = await this.api.reorderManagementPrompts(payload);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to reorder management prompts');
    }
    return true;
  }

  // ============================================================================
  // PROMPT MANAGEMENT MODULE - PromptResults
  // ============================================================================

  async createPromptResult(payload: CreatePromptResultPayload): Promise<PromptResult> {
    console.log('[API] Creating prompt result:', { prompt_uuid: payload.prompt_uuid, contentLength: payload.content?.length });
    const response = await this.api.createPromptResult(payload);
    if (!response.success || !response.data) {
      console.error('[API] Failed to create prompt result:', { error: response.error, prompt_uuid: payload.prompt_uuid });
      throw new Error(response.error?.message || 'Failed to create prompt result');
    }
    console.log('[API] Prompt result created successfully:', { uuid: response.data.uuid, prompt_uuid: response.data.prompt_uuid });
    return response.data;
  }

  async updatePromptResult(uuid: string, payload: UpdatePromptResultPayload): Promise<PromptResult> {
    console.log('[API] Updating prompt result:', { uuid, fields: Object.keys(payload) });
    const response = await this.api.updatePromptResult(uuid, payload);
    if (!response.success || !response.data) {
      console.error('[API] Failed to update prompt result:', { uuid, error: response.error });
      throw new Error(response.error?.message || 'Failed to update prompt result');
    }
    console.log('[API] Prompt result updated successfully:', { uuid: response.data.uuid });
    return response.data;
  }

  async deletePromptResult(uuid: string): Promise<boolean> {
    console.warn('[API] Deleting prompt result:', { uuid });
    const response = await this.api.deletePromptResult(uuid);
    if (!response.success) {
      console.error('[API] Failed to delete prompt result:', { uuid, error: response.error });
      throw new Error(response.error?.message || 'Failed to delete prompt result');
    }
    console.warn('[API] Prompt result deleted successfully:', { uuid });
    return true;
  }

  async getPromptResult(uuid: string): Promise<PromptResult> {
    const response = await this.api.getPromptResult(uuid);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get prompt result');
    }
    return response.data;
  }

  async listPromptResults(prompt_uuid: string): Promise<PromptResult[]> {
    const response = await this.api.listPromptResults(prompt_uuid);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to list prompt results');
    }
    return response.data;
  }
}

export const promptApi = new PromptAPI();
