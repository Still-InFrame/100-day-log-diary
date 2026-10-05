import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { AdminTabs } from "@/components/admin/AdminTabs";

export const metadata: Metadata = {
  title: "Admin · 100 Day Log",
  robots: { index: false, follow: false },
};

// Every signed-in user has their own admin: the data behind it is filtered to
// the caller by Row Level Security, so there is nothing site-wide in here.
// Each page calls requireUser() itself as well: a layout is not re-run on
// every navigation between its child pages.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-zinc-500">
          Who is interested in which of your apps, and what people are
          clicking on your public page.
        </p>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
