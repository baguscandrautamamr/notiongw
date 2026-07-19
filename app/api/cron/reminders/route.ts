import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { coerceDatabase, firstTextFieldId } from "@/lib/db-types";
import { isRowDone } from "@/lib/db-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@bagusnote.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function todayISO(): string {
  // Use WIB (UTC+7) so "today" matches the user's day in Indonesia.
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  // Protect the endpoint. Vercel Cron sends "Authorization: Bearer <CRON_SECRET>".
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!configureWebPush()) {
    return NextResponse.json({ error: "VAPID not configured" }, { status: 500 });
  }
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
      { status: 500 }
    );
  }

  const today = todayISO();

  const { data: pages, error } = await supabase
    .from("notes")
    .select("id, user_id, db")
    .in("type", ["grid", "board"]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Collect due/overdue (not done) task titles per user.
  const dueByUser = new Map<string, string[]>();
  for (const page of pages ?? []) {
    if (!page.db) continue;
    const db = coerceDatabase(page.db);
    const dateField = db.fields.find((f) => f.type === "date");
    if (!dateField) continue;
    const titleId = firstTextFieldId(db.fields);

    for (const row of db.rows) {
      const due = row.cells[dateField.id] as string | undefined;
      if (!due) continue;
      if (due > today) continue; // future
      if (isRowDone(db, row)) continue;
      const title = (titleId && (row.cells[titleId] as string)) || "Tanpa judul";
      const label = due < today ? `${title} (telat)` : title;
      const arr = dueByUser.get(page.user_id) ?? [];
      arr.push(label);
      dueByUser.set(page.user_id, arr);
    }
  }

  let usersNotified = 0;
  let pushesSent = 0;

  for (const [userId, titles] of dueByUser) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, subscription")
      .eq("user_id", userId);
    if (!subs || subs.length === 0) continue;

    const shown = titles.slice(0, 4).join(", ");
    const extra = titles.length > 4 ? ` +${titles.length - 4} lagi` : "";
    const payload = JSON.stringify({
      title: `⏰ ${titles.length} tugas jatuh tempo`,
      body: `${shown}${extra}`,
      url: "/",
    });

    const stale: string[] = [];
    await Promise.all(
      subs.map(async (row) => {
        try {
          await webpush.sendNotification(
            row.subscription as webpush.PushSubscription,
            payload
          );
          pushesSent++;
        } catch (err) {
          const code = (err as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) stale.push(row.endpoint as string);
        }
      })
    );
    if (stale.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", stale);
    }
    usersNotified++;
  }

  return NextResponse.json({
    ok: true,
    date: today,
    usersNotified,
    pushesSent,
  });
}
