import { useState, useEffect, useCallback } from "react";
import { Users, Wallet, Package, Check, X, Clock, TrendingUp, LogOut, Shield, Copy, CheckCircle2 } from "lucide-react";

// TEMPORARY STORAGE — this uses the browser's localStorage so the demo works
// once deployed online. We will replace this with real Supabase database
// calls in the next step, so real resellers/orders/wallets persist properly
// across devices and users.
const storage = {
  async get(key) {
    const v = localStorage.getItem(key);
    return v ? { value: v } : null;
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { value };
  },
};

const BUNDLES = [
  { id: "1gb", label: "1GB", base: 4.8 },
  { id: "2gb", label: "2GB", base: 9.5 },
  { id: "3gb", label: "3GB", base: 13.5 },
  { id: "5gb", label: "5GB", base: 23.0 },
  { id: "10gb", label: "10GB", base: 42.0 },
];

const seedResellers = () => ([
  {
    id: "r1", name: "Kwame Boateng", phone: "0244111222", whatsapp: "0244111222",
    status: "approved", slug: "kwame", joined: "2026-06-10",
    prices: { "1gb": 6.0, "2gb": 11.5, "3gb": 16.0, "5gb": 27.0, "10gb": 48.0 },
    walletAvailable: 84.5, walletWithdrawn: 220.0,
    orders: [
      { id: "o1", bundle: "5GB", customer: "0201234567", amount: 27.0, profit: 4.0, status: "Completed", date: "Jun 28" },
      { id: "o2", bundle: "2GB", customer: "0244998877", amount: 11.5, profit: 2.0, status: "Completed", date: "Jun 29" },
    ],
  },
  {
    id: "r2", name: "Ama Serwaa", phone: "0209333444", whatsapp: "0209333444",
    status: "pending", slug: "ama", joined: "2026-06-30",
    prices: {}, walletAvailable: 0, walletWithdrawn: 0, orders: [],
  },
]);

