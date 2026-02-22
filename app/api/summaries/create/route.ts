import { NextResponse } from "next/server";
import { processWatchedFolders } from "@/lib/process-watched-folders";

export async function POST(request: Request) {
  // const apiKey = request.headers.get("x-scheduler-api-key");
  // if (!apiKey || apiKey !== process.env.SCHEDULER_API_KEY) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  const result = await processWatchedFolders();
  return NextResponse.json(result);
}
