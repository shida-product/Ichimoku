import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { IS_PREVIEW } from "@/lib/preview";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInMock?: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(
    IS_PREVIEW ? ({ email: "preview@example.com", id: "preview-user" } as User) : null
  );
  const [session, setSession] = useState<Session | null>(
    IS_PREVIEW
      ? ({ user: { email: "preview@example.com", id: "preview-user" } } as unknown as Session)
      : null
  );
  const [loading, setLoading] = useState(!IS_PREVIEW);

  useEffect(() => {
    if (IS_PREVIEW) return;

    // 現在のセッションを非同期に取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 認証状態の変更をリッスン
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    if (IS_PREVIEW) {
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  const signInMock = (email: string) => {
    if (!IS_PREVIEW) return;
    setUser({ email, id: "preview-user" } as User);
    setSession({ user: { email, id: "preview-user" } } as unknown as Session);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, signInMock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
