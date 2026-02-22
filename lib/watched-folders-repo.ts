export interface WatchedFolder {
  id: string;
  userId: string;
  folderId: string;
  folderName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchedFoldersRepo {
  list(userId: string): Promise<WatchedFolder[]>;
  listAll(): Promise<WatchedFolder[]>;
  add(userId: string, folderId: string, folderName: string): Promise<WatchedFolder>;
  remove(userId: string, folderId: string): Promise<void>;
}

class InMemoryWatchedFoldersRepo implements WatchedFoldersRepo {
  private store = new Map<string, WatchedFolder[]>();

  async list(userId: string): Promise<WatchedFolder[]> {
    return (this.store.get(userId) ?? []).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async listAll(): Promise<WatchedFolder[]> {
    const all: WatchedFolder[] = [];
    for (const folders of this.store.values()) {
      all.push(...folders);
    }
    return all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async add(userId: string, folderId: string, folderName: string): Promise<WatchedFolder> {
    const folders = this.store.get(userId) ?? [];
    const existing = folders.find((f) => f.folderId === folderId);

    if (existing) {
      existing.folderName = folderName;
      existing.updatedAt = new Date();
      return existing;
    }

    const now = new Date();
    const folder: WatchedFolder = {
      id: crypto.randomUUID(),
      userId,
      folderId,
      folderName,
      createdAt: now,
      updatedAt: now,
    };
    folders.push(folder);
    this.store.set(userId, folders);
    return folder;
  }

  async remove(userId: string, folderId: string): Promise<void> {
    const folders = this.store.get(userId) ?? [];
    this.store.set(
      userId,
      folders.filter((f) => f.folderId !== folderId),
    );
  }
}

const globalForRepo = globalThis as unknown as { watchedFoldersRepo: WatchedFoldersRepo };

export const repo: WatchedFoldersRepo =
  globalForRepo.watchedFoldersRepo ?? new InMemoryWatchedFoldersRepo();

if (process.env.NODE_ENV !== "production") {
  globalForRepo.watchedFoldersRepo = repo;
}
