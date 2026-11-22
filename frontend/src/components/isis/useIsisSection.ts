"use client";

import { useState } from "react";
import type { IsisProblem } from "@/lib/api/isis-save-ops";
import type { ApiError } from "@/lib/types/api";
import { useIsisProblemText } from "./useIsisProblemText";

/**
 * Edit state of one Edit/Save section. ``form`` is null while not editing;
 * the open handler copies the loaded config in, so no effect mirrors props.
 */
export function useIsisSection<F>(failedText: string) {
  const problemText = useIsisProblemText();
  const [form, setForm] = useState<F | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    form,
    editing: form !== null,
    saving,
    error,
    update: (patch: Partial<F>) => setForm((prev) => (prev === null ? prev : { ...prev, ...patch })),
    start: (loaded: F) => {
      setForm(loaded);
      setError(null);
    },
    cancel: () => {
      setForm(null);
      setError(null);
    },
    /** Shows a save check, or commits and leaves edit mode; a rejected commit stays open. */
    save: async (problem: IsisProblem | null, commit: () => Promise<unknown>) => {
      if (problem) {
        setError(problemText(problem));
        return;
      }
      try {
        setSaving(true);
        setError(null);
        await commit();
        setForm(null);
      } catch (err) {
        setError((err as ApiError).message || failedText);
      } finally {
        setSaving(false);
      }
    },
  };
}
