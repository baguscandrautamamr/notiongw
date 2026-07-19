export type PageType = "document" | "grid" | "board" | "whiteboard";

export type Note = {
  id: string;
  user_id: string;
  parent_id: string | null;
  position: number;
  type: PageType;
  title: string;
  icon: string;
  cover_url: string | null;
  doc: unknown | null; // BlockNote block array (documents)
  db: unknown | null; // Database (grid/board pages)
  is_public: boolean;
  content: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

// Lightweight shape used by the sidebar tree.
export type NoteSummary = Pick<
  Note,
  "id" | "title" | "icon" | "type" | "parent_id" | "position" | "updated_at"
>;

// A NoteSummary with its resolved children (built client-side).
export type TreeNode = NoteSummary & { children: TreeNode[] };
