export async function uploadAudio(blob: Blob, taskId: string): Promise<string | null> {
  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");
  formData.append("taskId", taskId);

  const res = await fetch("/api/upload-audio", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    console.error("Upload error:", await res.text());
    return null;
  }

  const json = await res.json();
  return json.path ?? null;
}
