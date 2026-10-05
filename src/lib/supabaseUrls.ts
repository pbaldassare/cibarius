import { supabase } from "@/integrations/supabase/client";

const client = supabase as unknown as {
  supabaseUrl: string;
  supabaseKey: string;
  functionsUrl: string | URL;
  authUrl: string | URL;
};

const senzaBarraFinale = (valore: string | URL): string => String(valore).replace(/\/$/, "");

export const supabaseUrl = (): string => senzaBarraFinale(client.supabaseUrl);

export const functionsUrl = (): string => senzaBarraFinale(client.functionsUrl);

export const authUrl = (): string => senzaBarraFinale(client.authUrl);

export const anonKey = (): string => client.supabaseKey;
