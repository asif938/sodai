"use client";

import { useState, useOptimistic, useTransition, useCallback, useEffect, useRef } from "react";
import { addItem, deleteItem, toggleItem, clearCollected } from "../actions/items";
import { useRouter } from "next/navigation";

const UNITS = ["কেজি", "গ্রাম", "লিটার", "মিলি", "পিস", "হালি", "ডজন", "বান্ডেল", "প্যাকেট", "বোতল", "বস্তা", "টি"];
const COMMON_ITEMS = ["চাল", "ডাল", "তেল", "লবণ", "চিনি", "আটা", "ময়দা", "পেঁয়াজ", "রসুন", "আদা", "মরিচ", "হলুদ", "ধনে", "জিরা", "দুধ", "ডিম", "মাছ", "মাংস", "সবজি", "টমেটো"];

const THEMES = {
  dark: {
    bg: "#0f1117",
    bg2: "#161b27",
    bg3: "#1e2535",
    surface: "#242d42",
    surface2: "#2d3850",
    border: "#2f3d5a",
    border2: "#3d4f70",
    text: "#e8ecf5",
    text2: "#9aaabf",
    text3: "#6a7d9a",
    inputBg: "#1e2535",
    shadow: "0 4px 24px rgba(0,0,0,0.4)",
    swalBg: "#1e2535",
    headerGrad: "linear-gradient(180deg, #161b27f0 0%, #161b2700 100%)",
  },
  light: {
    bg: "#f0f4fb",
    bg2: "#ffffff",
    bg3: "#e8eef8",
    surface: "#ffffff",
    surface2: "#f4f7fd",
    border: "#dce4f5",
    border2: "#c2d0eb",
    text: "#1a2240",
    text2: "#4a5a80",
    text3: "#8090b0",
    inputBg: "#f0f4fb",
    shadow: "0 2px 16px rgba(30,50,120,0.07)",
    swalBg: "#ffffff",
    headerGrad: "linear-gradient(180deg, #fffffff0 0%, #ffffff00 100%)",
  },
};

function optimisticReducer(state, action) {
  switch (action.type) {
    case "ADD": return [action.item, ...state];
    case "DELETE": return state.filter(i => i._id !== action.id);
    case "TOGGLE": return state.map(i => i._id === action.id ? { ...i, status: action.newStatus } : i);
    case "CLEAR_COLLECTED": return state.filter(i => i.status !== "নেওয়া হয়েছে");
    default: return state;
  }
}

function SodaiLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 22h32l-3.5 16H11.5L8 22z" fill="#f59e0b"/>
      <path d="M8 22h32l-3.5 16H11.5L8 22z" fill="url(#basketGrad)"/>
      <path d="M13 28h22M12 34h24" stroke="#b45309" strokeWidth="1.2" opacity="0.5"/>
      <path d="M11.5 22l2 16M24 22v16M36.5 22l-2 16" stroke="#b45309" strokeWidth="0.8" opacity="0.4"/>
      <path d="M17 22 C17 13, 31 13, 31 22" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="18" cy="17" r="3.5" fill="#ef4444"/>
      <circle cx="24.5" cy="14.5" r="3.5" fill="#22c55e"/>
      <circle cx="31" cy="17" r="3.5" fill="#f97316"/>
      <path d="M14 26 C17 24, 21 24, 23 26" stroke="white" strokeWidth="1.5" opacity="0.25" strokeLinecap="round"/>
      <defs>
        <linearGradient id="basketGrad" x1="8" y1="22" x2="40" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24"/>
          <stop offset="1" stopColor="#d97706"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  );
}

