import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/study/app-shell";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { signInWithUsername } from "@/lib/auth.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Photon" },
      {
        name: "description",
        content:
          "Sign in to Photon to sync your real study progress and compare it with friends.",
      },
      { property: "og:title", content: "Sign in — Photon" },
      { property: "og:description", content: "Sync your study progress across devices." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const signIn = useServerFn(signInWithUsername);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/friends" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const normalizedUsername = username.trim().toLowerCase();
        if (!/^[a-z0-9_]{3,32}$/.test(normalizedUsername)) {
          throw new Error("Username must be 3–32 characters using letters, numbers, or underscores");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              username: normalizedUsername,
              full_name: name.trim() || normalizedUsername,
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Check your email to confirm your account");
          return;
        }
      } else {
        const result = await signIn({ data: { username, password } });
        const { error } = await supabase.auth.setSession(result.session);
        if (error) throw error;
      }
      void navigate({ to: "/friends" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (!email.trim()) {
      toast.error("Enter your email address first");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the reset email");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/friends" });
  };

  return (
    <AppShell>
      <div className="animate-rise mx-auto max-w-md">
        <Card className="p-7">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in so your real progress can sync and friends can follow it.
          </p>

          {sent ? (
            <p className="mt-6 rounded-2xl border border-border bg-surface/60 p-4 text-sm">
              We sent a confirmation link to <span className="font-semibold">{email}</span>. Open it
              to finish signing up.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void google()}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>

              <form className="space-y-3" onSubmit={submit}>
                {mode === "signup" ? (
                  <>
                    <input
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="Username"
                      pattern="[a-z0-9_]{3,32}"
                      className="w-full rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Display name (optional)"
                      className="w-full rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    />
                  </>
                ) : null}
                {mode === "signin" ? (
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="Username"
                    autoComplete="username"
                    className="w-full rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                ) : (
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    className="w-full rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                )}
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              {mode === "signin" ? (
                <div className="mt-4 space-y-2 text-center">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email for password reset"
                    autoComplete="email"
                    className="w-full rounded-2xl border border-border bg-surface/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                  <button
                    type="button"
                    onClick={() => void sendReset()}
                    disabled={busy}
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Forgot password? Send a reset link
                  </button>
                  {resetSent ? (
                    <p className="mt-1 text-xs text-muted-foreground">Check your email for a reset link.</p>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                {mode === "signin"
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </button>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
