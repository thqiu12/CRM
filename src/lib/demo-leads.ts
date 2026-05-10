"use client";

import * as React from "react";

import type { Lead } from "@/lib/types";

const STORAGE_KEY = "crm-demo-leads-v1";

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

export function useDemoLeads(fallback: Lead[]) {
  const [leads, setLeads] = React.useState<Lead[]>(() => loadLeadsFromStorage(fallback));

  React.useEffect(() => {
    saveLeadsToStorage(leads);
  }, [leads]);

  const replaceLeads = React.useCallback((next: Lead[]) => {
    setLeads(next);
  }, []);

  const upsertLead = React.useCallback((nextLead: Lead) => {
    setLeads((prev) => {
      const idx = prev.findIndex((l) => l.id === nextLead.id);
      if (idx === -1) return [nextLead, ...prev];
      const copy = prev.slice();
      copy[idx] = nextLead;
      return copy;
    });
  }, []);

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
