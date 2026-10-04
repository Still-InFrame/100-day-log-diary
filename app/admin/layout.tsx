import type { Metadata } from "next";
import { requireOwner } from "@/lib/owner";
import { AdminTabs } from "@/components/admin/AdminTabs";

export const metadata: Metadata = {
  title: "Admin · 100 Day Log",
  robots: { index: false, follow: false },
};

// Owner-only area. Each page calls requireOwner() itself as well: a layout is
// not re-run on every navigation between its child pages.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOwner();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-zinc-500">
          Who is interested in which app, and what people are clicking.
        </p>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
