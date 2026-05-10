"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import type { CRMUser, Role } from "@/lib/types";
import { users } from "@/lib/mock-data";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type DemoAccessState = {
  userId: string;
};

type DemoAccessContextValue = {
  mode: "demo" | "supabase";
  state: DemoAccessState;
  user: CRMUser;
  setUserId: (userId: string) => void;
  setRole: (role: Role) => void;
  signOut?: () => Promise<void>;
};

const DemoAccessContext = React.createContext<DemoAccessContextValue | null>(null);

const STORAGE_KEY = "crm-demo-access-v1";

function pickDefaultUserId() {
  const preferred = users.find((u) => u.role === "销售顾问");
  return preferred?.id ?? users[0]?.id ?? "u-admin";
}

function resolveUser(userId: string) {
  return users.find((u) => u.id === userId) ?? users[0]!;
}

export function DemoProviders({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabaseEnabled = isSupabaseConfigured();

  const [state, setState] = React.useState<DemoAccessState>(() => {
    if (supabaseEnabled) return { userId: "supabase" };
    if (typeof window === "undefined") return { userId: pickDefaultUserId() };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { userId: pickDefaultUserId() };
      const parsed = JSON.parse(raw) as Partial<DemoAccessState>;
      if (parsed.userId) return { userId: parsed.userId };
      return { userId: pickDefaultUserId() };
    } catch {
      return { userId: pickDefaultUserId() };
    }
  });

  React.useEffect(() => {
    if (supabaseEnabled) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, supabaseEnabled]);

  const [supabaseUser, setSupabaseUser] = React.useState<CRMUser | null>(null);
  const [supabaseReady, setSupabaseReady] = React.useState(false);

  React.useEffect(() => {
    if (!supabaseEnabled) return;
    const supabase = getSupabaseClient();
    let canceled = false;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (canceled) return;
      const session = data.session;
      if (!session) {
        setSupabaseUser(null);
        setSupabaseReady(true);
        return;
      }

      const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (canceled) return;
      if (!profile || error) {
        const name = session.user.user_metadata?.name ?? session.user.email?.split("@")[0] ?? "用户";
        const upserted = {
          id: session.user.id,
          name,
          role: "销售顾问",
          campus_id: "campus-tokyo",
          channel_ids: [],
          active: true,
        };
        await supabase.from("profiles").upsert(upserted);
        const { data: p2 } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
        if (canceled) return;
        if (p2) {
          setSupabaseUser({
            id: p2.id,
            name: p2.name,
            role: p2.role,
            campusId: p2.campus_id,
            active: p2.active,
            channelIds: p2.channel_ids ?? undefined,
          } as CRMUser);
        }
        setSupabaseReady(true);
        return;
      }

      setSupabaseUser({
        id: profile.id,
        name: profile.name,
        role: profile.role,
        campusId: profile.campus_id,
        active: profile.active,
        channelIds: profile.channel_ids ?? undefined,
      } as CRMUser);
      setSupabaseReady(true);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      canceled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabaseEnabled]);

  React.useEffect(() => {
    if (!supabaseEnabled) return;
    if (!supabaseReady) return;
    if (pathname === "/login") {
      if (supabaseUser) router.replace("/dashboard");
      return;
    }
    if (!supabaseUser) router.replace("/login");
  }, [pathname, router, supabaseEnabled, supabaseReady, supabaseUser]);

  const user = React.useMemo(() => (supabaseEnabled ? supabaseUser : resolveUser(state.userId)), [state.userId, supabaseEnabled, supabaseUser]);

  const setUserId = React.useCallback((userId: string) => {
    if (supabaseEnabled) return;
    setState((s) => ({ ...s, userId }));
  }, [supabaseEnabled]);

  const setRole = React.useCallback(
    (role: Role) => {
      if (supabaseEnabled) return;
      const match = users.find((u) => u.role === role && u.active);
      setUserId(match?.id ?? pickDefaultUserId());
    },
    [setUserId, supabaseEnabled],
  );

  const signOut = React.useCallback(async () => {
    if (!supabaseEnabled) return;
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setSupabaseUser(null);
  }, [supabaseEnabled]);

  const value = React.useMemo<DemoAccessContextValue>(
    () => ({ mode: supabaseEnabled ? "supabase" : "demo", state, user: user ?? resolveUser(pickDefaultUserId()), setUserId, setRole, signOut }),
    [setRole, setUserId, signOut, state, supabaseEnabled, user],
  );

  return <DemoAccessContext.Provider value={value}>{children}</DemoAccessContext.Provider>;
}

export function useDemoAccess() {
  const ctx = React.useContext(DemoAccessContext);
  if (!ctx) throw new Error("useDemoAccess must be used within DemoProviders");
  return ctx;
}
