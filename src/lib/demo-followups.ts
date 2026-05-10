"use client";

import * as React from "react";

import type { FollowUp } from "@/lib/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const storageKey = (leadId: string) => `crm-demo-followups-v1:${leadId}`;

type FollowUpRow = {
  id: string;
  lead_id: string;
  follow_up_at: string;
  method: string;
  content: string;
  feedback: string | null;
  next_action: string | null;
  next_follow_up_at: string | null;
  operator_id: string;
  level_change_from: string | null;
  level_change_to: string | null;
  status_change_from: string | null;
  status_change_to: string | null;
  created_at: string;
};

function rowToFollowUp(r: FollowUpRow): FollowUp {
  return {
    id: r.id,
    leadId: r.lead_id,
    followUpAt: r.follow_up_at,
    method: r.method as FollowUp["method"],
    content: r.content,
    feedback: r.feedback ?? undefined,
    nextAction: r.next_action ?? undefined,
    nextFollowUpAt: r.next_follow_up_at ?? undefined,
    operatorId: r.operator_id,
    levelChangeFrom: r.level_change_from as FollowUp["levelChangeFrom"],
    levelChangeTo: r.level_change_to as FollowUp["levelChangeTo"],
    statusChangeFrom: r.status_change_from as FollowUp["statusChangeFrom"],
    statusChangeTo: r.status_change_to as FollowUp["statusChangeTo"],
    createdAt: r.created_at,
  };
}

function followUpToRow(f: FollowUp): Partial<FollowUpRow> {
  return {
    id: f.id,
    lead_id: f.leadId,
    follow_up_at: f.followUpAt,
    method: f.method,
    content: f.content,
    feedback: f.feedback ?? null,
    next_action: f.nextAction ?? null,
    next_follow_up_at: f.nextFollowUpAt ?? null,
    operator_id: f.operatorId,
    level_change_from: f.levelChangeFrom ?? null,
    level_change_to: f.levelChangeTo ?? null,
    status_change_from: f.statusChangeFrom ?? null,
    status_change_to: f.statusChangeTo ?? null,
    created_at: f.createdAt,
  };
}

function loadFromStorage(leadId: string, fallback: FollowUp[]) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(leadId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    return parsed as FollowUp[];
  } catch {
    return fallback;
  }
}

function saveToStorage(leadId: string, items: FollowUp[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(leadId), JSON.stringify(items));
}

export function useDemoFollowUps(leadId: string, fallback: FollowUp[]) {
  const supabaseEnabled = isSupabaseConfigured();
  const [followUps, setFollowUps] = React.useState<FollowUp[]>(() => (supabaseEnabled ? [] : loadFromStorage(leadId, fallback)));

  React.useEffect(() => {
    if (supabaseEnabled) return;
    saveToStorage(leadId, followUps);
  }, [followUps, leadId, supabaseEnabled]);

  React.useEffect(() => {
    if (!supabaseEnabled) return;
    const supabase = getSupabaseClient();
    let canceled = false;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: rows } = await supabase.from("followups").select("*").eq("lead_id", leadId).order("follow_up_at", { ascending: false });
      if (canceled) return;
      setFollowUps(((rows ?? []) as FollowUpRow[]).map(rowToFollowUp));
    };
    load();
    const channel = supabase
      .channel(`followups-${leadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "followups", filter: `lead_id=eq.${leadId}` }, () => {
        load();
      })
      .subscribe();
    return () => {
      canceled = true;
      void supabase.removeChannel(channel);
    };
  }, [leadId, supabaseEnabled]);

  const createFollowUp = React.useCallback(
    async (created: FollowUp) => {
      setFollowUps((prev) => [created, ...prev]);
      if (!supabaseEnabled) return;
      const supabase = getSupabaseClient();
      await supabase.from("followups").insert(followUpToRow(created));
    },
    [supabaseEnabled],
  );

  return { followUps, createFollowUp };
}
