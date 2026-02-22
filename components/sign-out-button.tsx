"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 font-medium hover:bg-gray-300 transition-colors cursor-pointer"
    >
      Sign out
    </button>
  );
}
