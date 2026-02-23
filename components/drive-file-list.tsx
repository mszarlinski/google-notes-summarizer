"use client";

import { useEffect, useState, useCallback } from "react";

interface DriveFolder {
  id: string;
  name: string;
  modifiedTime: string;
}

function FolderIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
      </svg>
    </div>
  );
}

function WatchButton({
  isWatched,
  loading,
  onClick,
}: {
  isWatched: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={isWatched ? "Stop watching this folder" : "Watch this folder"}
      className={`group/watch flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
        isWatched
          ? "bg-brand-50 text-brand-600 hover:bg-brand-100"
          : "text-gray-300 hover:bg-gray-100 hover:text-gray-500"
      } ${loading ? "animate-pulse" : ""}`}
    >
      <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    </button>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4"
        >
          <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-50" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DriveFileList() {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/drive").then((res) => {
        if (!res.ok) throw new Error("Failed to fetch folders");
        return res.json();
      }),
      fetch("/api/watched-folders").then((res) => {
        if (!res.ok) return { folders: [] };
        return res.json();
      }),
    ])
      .then(([driveData, watchData]) => {
        setFolders(driveData.files);
        setWatchedIds(
          new Set(watchData.folders.map((f: { folderId: string }) => f.folderId)),
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleWatch = useCallback(
    async (folder: DriveFolder) => {
      const isWatched = watchedIds.has(folder.id);
      setTogglingIds((prev) => new Set(prev).add(folder.id));

      try {
        if (isWatched) {
          const res = await fetch("/api/watched-folders", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId: folder.id }),
          });
          if (!res.ok) throw new Error("Failed to unwatch folder");
          setWatchedIds((prev) => {
            const next = new Set(prev);
            next.delete(folder.id);
            return next;
          });
        } else {
          const res = await fetch("/api/watched-folders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId: folder.id, folderName: folder.name }),
          });
          if (!res.ok) throw new Error("Failed to watch folder");
          setWatchedIds((prev) => new Set(prev).add(folder.id));
        }
      } catch {
        // Silently fail — state remains unchanged
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(folder.id);
          return next;
        });
      }
    },
    [watchedIds],
  );

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">Something went wrong</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <svg
          className="mx-auto h-10 w-10 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
          />
        </svg>
        <p className="mt-3 text-sm font-medium text-gray-900">No folders found</p>
        <p className="mt-1 text-sm text-gray-500">
          No top-level folders in your Google Drive.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/60 bg-white shadow-sm">
      <ul className="divide-y divide-gray-100">
        {folders.map((folder) => (
          <li
            key={folder.id}
            className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/60"
          >
            <FolderIcon />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {folder.name}
              </p>
            </div>
            <span className="hidden text-xs text-gray-400 sm:block">
              {formatDate(folder.modifiedTime)}
            </span>
            <WatchButton
              isWatched={watchedIds.has(folder.id)}
              loading={togglingIds.has(folder.id)}
              onClick={() => toggleWatch(folder)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
