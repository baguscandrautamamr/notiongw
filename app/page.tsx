import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotesApp from "@/components/NotesApp";
import type { Note } from "@/lib/types";

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
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <NotesApp
      initialNotes={(notes as Note[]) ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
