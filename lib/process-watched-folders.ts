import { repo, WatchedFolder } from "@/lib/watched-folders-repo";
import { tokenStore } from "@/lib/token-store";
import { getDriveClientWithRefresh } from "@/lib/google-drive";
import { getGeminiModel } from "@/lib/gemini";
import { drive_v3 } from "googleapis";


interface ProcessedEntry {
  userId: string;
  folderId: string;
  summariesGenerated: number;
}

interface ErrorEntry {
  userId: string;
  folderId: string;
  error: string;
}

export interface ProcessResult {
  processed: ProcessedEntry[];
  errors: ErrorEntry[];
}

async function findOrCreateSummariesFolder(drive: drive_v3.Drive): Promise<string> {
  const existing = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' AND name = 'Summaries' AND 'root' in parents AND trashed = false",
    fields: "files(id)",
    spaces: "drive",
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id!;
  }

  const created = await drive.files.create({
    requestBody: {
      name: "Summaries",
      mimeType: "application/vnd.google-apps.folder",
      parents: ["root"],
    },
    fields: "id",
  });
  return created.data.id!;
}

async function fetchFileContent(drive: drive_v3.Drive, fileId: string): Promise<string> {
  const res = await drive.files.export(
    { fileId, mimeType: "text/plain" },
    { responseType: "text" },
  );
  return res.data as string;
}

async function generateSummary(content: string): Promise<string> {
  const model = getGeminiModel();
  const result = await model.generateContent(
    `You are a meeting notes assistant. Generate a concise, structured meeting summary from the following notes. Include key decisions, action items, and main discussion points.\n\nNotes:\n${content}`,
  );
  return result.response.text();
}

async function createSummaryDoc(
  drive: drive_v3.Drive,
  fileName: string,
  summary: string,
  summariesFolderId: string,
): Promise<void> {
  await drive.files.create({
    requestBody: {
      name: `${fileName}-summary`,
      mimeType: "application/vnd.google-apps.document",
      parents: [summariesFolderId],
    },
    media: {
      mimeType: "text/plain",
      body: summary,
    },
    fields: "id",
  });
}

async function summariseNewFiles(
  drive: drive_v3.Drive,
  folder: WatchedFolder,
  summariesFolderId: string,
): Promise<number> {
  let query = `'${folder.folderId}' in parents AND trashed = false`;
  if (folder.lastProcessedAt) {
    query += ` AND createdTime > '${folder.lastProcessedAt.toISOString()}'`;
  }

  const filesRes = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const files = filesRes.data.files ?? [];
  let summariesGenerated = 0;

  for (const file of files) {
    try {
      const content = await fetchFileContent(drive, file.id!);
      const summary = await generateSummary(content);
      await createSummaryDoc(drive, file.name!, summary, summariesFolderId);
      summariesGenerated++;
    } catch {
      // Best-effort: skip files that fail
    }
  }

  return summariesGenerated;
}

export async function processWatchedFolders(): Promise<ProcessResult> {
  const allFolders = await repo.listAll();

  const byUser = new Map<string, WatchedFolder[]>();
  for (const folder of allFolders) {
    const list = byUser.get(folder.userId) ?? [];
    list.push(folder);
    byUser.set(folder.userId, list);
  }

  const processed: ProcessedEntry[] = [];
  const errors: ErrorEntry[] = [];

  for (const [userId, folders] of byUser) {
    const refreshToken = tokenStore.get(userId);
    if (!refreshToken) {
      for (const f of folders) {
        errors.push({ userId, folderId: f.folderId, error: "No refresh token" });
      }
      continue;
    }

    const drive = getDriveClientWithRefresh(refreshToken);

    let summariesFolderId: string;
    try {
      summariesFolderId = await findOrCreateSummariesFolder(drive);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const f of folders) {
        errors.push({ userId, folderId: f.folderId, error: `Summaries folder error: ${message}` });
      }
      continue;
    }

    for (const folder of folders) {
      try {
        const summariesGenerated = await summariseNewFiles(drive, folder, summariesFolderId);
        await repo.updateLastProcessed(userId, folder.folderId);
        processed.push({ userId, folderId: folder.folderId, summariesGenerated });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ userId, folderId: folder.folderId, error: message });
      }
    }
  }

  return { processed, errors };
}
