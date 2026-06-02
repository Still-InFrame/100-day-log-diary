import { GoogleSignInButton } from "@/components/GoogleSignInButton";

type SearchParams = Promise<{ error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 text-center">
      <div>
        <div className="text-5xl">📓</div>
        <h1 className="mt-4 text-3xl font-semibold">100 Day Log Diary</h1>
        <p className="mt-2 text-zinc-500">
          Sign in to track every app you build over the next 100 days.
        </p>
      </div>

      <GoogleSignInButton />

      {error === "oauth_failed" && (
        <p className="text-sm text-red-500">
          Sign-in failed. Please try again.
        </p>
      )}
    </div>
  );
}
