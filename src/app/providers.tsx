"use client";

import * as React from "react";

import type { CRMUser, Role } from "@/lib/types";
import { users } from "@/lib/mock-data";

export type DemoAccessState = {
  userId: string;
};

type DemoAccessContextValue = {
  state: DemoAccessState;
  user: CRMUser;
  setUserId: (userId: string) => void;
  setRole: (role: Role) => void;
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
  const [state, setState] = React.useState<DemoAccessState>(() => {
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const user = React.useMemo(() => resolveUser(state.userId), [state.userId]);

  const setUserId = React.useCallback((userId: string) => {
    setState((s) => ({ ...s, userId }));
  }, []);

  const setRole = React.useCallback(
    (role: Role) => {
      const match = users.find((u) => u.role === role && u.active);
      setUserId(match?.id ?? pickDefaultUserId());
    },
    [setUserId],
  );

  const value = React.useMemo<DemoAccessContextValue>(
    () => ({ state, user, setUserId, setRole }),
    [state, user, setUserId, setRole],
  );

  return <DemoAccessContext.Provider value={value}>{children}</DemoAccessContext.Provider>;
}

export function useDemoAccess() {
  const ctx = React.useContext(DemoAccessContext);
  if (!ctx) throw new Error("useDemoAccess must be used within DemoProviders");
  return ctx;
}
