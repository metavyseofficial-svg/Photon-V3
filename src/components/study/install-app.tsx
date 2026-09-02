import { useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";
import { Card } from "@/components/study/app-shell";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Install-as-app panel: native prompt where supported, manual steps elsewhere. */
export function InstallApp() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <Card className="lift-hover">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Install as app
      </p>

      {installed ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Smartphone className="h-4 w-4 text-success" /> Running as an installed app. You're all
          set.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Add Photon to your home screen for a full-screen, app-like experience with its
            own icon.
          </p>

          {promptEvent ? (
            <button
              type="button"
              onClick={async () => {
                await promptEvent.prompt();
                const choice = await promptEvent.userChoice;
                if (choice.outcome === "accepted") setInstalled(true);
                setPromptEvent(null);
              }}
              className="press mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Download className="h-4 w-4" /> Install app
            </button>
          ) : (
            <div className="glass-inset mt-4 space-y-2 rounded-2xl p-4 text-sm text-muted-foreground">
              {ios ? (
                <p className="flex items-start gap-2">
                  <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  In Safari, tap Share, then <strong className="text-foreground">
                    Add to Home Screen
                  </strong>
                  .
                </p>
              ) : (
                <p className="flex items-start gap-2">
                  <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Open your browser menu and choose{" "}
                  <strong className="text-foreground">Install app</strong> or{" "}
                  <strong className="text-foreground">Add to Home screen</strong>.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
