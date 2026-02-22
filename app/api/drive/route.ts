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
      pageSize: 20,
      fields: "files(id, name, mimeType, modifiedTime)",
    });

    return NextResponse.json({ files: res.data.files ?? [] });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch Drive files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
