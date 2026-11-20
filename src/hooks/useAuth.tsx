import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const welcomeSent = useRef(new Set<string>());
  const welcomeUser = session?.user.user_metadata.welcome_email_requested === "v1" && session.user.email_confirmed_at
    ? session.user.id : undefined;

  useEffect(() => {
    // Set up listener BEFORE getSession (best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!welcomeUser || welcomeSent.current.has(welcomeUser)) return;
    let cancelled = false;
    let timer: number | undefined;
    const sendWelcome = async (attempt: number) => {
      const { error } = await supabase.functions.invoke("send-welcome-email", { body: {} });
      if (!error) welcomeSent.current.add(welcomeUser);
      else if (!cancelled && attempt < 3) timer = window.setTimeout(() => void sendWelcome(attempt + 1), 2500 * attempt);
    };
    void sendWelcome(1);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [welcomeUser]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    window.location.href = "/auth/login";
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
