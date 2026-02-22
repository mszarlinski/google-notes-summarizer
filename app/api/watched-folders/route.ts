import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { repo } from "@/lib/watched-folders-repo";

export async function GET() {
  const session = await auth();
  if (!session?.userEmail) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const folders = await repo.list(session.userEmail);

  return NextResponse.json({ folders });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.userEmail) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { folderId, folderName } = await request.json();
  if (!folderId || !folderName) {
    return NextResponse.json(
      { error: "folderId and folderName are required" },
      { status: 400 },
    );
  }

  const folder = await repo.add(session.userEmail, folderId, folderName);

  return NextResponse.json({ folder }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.userEmail) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { folderId } = await request.json();
  if (!folderId) {
    return NextResponse.json(
      { error: "folderId is required" },
      { status: 400 },
    );
  }

  await repo.remove(session.userEmail, folderId);

  return NextResponse.json({ success: true });
}
