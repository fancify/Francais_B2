import { NextResponse } from "next/server";

// 必须在运行时读 env，不要被 Next.js 静态缓存（否则永远显示 build 时的值）
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const key = process.env.OPENROUTER_API_KEY ?? "";
  return NextResponse.json({
    v: "2fcff30",
    openrouter: !!key,
    openrouter_prefix: key ? key.slice(0, 4) : "(empty)",
    openrouter_len: key.length,
    password: !!process.env.NEXT_PUBLIC_APP_PASSWORD,
  });
}
