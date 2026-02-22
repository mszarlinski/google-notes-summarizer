import { describe, it, expect, vi, beforeEach } from "vitest";
import { processWatchedFolders } from "./process-watched-folders";
import { repo } from "./watched-folders-repo";
import { tokenStore } from "./token-store";
import { getDriveClientWithRefresh } from "./google-drive";
import type { WatchedFolder } from "./watched-folders-repo";

vi.mock("./watched-folders-repo", () => ({
  repo: {
    listAll: vi.fn(),
    updateLastProcessed: vi.fn(),
  },
}));

vi.mock("./token-store", () => ({
  tokenStore: {
    get: vi.fn(),
  },
}));

vi.mock("./google-drive", () => ({
  getDriveClientWithRefresh: vi.fn(),
}));

const mockFilesList = vi.fn();
const mockFilesCopy = vi.fn();
const mockFilesCreate = vi.fn();

function makeDrive() {
  return {
    files: {
      list: mockFilesList,
      copy: mockFilesCopy,
      create: mockFilesCreate,
    },
  };
}

const USER = "user@example.com";
const FOLDER_ID = "folder-123";
const SUMMARIES_FOLDER_ID = "summaries-456";

function makeWatchedFolder(overrides: Partial<WatchedFolder> = {}): WatchedFolder {
  const now = new Date();
  return {
    id: "wf-1",
    userId: USER,
    folderId: FOLDER_ID,
    folderName: "My Folder",
    createdAt: now,
    updatedAt: now,
    lastProcessedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();

  // Default: Summaries folder already exists
  mockFilesList.mockResolvedValue({
    data: { files: [{ id: SUMMARIES_FOLDER_ID }] },
  });

  vi.mocked(getDriveClientWithRefresh).mockReturnValue(makeDrive() as any);
  vi.mocked(tokenStore.get).mockReturnValue("refresh-token");
  vi.mocked(repo.updateLastProcessed).mockResolvedValue(undefined);
});

describe("processWatchedFolders", () => {
  it("does not create summaries when no folders are watched", async () => {
    vi.mocked(repo.listAll).mockResolvedValue([]);

    const result = await processWatchedFolders();

    expect(result.processed).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(getDriveClientWithRefresh).not.toHaveBeenCalled();
    expect(mockFilesCopy).not.toHaveBeenCalled();
  });

  it("copies a new file into the Summaries folder", async () => {
    vi.mocked(repo.listAll).mockResolvedValue([makeWatchedFolder()]);

    // First call: find Summaries folder; second call: list files in watched folder
    mockFilesList
      .mockResolvedValueOnce({ data: { files: [{ id: SUMMARIES_FOLDER_ID }] } })
      .mockResolvedValueOnce({
        data: { files: [{ id: "file-1", name: "Meeting Notes" }] },
      });
    mockFilesCopy.mockResolvedValue({});

    const result = await processWatchedFolders();

    expect(result.processed).toEqual([
      { userId: USER, folderId: FOLDER_ID, filesCopied: 1 },
    ]);
    expect(result.errors).toEqual([]);
    expect(mockFilesCopy).toHaveBeenCalledOnce();
    expect(mockFilesCopy).toHaveBeenCalledWith({
      fileId: "file-1",
      requestBody: {
        name: "Meeting Notes-copy",
        parents: [SUMMARIES_FOLDER_ID],
      },
    });
  });

  it("skips already-processed files using lastProcessedAt filter", async () => {
    const lastProcessed = new Date("2026-02-20T10:00:00Z");
    vi.mocked(repo.listAll).mockResolvedValue([
      makeWatchedFolder({ lastProcessedAt: lastProcessed }),
    ]);

    // First call: Summaries folder; second call: no new files (empty result)
    mockFilesList
      .mockResolvedValueOnce({ data: { files: [{ id: SUMMARIES_FOLDER_ID }] } })
      .mockResolvedValueOnce({ data: { files: [] } });

    const result = await processWatchedFolders();

    expect(result.processed).toEqual([
      { userId: USER, folderId: FOLDER_ID, filesCopied: 0 },
    ]);
    expect(mockFilesCopy).not.toHaveBeenCalled();

    // Verify the query includes the createdTime filter
    const listCall = mockFilesList.mock.calls[1][0];
    expect(listCall.q).toContain(`createdTime > '${lastProcessed.toISOString()}'`);
  });

  it("does not copy files that were deleted (trashed)", async () => {
    vi.mocked(repo.listAll).mockResolvedValue([makeWatchedFolder()]);

    // First call: Summaries folder; second call: Drive returns no files
    // (trashed files are excluded by the `trashed = false` query filter)
    mockFilesList
      .mockResolvedValueOnce({ data: { files: [{ id: SUMMARIES_FOLDER_ID }] } })
      .mockResolvedValueOnce({ data: { files: [] } });

    const result = await processWatchedFolders();

    expect(result.processed).toEqual([
      { userId: USER, folderId: FOLDER_ID, filesCopied: 0 },
    ]);
    expect(mockFilesCopy).not.toHaveBeenCalled();

    // Verify the query includes trashed = false
    const listCall = mockFilesList.mock.calls[1][0];
    expect(listCall.q).toContain("trashed = false");
  });
});
