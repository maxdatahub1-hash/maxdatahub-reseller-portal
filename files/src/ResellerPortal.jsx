import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { Users, Wallet, Package, Check, X, Clock, TrendingUp, LogOut, Shield, Copy, CheckCircle2 } from "lucide-react";

const BUNDLES = [
  { id: "1gb", label: "1GB", base: 4.80 },
  { id: "2gb", label: "2GB", base: 9.50 },
  { id: "3gb", label: "3GB", base: 13.50 },
  { id: "5gb", label: "5GB", base: 23.00 },
  { id: "10gb", label: "10GB", base: 42.00 },
];

export default function App() {
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
  const [resellers, setResellers] = useState([]);
  const [activeReseller, setActiveReseller] = useState(null);
  const [delivery, setDelivery] = useState({ status: "normal", message: "Delivery running smoothly · orders sent within 10 minutes" });
  const [tab, setTab] = useState("pending");
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [priceDraft, setPriceDraft] = useState({});

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const fetchResellers = async () => {
    const { data } = await supabase.from("resellers").select("*, wallets(*), orders(*), reseller_prices(*)");
    if (data) setResellers(data);
  };

  const fetchDelivery = async () => {
    const { data } = await supabase.from("delivery_status").select("*").order("updated_at", { ascending: false }).limit(1);
    if (data && data[0]) setDelivery(data[0]);
  };

  useEffect(() => { if (role) { fetchResellers(); fetchDelivery(); } }, [role]);

  const approve = async (id) => {
    await supabase.from("resellers").update({ status: "approved" }).eq("id", id);
    for (const b of BUNDLES) await supabase.from("reseller_prices").upsert({ reseller_id: id, bundle_id: b.id, price: +(b.base * 1.18).toFixed(2) });
    await supabase.from("wallets").upsert({ reseller_id: id, available: 0, withdrawn: 0 });
    showToast("Approved!"); fetchResellers();
  };

  const reject = async (id) => { await supabase.from("resellers").update({ status: "rejected" }).eq("id", id); showToast("Rejected"); fetchResellers(); };

  const savePrices = async (rid) => {
    for (const [k, v] of Object.entries(priceDraft)) if (k.startsWith(rid)) await supabase.from("reseller_prices").upsert({ reseller_id: rid, bundle_id: k.split(":")[1], price: parseFloat(v) });
    showToast("Prices saved!"); fetchResellers();
  };

  const withdraw = async (rid, available) => {
    if (available < 10) { showToast("Min withdrawal ₵10"); return; }
    const w = resellers.find(r => r.id === rid)?.wallets?.[0];
    if (w) { await supabase.from("wallets").update({ available: 0, withdrawn: (w.withdrawn || 0) + available }).eq("reseller_id", rid); showToast("Withdrawal requested!"); fetchResellers(); }
  };

  const toggleDelivery = async () => {
    const next = delivery.status === "normal"
      ? { status: "delayed", message: "MTN running slow — orders may take longer but WILL be delivered" }
      : { status: "normal", message: "Delivery running smoothly · orders sent within 10 minutes" };
    await supabase.from("delivery_status").insert({ ...next, updated_at: new Date().toISOString() });
    setDelivery(next);
  };

  const loginReseller = async () => {
  if (!email || !password) { showToast("Enter email and password"); return; }
  const { data } = await supabase.from("resellers").select("*, wallets(*), orders(*), reseller_prices(*)").eq("email", email).eq("password", password).eq("status", "approved").single();
  if (data) { setActiveReseller(data); setRole("reseller"); fetchDelivery(); }
  else showToast("Invalid email/password or not approved");
};

  const pending = resellers.filter(r => r.status === "pending");
  const approved = resellers.filter(r => r.status === "approved");
  const base = { minHeight: "100vh", background: "#0B0A07", fontFamily: "Inter, system-ui, sans-serif", color: "#F5F2E8" };

  if (!role) return (
    <div style={{ ...base, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
        <span>MAX </span><span style={{ color: "#F2B705" }}>Data</span><span> Hub</span>
      </div>
      <div style={{ color: "#8A8470", fontSize: 12, marginBottom: 36, letterSpacing: "0.1em" }}>AGENT PORTAL</div>
      <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 12 }}>
        <button onClick={() => setRole("admin")} style={BP}><Shield size={16} /> Admin (Maxwell)</button>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={INP} />
<input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={INP} />
        <button onClick={loginReseller} style={BS}><Users size={16} /> Reseller Login</button>
      </div>
      <Toast msg={toast} />
    </div>
  );

  if (role === "admin") return (
    <div style={base}>
      <Header name="Maxwell" role="Admin" onLogout={() => setRole(null)} />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 18px 60px" }}>
        <Banner status={delivery.status} message={delivery.message} />
        <button onClick={toggleDelivery} style={{ background: "none", border: "1px solid #2A2618", color: "#8A8470", fontSize: 12, padding: "6px 12px", borderRadius: 8, marginBottom: 20, cursor: "pointer" }}>Toggle delivery status</button>
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <SC label="Pending" value={pending.length} icon={Clock} />
          <SC label="Resellers" value={approved.length} icon={Users} />
          <SC label="Orders" value={approved.reduce((s, r) => s + (r.orders?.length || 0), 0)} icon={Package} />
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid #2A2618", marginBottom: 18 }}>
          {["pending", "approved"].map(t => <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", color: tab === t ? "#F2B705" : "#8A8470", padding: "10px 0", marginRight: 22, fontSize: 14, fontWeight: 600, cursor: "pointer", borderBottom: tab === t ? "2px solid #F2B705" : "2px solid transparent" }}>{t === "pending" ? `Pending (${pending.length})` : `Resellers (${approved.length})`}</button>)}
        </div>
        {tab === "pending" && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pending.length === 0 && <Empty text="No pending applications." />}
          {pending.map(r => <div key={r.id} style={CARD}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ color: "#8A8470", fontSize: 12 }}>{r.phone} · {r.city}</div></div>
              <div style={{ display: "flex", gap: 8 }}><button onClick={() => approve(r.id)} style={IB("#1E4A1B","#4ADE80")}><Check size={15}/></button><button onClick={() => reject(r.id)} style={IB("#4A1E1E","#F87171")}><X size={15}/></button></div>
            </div>
          </div>)}
        </div>}
        {tab === "approved" && <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {approved.length === 0 && <Empty text="No approved resellers yet." />}
          {approved.map(r => { const w = r.wallets?.[0]; return <div key={r.id} style={CARD}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ color: "#8A8470", fontSize: 12 }}>maxdatahub.store/r/{r.slug}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ color: "#F2B705", fontWeight: 700 }}>₵{(w?.available||0).toFixed(2)}</div><div style={{ color: "#5C5847", fontSize: 11 }}>owed</div></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 10 }}>
              {BUNDLES.map(b => <div key={b.id}><div style={{ color: "#5C5847", fontSize: 10 }}>{b.label}</div><input type="number" defaultValue={r.reseller_prices?.find(p=>p.bundle_id===b.id)?.price||b.base} onChange={e=>setPriceDraft(d=>({...d,[`${r.id}:${b.id}`]:e.target.value}))} style={INP}/></div>)}
            </div>
          </div>
          }
          
