import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { DriveFileList } from "@/components/drive-file-list";

export default async function Dashboard() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const initials = session.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="border-b border-gray-200/60 bg-white/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-sm">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              Notes Summarizer
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                {initials}
              </div>
              <span className="hidden text-sm text-gray-600 sm:block">
                {session.user?.email}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Your Drive Folders
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Top-level folders from your Google Drive
          </p>
        </div>
        <DriveFileList />
      </main>
    </div>
  );
}
