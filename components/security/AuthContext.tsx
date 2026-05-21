"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  color?: string | null;
  club_data?: unknown;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => ({ error: null }),
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Ref tracks last fetched user ID — prevents double-fetch when Supabase
  // fires both INITIAL_SESSION and SIGNED_IN for the same user on mount.
  const lastFetchedUserIdRef = React.useRef<string | null>(null);

  // Fetch additional profile data from the profiles table
  const fetchProfile = async (userId: string) => {
    console.count("profile fetch");
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // If error is code PGRST116 (no rows found), we might need to wait for trigger or retry
        console.error("Error fetching user profile:", error.message);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setProfile(null);
    }
  };

  const refreshProfile = React.useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user]);

  const signOut = React.useCallback(async () => {
    setLoading(true);
    let errorObj = null;
    try {
      const { error } = await supabase.auth.signOut();
      errorObj = error;
    } catch (err) {
      console.error("SignOut threw exception:", err);
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
    return { error: errorObj };
  }, []);

  useEffect(() => {
    // Supabase fires INITIAL_SESSION immediately on mount, then may also fire
    // SIGNED_IN for the same user. The ref guard ensures fetchProfile runs
    // only once per unique user ID regardless of how many events fire.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const currentUser = session?.user ?? null;
          setUser(currentUser);

          if (currentUser) {
            if (currentUser.id !== lastFetchedUserIdRef.current) {
              lastFetchedUserIdRef.current = currentUser.id;
              await fetchProfile(currentUser.id);
            }
          } else {
            lastFetchedUserIdRef.current = null;
            setProfile(null);
          }
        } catch (err) {
          console.error("Error in onAuthStateChange:", err);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const contextValue = React.useMemo(() => ({
    user,
    profile,
    loading,
    signOut,
    refreshProfile
  }), [user, profile, loading, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
