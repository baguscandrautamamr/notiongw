export type Note = {
  id: string;
  user_id: string;
  title: string;
  icon: string;
  doc: unknown | null; // BlockNote block array
  content: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

// Lightweight shape used by the sidebar list.
export type NoteSummary = Pick<
  Note,
  "id" | "title" | "icon" | "updated_at"
>;
