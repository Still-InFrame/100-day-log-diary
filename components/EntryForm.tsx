"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { TechTagInput } from "./TechTagInput";
import { MoodPicker } from "./MoodPicker";
import { ConfettiBurst } from "./ConfettiBurst";
import { saveEntry } from "@/app/actions/entries";
import { createClient } from "@/lib/supabase/client";
import { BADGE_META, type BadgeType, type Entry } from "@/lib/types";
import { todayISO } from "@/lib/dates";

export function EntryForm({
  userId,
  existing,
}: {
  userId: string;
  existing?: Entry;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [celebrateBadges, setCelebrateBadges] = useState<BadgeType[]>([]);

  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [appName, setAppName] = useState(existing?.app_name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [repoUrl, setRepoUrl] = useState(existing?.repo_url ?? "");
  const [techStack, setTechStack] = useState<string[]>(existing?.tech_stack ?? []);
  const [timeSpent, setTimeSpent] = useState<number>(
    existing?.time_spent_minutes ?? 60,
  );
  const [learnings, setLearnings] = useState(existing?.learnings ?? "");
  const [challenges, setChallenges] = useState(existing?.challenges ?? "");
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(
    existing?.screenshot_url ?? null,
  );
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("screenshots")
        .upload(path, file, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("screenshots").getPublicUrl(path);
      setScreenshotUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Idempotency lock. The form was observed firing the server action twice on
  // a single submit in dev (Strict Mode / fast double-click). The DB unique
  // constraint already prevents duplicate rows, but a second fire flashes a
  // confusing "duplicate key" error on new entries. This ref blocks it.
  const submittingRef = useRef(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    startTransition(async () => {
      const result = await saveEntry({
        id: existing?.id,
        date,
        app_name: appName,
        description,
        repo_url: repoUrl,
        tech_stack: techStack,
        time_spent_minutes: timeSpent,
        learnings: learnings || null,
        challenges: challenges || null,
        mood,
        screenshot_url: screenshotUrl,
      });
      if (!result.ok) {
        setError(result.error);
        submittingRef.current = false; // allow retry after a failed save
        return;
      }
      if (result.newBadges.length > 0) {
        setCelebrateBadges(result.newBadges);
        setTimeout(() => router.push("/"), 2200);
      } else {
        router.push("/");
        router.refresh();
      }
      // Success path navigates away; intentionally leave the lock engaged.
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ConfettiBurst trigger={celebrateBadges.length ? Date.now() : 0} />

      {celebrateBadges.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
            🎉 New badge{celebrateBadges.length > 1 ? "s" : ""} unlocked!
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {celebrateBadges.map((b) => {
              const meta = BADGE_META[b];
              return (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm dark:bg-zinc-900"
                >
                  <span>{meta.emoji}</span>
                  <span className="font-medium">{meta.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Required
        </h2>

        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <Field label="App name">
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            required
            maxLength={120}
            placeholder="e.g. 100 Day Log Diary"
            className={inputClass}
          />
        </Field>

        <Field label="One-line description">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={240}
            placeholder="What does it do?"
            className={inputClass}
          />
        </Field>

        <Field label="Link to code or live demo">
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            required
            placeholder="https://github.com/..."
            className={inputClass}
          />
        </Field>

        <Field label="Tech stack">
          <TechTagInput value={techStack} onChange={setTechStack} />
        </Field>

        <Field label="Time spent (minutes)">
          <input
            type="number"
            min={0}
            step={5}
            value={timeSpent}
            onChange={(e) => setTimeSpent(Number(e.target.value))}
            required
            className={`${inputClass} max-w-[160px]`}
          />
        </Field>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Optional
        </h2>

        <Field label="What I learned today">
          <textarea
            value={learnings}
            onChange={(e) => setLearnings(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </Field>

        <Field label="Challenges / blockers">
          <textarea
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </Field>

        <Field label="Mood / energy">
          <MoodPicker value={mood} onChange={setMood} />
        </Field>

        <Field label="Screenshot / demo image">
          <div className="space-y-2">
            {screenshotUrl && (
              <div className="relative w-full max-w-md overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700">
                <Image
                  src={screenshotUrl}
                  alt="Screenshot preview"
                  width={1200}
                  height={800}
                  sizes="(max-width: 768px) 100vw, 28rem"
                  className="h-auto w-full"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 dark:file:bg-white dark:file:text-zinc-900"
            />
            {uploading && (
              <div className="text-xs text-zinc-500">Uploading…</div>
            )}
            {screenshotUrl && (
              <button
                type="button"
                onClick={() => setScreenshotUrl(null)}
                className="text-xs text-red-500 hover:underline"
              >
                Remove screenshot
              </button>
            )}
          </div>
        </Field>
      </section>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending || uploading}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : existing
              ? "Update entry"
              : "Save entry"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
