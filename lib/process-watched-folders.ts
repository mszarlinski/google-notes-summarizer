import { repo, WatchedFolder } from "@/lib/watched-folders-repo";
import { tokenStore } from "@/lib/token-store";
import { getDriveClientWithRefresh } from "@/lib/google-drive";
import { drive_v3 } from "googleapis";

interface ProcessedEntry {
  userId: string;
  folderId: string;
  filesCopied: number;
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

async function copyNewFiles(
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
  let copied = 0;

  for (const file of files) {
    await drive.files.copy({
      fileId: file.id!,
      requestBody: {
        name: `${file.name}-copy`,
        parents: [summariesFolderId],
      },
    });
    copied++;
  }

  return copied;
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
        const filesCopied = await copyNewFiles(drive, folder, summariesFolderId);
        await repo.updateLastProcessed(userId, folder.folderId);
        processed.push({ userId, folderId: folder.folderId, filesCopied });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ userId, folderId: folder.folderId, error: message });
      }
    }
  }

  return { processed, errors };
}
