import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCOUNT_MANAGEMENT_COOKIE_NAME,
  createAccountManagementToken,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Permintaan tidak valid." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const configuredEmail = (process.env.ACCOUNT_MANAGEMENT_EMAIL || "").trim().toLowerCase();
  const passwordHash = process.env.ACCOUNT_MANAGEMENT_PASSWORD_HASH || "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Email dan password wajib diisi." }, { status: 400 });
  }

  if (!configuredEmail || !passwordHash || email !== configuredEmail || !verifyPassword(password, passwordHash)) {
    return NextResponse.json({ ok: false, message: "Email atau password manajemen akun salah." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, message: "Akses manajemen akun dibuka." });
  response.cookies.set(ACCOUNT_MANAGEMENT_COOKIE_NAME, createAccountManagementToken(configuredEmail), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  return response;
}
