import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createSupabaseServerClient();

  // Touch session to ensure auth cookies refresh; route protection to be added later.
  await supabase.auth.getSession();

  return res;
}

