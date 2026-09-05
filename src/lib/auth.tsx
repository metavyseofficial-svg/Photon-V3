import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  friend_code: string;
};

type AuthCtx = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  signOut: () => Promise<void>;
  refreshProfile: (displayName?: string, username?: string) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (displayName?: string, username?: string) => {
    const { data, error } = await supabase.rpc("ensure_my_profile", {
      ...(displayName ? { _display_name: displayName } : {}),
      ...(username ? { _username: username } : {}),
    });
    if (error) {
      console.error("profile error", error.message);
      return;
    }
    const row = (Array.isArray(data) ? data[0] : data) as Profile | null;
    setProfile(row ?? null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setProfile(null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const name =
      (session.user.user_metadata?.["full_name"] as string | undefined) ??
      (session.user.user_metadata?.["name"] as string | undefined) ??
      session.user.email?.split("@")[0];
    const username = session.user.user_metadata?.["username"] as string | undefined;
    void refreshProfile(name, username);
  }, [session, refreshProfile]);

  const value = useMemo<AuthCtx>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
      refreshProfile,
    }),
    [loading, session, profile, refreshProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
