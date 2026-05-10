"use client";

import * as React from "react";

import type { Lead } from "@/lib/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const STORAGE_KEY = "crm-demo-leads-v1";

type LeadRow = {
  id: string;
  student_name: string;
  wechat: string | null;
  phone: string | null;
  email: string | null;
  location_country: string;
  location_city: string | null;
  current_school: string | null;
  current_grade: string | null;
  target_track: string;
  target_year: number | null;
  target_school: string | null;
  target_major: string | null;
  japanese_level: string | null;
  english_level: string | null;
  eju_score: string | null;
  toefl_toeic_score: string | null;
  budget: number | null;
  channel_id: string;
  campus_id: string;
  owner_id: string | null;
  customer_level: string;
  status: string;
  tag_ids: string[] | null;
  notes: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
};

function isLead(value: unknown): value is Lead {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string") return false;
  if (typeof v.studentName !== "string") return false;
  if (typeof v.status !== "string") return false;
  if (typeof v.customerLevel !== "string") return false;
  if (typeof v.channelId !== "string") return false;
  if (typeof v.campusId !== "string") return false;
  if (typeof v.ownerId !== "string") return false;
  if (typeof v.targetTrack !== "string") return false;
  if (typeof v.locationCountry !== "string") return false;
  if (!Array.isArray(v.tagIds) || v.tagIds.some((x) => typeof x !== "string")) return false;
  if (typeof v.createdAt !== "string") return false;
  if (typeof v.updatedAt !== "string") return false;
  return true;
}

export function normalizeWechat(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

export function loadLeadsFromStorage(fallback: Lead[]) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    if (!parsed.every(isLead)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function saveLeadsToStorage(leads: Lead[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

function rowToLead(r: LeadRow): Lead {
  return {
    id: r.id,
    studentName: r.student_name,
    wechat: r.wechat ?? undefined,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    locationCountry: r.location_country as Lead["locationCountry"],
    locationCity: r.location_city ?? undefined,
    currentSchool: r.current_school ?? undefined,
    currentGrade: r.current_grade ?? undefined,
    targetTrack: r.target_track as Lead["targetTrack"],
    targetYear: r.target_year ?? undefined,
    targetSchool: r.target_school ?? undefined,
    targetMajor: r.target_major ?? undefined,
    japaneseLevel: r.japanese_level ?? undefined,
    englishLevel: r.english_level ?? undefined,
    ejuScore: r.eju_score ?? undefined,
    toeflToeicScore: r.toefl_toeic_score ?? undefined,
    budget: r.budget ?? undefined,
    channelId: r.channel_id,
    campusId: r.campus_id,
    ownerId: r.owner_id ?? "",
    customerLevel: r.customer_level as Lead["customerLevel"],
    status: r.status as Lead["status"],
    tagIds: r.tag_ids ?? [],
    notes: r.notes ?? undefined,
    nextFollowUpAt: r.next_follow_up_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function leadToRow(l: Lead): Partial<LeadRow> {
  return {
    id: l.id,
    student_name: l.studentName,
    wechat: l.wechat ?? null,
    phone: l.phone ?? null,
    email: l.email ?? null,
    location_country: l.locationCountry,
    location_city: l.locationCity ?? null,
    current_school: l.currentSchool ?? null,
    current_grade: l.currentGrade ?? null,
    target_track: l.targetTrack,
    target_year: l.targetYear ?? null,
    target_school: l.targetSchool ?? null,
    target_major: l.targetMajor ?? null,
    japanese_level: l.japaneseLevel ?? null,
    english_level: l.englishLevel ?? null,
    eju_score: l.ejuScore ?? null,
    toefl_toeic_score: l.toeflToeicScore ?? null,
    budget: l.budget ?? null,
    channel_id: l.channelId,
    campus_id: l.campusId,
    owner_id: l.ownerId || null,
    customer_level: l.customerLevel,
    status: l.status,
    tag_ids: l.tagIds,
    notes: l.notes ?? null,
    next_follow_up_at: l.nextFollowUpAt ?? null,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  };
}

export function useDemoLeads(fallback: Lead[]) {
  const supabaseEnabled = isSupabaseConfigured();
  const [leads, setLeads] = React.useState<Lead[]>(() => (supabaseEnabled ? [] : loadLeadsFromStorage(fallback)));

  React.useEffect(() => {
    if (supabaseEnabled) return;
    saveLeadsToStorage(leads);
  }, [leads, supabaseEnabled]);

  React.useEffect(() => {
    if (!supabaseEnabled) return;
    const supabase = getSupabaseClient();
    let canceled = false;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: rows } = await supabase.from("leads").select("*").order("updated_at", { ascending: false });
      if (canceled) return;
      setLeads(((rows ?? []) as LeadRow[]).map(rowToLead));
    };
    load();
    const channel = supabase
      .channel("leads-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        load();
      })
      .subscribe();
    return () => {
      canceled = true;
      void supabase.removeChannel(channel);
    };
  }, [supabaseEnabled]);

  const replaceLeads = React.useCallback((next: Lead[]) => {
    setLeads(next);
    if (!supabaseEnabled) return;
    const supabase = getSupabaseClient();
    void supabase.from("leads").upsert(next.map((l) => leadToRow(l)), { onConflict: "id" });
  }, [supabaseEnabled]);

  const upsertLead = React.useCallback((nextLead: Lead) => {
    setLeads((prev) => {
      const idx = prev.findIndex((l) => l.id === nextLead.id);
      if (idx === -1) return [nextLead, ...prev];
      const copy = prev.slice();
      copy[idx] = nextLead;
      return copy;
    });
    if (!supabaseEnabled) return;
    const supabase = getSupabaseClient();
    void supabase.from("leads").upsert(leadToRow(nextLead), { onConflict: "id" });
  }, [supabaseEnabled]);

  const findByWechat = React.useCallback(
    (wechat?: string) => {
      const key = normalizeWechat(wechat);
      if (!key) return null;
      for (const l of leads) {
        if (normalizeWechat(l.wechat) === key) return l;
      }
      return null;
    },
    [leads],
  );

  return { leads, replaceLeads, upsertLead, findByWechat };
}
