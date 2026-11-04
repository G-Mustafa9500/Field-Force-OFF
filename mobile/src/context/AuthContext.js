// ================================================================
// AUTH CONTEXT — login state hold karta hai
// Token + user info AsyncStorage pe persist hoti hai. Startup pe
// protected endpoint (tracking/active) se token validity verify
// hoti hai — 401 aaya to auto-logout.
//
// FIX: login ke waqt LoginScreen UNMOUNT nahi hota (pehle loading
// state se pura screen blank ho jata tha aur fields reset ho jati
// theen). Ab sirf startup pe "booting" splash dikhta hai.
// ================================================================
import React, {
  createContext, useContext, useEffect, useState, useCallback
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, initAuth, setToken, initServerUrl } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true); // sirf app start pe
  const [needsSetup, setNeedsSetup] = useState(false);

  // ── Startup: saved token + user restore, phir backend se verify ──
  useEffect(() => {
    (async () => {
      await initServerUrl(); // server URL override load karo
      const token = await initAuth();
      if (!token) {
        // Fresh install — check karo admin account bana hua hai ya nahi
        try {
          const r = await api.needsSetup();
          if (r.ok) setNeedsSetup(!!r.data?.needsSetup);
        } catch { /* offline — login dikhao */ }
        setBooting(false);
        return;
      }
      try {
        const savedUser = await AsyncStorage.getItem("ff_user");
        if (savedUser) setUser(JSON.parse(savedUser));
      } catch { /* corrupt user data — ignore */ }

      // Token validity check — koi bhi protected endpoint chalega
      try {
        const res = await api.activeTracking();
        if (res.status === 401) {
          await setToken(null);
          await AsyncStorage.removeItem("ff_user");
          setUser(null);
        }
      } catch {
        // Network fail — token rakho, user offline login dikhega
      }
      setBooting(false);
    })();
  }, []);

  const actionLogin = useCallback(async (email, password) => {
    try {
      const res = await api.login(email, password);
      if (!res.ok) return res.data?.message || "Login fail hua";
      await setToken(res.data.token);
      await AsyncStorage.setItem("ff_user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      return null;
    } catch (err) {
      // Fetch network error — server unreachable
      return "Server se connection nahi — Advanced mein server URL check karo";
    }
  }, []);

  const actionLogout = useCallback(async () => {
    await setToken(null);
    await AsyncStorage.removeItem("ff_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, booting, needsSetup, actionLogin, actionLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
