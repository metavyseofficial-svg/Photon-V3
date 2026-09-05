import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const usernameLoginSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/),
  password: z.string().min(1),
});

function createPublishableFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

export const signInWithUsername = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => usernameLoginSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();

    if (profileError || !profile) throw new Error("Invalid username or password");

    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(
      profile.id,
    );
    const email = authUser.user?.email;
    if (authUserError || !email) throw new Error("Invalid username or password");

    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Authentication is temporarily unavailable");

    const authClient = createClient<Database>(url, key, {
      global: { fetch: createPublishableFetch(key) },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: signedIn, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (signInError || !signedIn.session) throw new Error("Invalid username or password");
    return { session: signedIn.session };
  });