import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      const k = l.slice(0, i).trim();
      const v = l.slice(i + 1).trim().replace(/^"|"$/g, "");
      return [k, v];
    }),
);

const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!url || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function tryRpc(token) {
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.rpc("seed_francesca_biazzi");
  return { data, error };
}

async function countInventory(token) {
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { count, error } = await client
    .from("inventory_items")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", "718a977f-1742-40bc-9960-c61a876e1d93");
  return { count, error };
}

async function main() {
  let token = anonKey;

  if (adminEmail && adminPassword) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    if (error) {
      console.error("Admin login failed:", error.message);
      process.exit(1);
    }
    token = data.session.access_token;
    console.log("Logged in as", adminEmail);
  } else {
    console.log("No SEED_ADMIN_EMAIL/PASSWORD — trying RPC with anon (likely fails without migration)");
  }

  const rpc = await tryRpc(token);
  if (rpc.error) {
    console.error("RPC error:", rpc.error.message);
    if (!adminEmail) {
      console.error("\nSet env vars and retry:");
      console.error("  $env:SEED_ADMIN_EMAIL='admin@cibarius.it'");
      console.error("  $env:SEED_ADMIN_PASSWORD='your-password'");
      console.error("  node scripts/run-seed-francesca.mjs");
    }
    process.exit(1);
  }

  console.log("Seed OK:", rpc.data);
  const inv = await countInventory(token);
  if (inv.error) console.error("Inventory check:", inv.error.message);
  else console.log("Francesca inventory items:", inv.count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
