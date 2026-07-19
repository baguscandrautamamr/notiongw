export type Note = {
  id: string;
  user_id: string;
  parent_id: string | null;
  position: number;
  title: string;
  icon: string;
  cover_url: string | null;
  doc: unknown | null; // BlockNote block array
  content: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

// Lightweight shape used by the sidebar tree.
export type NoteSummary = Pick<
  Note,
  "id" | "title" | "icon" | "parent_id" | "position" | "updated_at"
>;

// A NoteSummary with its resolved children (built client-side).
export type TreeNode = NoteSummary & { children: TreeNode[] };