function Banner({ status, message }) {
  const styles = {
    normal: { bg: "#10240F", border: "#1E4A1B", dot: "#4ADE80", text: "#9FE8A0" },
    delayed: { bg: "#2A1810", border: "#5A2E14", dot: "#F2B705", text: "#F2C94C" },
  };
  const s = styles[status] || styles.normal;
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: s.dot, flexShrink: 0 }} />
      <span style={{ color: s.text, fontSize: 13, lineHeight: 1.4 }}>{message}</span>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div style={{ background: "#16140F", border: "1px solid #2A2618", borderRadius: 14, padding: 16, flex: 1, minWidth: 130 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon size={15} color={accent || "#F2B705"} />
        <span style={{ color: "#8A8470", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ color: "#F5F2E8", fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif" }}>{value}</div>
    </div>
  );
}

export default function ResellerPortal() {
  const [role, setRole] = useState(null);
  const [resellers, setResellers] = useState(null);
  const [activeResellerId, setActiveResellerId] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState({ status: "normal", message: "Delivery running smoothly · most orders sent within 10 minutes", lastDelivered: "Jun 30, 3:48 PM" });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [priceDraft, setPriceDraft] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const persist = useCallback(async (next) => {
    try { await storage.set("maxdatahub:resellers", JSON.stringify(next)); } catch (e) { console.error(e); }
  }, []);

  const persistDelivery = useCallback(async (next) => {
    try { await storage.set("maxdatahub:delivery", JSON.stringify(next)); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get("maxdatahub:resellers");
        setResellers(r ? JSON.parse(r.value) : seedResellers());
      } catch (e) {
        setResellers(seedResellers());
      }
      try {
        const d = await storage.get("maxdatahub:delivery");
        if (d) setDeliveryStatus(JSON.parse(d.value));
      } catch (e) { /* keep default */ }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (resellers && !loading) persist(resellers);
  }, [resellers]); // eslint-disable-line

  const updateReseller = (id, patch) => {
    setResellers((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const approveReseller = (id) => {
    const defaults = Object.fromEntries(BUNDLES.map((b) => [b.id, +(b.base * 1.18).toFixed(2)]));
    updateReseller(id, { status: "approved", prices: defaults });
    showToast("Reseller approved");
  };

  const rejectReseller = (id) => {
    updateReseller(id, { status: "rejected" });
    showToast("Reseller rejected");
  };

  const savePrices = (id) => {
    const r = resellers.find((x) => x.id === id);
    updateReseller(id, { prices: { ...r.prices, ...priceDraft } });
    setPriceDraft({});
    showToast("Prices updated");
  };

  const withdraw = (id) => {
    const r = resellers.find((x) => x.id === id);
    if (r.walletAvailable < 10) { showToast("Minimum withdrawal is ₵10"); return; }
    updateReseller(id, { walletAvailable: 0, walletWithdrawn: r.walletWithdrawn + r.walletAvailable });
    showToast("Withdrawal requested");
  };

  const copyLink = (slug) => {
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 1500);
  };

  const cycleDeliveryStatus = () => {
    const next = deliveryStatus.status === "normal"
      ? { status: "delayed", message: "MTN running slow today — orders may take longer, but will be delivered", lastDelivered: deliveryStatus.lastDelivered }
      : { status: "normal", message: "Delivery running smoothly · most orders sent within 10 minutes", lastDelivered: deliveryStatus.lastDelivered };
    setDeliveryStatus(next);
    persistDelivery(next);
  };

  if (loading || !resellers) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B0A07", display: "flex", alignItems: "center", justifyContent: "center", color: "#F2B705", fontFamily: "system-ui" }}>
        Loading…
      </div>
    );
  }

  const pending = resellers.filter((r) => r.status === "pending");
  const approved = resellers.filter((r) => r.status === "approved");
  const activeReseller = resellers.find((r) => r.id === activeResellerId);

  const baseStyle = {
    minHeight: "100vh",
    background: "#0B0A07",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#F5F2E8",
  };

  if (!role) {
    return (
      <div style={{ ...baseStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700, letterSpacing: "-0.01em" }}>
            <span style={{ color: "#F5F2E8" }}>MAX </span><span style={{ color: "#F2B705" }}>Data</span><span style={{ color: "#F5F2E8" }}> Hub</span>
          </div>
          <div style={{ color: "#8A8470", fontSize: 13, marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Agent Portal</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
          <button onClick={() => setRole("admin")} style={btnPrimary}>
            <Shield size={16} /> Enter as Admin (Maxwell)
          </button>
          <button onClick={() => { setRole("reseller"); setActiveResellerId(approved[0]?.id || null); }} style={btnSecondary}>
            <Users size={16} /> Enter as Reseller (Kwame)
          </button>
        </div>
      </div>
    );
  }

  if (role === "admin") {
    return (
      <div style={baseStyle}>
        <Header role="Admin" name="Maxwell" onLogout={() => setRole(null)} />
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 18px 60px" }}>
          <Banner status={deliveryStatus.status} message={deliveryStatus.message} />
          <button onClick={cycleDeliveryStatus} style={{ background: "none", border: "1px solid #2A2618", color: "#8A8470", fontSize: 12, padding: "6px 12px", borderRadius: 8, marginBottom: 22, cursor: "pointer" }}>
            Toggle delivery status
          </button>

          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="Pending" value={pending.length} icon={Clock} />
            <StatCard label="Approved Resellers" value={approved.length} icon={Users} />
            <StatCard label="Total Orders" value={approved.reduce((s, r) => s + r.orders.length, 0)} icon={Package} />
            <StatCard label="Wallets Owed" value={`₵${approved.reduce((s, r) => s + r.walletAvailable, 0).toFixed(2)}`} icon={Wallet} />
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: "1px solid #2A2618" }}>
            {["pending", "approved"].map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: "none", border: "none", color: tab === t ? "#F2B705" : "#8A8470",
                padding: "10px 4px", marginRight: 22, fontSize: 14, fontWeight: 600, cursor: "pointer",
                borderBottom: tab === t ? "2px solid #F2B705" : "2px solid transparent",
              }}>
                {t === "pending" ? `Pending (${pending.length})` : `Resellers (${approved.length})`}
              </button>
            ))}
          </div>

          {tab === "pending" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pending.length === 0 && <EmptyState text="No pending applications right now." />}
              {pending.map((r) => (
                <div key={r.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{r.name}</div>
                      <div style={{ color: "#8A8470", fontSize: 12, marginTop: 2 }}>{r.phone} · Applied {r.joined}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => approveReseller(r.id)} style={iconBtn("#1E4A1B", "#4ADE80")}><Check size={15} /></button>
                      <button onClick={() => rejectReseller(r.id)} style={iconBtn("#4A1E1E", "#F87171")}><X size={15} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "approved" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {approved.length === 0 && <EmptyState text="No approved resellers yet." />}
              {approved.map((r) => (
                <div key={r.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{r.name}</div>
                      <div style={{ color: "#8A8470", fontSize: 12, marginTop: 2 }}>maxdatahub.store/r/{r.slug} · {r.orders.length} orders</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#F2B705", fontWeight: 700, fontSize: 15 }}>₵{r.walletAvailable.toFixed(2)}</div>
                      <div style={{ color: "#5C5847", fontSize: 11 }}>owed</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#8A8470", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Set their prices (₵)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 8 }}>
                    {BUNDLES.map((b) => (
                      <div key={b.id}>
                        <div style={{ color: "#5C5847", fontSize: 10, marginBottom: 3 }}>{b.label}</div>
                        <input
                          type="number"
                          defaultValue={r.prices[b.id]}
                          onChange={(e) => setPriceDraft((d) => ({ ...d, [b.id]: parseFloat(e.target.value) || 0 }))}
                          style={inputStyle}
                        />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => savePrices(r.id)} style={{ ...btnPrimary, marginTop: 12, padding: "8px 14px", fontSize: 13 }}>Save prices</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <Toast message={toast} />
      </div>
    );
  }

  if (role === "reseller") {
    if (!activeReseller) {
      return (
        <div style={baseStyle}>
          <Header role="Reseller" name="—" onLogout={() => setRole(null)} />
          <EmptyState text="No approved reseller account to preview yet." />
        </div>
      );
    }
    const link = `maxdatahub.store/r/${activeReseller.slug}`;
    return (
      <div style={baseStyle}>
        <Header role="Reseller" name={activeReseller.name} onLogout={() => setRole(null)} />
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 18px 60px" }}>
          <Banner status={deliveryStatus.status} message={deliveryStatus.message} />

          <div style={{ background: "linear-gradient(135deg, #1A1610, #0B0A07)", border: "1px solid #2A2618", borderRadius: 14, padding: 18, marginBottom: 20 }}>
            <div style={{ color: "#8A8470", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Your link</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontFamily: "monospace", fontSize: 14, color: "#F5F2E8" }}>{link}</span>
              <button onClick={() => copyLink(activeReseller.slug)} style={iconBtn("#2A2618", "#F2B705")}>
                {copiedSlug === activeReseller.slug ? <CheckCircle2 size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="Available" value={`₵${activeReseller.walletAvailable.toFixed(2)}`} icon={Wallet} />
            <StatCard label="Withdrawn" value={`₵${activeReseller.walletWithdrawn.toFixed(2)}`} icon={TrendingUp} />
            <StatCard label="Orders" value={activeReseller.orders.length} icon={Package} />
          </div>

          <button onClick={() => withdraw(activeReseller.id)} style={{ ...btnPrimary, width: "100%", marginBottom: 26 }}>
            Withdraw ₵{activeReseller.walletAvailable.toFixed(2)} to MoMo
          </button>
          <div style={{ color: "#5C5847", fontSize: 11, marginTop: -18, marginBottom: 22 }}>Minimum withdrawal: ₵10</div>

          <SectionLabel text="Your prices" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8, marginBottom: 26 }}>
            {BUNDLES.map((b) => (
              <div key={b.id} style={{ background: "#16140F", border: "1px solid #2A2618", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ color: "#8A8470", fontSize: 11 }}>{b.label}</div>
                <div style={{ color: "#F2B705", fontWeight: 700, fontSize: 15 }}>₵{activeReseller.prices[b.id]?.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <SectionLabel text="Recent orders" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeReseller.orders.length === 0 && <EmptyState text="No orders yet — share your link to get started." />}
            {activeReseller.orders.map((o) => (
              <div key={o.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{o.bundle}</div>
                  <div style={{ color: "#8A8470", fontSize: 12 }}>{o.customer} · {o.date}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#4ADE80", fontSize: 13, fontWeight: 600 }}>+₵{o.profit.toFixed(2)}</div>
                  <div style={{ color: "#5C5847", fontSize: 11 }}>{o.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Toast message={toast} />
      </div>
    );
  }

  return null;
}

function Header({ role, name, onLogout }) {
  return (
    <div style={{ borderBottom: "1px solid #2A2618", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 16 }}>
        <span style={{ color: "#F5F2E8" }}>MAX </span><span style={{ color: "#F2B705" }}>Data</span><span style={{ color: "#F5F2E8" }}> Hub</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 10, color: "#8A8470", textTransform: "uppercase", letterSpacing: "0.05em" }}>{role}</div>
        </div>
        <button onClick={onLogout} style={iconBtn("#2A2618", "#8A8470")}><LogOut size={14} /></button>
      </div>
    </div>
  );
}

function SectionLabel({ text }) {
  return <div style={{ color: "#8A8470", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>{text}</div>;
}

function EmptyState({ text }) {
  return (
    <div style={{ border: "1px dashed #2A2618", borderRadius: 12, padding: "28px 16px", textAlign: "center", color: "#5C5847", fontSize: 13 }}>
      {text}
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#F2B705", color: "#0B0A07", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      {message}
    </div>
  );
}

const cardStyle = { background: "#16140F", border: "1px solid #2A2618", borderRadius: 12, padding: 14 };

const btnPrimary = {
  background: "#F2B705", color: "#0B0A07", border: "none", borderRadius: 10,
  padding: "12px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
};

const btnSecondary = {
  background: "transparent", color: "#F5F2E8", border: "1px solid #2A2618", borderRadius: 10,
  padding: "12px 18px", fontWeight: 600, fontSize: 14, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
};

const inputStyle = {
  width: "100%", background: "#0B0A07", border: "1px solid #2A2618", borderRadius: 7,
  color: "#F5F2E8", fontSize: 13, padding: "6px 8px", boxSizing: "border-box",
};

function iconBtn(bg, color) {
  return {
    background: bg, color, border: "none", borderRadius: 8, width: 32, height: 32,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  };
}
