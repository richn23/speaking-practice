import { supabase } from "./supabase";

export async function uploadAudio(blob: Blob, taskId: string): Promise<string | null> {
  const fileName = `${taskId}-${Date.now()}.webm`;

  const { data, error } = await supabase.storage.from("audio").upload(fileName, blob, {
    contentType: "audio/webm",
  });

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  return data.path;
}

