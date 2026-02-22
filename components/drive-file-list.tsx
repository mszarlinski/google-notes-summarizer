"use client";

import { useEffect, useState, useCallback } from "react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

const FOLDER_MIME = "application/vnd.google-apps.folder";

const FILE_ICONS: Record<string, { bg: string; icon: string }> = {
  "application/vnd.google-apps.document": { bg: "bg-blue-50 text-blue-600", icon: "doc" },
  "application/vnd.google-apps.spreadsheet": { bg: "bg-green-50 text-green-600", icon: "sheet" },
  "application/vnd.google-apps.presentation": { bg: "bg-amber-50 text-amber-600", icon: "slide" },
  [FOLDER_MIME]: { bg: "bg-slate-100 text-slate-500", icon: "folder" },
  "application/pdf": { bg: "bg-red-50 text-red-500", icon: "pdf" },
};

function FileIcon({ mimeType }: { mimeType: string }) {
  const config = FILE_ICONS[mimeType] ?? { bg: "bg-gray-50 text-gray-400", icon: "file" };

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
      {config.icon === "folder" ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      )}
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

function formatMimeType(mimeType: string): string {
  const labels: Record<string, string> = {
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slides",
    [FOLDER_MIME]: "Folder",
    "application/vnd.google-apps.form": "Google Form",
    "application/pdf": "PDF",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
  };
  return labels[mimeType] ?? mimeType.split("/").pop()?.replace("vnd.google-apps.", "") ?? mimeType;
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
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/drive").then((res) => {
        if (!res.ok) throw new Error("Failed to fetch files");
        return res.json();
      }),
      fetch("/api/watched-folders").then((res) => {
        if (!res.ok) return { folders: [] };
        return res.json();
      }),
    ])
      .then(([driveData, watchData]) => {
        setFiles(driveData.files);
        setWatchedIds(
          new Set(watchData.folders.map((f: { folderId: string }) => f.folderId)),
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleWatch = useCallback(
    async (file: DriveFile) => {
      const isWatched = watchedIds.has(file.id);
      setTogglingIds((prev) => new Set(prev).add(file.id));

      try {
        if (isWatched) {
          const res = await fetch("/api/watched-folders", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId: file.id }),
          });
          if (!res.ok) throw new Error("Failed to unwatch folder");
          setWatchedIds((prev) => {
            const next = new Set(prev);
            next.delete(file.id);
            return next;
          });
        } else {
          const res = await fetch("/api/watched-folders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId: file.id, folderName: file.name }),
          });
          if (!res.ok) throw new Error("Failed to watch folder");
          setWatchedIds((prev) => new Set(prev).add(file.id));
        }
      } catch {
        // Silently fail — state remains unchanged
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(file.id);
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
        <p className="text-sm font-medium text-red-800">
          Something went wrong
        </p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (files.length === 0) {
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
        <p className="mt-3 text-sm font-medium text-gray-900">No files found</p>
        <p className="mt-1 text-sm text-gray-500">
          Your Google Drive appears to be empty.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/60 bg-white shadow-sm">
      <ul className="divide-y divide-gray-100">
        {files.map((file) => {
          const isFolder = file.mimeType === FOLDER_MIME;
          return (
            <li
              key={file.id}
              className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/60"
            >
              <FileIcon mimeType={file.mimeType} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatMimeType(file.mimeType)}
                </p>
              </div>
              <span className="hidden text-xs text-gray-400 sm:block">
                {formatDate(file.modifiedTime)}
              </span>
              {isFolder && (
                <WatchButton
                  isWatched={watchedIds.has(file.id)}
                  loading={togglingIds.has(file.id)}
                  onClick={() => toggleWatch(file)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
