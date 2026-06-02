import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">📓</span>
          <span>100 Day Log</span>
        </Link>
        {user ? (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/entries" className="hover:underline">
              Entries
            </Link>
            <Link href="/stats" className="hover:underline">
              Stats
            </Link>
            <Link href="/profile" className="hover:underline">
              Profile
            </Link>
            <SignOutButton />
          </nav>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
