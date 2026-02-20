import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    openrouter: !!process.env.OPENROUTER_API_KEY,
    password: !!process.env.NEXT_PUBLIC_APP_PASSWORD,
  });
}
