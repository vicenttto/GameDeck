import { useCallback, useEffect, useRef, useState } from "react";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import GamePage from "./pages/GamePage";
import CalendarPage from "./pages/CalendarPage";
import GamesPage from "./pages/GamesPage";
import AdminPage from "./pages/AdminPage";

export type Page = "home" | "profile" | "user" | "login" | "game" | "calendar" | "games" | "admin";

export type AuthUser = {
  token: string;
  username: string;
  email: string;
  avatarUrl?: string;
  isAdmin?: boolean;
};

type LoginIntent = { rawgGameId: number; openEntry: boolean };

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [page, setPage] = useState<Page>("home");
  const [viewingUsername, setViewingUsername] = useState<string | null>(null);
  const [viewingGameId, setViewingGameId] = useState<number | null>(null);
  const [loginIntent, setLoginIntent] = useState<LoginIntent | null>(null);

  type HistoryEntry = { page: Page; viewingUsername: string | null; viewingGameId: number | null };
  const [navHistory, setNavHistory] = useState<HistoryEntry[]>([]);

  const [user, setUser] = useState<AuthUser | null>(() => {
    const token     = localStorage.getItem("token");
    const username  = localStorage.getItem("username");
    const email     = localStorage.getItem("email");
    const avatarUrl = localStorage.getItem("avatarUrl") ?? undefined;
    const isAdmin   = localStorage.getItem("isAdmin") === "true";
    if (token && username && email) return { token, username, email, avatarUrl, isAdmin };
    return null;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    document.documentElement.classList.add("is-theme-switching");
    setTheme(t => (t === "dark" ? "light" : "dark"));
    setTimeout(() => document.documentElement.classList.remove("is-theme-switching"), 700);
  };

  const navigate = (p: Page) => {
    if (p !== "user") setViewingUsername(null);
    if (p === "login") setLoginIntent(null);
    setPage(p);
  };

  const pushNav = (p: Page, username?: string, gameId?: number) => {
    setNavHistory(h => [...h, { page, viewingUsername, viewingGameId }]);
    setViewingUsername(username ?? null);
    if (gameId !== undefined) setViewingGameId(gameId);
    if (p === "login") setLoginIntent(null);
    setPage(p);
    history.pushState({ spa: true }, "");
  };

  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  const goBack = useCallback(() => {
    const prev = navHistory[navHistory.length - 1];
    if (!prev) { navigate("home"); return; }
    setNavHistory(h => h.slice(0, -1));
    if (prev.page === "profile" || prev.page === "user") {
      setProfileRefreshKey(k => k + 1);
    }
    setPage(prev.page);
    setViewingUsername(prev.viewingUsername);
    setViewingGameId(prev.viewingGameId);
  }, [navHistory]);

  const goBackRef = useRef(goBack);
  useEffect(() => { goBackRef.current = goBack; });

  useEffect(() => { history.replaceState({ spa: true }, ""); }, []);

  useEffect(() => {
    const handler = () => {
      goBackRef.current();
      history.pushState({ spa: true }, "");
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const userNavigate = useCallback((p: Page) => {
    if (p === "home" || p === "login") navigate(p);
    else pushNav(p);
  }, [page, viewingUsername, viewingGameId]);

  const [viewingGamesOrdering, setViewingGamesOrdering] = useState("");

  const viewUser  = (username: string)  => pushNav("user", username);
  const viewGame  = (rawgGameId: number) => pushNav("game", undefined, rawgGameId);
  const viewGames = (ordering?: string) => { window.scrollTo({ top: 0, behavior: "instant" }); setViewingGamesOrdering(ordering ?? ""); pushNav("games"); };

  const requestLogin = (rawgGameId: number, openEntry: boolean) => {
    setLoginIntent({ rawgGameId, openEntry });
    setPage("login");
  };

  const handleLogin = (userData: AuthUser) => {
    localStorage.setItem("token",    userData.token);
    localStorage.setItem("username", userData.username);
    localStorage.setItem("email",    userData.email);
    localStorage.setItem("isAdmin",  String(userData.isAdmin ?? false));
    if (userData.avatarUrl) localStorage.setItem("avatarUrl", userData.avatarUrl);
    setUser(userData);
    if (userData.isAdmin) {
      navigate("admin");
      return;
    }
    if (loginIntent) {
      setViewingGameId(loginIntent.rawgGameId);
      setPage("game");
    } else {
      navigate("home");
    }
  };

  const consumeLoginIntent = useCallback(() => setLoginIntent(null), []);

  const handleLogout = () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("avatarUrl");
    localStorage.removeItem("isAdmin");
    setUser(null);
    navigate("home");
  };

  const handleUserUpdate = (updated: AuthUser) => {
    localStorage.setItem("token",    updated.token);
    localStorage.setItem("username", updated.username);
    localStorage.setItem("email",    updated.email);
    localStorage.setItem("isAdmin",  String(updated.isAdmin ?? false));
    if (updated.avatarUrl) localStorage.setItem("avatarUrl", updated.avatarUrl);
    else localStorage.removeItem("avatarUrl");
    setUser(updated);
  };

  if (user?.isAdmin) {
    return (
      <AdminPage
        user={user}
        theme={theme}
        onLogout={handleLogout}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (page === "calendar") {
    return (
      <CalendarPage
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={userNavigate}
        onGoBack={goBack}
        user={user}
        onLogout={handleLogout}
        onViewGame={viewGame}
      />
    );
  }

  if (page === "games") {
    return (
      <GamesPage
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={userNavigate}
        onGoBack={goBack}
        user={user}
        onLogout={handleLogout}
        onViewGame={viewGame}
        onViewUser={viewUser}
        onViewGames={viewGames}
        onRequestLogin={(rawgGameId) => requestLogin(rawgGameId, true)}
        initialOrdering={viewingGamesOrdering}
      />
    );
  }

  if (page === "game" && viewingGameId !== null) {
    return (
      <GamePage
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={userNavigate}
        onGoBack={goBack}
        onViewUser={viewUser}
        onViewGame={viewGame}
        onViewGames={viewGames}
        user={user}
        onLogout={handleLogout}
        rawgGameId={viewingGameId}
        onRequestLogin={(openEntry) => requestLogin(viewingGameId, openEntry)}
        autoOpenEntry={loginIntent?.rawgGameId === viewingGameId && (loginIntent?.openEntry ?? false)}
        onAutoOpenConsumed={consumeLoginIntent}
      />
    );
  }

  if (page === "profile") {
    return (
      <ProfilePage
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={userNavigate}
        onGoBack={goBack}
        refreshKey={profileRefreshKey}
        user={user}
        onLogout={handleLogout}
        onUserUpdate={handleUserUpdate}
        onViewUser={viewUser}
        onViewGame={viewGame}
        onViewGames={viewGames}
      />
    );
  }

  if (page === "user") {
    return (
      <ProfilePage
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={userNavigate}
        onGoBack={goBack}
        refreshKey={profileRefreshKey}
        user={user}
        onLogout={handleLogout}
        onUserUpdate={handleUserUpdate}
        viewingUsername={viewingUsername}
        onViewUser={viewUser}
        onViewGame={viewGame}
        onViewGames={viewGames}
      />
    );
  }

  if (page === "login") {
    return (
      <LoginPage
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={navigate}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <HomePage
      theme={theme}
      onToggleTheme={toggleTheme}
      onNavigate={navigate}
      user={user}
      onLogout={handleLogout}
      onViewUser={viewUser}
      onViewGame={viewGame}
      onViewGames={viewGames}
      onRequestLogin={(rawgGameId) => requestLogin(rawgGameId, true)}
    />
  );
}