export default function SodaiApp({ initialItems }) {
  const [activeTab, setActiveTab] = useState("all");
  const [, startTransition] = useTransition();
  const [optimisticItems, dispatch] = useOptimistic(initialItems, optimisticReducer);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("কেজি");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sodai-theme");
    if (saved) setIsDark(saved === "dark");
  }, []);

  const router = useRouter();

  // SSE real-time updates
  useEffect(() => {
    let es;
    let retryTimeout;

    function connect() {
      es = new EventSource("/api/sse");

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "REFRESH") {
            router.refresh();
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        // Reconnect after 3 seconds
        retryTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (es) es.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem("sodai-theme", next ? "dark" : "light");
      return next;
    });
  };

  const t = (mounted ? isDark : true) ? THEMES.dark : THEMES.light;

  const allItems = optimisticItems;
  const needItems = optimisticItems.filter(i => i.status !== "নেওয়া হয়েছে");
  const doneItems = optimisticItems.filter(i => i.status === "নেওয়া হয়েছে");
  const filteredItems = activeTab === "all" ? allItems : activeTab === "need" ? needItems : doneItems;

  const suggestions = COMMON_ITEMS.filter(s =>
    itemName.length > 0 && s.includes(itemName) && s !== itemName
  ).slice(0, 5);

  const handleAdd = useCallback(async (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    setIsAdding(true);
    const newItem = {
      _id: `temp-${Date.now()}`,
      name: itemName.trim(),
      quantity: quantity || "",
      unit: quantity ? unit : "",
      status: "নিতে হবে",
      createdAt: new Date().toISOString(),
    };
    startTransition(async () => {
      dispatch({ type: "ADD", item: newItem });
      await addItem({ name: newItem.name, quantity: newItem.quantity, unit: newItem.unit, status: "নিতে হবে" });
    });
    setItemName(""); setQuantity(""); setUnit("কেজি"); setShowSuggestions(false); setIsAdding(false);
  }, [itemName, quantity, unit]);

  const handleToggle = useCallback(async (item) => {
    startTransition(async () => {
      const newStatus = item.status === "নেওয়া হয়েছে" ? "নিতে হবে" : "নেওয়া হয়েছে";
      dispatch({ type: "TOGGLE", id: item._id, newStatus });
      await toggleItem(item._id, item.status);
    });
  }, []);

  const handleDelete = useCallback(async (item) => {
    const result = await Swal.fire({
      title: `"${item.name}" মুছবেন?`,
      text: "এই আইটেমটি তালিকা থেকে সরিয়ে দেওয়া হবে।",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "হ্যাঁ, মুছুন",
      cancelButtonText: "না, রাখুন",
      background: t.swalBg,
      color: t.text,
      iconColor: "#f59e0b",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: isDark ? "#3d4f70" : "#c2d0eb",
    });
    if (result.isConfirmed) {
      startTransition(async () => {
        dispatch({ type: "DELETE", id: item._id });
        await deleteItem(item._id);
      });
    }
  }, [t, isDark]);

  const handleClearCollected = useCallback(async () => {
    if (doneItems.length === 0) return;
    const result = await Swal.fire({
      title: "সব নেওয়া আইটেম মুছবেন?",
      text: `${doneItems.length}টি আইটেম সরিয়ে দেওয়া হবে।`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "হ্যাঁ, পরিষ্কার করুন",
      cancelButtonText: "না",
      background: t.swalBg,
      color: t.text,
      iconColor: "#10b981",
      confirmButtonColor: "#10b981",
      cancelButtonColor: isDark ? "#3d4f70" : "#c2d0eb",
    });
    if (result.isConfirmed) {
      startTransition(async () => {
        dispatch({ type: "CLEAR_COLLECTED" });
        await clearCollected();
      });
    }
  }, [doneItems.length, t, isDark]);

  const tabConfig = [
    { id: "all", label: "সব", emoji: "📋", count: allItems.length, color: "#8b5cf6" },
    { id: "need", label: "নিতে হবে", emoji: "🛒", count: needItems.length, color: "#f59e0b" },
    { id: "done", label: "নেওয়া হয়েছে", emoji: "✅", count: doneItems.length, color: "#10b981" },
  ];

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${t.bg}; transition: background 0.3s; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${t.border2}; border-radius: 4px; }
        input::placeholder { color: ${t.text3}; }
        select option { background: ${t.surface}; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
        transition: "background 0.3s",
        fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
      }}>

        {/* Sticky Header */}
        <div style={{
          padding: "16px 16px 0",
          background: t.headerGrad,
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}>

          {/* Top row: Logo + Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                background: "rgba(245,158,11,0.12)",
                borderRadius: 14,
                padding: 7,
                border: "1.5px solid rgba(245,158,11,0.28)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 12px rgba(245,158,11,0.15)",
              }}>
                <SodaiLogo size={30} />
              </div>
              <div>
                <div style={{
                  fontSize: 25,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 60%, #f97316 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.1,
                }}>সদাই</div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>বাজারের তালিকা</div>
              </div>
            </div>

            {/* Right side controls */}
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              {doneItems.length > 0 && (
                <button onClick={handleClearCollected} style={{
                  padding: "6px 10px",
                  borderRadius: 20,
                  border: "1px solid rgba(16,185,129,0.35)",
                  background: "rgba(16,185,129,0.08)",
                  color: "#10b981",
                  fontSize: 12,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  fontWeight: 600,
                }}>
                  🧹 পরিষ্কার
                </button>
              )}
              {/* Theme toggle */}
              <button onClick={toggleTheme} title={isDark ? "Light mode" : "Dark mode"} style={{
                width: 36, height: 36,
                borderRadius: 10,
                border: `1.5px solid ${t.border}`,
                background: t.surface,
                color: isDark ? "#fbbf24" : "#6366f1",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.25s",
                boxShadow: t.shadow,
              }}>
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>
              {/* Count */}
              <div style={{
                padding: "5px 10px",
                borderRadius: 20,
                background: t.surface,
                border: `1px solid ${t.border}`,
                fontSize: 12, color: t.text2, fontWeight: 700,
              }}>
                {needItems.length}/{allItems.length}
              </div>
            </div>
          </div>

          {/* Add form */}
          <form onSubmit={handleAdd} style={{ marginBottom: 10 }}>
            <div style={{ position: "relative" }}>
              <div style={{
                display: "flex",
                gap: 6,
                background: t.surface,
                borderRadius: 14,
                border: `1.5px solid ${t.border}`,
                padding: "8px 8px 8px 14px",
                boxShadow: t.shadow,
                transition: "border-color 0.2s, background 0.3s",
              }}>
                <input
                  type="text"
                  value={itemName}
                  onChange={e => { setItemName(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="আইটেম লিখুন..."
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: t.text,
                    fontSize: 15,
                    fontFamily: "inherit",
                    minWidth: 0,
                  }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="পরিমাণ"
                  style={{
                    width: 65,
                    background: t.inputBg,
                    border: `1px solid ${t.border}`,
                    outline: "none",
                    color: t.text,
                    fontSize: 13,
                    fontFamily: "inherit",
                    borderRadius: 8,
                    padding: "5px 6px",
                    textAlign: "center",
                    transition: "background 0.3s",
                  }}
                />
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  style={{
                    background: t.inputBg,
                    border: `1px solid ${t.border}`,
                    outline: "none",
                    color: t.text2,
                    fontSize: 12,
                    fontFamily: "inherit",
                    borderRadius: 8,
                    padding: "5px 3px",
                    cursor: "pointer",
                    width: 60,
                    transition: "background 0.3s",
                  }}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button
                  type="submit"
                  disabled={!itemName.trim() || isAdding}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    background: itemName.trim()
                      ? "linear-gradient(135deg, #f59e0b, #d97706)"
                      : t.inputBg,
                    border: "none",
                    color: itemName.trim() ? "#000" : t.text3,
                    fontWeight: 700,
                    fontSize: 20,
                    lineHeight: 1,
                    cursor: itemName.trim() ? "pointer" : "not-allowed",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                    flexShrink: 0,
                  }}
                >+</button>
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0, right: 0,
                  background: t.surface,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 10,
                  overflow: "hidden",
                  zIndex: 100,
                  boxShadow: t.shadow,
                }}>
                  {suggestions.map(sg => (
                    <button
                      key={sg}
                      type="button"
                      onMouseDown={() => { setItemName(sg); setShowSuggestions(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "10px 14px",
                        background: "transparent",
                        border: "none",
                        borderBottom: `1px solid ${t.border}`,
                        color: t.text,
                        textAlign: "left",
                        fontSize: 14,
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      🔍 {sg}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

          {/* Tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, paddingBottom: 12 }}>
            {tabConfig.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 4px",
                  borderRadius: 12,
                  border: activeTab === tab.id ? `1.5px solid ${tab.color}` : `1.5px solid ${t.border}`,
                  background: activeTab === tab.id ? `${tab.color}20` : t.surface,
                  color: activeTab === tab.id ? tab.color : t.text3,
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.emoji}</span>
                <span>{tab.label}</span>
                <span style={{
                  background: activeTab === tab.id ? tab.color : t.bg3,
                  color: activeTab === tab.id ? "#fff" : t.text3,
                  borderRadius: 10,
                  padding: "1px 7px",
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 1,
                }}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Items list */}
        <div style={{ flex: 1, padding: "8px 16px 100px", overflowY: "auto" }}>
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: t.text3 }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>
                {activeTab === "all" ? "🛍️" : activeTab === "need" ? "🛒" : "✅"}
              </div>
              <p style={{ fontSize: 16, color: t.text2, marginBottom: 6 }}>
                {activeTab === "all" ? "তালিকা খালি আছে" : activeTab === "need" ? "নেওয়ার কিছু নেই" : "এখনো কিছু নেওয়া হয়নি"}
              </p>
              {activeTab === "all" && <p style={{ fontSize: 13 }}>উপরে আইটেম যোগ করুন</p>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredItems.map((item, idx) => (
                <ItemCard key={item._id} item={item} idx={idx} onToggle={handleToggle} onDelete={handleDelete} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ItemCard({ item, idx, onToggle, onDelete, t }) {
  const isDone = item.status === "নেওয়া হয়েছে";

  return (
    <div style={{
      background: isDone ? "rgba(16,185,129,0.07)" : t.surface,
      border: isDone ? "1px solid rgba(16,185,129,0.22)" : `1px solid ${t.border}`,
      borderRadius: 14,
      padding: "12px 12px 12px 14px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      animation: `fadeIn 0.3s ease ${Math.min(idx, 10) * 30}ms both`,
      boxShadow: t.shadow,
      transition: "background 0.3s, border 0.3s",
    }}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item)}
        style={{
          width: 28, height: 28,
          borderRadius: "50%",
          border: isDone ? "none" : `2px solid ${t.border2}`,
          background: isDone ? "#10b981" : "transparent",
          cursor: "pointer",
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
        }}
      >
        {isDone && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </button>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 15,
          fontWeight: 500,
          color: isDone ? t.text3 : t.text,
          textDecoration: isDone ? "line-through" : "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {item.name}
        </p>
        {(item.quantity || item.unit) && (
          <p style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>
            {item.quantity} {item.unit}
          </p>
        )}
      </div>

      {/* Badge */}
      <span style={{
        fontSize: 11,
        padding: "3px 8px",
        borderRadius: 20,
        background: isDone ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.1)",
        color: isDone ? "#10b981" : "#f59e0b",
        fontWeight: 600,
        whiteSpace: "nowrap",
        flexShrink: 0,
        border: isDone ? "1px solid rgba(16,185,129,0.28)" : "1px solid rgba(245,158,11,0.22)",
      }}>
        {isDone ? "✓ নেওয়া হয়েছে" : "● নিতে হবে"}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(item)}
        style={{
          width: 32, height: 32,
          borderRadius: 8,
          border: "none",
          background: "rgba(239,68,68,0.08)",
          color: "#ef4444",
          cursor: "pointer",
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.18)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
    </div>
  );
}
