import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { DriveFileList } from "@/components/drive-file-list";

export default async function Dashboard() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-600">{session.user?.email}</p>
        </div>
        <SignOutButton />
      </div>
      <h2 className="text-xl font-semibold mb-4">Your Drive Files</h2>
      <DriveFileList />
    </main>
  );
}
