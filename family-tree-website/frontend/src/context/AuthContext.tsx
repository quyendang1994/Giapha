import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';

interface User {
  id: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
  role: 'admin' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: (overrides?: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  signInWithGoogle: async () => {},
  signInWithFacebook: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const mapSupabaseUserToUser = (supabaseUser: any): User => {
    // Fallback from OAuth provider metadata.
    // If a profile exists in Supabase, enrichUserFromProfiles() will override these values.
    const metadata = supabaseUser.user_metadata || supabaseUser.raw_user_meta_data || {};
    const email = supabaseUser.email || '';
    const isAdmin = email === import.meta.env.VITE_ADMIN_EMAIL;

    return {
      id: supabaseUser.id,
      displayName:
        metadata.full_name ||
        metadata.name ||
        email.split('@')[0] ||
        'User',
      email,
      photoUrl: metadata.avatar_url || null,
      role: isAdmin ? 'admin' : 'viewer',
    };
  };

  const enrichUserFromProfiles = async (baseUser: User): Promise<User> => {
    try {
      const { data: profileById, error: profileByIdError } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .eq('id', baseUser.id)
        .maybeSingle();

      if (profileByIdError) {
        console.warn('[profiles] read by id failed:', profileByIdError);
      }

      // Schema hiện tại không có cột `email`, nên chỉ đọc theo `id`.
      const profile = profileById;

      if (!profile) {
        return baseUser;
      }

      const hasAvatarField = Object.prototype.hasOwnProperty.call(profile, 'avatar_url');
      const resolvedPhotoUrl = hasAvatarField
        ? (profile.avatar_url as string | null)
        : baseUser.photoUrl;

      return {
        ...baseUser,
        // NOTE: current DB schema does not have `display_name`, so we keep OAuth displayName.
        // IMPORTANT: do not use `||` here, otherwise empty/null DB value
        // gets replaced by Google/OAuth avatar unexpectedly.
        photoUrl: resolvedPhotoUrl,
        role: baseUser.role,
      };
    } catch {
      return baseUser;
    }
  };

  const setBaseUserFromSessionUser = (sessionUser: any | null) => {
    if (!sessionUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    const base = mapSupabaseUserToUser(sessionUser);

    // Set immediately so the header shows user info right after login.
    setUser(base);
    setLoading(false);

    // Then enrich from Supabase profiles asynchronously.
    void (async () => {
      const enriched = await enrichUserFromProfiles(base);
      setUser(enriched);
    })();
  };

  const refreshUser = async (overrides: Partial<User> = {}) => {
    // IMPORTANT: Don't rely on the current React `user` state (can be stale/partial).
    // Always refresh from Supabase session, then await re-enrichment from `profiles`.
    // `overrides` makes profile edits reflect immediately even if Supabase/RLS/cache
    // delays the next profile read for a moment.
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      const base = mapSupabaseUserToUser(session.user);
      const enriched = await enrichUserFromProfiles(base);
      setUser({ ...enriched, ...overrides });
      setLoading(false);
    } catch {
      if (Object.keys(overrides).length > 0) {
        setUser((current) => current ? { ...current, ...overrides } : current);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const setBaseUserFromSessionUserSafe = (sessionUser: any | null) => {
      if (cancelled) return;
      setBaseUserFromSessionUser(sessionUser);
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setBaseUserFromSessionUserSafe(session?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Do not await Supabase queries inside onAuthStateChange.
      // Supabase recommends deferring async work to avoid auth callback lockups.
      setTimeout(() => setBaseUserFromSessionUserSafe(session?.user ?? null), 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const signInWithFacebook = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'facebook',
      options: { redirectTo: window.location.origin }
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithFacebook, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);