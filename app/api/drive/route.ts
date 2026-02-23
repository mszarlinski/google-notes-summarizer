import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDriveClient } from "@/lib/google-drive";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const drive = getDriveClient(session.accessToken);
    const res = await drive.files.list({
      pageSize: 50,
      q: "mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false",
      fields: "files(id, name, modifiedTime)",
      orderBy: "name",
    });

    return NextResponse.json({ files: res.data.files ?? [] });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch Drive files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
