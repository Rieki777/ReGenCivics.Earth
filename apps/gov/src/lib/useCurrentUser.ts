"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { fetchFromMainSite } from "./api";

interface CurrentUser {
  id: number;
  name?: string | null;
  handle?: string | null;
  role?: "user" | "admin" | "superadmin" | null;
}

export function useCurrentUser() {
  const { ready, authenticated, getAccessToken } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setUser(null);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const token = await getAccessToken();
        const u = await fetchFromMainSite<CurrentUser>("auth.me", {}, token ?? undefined);
        setUser(u ?? null);
      } catch (err) {
        console.error("Failed to fetch current user:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, authenticated, getAccessToken]);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  return { user, isAdmin, loading };
}
