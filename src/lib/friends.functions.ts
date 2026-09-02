import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/) });

export const addFriendByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => codeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, friend_code")
      .eq("friend_code", data.code)
      .maybeSingle();

    if (error) throw new Error("Could not connect right now");
    if (!target) throw new Error("No student found with that code");
    if (target.id === context.userId) throw new Error("That is your own code");

    const { error: insertError } = await supabaseAdmin
      .from("friendships")
      .upsert(
        { user_id: context.userId, friend_id: target.id },
        { onConflict: "user_id,friend_id", ignoreDuplicates: true },
      );
    if (insertError) throw new Error("Could not connect right now");

    return target;
  });
