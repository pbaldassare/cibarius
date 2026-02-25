import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await adminClient.from("profiles").select("role").eq("id", caller.id).single();
    if (profile?.role !== "admin") throw new Error("Forbidden");

    const { email, password, full_name, role } = await req.json();
    if (!email || !password) throw new Error("email and password required");

    const validRoles = ["user", "restaurant_owner", "admin", "professional", "supplier"];
    const userRole = validRoles.includes(role) ? role : "user";

    // Create auth user with email confirmed
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "", email },
    });
    if (createError) throw createError;

    // Update role if not default
    if (userRole !== "user" && newUser.user) {
      await adminClient.from("profiles").update({ role: userRole }).eq("id", newUser.user.id);
    }

    // Update full_name if provided
    if (full_name && newUser.user) {
      await adminClient.from("profiles").update({ full_name }).eq("id", newUser.user.id);
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
