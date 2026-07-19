import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PublicPage from "@/components/PublicPage";
import type { Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const note = data as Note | null;

  if (!note || !note.is_public) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-lg font-semibold">Halaman tidak tersedia</h1>
        <p className="mt-1 max-w-xs text-sm text-slate-500">
          Link ini tidak valid atau halaman belum dibagikan ke publik.
        </p>
        <Link
          href="/"
          className="mt-5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Ke BagusNote
        </Link>
      </div>
    );
  }

  return <PublicPage note={note} />;
}
