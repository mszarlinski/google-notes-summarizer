"use client";

import { useEffect, useState } from "react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

export function DriveFileList() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/drive")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch files");
        return res.json();
      })
      .then((data) => setFiles(data.files))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading files...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (files.length === 0) return <p className="text-gray-500">No files found.</p>;

  return (
    <ul className="space-y-2">
      {files.map((file) => (
        <li
          key={file.id}
          className="rounded-lg border border-gray-200 p-3 flex justify-between items-center"
        >
          <span className="font-medium">{file.name}</span>
          <span className="text-sm text-gray-500">{file.mimeType}</span>
        </li>
      ))}
    </ul>
  );
}
