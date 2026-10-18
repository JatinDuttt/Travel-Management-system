import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const day = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const photoCache = new Map();
// Looks up a photo on Wikipedia (free, no key). Tries each query in order, returns "" if none has a photo.
function usePhoto(queries) {
  const key = queries.join("|");
  const [src, setSrc] = useState(photoCache.get(key) || "");
  useEffect(() => {
    if (photoCache.has(key)) { setSrc(photoCache.get(key)); return undefined; }
    let live = true;
    (async () => {
      for (const q of queries) {
        try {
          const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=5&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json&origin=*`;
          const data = await (await fetch(url)).json();
          const hits = Object.values(data.query?.pages ?? {}).filter((x) => x.thumbnail).sort((a, b) => a.index - b.index);
          if (hits.length) { photoCache.set(key, hits[0].thumbnail.source); if (live) setSrc(hits[0].thumbnail.source); return; }
        } catch { /* try the next query */ }
      }
      photoCache.set(key, "");
    })();
    return () => { live = false; };
  }, [key]); // eslint-disable-line
  return src;
}

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
  const tabs = [["packages", "Trips"], ["hotels", "Hotels"], ...(auth ? [["bookings", "My bookings"]] : []), ...(isAdmin ? [["admin", "Add a trip"]] : [])];

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
        {view === "hotels" && <Hotels call={call} auth={auth} say={say} isAdmin={isAdmin} />}
        <div className="wrap narrow">
          {view === "bookings" && auth && <><Bookings call={call} say={say} /><HotelStays call={call} say={say} /></>}
          {view === "admin" && isAdmin && <><AddPackage call={call} say={say} done={() => setView("packages")} /><AddHotel call={call} say={say} done={() => setView("hotels")} /></>}
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
  const photo = usePhoto([`${p.destination} India`]);
  return (
    <li className="card">
      <div className="cover" style={{ "--h": hue }}>
        {photo && <img src={photo} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
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

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function Hotels({ call, auth, say, isAdmin }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState(null);
  const load = useCallback(() => call(`/api/hotels?${new URLSearchParams({ city: q, size: 20 })}`)
    .then((d) => setItems(d.content)).catch(() => setItems([])), [q, call]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  return (
    <div className="wrap">
      <h1 className="page">Where do you want to stay?</h1>
      <div className="search"><input aria-label="City" placeholder="Search a city, e.g. Jaipur" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="gap" />
      {items === null ? <p className="muted">Loading hotels…</p>
        : items.length === 0 ? <p className="muted">No hotels found. Try another city or ask an admin to add one.</p>
        : <ul className="grid">{items.map((h) => <Stay key={h.id} h={h} auth={auth} call={call} say={say} isAdmin={isAdmin} reload={load} />)}</ul>}
    </div>
  );
}

function Stay({ h, auth, call, say, isAdmin, reload }) {
  const [inD, setIn] = useState("");
  const [outD, setOut] = useState("");
  const [n, setN] = useState(1);
  const hue = [...h.city].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 11);
  const photo = usePhoto([`${h.city} India hotel`, `${h.city} India`]);
  const book = async () => {
    if (!auth) return say("Log in to book a stay.", "err");
    if (!inD || !outD) return say("Choose check-in and check-out dates.", "err");
    try {
      const b = await call("/api/hotel-bookings", { method: "POST", body: { hotelId: h.id, checkIn: inD, checkOut: outD, rooms: n } });
      say(`Booked ${h.name} for ${money.format(b.totalPrice)}.`); setIn(""); setOut(""); setN(1);
    } catch { /* shown by call() */ }
  };
  const remove = async () => {
    if (!window.confirm(`Delete ${h.name}?`)) return;
    try { await call(`/api/hotels/${h.id}`, { method: "DELETE" }); say("Hotel deleted."); reload(); } catch { /* shown by call() */ }
  };
  return (
    <li className="card">
      <div className="cover" style={{ "--h": hue }}>
        {photo && <img src={photo} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
        <span className="chip">{h.city}</span>
      </div>
      <div className="body">
        <h2>{h.name}</h2>
        <p className="seats">{h.rooms} rooms</p>
        <div className="dates">
          <label>Check-in<input type="date" min={today()} value={inD} onChange={(e) => setIn(e.target.value)} /></label>
          <label>Check-out<input type="date" min={inD || today()} value={outD} onChange={(e) => setOut(e.target.value)} /></label>
        </div>
        <div className="foot">
          <div className="price">{money.format(h.pricePerNight)}<small> per night</small></div>
          <div className="act">
            <select aria-label="Rooms" value={n} onChange={(e) => setN(+e.target.value)}>
              {Array.from({ length: Math.min(5, h.rooms) }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
            <button className="btn" onClick={book}>Book stay</button>
          </div>
        </div>
        {isAdmin && <button className="btn ghost del" onClick={remove}>Delete hotel</button>}
      </div>
    </li>
  );
}

function HotelStays({ call, say }) {
  const [items, setItems] = useState(null);
  const load = useCallback(() => call("/api/hotel-bookings/my").then(setItems).catch(() => setItems([])), [call]);
  useEffect(() => { load(); }, [load]);
  const cancel = async (id) => {
    try { await call(`/api/hotel-bookings/${id}`, { method: "DELETE" }); say("Stay cancelled."); load(); } catch { /* shown by call() */ }
  };
  return (
    <>
      <h1 className="page sub">Hotel stays</h1>
      {items === null ? <p className="muted">Loading…</p>
        : items.length === 0 ? <p className="muted">No hotel stays yet. Find one under Hotels.</p>
        : <ul className="list">{items.map((b) => (
          <li className="row" key={b.id}>
            <div>
              <h2>{b.hotel.name}</h2>
              <p className="muted">{b.hotel.city}, {day(b.checkIn)} to {day(b.checkOut)}, {b.rooms} room{b.rooms > 1 ? "s" : ""}</p>
              <p className={b.status === "CANCELLED" ? "seats low" : "seats"}>{b.status === "CANCELLED" ? "Cancelled" : "Confirmed"}</p>
            </div>
            <div className="side">
              <div className="price">{money.format(b.totalPrice)}</div>
              {b.status === "CONFIRMED" && <button className="btn ghost" onClick={() => cancel(b.id)}>Cancel stay</button>}
            </div>
          </li>))}</ul>}
    </>
  );
}

function AddHotel({ call, say, done }) {
  const [f, setF] = useState({ name: "", city: "", pricePerNight: "", rooms: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try { await call("/api/hotels", { method: "POST", body: { ...f, pricePerNight: +f.pricePerNight, rooms: +f.rooms } }); say("Hotel added."); done(); } catch { /* shown by call() */ }
  };
  return (
    <form className="form" onSubmit={submit}>
      <h1 className="page">Add a hotel</h1>
      <label>Hotel name<input required value={f.name} onChange={set("name")} /></label>
      <label>City<input required value={f.city} onChange={set("city")} /></label>
      <label>Price per night (₹)<input required type="number" min="1" value={f.pricePerNight} onChange={set("pricePerNight")} /></label>
      <label>Rooms<input required type="number" min="1" value={f.rooms} onChange={set("rooms")} /></label>
      <button className="btn">Add hotel</button>
    </form>
  );
}
