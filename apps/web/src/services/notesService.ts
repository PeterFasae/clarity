
import { toast } from "sonner";

// Types for our data model
export interface Note {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isArchived: boolean;
  isShared: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteDto {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isShared?: boolean;
  tags?: string[];
}

// Base URL for our API endpoints.
// Set VITE_API_BASE_URL in your hosting provider's environment variables
// (Vercel / Render) to point this at your deployed API Gateway URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/dev";

// Helper function for handling API requests
const handleApiError = (error: Error) => {
  console.error("API Error:", error);
  toast.error("An error occurred while connecting to the server");
  throw error;
};

// Notes API service
export const notesService = {
  // Get all notes
  async getAllNotes(): Promise<Note[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/notes`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error as Error);
    }
  },

  // Get pinned notes
  async getPinnedNotes(): Promise<Note[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/notes/pinned`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error as Error);
    }
  },

  // Get archived notes
  async getArchivedNotes(): Promise<Note[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/notes/archived`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error as Error);
    }
  },

  // Get shared notes
  async getSharedNotes(): Promise<Note[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/notes/shared`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error as Error);
    }
  },

  // Get note by ID
  async getNoteById(id: string): Promise<Note> {
    try {
      const response = await fetch(`${API_BASE_URL}/notes/${id}`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error as Error);
    }
  },

  // Create a new note
  async createNote(noteData: CreateNoteDto): Promise<Note> {
    try {
      const response = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error as Error);
    }
  },

  // Update an existing note
  async updateNote(id: string, noteData: UpdateNoteDto): Promise<Note> {
    try {
      const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error as Error);
    }
  },

  // Delete a note
  async deleteNote(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
    } catch (error) {
      handleApiError(error as Error);
    }
  },

  // Summarize a note
  async summarizeNote(content: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      return data.summary;
    } catch (error) {
      return handleApiError(error as Error);
    }
  }
};
