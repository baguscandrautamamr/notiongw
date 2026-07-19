import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Workspace from "@/components/Workspace";
import type { NoteSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullCols =
    "id, title, icon, type, parent_id, position, updated_at, is_favorite";
  // Only the original columns — guaranteed to exist even before any migration.
  const baseCols = "id, title, icon, type, parent_id, position, updated_at";

  const primary = await supabase
    .from("notes")
    .select(fullCols)
    .is("deleted_at", null)
    .order("position", { ascending: true });

  // If newer columns (deleted_at / is_favorite) don't exist yet because the
  // schema migration hasn't been run, fall back to the base columns so the
  // workspace still loads with all pages instead of showing an empty state.
  let rows = primary.data as Record<string, unknown>[] | null;
  if (primary.error) {
    const fallback = await supabase
      .from("notes")
      .select(baseCols)
      .order("position", { ascending: true });
    rows = fallback.data as Record<string, unknown>[] | null;
  }

  const notes: NoteSummary[] = (rows ?? []).map((n) => ({
    id: n.id as string,
    title: n.title as string,
    icon: n.icon as string,
    type: n.type as NoteSummary["type"],
    parent_id: (n.parent_id as string | null) ?? null,
    position: n.position as number,
    updated_at: n.updated_at as string,
    is_favorite: (n.is_favorite as boolean | undefined) ?? false,
  }));

  return (
    <Workspace
      initialNotes={notes}
      userEmail={user.email ?? ""}
      userId={user.id}
    />
  );
}
