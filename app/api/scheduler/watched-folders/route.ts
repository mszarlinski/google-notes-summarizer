import { NextResponse } from "next/server";
import { repo } from "@/lib/watched-folders-repo";

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-scheduler-api-key");
  if (!apiKey || apiKey !== process.env.SCHEDULER_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folders = await repo.listAll();

  return NextResponse.json({ folders });
}
