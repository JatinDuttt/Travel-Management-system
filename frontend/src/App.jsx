import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const day = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function useAuth() {
  const [auth, setAuth] = useState(() => { try { return JSON.parse(localStorage.getItem("auth")); } catch { return null; } });
  const save = (a) => {
    setAuth(a);
    try { a ? localStorage.setItem("auth", JSON.stringify(a)) : localStorage.removeItem("auth"); } catch { /* storage blocked */ }
  };
  return [auth, save];
}

export default function App() {
  const [auth, setAuth] = useAuth();
  const [view, setView] = useState("packages");
  const [note, setNote] = useState(null);
  const token = auth?.token;
  const say = (text, type = "ok") => setNote({ text, type });

  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4000); return () => clearTimeout(t); }, [note]);

  const call = useCallback(async (path, opts) => {
    try { return await api(path, { ...opts, token }); }
    catch (e) { if (e.status === 401 && token) setAuth(null); say(e.message, "err"); throw e; }
  }, [token]); // eslint-disable-line

  const isAdmin = auth?.role === "ADMIN";
  const tabs = [["packages", "Trips"], ...(auth ? [["bookings", "My bookings"]] : []), ...(isAdmin ? [["admin", "Add a trip"]] : [])];

  return (
    <>
      <header className="bar">
        <strong className="brand">Travel Desk</strong>
        <nav aria-label="Main">
          {tabs.map(([k, label]) => (
            <button key={k} className={"tab" + (view === k ? " on" : "")} onClick={() => setView(k)}>{label}</button>
          ))}
        </nav>
        <div className="who">
          {auth ? (<><span>{auth.email} ({auth.role.toLowerCase()})</span>
            <button className="tab" onClick={() => { setAuth(null); setView("packages"); }}>Log out</button></>)
            : <button className="tab" onClick={() => setView("login")}>Log in</button>}
        </div>
      </header>
      <main>
        {view === "packages" && <Packages call={call} auth={auth} say={say} isAdmin={isAdmin} />}
        <div className="wrap narrow">
          {view === "bookings" && auth && <Bookings call={call} say={say} />}
          {view === "admin" && isAdmin && <AddPackage call={call} say={say} done={() => setView("packages")} />}
          {view === "login" && <AuthForm say={say} done={(a) => { setAuth(a); setView("packages"); }} />}
        </div>
      </main>
      <Footer />
      {note && <div className={"toast " + note.type} role="status" aria-live="polite">{note.text}</div>}
    </>
  );
}

function Packages({ call, auth, say, isAdmin }) {
  const [q, setQ] = useState("");
  const [max, setMax] = useState("");
  const [items, setItems] = useState(null);
  const load = useCallback(() => {
    const p = new URLSearchParams({ destination: q, size: 20, sort: "startDate,asc" });
    if (max) p.set("maxPrice", max);
    return call(`/api/packages?${p}`).then((d) => setItems(d.content)).catch(() => setItems([]));
  }, [q, max, call]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <>
      <section className="hero">
        <div className="hero-in">
        <h1>Where do you want to go?</h1>
        <p className="lede">Pick a trip, choose how many are travelling, and book in one step.</p>
        <div className="search">
          <input aria-label="Destination" placeholder="Search a destination, e.g. Goa" value={q} onChange={(e) => setQ(e.target.value)} />
          <input aria-label="Maximum price" type="number" min="0" placeholder="Max price (₹)" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
        </div>
      </section>
      <div className="wrap">
      {items === null ? <p className="muted">Loading trips…</p>
        : items.length === 0 ? <p className="muted">No trips match. Clear the filters or ask an admin to add one.</p>
        : <ul className="grid">{items.map((p) => <Row key={p.id} p={p} auth={auth} call={call} say={say} reload={load} isAdmin={isAdmin} />)}</ul>}
      </div>
    </>
  );
}

