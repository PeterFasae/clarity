export type Note = {
  id: string;
  title: string;
  body: string;
  summary: string;
  actions: string[];
  createdAt: string;
  updatedAt: string;
  score?: number;
};

export type ActionItem = {
  text: string;
  noteId: string;
  noteTitle: string;
};
