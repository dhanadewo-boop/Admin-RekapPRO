import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(undefined); // undefined = loading, null = not logged in

    // On mount: check if already logged in (session persistence)
    useEffect(() => {
        let cancelled = false;

        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (cancelled) return;

                if (session?.user) {
                    const profile = await loadProfile(session.user.id, session.user.email);
                    if (!cancelled) setUser(profile);
                } else {
                    if (!cancelled) setUser(null);
                }
            } catch (err) {
                console.error('Session check error:', err);
                if (!cancelled) setUser(null);
            }
        };

        checkSession();

        // Safety timeout: if session check takes >4s, just show login
        const timeout = setTimeout(() => {
            if (!cancelled) setUser(prev => prev === undefined ? null : prev);
        }, 4000);

        return () => { cancelled = true; clearTimeout(timeout); };
    }, []);

    // Login function — called directly by LoginPage
    const loginUser = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const profile = await loadProfile(data.user.id, data.user.email);
        setUser(profile); // This triggers App re-render → shows Dashboard
        return profile;
    };

    // Logout
    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loginUser, logout, loading: user === undefined }}>
            {children}
        </AuthContext.Provider>
    );
}

// Load profile from users table, with robust fallback
async function loadProfile(uid, email) {
    const fallback = {
        uid, id: uid,
        name: email?.split('@')[0] || 'User',
        email: email || '',
        role: 'admin'
    };

    try {
        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', uid)
            .maybeSingle();

        if (data) {
            return { uid, ...data };
        }

        // Profile not found — return fallback (acts as admin)
        return fallback;
    } catch {
        return fallback;
    }
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