function Row({ p, auth, call, say, reload, isAdmin }) {
  const [n, setN] = useState(1);
  const most = Math.min(10, p.availableSeats);
  const book = async () => {
    if (!auth) return say("Log in to book a trip.", "err");
    try { await call("/api/bookings", { method: "POST", body: { packageId: p.id, travelers: n } }); say(`Booked ${n} traveller${n > 1 ? "s" : ""} on ${p.name}.`); setN(1); reload(); } catch { /* shown by call() */ }
  };
  const remove = async () => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    try { await call(`/api/packages/${p.id}`, { method: "DELETE" }); say("Trip deleted."); reload(); } catch { /* shown by call() */ }
  };
  const hue = [...p.destination].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const photo = `https://loremflickr.com/640/480/${encodeURIComponent(p.destination)},travel?lock=${p.id}`;
  return (
    <li className="card">
      <div className="cover" style={{ "--h": hue }}>
        <img src={photo} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <span className="chip">{day(p.startDate)}</span>
        {p.availableSeats === 0 && <span className="chip sold">Sold out</span>}
      </div>
      <div className="body">
        <h2>{p.name}</h2>
        <p className="muted">{p.destination}{p.description ? `. ${p.description}` : ""}</p>
        <p className={p.availableSeats <= 5 ? "seats low" : "seats"}>{p.availableSeats === 0 ? "No seats left" : `${p.availableSeats} seats left`}</p>
        <div className="foot">
          <div className="price">{money.format(p.price)}<small> per person</small></div>
          {p.availableSeats > 0 && (
            <div className="act">
              <select aria-label="Travellers" value={n} onChange={(e) => setN(+e.target.value)}>
                {Array.from({ length: most }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
              <button className="btn" onClick={book}>Book trip</button>
            </div>
          )}
        </div>
        {isAdmin && <button className="btn ghost del" onClick={remove}>Delete trip</button>}
      </div>
    </li>
  );
}

function Bookings({ call, say }) {
  const [items, setItems] = useState(null);
  const load = useCallback(() => call("/api/bookings/my").then(setItems).catch(() => setItems([])), [call]);
  useEffect(() => { load(); }, [load]);
  const cancel = async (id) => {
    try { await call(`/api/bookings/${id}`, { method: "DELETE" }); say("Booking cancelled."); load(); } catch { /* shown by call() */ }
  };
  return (
    <>
      <h1 className="page">My bookings</h1>
      {items === null ? <p className="muted">Loading…</p>
        : items.length === 0 ? <p className="muted">No bookings yet. Pick a trip and book it.</p>
        : <ul className="list">{items.map((b) => (
          <li className="row" key={b.id}>
            <div>
              <h2>{b.travelPackage.name}</h2>
              <p className="muted">{b.travelers} traveller{b.travelers > 1 ? "s" : ""}, leaves {day(b.travelPackage.startDate)}</p>
              <p className={b.status === "CANCELLED" ? "seats low" : "seats"}>{b.status === "CANCELLED" ? "Cancelled" : "Confirmed"}</p>
            </div>
            <div className="side">
              <div className="price">{money.format(b.totalPrice)}</div>
              {b.status === "CONFIRMED" && <button className="btn ghost" onClick={() => cancel(b.id)}>Cancel booking</button>}
            </div>
          </li>))}</ul>}
    </>
  );
}

function AddPackage({ call, say, done }) {
  const [f, setF] = useState({ name: "", destination: "", price: "", startDate: "", availableSeats: "", description: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try { await call("/api/packages", { method: "POST", body: { ...f, price: +f.price, availableSeats: +f.availableSeats } }); say("Trip added."); done(); } catch { /* shown by call() */ }
  };
  return (
    <form className="form" onSubmit={submit}>
      <h1 className="page">Add a trip</h1>
      <label>Trip name<input required value={f.name} onChange={set("name")} /></label>
      <label>Destination<input required value={f.destination} onChange={set("destination")} /></label>
      <label>Price per person (₹)<input required type="number" min="1" value={f.price} onChange={set("price")} /></label>
      <label>Start date<input required type="date" value={f.startDate} onChange={set("startDate")} /></label>
      <label>Seats available<input required type="number" min="0" value={f.availableSeats} onChange={set("availableSeats")} /></label>
      <label>Description<input value={f.description} onChange={set("description")} /></label>
      <button className="btn">Add trip</button>
    </form>
  );
}

function AuthForm({ say, done }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try {
      const body = mode === "login" ? { email: f.email, password: f.password } : f;
      const d = await api(`/api/auth/${mode}`, { method: "POST", body });
      say(mode === "login" ? "Logged in." : "Account created. You're logged in.");
      done({ token: d.token, role: d.role, email: f.email.toLowerCase() });
    } catch (err) { say(err.message, "err"); }
  };
  return (
    <form className="form" onSubmit={submit}>
      <h1 className="page">{mode === "login" ? "Log in" : "Create an account"}</h1>
      {mode === "register" && <label>Name<input required value={f.name} onChange={set("name")} /></label>}
      <label>Email<input required type="email" value={f.email} onChange={set("email")} /></label>
      <label>Password{mode === "register" && " (8+ characters)"}<input required type="password" minLength={mode === "register" ? 8 : 1} value={f.password} onChange={set("password")} /></label>
      <button className="btn">{mode === "login" ? "Log in" : "Create account"}</button>
      <button type="button" className="link" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "New here? Create an account" : "Have an account? Log in"}
      </button>
    </form>
  );
}

function Footer() {
  return (
    <footer className="foot-bar">
      <div className="foot-in">
        <div>
          <strong className="brand">Travel Desk</strong>
          <p>Browse trips, book seats, and manage your bookings in one place.</p>
        </div>
        <p className="small">Built by Jatin with Spring Boot, React and MySQL.{" "}
          <a href="https://github.com/JatinDuttt/Travel-Management-system">Source on GitHub</a></p>
      </div>
    </footer>
  );
}
