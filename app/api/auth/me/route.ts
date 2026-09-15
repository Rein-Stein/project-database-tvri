import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  const user = session
    ? {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      }
    : null;
  return NextResponse.json({ user });
}
