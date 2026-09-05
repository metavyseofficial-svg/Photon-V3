import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/study/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Photon" },
      { name: "description", content: "Choose a new password for your Photon account." },
      { property: "og:title", content: "Reset password — Photon" },
      { property: "og:description", content: "Choose a new password for your Photon account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReady(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    void navigate({ to: "/friends" });
  };

  return (
    <AppShell>
      <div className="animate-rise mx-auto max-w-md">
        <Card className="p-7">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Set a new password</h1>
          {ready ? (
            <form className="mt-6 space-y-3" onSubmit={submit}>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                className="w-full rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
              <input
                type="password"
                required
                minLength={6}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Repeat new password"
                className="w-full rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Please wait…" : "Update password"}
              </button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">This password link is no longer valid. Request a new one from sign in.</p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}