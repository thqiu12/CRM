"use client";

import * as React from "react";

import type { CRMTask } from "@/lib/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const STORAGE_KEY = "crm-demo-tasks-v1";

type TaskRow = {
  id: string;
  lead_id: string | null;
  assignee_id: string;
  type: string;
  title: string;
  status: string;
  due_at: string | null;
  done_at: string | null;
  created_at: string;
};

function isTask(value: unknown): value is CRMTask {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string") return false;
  if (typeof v.assigneeId !== "string") return false;
  if (typeof v.type !== "string") return false;
  if (typeof v.title !== "string") return false;
  if (typeof v.status !== "string") return false;
  if (typeof v.createdAt !== "string") return false;
  return true;
}

function loadFromStorage(fallback: CRMTask[]) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    if (!parsed.every(isTask)) return fallback;
    return parsed as CRMTask[];
  } catch {
    return fallback;
  }
}

function saveToStorage(tasks: CRMTask[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function rowToTask(r: TaskRow): CRMTask {
  return {
    id: r.id,
    leadId: r.lead_id ?? undefined,
    assigneeId: r.assignee_id,
    type: r.type as CRMTask["type"],
    title: r.title,
    status: r.status as CRMTask["status"],
    dueAt: r.due_at ?? undefined,
    doneAt: r.done_at ?? undefined,
    createdAt: r.created_at,
  };
}

function taskToRow(t: CRMTask): Partial<TaskRow> {
  return {
    id: t.id,
    lead_id: t.leadId ?? null,
    assignee_id: t.assigneeId,
    type: t.type,
    title: t.title,
    status: t.status,
    due_at: t.dueAt ?? null,
    done_at: t.doneAt ?? null,
    created_at: t.createdAt,
  };
}

export function useDemoTasks(fallback: CRMTask[]) {
  const supabaseEnabled = isSupabaseConfigured();
  const [tasks, setTasks] = React.useState<CRMTask[]>(() => (supabaseEnabled ? [] : loadFromStorage(fallback)));

  React.useEffect(() => {
    if (supabaseEnabled) return;
    saveToStorage(tasks);
  }, [supabaseEnabled, tasks]);

  React.useEffect(() => {
    if (!supabaseEnabled) return;
    const supabase = getSupabaseClient();
    let canceled = false;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: rows } = await supabase.from("crm_tasks").select("*").order("created_at", { ascending: false });
      if (canceled) return;
      setTasks(((rows ?? []) as TaskRow[]).map(rowToTask));
    };
    load();
    const channel = supabase
      .channel("tasks-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_tasks" }, () => {
        load();
      })
      .subscribe();
    return () => {
      canceled = true;
      void supabase.removeChannel(channel);
    };
  }, [supabaseEnabled]);

  const upsertTask = React.useCallback(
    (nextTask: CRMTask) => {
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === nextTask.id);
        if (idx === -1) return [nextTask, ...prev];
        const copy = prev.slice();
        copy[idx] = nextTask;
        return copy;
      });
      if (!supabaseEnabled) return;
      const supabase = getSupabaseClient();
      void supabase.from("crm_tasks").upsert(taskToRow(nextTask), { onConflict: "id" });
    },
    [supabaseEnabled],
  );

  const markDone = React.useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "已完成", doneAt: now } : t)),
      );
      if (!supabaseEnabled) return;
      const supabase = getSupabaseClient();
      void supabase.from("crm_tasks").update({ status: "已完成", done_at: now }).eq("id", id);
    },
    [supabaseEnabled],
  );

  return { tasks, upsertTask, markDone };
}

