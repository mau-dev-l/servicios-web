import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

function Method({ children }) {
  return <span className={`method ${children.toLowerCase()}`}>{children}</span>;
}

function Field({ label, name, type = "text", ...props }) {
  return <label>{label}<input name={name} type={type} required {...props} /></label>;
}

function App() {
  const [mode, setMode] = useState("login");
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState(null);
  const [profile, setProfile] = useState({ nombre: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  function signOut() {
    setSession(null);
    setUsers(null);
    setProfile({ nombre: "", email: "" });
    setMode("login");
  }

  async function request(path, method = "GET", body, token = session?.token) {
    let response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new Error("No se pudo conectar con la API. Comprueba que el servidor esté encendido e intenta de nuevo.");
    }
    if (response.status === 401 && token) {
      signOut();
      throw new Error("Tu sesión venció o no es válida. Inicia sesión nuevamente.");
    }
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.msg || `La API respondió con un error (${response.status}).`);
    return data;
  }

  async function run(action) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try { await action(); }
    catch (error) { setNotice({ error: true, text: error.message }); }
    finally { setBusy(false); }
  }

  async function loadUsers(currentSession = session) {
    setUsers(null);
    const list = await request("/users", "GET", undefined, currentSession.token);
    if (!Array.isArray(list)) throw new Error("La API no devolvió una lista de usuarios válida.");
    setUsers(list);
    const me = list.find(user => String(user.id) === String(currentSession.id));
    if (me) setProfile({ nombre: me.nombre, email: me.email });
  }

  function authenticate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    data.email = data.email.trim();
    if (data.nombre !== undefined) data.nombre = data.nombre.trim();
    run(async () => {
      if (mode === "register") {
        if (!data.nombre) throw new Error("Ingresa un nombre válido.");
        await request("/register", "POST", data);
        form.reset();
        setMode("login");
        setNotice({ text: "Cuenta creada. Ya puedes iniciar sesión." });
      } else {
        const result = await request("/login", "POST", data);
        const payload = result.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const currentSession = { token: result.token, id: JSON.parse(atob(payload)).id };
        form.reset();
        setSession(currentSession);
        await loadUsers(currentSession);
        setNotice({ text: "Sesión iniciada correctamente." });
      }
    });
  }

  function updateProfile(event) {
    event.preventDefault();
    run(async () => {
      const updated = { nombre: profile.nombre.trim(), email: profile.email.trim() };
      if (!updated.nombre) throw new Error("Ingresa un nombre válido.");
      await request("/users/me", "PUT", updated);
      setProfile(updated);
      setUsers(previous => previous?.map(user => String(user.id) === String(session.id) ? { ...user, ...updated } : user));
      setNotice({ text: "Tu cuenta se actualizó correctamente." });
    });
  }

  function deleteAccount() {
    if (!window.confirm("¿Eliminar tu cuenta de forma permanente? Esta acción no se puede deshacer.")) return;
    run(async () => {
      await request("/users/me", "DELETE");
      signOut();
      setNotice({ text: "Tu cuenta fue eliminada correctamente." });
    });
  }

  return <main>
    <header>
      <div className="brand"><span className="logo">u.</span><div><strong>Usuarios</strong><small>Panel de API</small></div></div>
      <span className="session-state">{session ? "● Sesión activa" : "○ Sin sesión"}</span>
    </header>
    <section className="intro"><p className="eyebrow">CRUD</p><h1>Bienvenido</h1><p>Crea una cuenta, consulta usuarios y administra tu perfil.</p></section>
    <div role="status" aria-live="polite" className={notice ? `notice ${notice.error ? "error" : "success"}` : ""}>{notice?.text}</div>
    {busy && <p role="status" className="loading">Procesando solicitud…</p>}
    {!session ? <section className="card auth-card">
      <div className="tabs"><button disabled={busy} className={mode === "login" ? "active" : ""} aria-pressed={mode === "login"} onClick={() => { setMode("login"); setNotice(null); }}>Iniciar sesión</button><button disabled={busy} className={mode === "register" ? "active" : ""} aria-pressed={mode === "register"} onClick={() => { setMode("register"); setNotice(null); }}>Crear cuenta</button></div>
      <div className="section-heading"><h2>{mode === "login" ? "Bienvenido de nuevo" : "Tu primera cuenta"}</h2><Method>POST</Method></div>
      <p className="muted">{mode === "login" ? "Ingresa para consultar usuarios y gestionar tu cuenta." : "Completa tus datos para registrarte en la API."}</p>
      <form key={mode} onSubmit={authenticate}><fieldset disabled={busy}>
        {mode === "register" && <Field label="Nombre" name="nombre" autoComplete="name" placeholder="Tu nombre" />}
        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="nombre@ejemplo.com" />
        <Field label="Contraseña" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Tu contraseña" />
        <button className="primary full">{busy ? "Espera un momento…" : mode === "login" ? "Iniciar sesión →" : "Crear mi cuenta →"}</button>
      </fieldset></form>
      <p className="endpoint">POST /{mode === "login" ? "login" : "register"}</p>
    </section> : <div className="dashboard">
      <section className="card users-card"><div className="section-heading"><h2>Usuarios registrados</h2><Method>GET</Method></div>
        <p className="muted">{users ? `${users.length} usuarios en la comunidad` : "Consulta los usuarios de la API."}</p>
        <button className="secondary" disabled={busy} onClick={() => run(() => loadUsers())}>↻ Actualizar lista</button>
        <div className="table-wrap"><table><thead><tr><th>ID</th><th>Nombre</th><th>Email</th></tr></thead><tbody>
          {users?.map(user => <tr key={user.id}><td className="muted">#{user.id}</td><td>{user.nombre}{String(user.id) === String(session.id) && <span className="you">Tú</span>}</td><td>{user.email}</td></tr>)}
          {(!users || !users.length) && <tr><td colSpan="3" className="empty">{busy ? "Cargando usuarios…" : users ? "Todavía no hay usuarios." : "Lista no disponible. Intenta actualizarla."}</td></tr>}
        </tbody></table></div><p className="endpoint">GET /users</p>
      </section>
      <section className="card"><div className="section-heading"><h2>Mi cuenta</h2><Method>PUT</Method></div><p className="muted">Edita el nombre y email de tu propia cuenta.</p>
        <form onSubmit={updateProfile}><fieldset disabled={busy}>
          <Field label="Nombre" name="nombre" autoComplete="name" value={profile.nombre} onChange={event => setProfile({ ...profile, nombre: event.target.value })} />
          <Field label="Email" name="email" type="email" autoComplete="email" value={profile.email} onChange={event => setProfile({ ...profile, email: event.target.value })} />
          <button className="primary full">Guardar cambios</button>
        </fieldset></form><p className="endpoint">PUT /users/me</p>
        <div className="danger-zone"><div className="section-heading"><h3>Eliminar cuenta</h3><Method>DELETE</Method></div><p className="muted">La eliminación de tu cuenta es permanente.</p><button className="danger full" disabled={busy} onClick={deleteAccount}>Eliminar mi cuenta</button></div>
        <button className="text-button full" disabled={busy} onClick={() => { signOut(); setNotice(null); }}>Cerrar sesión</button>
      </section>
    </div>}
    <footer>React + Vite <span>·</span> API de usuarios <span>·</span> La sesión termina al recargar la página.</footer>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
