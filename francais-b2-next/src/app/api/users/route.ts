import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/** GET /api/users — 返回所有用户 */
export async function GET() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .select("name, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ users: data });
}

/** POST /api/users — 创建新用户 */
export async function POST(req: Request) {
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .insert({ name })
    .select("name, created_at")
    .single();

  if (error) {
    // unique violation → 用户已存在，当作成功
    if (error.code === "23505") {
      const { data: existing } = await sb
        .from("users")
        .select("name, created_at")
        .eq("name", name)
        .single();
      return NextResponse.json({ user: existing });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ user: data }, { status: 201 });
}

/** DELETE /api/users?name=xxx — 删除用户及其进度 */
export async function DELETE(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const sb = getSupabase();

  // 先删 progress（FK 约束）
  await sb.from("progress").delete().eq("user_name", name);

  const { error } = await sb.from("users").delete().eq("name", name);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
