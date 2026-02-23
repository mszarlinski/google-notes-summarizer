import { describe, it, expect, vi, beforeEach } from "vitest";
import { processWatchedFolders } from "./process-watched-folders";
import { repo } from "./watched-folders-repo";
import { tokenStore } from "./token-store";
import { getDriveClientWithRefresh } from "./google-drive";
import { getGeminiModel } from "./gemini";
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

vi.mock("./gemini", () => ({
  getGeminiModel: vi.fn(),
}));

const mockFilesList = vi.fn();
const mockFilesCreate = vi.fn();
const mockFilesExport = vi.fn();

function makeDrive() {
  return {
    files: {
      list: mockFilesList,
      create: mockFilesCreate,
      export: mockFilesExport,
    },
  };
}

const mockGenerateContent = vi.fn();

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
  vi.mocked(getGeminiModel).mockReturnValue({
    generateContent: mockGenerateContent,
  } as any);
  mockGenerateContent.mockResolvedValue({
    response: { text: () => "Meeting summary." },
  });
  mockFilesCreate.mockResolvedValue({ data: { id: "new-doc-id" } });
});

describe("processWatchedFolders", () => {
  it("does not create summaries when no folders are watched", async () => {
    vi.mocked(repo.listAll).mockResolvedValue([]);

    const result = await processWatchedFolders();

    expect(result.processed).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(getDriveClientWithRefresh).not.toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("generates a summary doc for a new Google Doc file", async () => {
    vi.mocked(repo.listAll).mockResolvedValue([makeWatchedFolder()]);

    mockFilesList
      .mockResolvedValueOnce({ data: { files: [{ id: SUMMARIES_FOLDER_ID }] } })
      .mockResolvedValueOnce({
        data: { files: [{ id: "file-1", name: "Meeting Notes" }] },
      });
    mockFilesExport.mockResolvedValue({ data: "Raw meeting notes content." });

    const result = await processWatchedFolders();

    expect(result.processed).toEqual([
      { userId: USER, folderId: FOLDER_ID, summariesGenerated: 1 },
    ]);
    expect(result.errors).toEqual([]);
    expect(mockFilesExport).toHaveBeenCalledWith(
      { fileId: "file-1", mimeType: "text/plain" },
      { responseType: "text" },
    );
    expect(mockGenerateContent).toHaveBeenCalledOnce();
    expect(mockFilesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({ name: "Meeting Notes-summary" }),
      }),
    );
  });

  it("skips already-processed files using lastProcessedAt filter", async () => {
    const lastProcessed = new Date("2026-02-20T10:00:00Z");
    vi.mocked(repo.listAll).mockResolvedValue([
      makeWatchedFolder({ lastProcessedAt: lastProcessed }),
    ]);

    mockFilesList
      .mockResolvedValueOnce({ data: { files: [{ id: SUMMARIES_FOLDER_ID }] } })
      .mockResolvedValueOnce({ data: { files: [] } });

    const result = await processWatchedFolders();

    expect(result.processed).toEqual([
      { userId: USER, folderId: FOLDER_ID, summariesGenerated: 0 },
    ]);
    expect(mockGenerateContent).not.toHaveBeenCalled();

    // Verify the query includes the createdTime filter
    const listCall = mockFilesList.mock.calls[1][0];
    expect(listCall.q).toContain(`createdTime > '${lastProcessed.toISOString()}'`);
  });

  it("does not update lastProcessedAt when Gemini returns an error", async () => {
    vi.mocked(repo.listAll).mockResolvedValue([makeWatchedFolder()]);

    mockFilesList
      .mockResolvedValueOnce({ data: { files: [{ id: SUMMARIES_FOLDER_ID }] } })
      .mockResolvedValueOnce({
        data: { files: [{ id: "file-1", name: "Meeting Notes" }] },
      });
    mockFilesExport.mockResolvedValue({ data: "Some notes content." });
    mockGenerateContent.mockRejectedValue(new Error("429 Too Many Requests"));

    const result = await processWatchedFolders();

    expect(result.processed).toEqual([
      { userId: USER, folderId: FOLDER_ID, summariesGenerated: 0 },
    ]);
    expect(repo.updateLastProcessed).not.toHaveBeenCalled();
  });

  it("excludes trashed files from summarisation", async () => {
    vi.mocked(repo.listAll).mockResolvedValue([makeWatchedFolder()]);

    mockFilesList
      .mockResolvedValueOnce({ data: { files: [{ id: SUMMARIES_FOLDER_ID }] } })
      .mockResolvedValueOnce({ data: { files: [] } });

    const result = await processWatchedFolders();

    expect(result.processed).toEqual([
      { userId: USER, folderId: FOLDER_ID, summariesGenerated: 0 },
    ]);
    expect(mockGenerateContent).not.toHaveBeenCalled();

    // Verify the query includes trashed = false
    const listCall = mockFilesList.mock.calls[1][0];
    expect(listCall.q).toContain("trashed = false");
  });
});
