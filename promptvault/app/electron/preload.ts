// File: app/electron/preload.ts

import { contextBridge, ipcRenderer } from 'electron';
import type {
  PromptVaultAPI,
  CreatePromptPayload,
  UpdatePromptPayload,
  ListPromptsParams,
  SearchPromptsParams,
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
 * Preload-Script: Stellt sicheres API über contextBridge zur Verfügung
 * Alle IPC-Aufrufe sind strikt typisiert
 */

const promptVaultAPI: PromptVaultAPI = {
  createPrompt: (payload: CreatePromptPayload) => {
    return ipcRenderer.invoke('prompt:create', payload);
  },
  
  updatePrompt: (uuid: string, payload: UpdatePromptPayload) => {
    return ipcRenderer.invoke('prompt:update', uuid, payload);
  },
  
  deletePrompt: (uuid: string) => {
    return ipcRenderer.invoke('prompt:delete', uuid);
  },
  
  getPrompt: (uuid: string) => {
    return ipcRenderer.invoke('prompt:get', uuid);
  },
  
  listPrompts: (params?: ListPromptsParams) => {
    return ipcRenderer.invoke('prompt:list', params);
  },
  
  searchPrompts: (params: SearchPromptsParams) => {
    return ipcRenderer.invoke('prompt:search', params);
  },
  
  exportPromptsToJson: () => {
    return ipcRenderer.invoke('prompt:export');
  },
  
  importPromptsFromJson: () => {
    return ipcRenderer.invoke('prompt:import');
  },
  
  revealDbLocation: () => {
    return ipcRenderer.invoke('prompt:reveal-db');
  },
  
  // Prompt Management Module - Categories
  createCategory: (payload: CreateCategoryPayload) => {
    return ipcRenderer.invoke('category:create', payload);
  },
  updateCategory: (uuid: string, payload: UpdateCategoryPayload) => {
    return ipcRenderer.invoke('category:update', uuid, payload);
  },
  deleteCategory: (uuid: string) => {
    return ipcRenderer.invoke('category:delete', uuid);
  },
  getCategory: (uuid: string) => {
    return ipcRenderer.invoke('category:get', uuid);
  },
  listCategories: () => {
    return ipcRenderer.invoke('category:list');
  },
  
  // Prompt Management Module - Groups
  createGroup: (payload: CreateGroupPayload) => {
    return ipcRenderer.invoke('group:create', payload);
  },
  updateGroup: (uuid: string, payload: UpdateGroupPayload) => {
    return ipcRenderer.invoke('group:update', uuid, payload);
  },
  deleteGroup: (uuid: string) => {
    return ipcRenderer.invoke('group:delete', uuid);
  },
  getGroup: (uuid: string) => {
    return ipcRenderer.invoke('group:get', uuid);
  },
  listGroups: (category_uuid: string) => {
    return ipcRenderer.invoke('group:list', category_uuid);
  },
  reorderGroups: (payload: ReorderItemsPayload) => {
    return ipcRenderer.invoke('group:reorder', payload);
  },
  
  // Prompt Management Module - ManagementPrompts
  createManagementPrompt: (payload: CreateManagementPromptPayload) => {
    return ipcRenderer.invoke('management-prompt:create', payload);
  },
  updateManagementPrompt: (uuid: string, payload: UpdateManagementPromptPayload) => {
    return ipcRenderer.invoke('management-prompt:update', uuid, payload);
  },
  deleteManagementPrompt: (uuid: string) => {
    return ipcRenderer.invoke('management-prompt:delete', uuid);
  },
  getManagementPrompt: (uuid: string) => {
    return ipcRenderer.invoke('management-prompt:get', uuid);
  },
  listManagementPrompts: (group_uuid: string) => {
    return ipcRenderer.invoke('management-prompt:list', group_uuid);
  },
  reorderManagementPrompts: (payload: ReorderItemsPayload) => {
    return ipcRenderer.invoke('management-prompt:reorder', payload);
  },
  
  // Prompt Management Module - PromptResults
  createPromptResult: (payload: CreatePromptResultPayload) => {
    return ipcRenderer.invoke('prompt-result:create', payload);
  },
  updatePromptResult: (uuid: string, payload: UpdatePromptResultPayload) => {
    return ipcRenderer.invoke('prompt-result:update', uuid, payload);
  },
  deletePromptResult: (uuid: string) => {
    return ipcRenderer.invoke('prompt-result:delete', uuid);
  },
  getPromptResult: (uuid: string) => {
    return ipcRenderer.invoke('prompt-result:get', uuid);
  },
  listPromptResults: (prompt_uuid: string) => {
    return ipcRenderer.invoke('prompt-result:list', prompt_uuid);
  },
};

// API über contextBridge exposen
contextBridge.exposeInMainWorld('promptVault', promptVaultAPI);

console.log('[Preload] PromptVault API initialized');
