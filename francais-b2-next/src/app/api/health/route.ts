import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const key = process.env.OPENROUTER_API_KEY ?? "";
  return NextResponse.json({
    openrouter: !!key,
    // 前4位 + 长度，用于确认 key 有值但不泄露完整 key
    openrouter_prefix: key ? key.slice(0, 4) : "(empty)",
    openrouter_len: key.length,
    password: !!process.env.NEXT_PUBLIC_APP_PASSWORD,
  });
}
