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

  const cols = "id, title, icon, type, parent_id, position, updated_at";
  const active = await supabase
    .from("notes")
    .select(cols)
    .is("deleted_at", null)
    .order("position", { ascending: true });

  // Fall back gracefully if the `deleted_at` migration hasn't been run yet,
  // so the workspace still loads instead of showing an empty state.
  const notes = active.error
    ? (
        await supabase
          .from("notes")
          .select(cols)
          .order("position", { ascending: true })
      ).data
    : active.data;

  return (
    <Workspace
      initialNotes={(notes as NoteSummary[]) ?? []}
      userEmail={user.email ?? ""}
      userId={user.id}
    />
  );
}
