import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const invoke = async (fnName: string, body: any, token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
};

Deno.test("validate-coupon: handles invalid coupon code", async () => {
  const { data } = await invoke("validate-coupon", { coupon_code: "NONEXISTENT_CODE_XYZ" });
  // After deployment, should return valid=false
  assertEquals(data.valid, false);
});

Deno.test("validate-coupon: rejects empty coupon code", async () => {
  const { status, data } = await invoke("validate-coupon", {});
  assertEquals(status, 400);
  assertEquals(data.valid, false);
});

Deno.test("process-coupon-payment: rejects missing auth", async () => {
  const { status, data } = await invoke("process-coupon-payment", { original_amount: 9.99 });
  assertEquals(status, 400);
  assertEquals(typeof data.error, "string");
});

Deno.test("process-coupon-payment: rejects invalid amount", async () => {
  const { status, data } = await invoke("process-coupon-payment", { original_amount: -5 });
  assertEquals(status, 400);
  assertEquals(typeof data.error, "string");
});
