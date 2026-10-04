import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBadges, getEntries, getProfileByHandle } from "@/lib/queries";
import { Showcase } from "@/components/Showcase";

type Params = Promise<{ handle: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) return { title: "Not found · 100 Day Log" };
  const name = profile.display_name ?? handle;
  return {
    title: `${name}'s 100 Day Build Challenge`,
    description: `Follow ${name}'s progress building one app every day for 100 days.`,
  };
}

export default async function SharePage({ params }: { params: Params }) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const [entries, badges] = await Promise.all([
    getEntries(profile.user_id),
    getBadges(profile.user_id),
  ]);

  return (
    <Showcase
      profile={profile}
      entries={entries}
      badges={badges}
      handle={handle}
    />
  );
}
