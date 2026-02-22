"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:text-gray-900 hover:shadow-sm active:scale-[0.97] cursor-pointer"
    >
      Sign out
    </button>
  );
}
