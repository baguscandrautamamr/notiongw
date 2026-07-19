import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@bagusnote.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function POST(request: Request) {
  if (!configureWebPush()) {
    return NextResponse.json(
      { error: "VAPID keys belum dikonfigurasi di server." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    payload = await request.json();
  } catch {
    /* use defaults */
  }

  const notification = JSON.stringify({
    title: payload.title || "BagusNote",
    body: payload.body || "Kamu punya notifikasi baru.",
    url: payload.url || "/",
  });

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, subscription")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!subs || subs.length === 0) {
    return NextResponse.json(
      { error: "Belum ada perangkat yang berlangganan notifikasi." },
      { status: 400 }
    );
  }

  const stale: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          notification
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // 404/410 => subscription no longer valid, clean it up.
        if (statusCode === 404 || statusCode === 410) {
          stale.push(row.endpoint as string);
        }
      }
    })
  );

  if (stale.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return NextResponse.json({ ok: true, sent });
}
