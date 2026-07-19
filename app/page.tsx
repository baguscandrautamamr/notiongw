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

  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, icon, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <Workspace
      initialNotes={(notes as NoteSummary[]) ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
