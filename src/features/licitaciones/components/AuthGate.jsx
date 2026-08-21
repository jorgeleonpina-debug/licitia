import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../../lib/supabase.js";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) { setChecking(false); return undefined; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return <div className="lo-state lo-state--error"><h2>Supabase no configurado</h2><p>Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para acceder al módulo.</p></div>;
  }
  if (checking) return <div className="lo-state"><div className="lo-spinner"/><p>Validando sesión…</p></div>;
  if (session) return children({ session, signOut: () => supabase.auth.signOut() });

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setMessage(result.error.message);
    setSubmitting(false);
  }

  return (
    <div className="lo-auth-shell">
      <form className="lo-auth-card" onSubmit={submit}>
        <span className="lo-eyebrow">ACCESO SEGURO</span>
        <h2>Ingresar a oportunidades</h2>
        <p>Solo usuarios autorizados en Supabase pueden consultar y gestionar oportunidades.</p>
        <label>Correo<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
        <label>Contraseña<input type="password" required minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
        {message && <div className="lo-form-message">{message}</div>}
        <button className="lo-button lo-button--primary" disabled={submitting}>{submitting ? "Procesando…" : "Ingresar"}</button>
      </form>
    </div>
  );
}
