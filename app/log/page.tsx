import { redirect } from "next/navigation";
import { EntryForm } from "@/components/EntryForm";
import { getCurrentUser } from "@/lib/queries";

export default async function LogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Log today&apos;s app</h1>
        <p className="text-sm text-zinc-500">
          Required fields lock the entry in. Optional fields make Future You
          grateful.
        </p>
      </div>
      <EntryForm userId={user.id} />
    </div>
  );
}
