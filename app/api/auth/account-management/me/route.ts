import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCOUNT_MANAGEMENT_COOKIE_NAME, verifyAccountManagementToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const allowed = verifyAccountManagementToken(cookies().get(ACCOUNT_MANAGEMENT_COOKIE_NAME)?.value);
  return NextResponse.json({ allowed });
}
