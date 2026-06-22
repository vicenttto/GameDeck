import { useState } from "react";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import type { AuthUser } from "../App";
import { API_BASE } from "../config";

type Page = "home" | "profile" | "login";

type LoginPageProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNavigate: (page: Page) => void;
  onLogin: (user: AuthUser) => void;
};

type AuthMode = "login" | "register";

type AuthResponse = {
  token: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  admin: boolean;
};

export default function LoginPage({ theme, onToggleTheme, onNavigate, onLogin }: LoginPageProps) {
  const [mode,        setMode]        = useState<AuthMode>("login");
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email,       setEmail]       = useState("");
  const [username,    setUsername]    = useState("");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      if (!/^[a-zA-Z0-9_]{3,40}$/.test(username)) {
        setError("El nombre de usuario debe tener entre 3 y 40 caracteres y solo puede contener letras, números y guion bajo.");
        return;
      }
      if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (password !== confirm) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email, password }
        : { username, email, password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        if (res.status === 400) {
          throw new Error(mode === "login"
            ? "El email o la contraseña no tienen un formato válido."
            : "Revisa que todos los campos sean válidos.");
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? (mode === "login" ? "Credenciales incorrectas." : "No se pudo crear la cuenta. Inténtalo de nuevo."));
      }

      const data: AuthResponse = await res.json();
      onLogin({ token: data.token, username: data.username, email: data.email, avatarUrl: data.avatarUrl ?? undefined, isAdmin: data.admin });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión con el servidor. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setShowPass(false);
    setShowConfirm(false);
  };

  return (
    <div className="login-page">

      <header className="login-header">
        <a className="nav-brand" onClick={() => onNavigate("home")}>
          <img src={`/media/logo-${theme === "dark" ? "oscuro" : "claro"}.png`} alt="GameDeck" className="brand-logo-img" />
          GameDeck
        </a>
        <button className="nav-theme-btn" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === "dark"
            ? <Sun  size={17} strokeWidth={2} />
            : <Moon size={17} strokeWidth={2} />}
        </button>
      </header>

      <main className="login-main">
        <div className="login-card glass">

          <div className="login-brand">
            <div className="login-brand-icon">
              <img src={`/media/logo-${theme === "dark" ? "oscuro" : "claro"}.png`} alt="GameDeck" className="brand-logo-img brand-logo-img--large" />
            </div>
            <h1 className="login-brand-name">GameDeck</h1>
            <p className="login-brand-sub">
              {mode === "login" ? "Bienvenido de vuelta" : "Únete a la comunidad"}
            </p>
          </div>

          <div className="login-toggle">
            <button
              className={`login-toggle-btn${mode === "login" ? " active" : ""}`}
              onClick={() => switchMode("login")}
              type="button"
            >
              Entrar
            </button>
            <button
              className={`login-toggle-btn${mode === "register" ? " active" : ""}`}
              onClick={() => switchMode("register")}
              type="button"
            >
              Crear cuenta
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>

            {mode === "register" && (
              <div className="login-field">
                <label className="login-label">Nombre de usuario</label>
                <input
                  className="login-input"
                  type="text"
                  placeholder="usuario123"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(null); }}
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </div>
            )}

            <div className="login-field">
              <label className="login-label">Email</label>
              <input
                className="login-input"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null); }}
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label">Contraseña</label>
              <div className="login-input-wrap">
                <input
                  className="login-input"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div className="login-field">
                <label className="login-label">Confirmar contraseña</label>
                <div className="login-input-wrap">
                  <input
                    className="login-input"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(null); }}
                    autoComplete="new-password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowConfirm(v => !v)}
                    aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showConfirm ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
                  </button>
                </div>
              </div>
            )}

            {mode === "login" && (
              <div className="login-extras">
                <a className="login-forgot">¿Olvidaste tu contraseña?</a>
              </div>
            )}

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading
                ? (mode === "login" ? "Entrando…" : "Creando cuenta…")
                : (mode === "login" ? "Iniciar sesión" : "Crear cuenta")}
            </button>

          </form>

          <p className="login-switch">
            {mode === "login" ? (
              <>¿No tienes cuenta?{" "}
                <a onClick={() => switchMode("register")}>Regístrate gratis</a>
              </>
            ) : (
              <>¿Ya tienes cuenta?{" "}
                <a onClick={() => switchMode("login")}>Inicia sesión</a>
              </>
            )}
          </p>

        </div>
      </main>

    </div>
  );
}
