export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUDIO_BUCKET = "audio";

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase service role key or URL missing" },
      { status: 500 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    const taskId = (formData.get("taskId") as string | null) ?? "audio";

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `${taskId}-${Date.now()}.webm`;

    const { data, error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type || "audio/webm",
        upsert: false,
      });

    if (error) {
      console.error("[upload-audio] upload error", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ path: data.path });
  } catch (err) {
    console.error("[upload-audio] unexpected error", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

