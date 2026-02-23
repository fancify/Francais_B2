import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/** GET /api/progress?user=xxx — 返回该用户的进度 */
export async function GET(req: NextRequest) {
  const userName = req.nextUrl.searchParams.get("user");
  if (!userName) {
    return NextResponse.json({ error: "user is required" }, { status: 400 });
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from("progress")
    .select("scores, weak_points, updated_at")
    .eq("user_name", userName)
    .single();

  if (error && error.code === "PGRST116") {
    // 无记录，返回空数据
    return NextResponse.json({ scores: {}, weak_points: [], updated_at: null });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/** PUT /api/progress — upsert 用户进度 */
export async function PUT(req: Request) {
  const body = await req.json();
  const { user_name, scores, weak_points } = body;

  if (!user_name) {
    return NextResponse.json({ error: "user_name is required" }, { status: 400 });
  }

  const sb = getSupabase();
  const { error } = await sb
    .from("progress")
    .upsert(
      { user_name, scores: scores ?? {}, weak_points: weak_points ?? [] },
      { onConflict: "user_name" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
