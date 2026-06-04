import { useState, useEffect, useCallback } from "react";

// ─── THEME & CONSTANTS ───────────────────────────────────────────────────────
const COLORS = {
  primary: "#009B4E",
  primaryDark: "#007A3D",
  primaryLight: "#E6F7EE",
  secondary: "#FF9416",
  secondaryDark: "#E67F00",
  secondaryLight: "#FFF2E3",
  success: "#009B4E",
  successLight: "#E6F7EE",
  warning: "#FF9416",
  warningLight: "#FFF2E3",
  danger: "#c81e1e",
  dangerLight: "#fde8e8",
  info: "#0e9f6e",
  infoLight: "#d5f5e3",
  bg: "#F7FBF8",
  bgCard: "#ffffff",
  sidebar: "#063D25",
  sidebarText: "#B7E7CB",
  sidebarActive: "#009B4E",
  text: "#123524",
  textMuted: "#64746A",
  border: "#DCEBE2",
  borderDark: "#B9D8C7",
};

const PAYMENT_METHODS = ["PIX","Bonificação","Depósito","TED","DOC","Transferência Bancária","Dinheiro"];
const STATUS_OPTIONS = ["Pendente","Pago","Parcial","Bonificado"];
const USER_TYPES = ["Administrador","Operador","Fornecedor"];
const ESTADOS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

// ─── INITIAL DATA ────────────────────────────────────────────────────────────
const initData = () => {
  const stored = localStorage.getItem("saas_data");
  if (stored) return JSON.parse(stored);
  return {
    users: [
      { id: 1, nome: "Administrador Master", email: "admin@sistema.com", senha: "admin123", tipo: "Administrador", fornecedor_id: null, ativo: true, created_at: "2024-01-01" },
      { id: 2, nome: "João Operador", email: "operador@sistema.com", senha: "op123", tipo: "Operador", fornecedor_id: null, ativo: true, created_at: "2024-01-15" },
      { id: 3, nome: "Maria Fornecedor", email: "fornecedor@sistema.com", senha: "forn123", tipo: "Fornecedor", fornecedor_id: 1, ativo: true, created_at: "2024-02-01" },
    ],
    fornecedores: [
      { id: 1, razao_social: "ABC Distribuidora Ltda", nome_fantasia: "ABC Distribuidora", cnpj: "12.345.678/0001-99", inscricao_estadual: "123456789", contato: "Carlos Silva", telefone: "(11) 3333-4444", celular: "(11) 99999-8888", email: "contato@abc.com", endereco: "Rua das Flores, 123", cidade: "São Paulo", estado: "SP", cep: "01310-100", observacoes: "Fornecedor parceiro desde 2020", created_at: "2024-01-10", saldo_devido: 15000, saldo_pago: 32000, saldo_bonificado: 3000 },
      { id: 2, razao_social: "XYZ Comércio S.A.", nome_fantasia: "XYZ Comércio", cnpj: "98.765.432/0001-11", inscricao_estadual: "987654321", contato: "Ana Costa", telefone: "(21) 2222-3333", celular: "(21) 98888-7777", email: "contato@xyz.com", endereco: "Av. Brasil, 456", cidade: "Rio de Janeiro", estado: "RJ", cep: "20040-020", observacoes: "", created_at: "2024-01-20", saldo_devido: 8500, saldo_pago: 21000, saldo_bonificado: 1500 },
      { id: 3, razao_social: "Tech Soluções ME", nome_fantasia: "TechSol", cnpj: "11.222.333/0001-44", inscricao_estadual: "111222333", contato: "Pedro Gomes", telefone: "(31) 4444-5555", celular: "(31) 97777-6666", email: "pedro@techsol.com", endereco: "Rua Mineiros, 789", cidade: "Belo Horizonte", estado: "MG", cep: "30130-110", observacoes: "Contrato anual", created_at: "2024-02-05", saldo_devido: 22000, saldo_pago: 45000, saldo_bonificado: 5000 },
    ],
    pagamentos: [
      { id: 1, fornecedor_id: 1, valor: 5000, forma_pagamento: "PIX", numero_nfe: "NF-001", observacao: "Pagamento referente jan/24", data_pagamento: "2024-01-15", created_at: "2024-01-15" },
      { id: 2, fornecedor_id: 1, valor: 3000, forma_pagamento: "Bonificação", numero_nfe: "NF-002", observacao: "Bonificação trimestral", data_pagamento: "2024-02-10", created_at: "2024-02-10" },
      { id: 3, fornecedor_id: 2, valor: 7000, forma_pagamento: "TED", numero_nfe: "NF-003", observacao: "Pagamento fevereiro", data_pagamento: "2024-02-20", created_at: "2024-02-20" },
      { id: 4, fornecedor_id: 3, valor: 12000, forma_pagamento: "Transferência Bancária", numero_nfe: "NF-004", observacao: "Parcela contrato anual", data_pagamento: "2024-03-05", created_at: "2024-03-05" },
      { id: 5, fornecedor_id: 1, valor: 8000, forma_pagamento: "PIX", numero_nfe: "NF-005", observacao: "Pagamento março", data_pagamento: "2024-03-15", created_at: "2024-03-15" },
      { id: 6, fornecedor_id: 2, valor: 4500, forma_pagamento: "PIX", numero_nfe: "NF-006", observacao: "Pagamento março", data_pagamento: "2024-03-25", created_at: "2024-03-25" },
      { id: 7, fornecedor_id: 3, valor: 9000, forma_pagamento: "DOC", numero_nfe: "NF-007", observacao: "Parcela 2 contrato", data_pagamento: "2024-04-10", created_at: "2024-04-10" },
      { id: 8, fornecedor_id: 1, valor: 6000, forma_pagamento: "Bonificação", numero_nfe: "NF-008", observacao: "Bonificação semestral", data_pagamento: "2024-04-20", created_at: "2024-04-20" },
    ],
    anexos: [
      { id: 1, pagamento_id: 1, nome_arquivo: "NF-001.pdf", tipo_arquivo: "PDF", created_at: "2024-01-15" },
      { id: 2, pagamento_id: 3, nome_arquivo: "NF-003.pdf", tipo_arquivo: "PDF", created_at: "2024-02-20" },
      { id: 3, pagamento_id: 4, nome_arquivo: "Contrato-TechSol.pdf", tipo_arquivo: "PDF", created_at: "2024-03-05" },
    ],
    logs: [
      { id: 1, usuario_id: 1, acao: "Login", descricao: "Login realizado com sucesso", ip: "192.168.1.1", created_at: "2024-04-20T08:00:00" },
      { id: 2, usuario_id: 1, acao: "Cadastro", descricao: "Fornecedor ABC Distribuidora cadastrado", ip: "192.168.1.1", created_at: "2024-04-20T08:30:00" },
      { id: 3, usuario_id: 2, acao: "Login", descricao: "Login realizado com sucesso", ip: "192.168.1.2", created_at: "2024-04-20T09:00:00" },
    ],
    nextId: { users: 4, fornecedores: 4, pagamentos: 9, anexos: 4, logs: 4 },
  };
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  app: { display: "flex", minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif", background: COLORS.bg, color: COLORS.text, fontSize: 14 },
  sidebar: { width: 240, background: COLORS.sidebar, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100, transition: "transform 0.2s" },
  sidebarLogo: { padding: "20px 20px 16px", borderBottom: `1px solid rgba(255,255,255,0.08)` },
  sidebarLogoText: { color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 },
  sidebarLogoSub: { color: COLORS.sidebarText, fontSize: 11, margin: "2px 0 0" },
  sidebarNav: { flex: 1, overflowY: "auto", padding: "12px 0" },
  sidebarSection: { color: "#475569", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 20px 4px" },
  sidebarItem: (active) => ({ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", cursor: "pointer", color: active ? "#fff" : COLORS.sidebarText, background: active ? COLORS.sidebarActive : "transparent", borderRadius: 0, fontSize: 13, fontWeight: active ? 500 : 400, transition: "all 0.15s", borderLeft: active ? `3px solid #60a5fa` : "3px solid transparent" }),
  sidebarUser: { padding: "12px 16px", borderTop: `1px solid rgba(255,255,255,0.08)`, display: "flex", alignItems: "center", gap: 10 },
  main: { marginLeft: 240, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" },
  topbar: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}`, padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 90 },
  content: { padding: 24, flex: 1 },
  pageTitle: { fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: COLORS.text },
  pageSub: { fontSize: 13, color: COLORS.textMuted, margin: "0 0 24px" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }),
  card: { background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 },
  cardTitle: { fontSize: 13, fontWeight: 500, color: COLORS.textMuted, margin: "0 0 8px" },
  cardValue: { fontSize: 26, fontWeight: 700, margin: 0 },
  cardSub: { fontSize: 12, color: COLORS.textMuted, margin: "4px 0 0" },
  btn: (variant = "primary", size = "md") => ({
    display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 500, borderRadius: 7, border: "none", fontSize: size === "sm" ? 12 : 13, padding: size === "sm" ? "5px 10px" : "8px 16px", transition: "all 0.15s",
    background: variant === "primary" ? COLORS.primary : variant === "danger" ? COLORS.danger : variant === "success" ? COLORS.success : variant === "warning" ? COLORS.warning : variant === "ghost" ? "transparent" : "#f1f5f9",
    color: ["primary","danger","success","warning"].includes(variant) ? "#fff" : variant === "ghost" ? COLORS.textMuted : COLORS.text,
    border: variant === "outline" ? `1px solid ${COLORS.border}` : "none",
  }),
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}`, background: "#f8fafc" },
  td: { padding: "11px 12px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.text, verticalAlign: "middle" },
  badge: (color) => ({ display: "inline-block", padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: color === "success" ? COLORS.successLight : color === "warning" ? COLORS.warningLight : color === "danger" ? COLORS.dangerLight : color === "info" ? COLORS.infoLight : COLORS.primaryLight, color: color === "success" ? COLORS.success : color === "warning" ? COLORS.warning : color === "danger" ? COLORS.danger : color === "info" ? COLORS.info : COLORS.primary }),
  input: { width: "100%", padding: "8px 11px", border: `1px solid ${COLORS.border}`, borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff", color: COLORS.text, fontFamily: "inherit" },
  select: { width: "100%", padding: "8px 11px", border: `1px solid ${COLORS.border}`, borderRadius: 7, fontSize: 13, outline: "none", background: "#fff", color: COLORS.text, fontFamily: "inherit", cursor: "pointer" },
  label: { fontSize: 12, fontWeight: 600, color: COLORS.textMuted, display: "block", marginBottom: 5 },
  formRow: { marginBottom: 14 },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 },
  modalBox: { background: "#fff", borderRadius: 12, padding: 28, width: "min(94vw, 640px)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  modalTitle: { fontSize: 17, fontWeight: 700, margin: "0 0 20px", color: COLORS.text },
  searchBar: { display: "flex", gap: 10, marginBottom: 16, alignItems: "center" },
  avatar: (size = 32) => ({ width: size, height: size, borderRadius: "50%", background: COLORS.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: COLORS.primary, flexShrink: 0 }),
  tabs: { display: "flex", gap: 0, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 20 },
  tab: (active) => ({ padding: "10px 18px", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? COLORS.primary : COLORS.textMuted, borderBottom: active ? `2px solid ${COLORS.primary}` : "2px solid transparent", marginBottom: -1, background: "none", border: "none", borderBottom: active ? `2px solid ${COLORS.primary}` : "2px solid transparent" }),
  loginBox: { minHeight: "100vh", background: `linear-gradient(135deg, ${COLORS.sidebar} 0%, ${COLORS.primaryDark} 55%, ${COLORS.secondaryDark} 100%)`, display: "flex", alignItems: "center", justifyContent: "center" },
  loginCard: { background: "#fff", borderRadius: 16, padding: 40, width: "min(90vw, 400px)", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" },
};

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color }) => {
  const icons = {
    dashboard: "M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z",
    suppliers: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    payments: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    reports: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    docs: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    audit: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    plus: "M12 4v16m8-8H4",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
    upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
    eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    check: "M5 13l4 4L19 7",
    x: "M6 18L18 6M6 6l12 12",
    arrow_left: "M10 19l-7-7m0 0l7-7m-7 7h18",
    building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    portal: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    filter: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {icons[name]?.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
    </svg>
  );
};

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = { Pago: "success", Pendente: "warning", Parcial: "info", Bonificado: "primary", Administrador: "primary", Operador: "info", Fornecedor: "success", Confirmado: "success", "Aguardando confirmação": "warning", "Em análise": "warning", Ativo: "success", Inativo: "danger", Rejeitado: "danger" };
  return <span style={S.badge(map[status] || "primary")}>{status}</span>;
};

// ─── MODAL ───────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide }) => (
  <div style={S.modal} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ ...S.modalBox, width: wide ? "min(94vw, 800px)" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ ...S.modalTitle, margin: 0 }}>{title}</h3>
        <button style={{ ...S.btn("ghost"), padding: 6 }} onClick={onClose}><Icon name="x" size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div style={S.modal} onClick={(e) => e.target === e.currentTarget && onCancel()}>
    <div style={{ ...S.modalBox, width: "min(90vw, 400px)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ background: COLORS.dangerLight, borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="trash" size={18} color={COLORS.danger} />
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 600, color: COLORS.text, fontSize: 15 }}>Confirmar exclusão</p>
          <p style={{ margin: "6px 0 0", color: COLORS.textMuted, fontSize: 13 }}>{message}</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={S.btn("outline")} onClick={onCancel}>Cancelar</button>
        <button style={S.btn("danger")} onClick={onConfirm}>Excluir</button>
      </div>
    </div>
  </div>
);

// ─── FORMAT CURRENCY ──────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "-";

// ─── METRIC CARD ──────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, sub, color, icon }) => (
  <div style={{ ...S.card, borderLeft: `4px solid ${color || COLORS.primary}` }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <p style={S.cardTitle}>{label}</p>
        <p style={{ ...S.cardValue, color: color || COLORS.text, fontSize: 20 }}>{value}</p>
        {sub && <p style={S.cardSub}>{sub}</p>}
      </div>
      {icon && <div style={{ background: `${color}20`, borderRadius: 10, padding: 10, color }}><Icon name={icon} size={20} color={color} /></div>}
    </div>
  </div>
);

// ─── CHART COMPONENT ──────────────────────────────────────────────────────────
const SimpleChart = ({ type, data, labels, color = COLORS.primary, height = 200 }) => {
  const max = Math.max(...data, 1);
  if (type === "bar") {
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, padding: "10px 0 20px" }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: COLORS.textMuted }}>{v > 999 ? (v / 1000).toFixed(0) + "k" : v}</span>
            <div style={{ width: "100%", background: color, borderRadius: "4px 4px 0 0", height: `${Math.max((v / max) * (height - 50), 4)}px`, opacity: 0.8, transition: "height 0.3s" }} />
            <span style={{ fontSize: 9, color: COLORS.textMuted, textAlign: "center" }}>{labels[i]}</span>
          </div>
        ))}
      </div>
    );
  }
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * 100, y: 100 - (v / max) * 85 }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${path} L${pts[pts.length - 1].x},100 L${pts[0].x},100 Z`;
  return (
    <div style={{ position: "relative", height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: height - 20 }}>
        <defs><linearGradient id="lg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill="url(#lg)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} />)}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
        {labels.map((l, i) => <span key={i} style={{ fontSize: 9, color: COLORS.textMuted }}>{l}</span>)}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin, portalMode, data, setData, onBackHome }) => {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [cadastro, setCadastro] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    contato: "",
    telefone: "",
    cidade: "",
    estado: "SP",
  });

  const updateCadastro = (field, value) => setCadastro(prev => ({ ...prev, [field]: value }));

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      const base = localStorage.getItem("saas_data") ? JSON.parse(localStorage.getItem("saas_data")) : initData();
      const user = base.users.find(u => u.email === email && u.senha === senha);
      if (!user) { setError("E-mail ou senha incorretos."); setLoading(false); return; }
      if (user.tipo === "Fornecedor" && !user.ativo) { setError("Seu cadastro foi para análise. Aguarde o administrador vincular sua conta ao fornecedor."); setLoading(false); return; }
      if (!user.ativo) { setError("Usuário inativo. Contate o administrador."); setLoading(false); return; }
      if (portalMode && user.tipo !== "Fornecedor") { setError("Acesso restrito ao portal de fornecedores."); setLoading(false); return; }
      if (!portalMode && user.tipo === "Fornecedor") { setError("Use o portal do fornecedor para acessar."); setLoading(false); return; }
      if (setData) setData(base);
      setLoading(false);
      onLogin(user);
    }, 600);
  };

  const handleCadastro = () => {
    setError("");

    if (!cadastro.nome || !cadastro.email || !cadastro.senha) {
      setError("Preencha nome, e-mail e senha.");
      return;
    }

    if (cadastro.senha !== cadastro.confirmarSenha) {
      setError("As senhas não conferem.");
      return;
    }

    if (portalMode && (!cadastro.razao_social || !cadastro.cnpj)) {
      setError("Preencha razão social e CNPJ do fornecedor.");
      return;
    }

    const next = { ...(data || initData()) };
    next.users = [...(next.users || [])];
    next.fornecedores = [...(next.fornecedores || [])];
    next.logs = [...(next.logs || [])];

    if (next.users.some(u => u.email.toLowerCase() === cadastro.email.toLowerCase())) {
      setError("Já existe um usuário cadastrado com esse e-mail.");
      return;
    }

    let fornecedorId = null;
    let tipo = "Fornecedor";

    if (portalMode) {
      fornecedorId = null;
      tipo = "Fornecedor";
    } else {
      const emailsDemo = ["admin@sistema.com", "operador@sistema.com", "fornecedor@sistema.com"];
      const usuariosReaisSistema = next.users.filter(u => !emailsDemo.includes(String(u.email).toLowerCase()) && (u.tipo === "Administrador" || u.tipo === "Operador"));
      tipo = usuariosReaisSistema.length === 0 ? "Administrador" : "Operador";
    }

    const userId = next.nextId.users++;
    const novoUsuario = {
      id: userId,
      nome: cadastro.nome,
      email: cadastro.email,
      senha: cadastro.senha,
      tipo,
      fornecedor_id: fornecedorId,
      ativo: portalMode ? false : true,
      fornecedor_pendente: portalMode ? {
        razao_social: cadastro.razao_social,
        nome_fantasia: cadastro.nome_fantasia,
        cnpj: cadastro.cnpj,
        contato: cadastro.contato || cadastro.nome,
        telefone: cadastro.telefone,
        cidade: cadastro.cidade,
        estado: cadastro.estado || "SP"
      } : null,
      status_cadastro: portalMode ? "Em análise" : "Ativo",
      created_at: new Date().toISOString().slice(0, 10)
    };

    next.users.push(novoUsuario);
    next.logs.push({
      id: next.nextId.logs++,
      usuario_id: userId,
      acao: "Cadastro",
      descricao: portalMode ? "Fornecedor cadastrado pelo portal" : `Usuário cadastrado como ${tipo}`,
      ip: "127.0.0.1",
      created_at: new Date().toISOString()
    });

    setData(next);
    setEmail(cadastro.email);
    setSenha(cadastro.senha);
    setModo("login");
    setError(portalMode ? "Seu cadastro foi para análise. Aguarde o administrador vincular sua conta ao fornecedor." : `Cadastro realizado como ${tipo}. Agora clique em Entrar.`);
  };

  const renderCadastroField = (label, field, type = "text", opts) => (
    <div style={S.formRow} key={field}>
      <label style={S.label}>{label}</label>
      {opts ? (
        <select style={S.select} value={cadastro[field] || ""} onChange={e => updateCadastro(field, e.target.value)}>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input style={S.input} type={type} value={cadastro[field] || ""} onChange={e => updateCadastro(field, e.target.value)} />
      )}
    </div>
  );

  return (
    <div style={S.loginBox}>
      <div style={S.loginCard}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: portalMode ? COLORS.secondary : COLORS.primary, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            {portalMode ? <Icon name="portal" size={26} color="#fff" /> : <Icon name="building" size={26} color="#fff" />}
          </div>
          <img src="/logo-gigantao.png" alt="Gigantão" style={{maxWidth:"220px",marginBottom:"12px"}} />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            {portalMode ? "Portal do Fornecedor" : "Sistema de Gestão"}
          </h2>
          <p style={{ margin: "6px 0 0", color: COLORS.textMuted, fontSize: 13 }}>
            {modo === "cadastro" ? "Criar novo cadastro" : portalMode ? "Acesse suas informações financeiras" : "Gestão financeira de fornecedores"}
          </p>
        </div>

        {error && <div style={{ background: error.includes("realizado") ? COLORS.successLight : COLORS.dangerLight, color: error.includes("realizado") ? COLORS.success : COLORS.danger, padding: "10px 14px", borderRadius: 7, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {modo === "login" ? (
          <>
            <div style={S.formRow}>
              <label style={S.label}>E-mail</label>
              <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Senha</label>
              <input style={S.input} type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <button style={{ ...S.btn("primary"), width: "100%", justifyContent: "center", padding: "11px", marginTop: 4 }} onClick={handleLogin} disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
            <div style={{display:"flex",gap:"10px",marginTop:"12px"}}>
              <button style={{ ...S.btn("outline"), flex:1, justifyContent:"center" }} onClick={() => { setError(""); setModo("cadastro"); }}>
                Cadastrar
              </button>
            </div>
            {portalMode && onBackHome && (
              <button style={{ ...S.btn("ghost"), width: "100%", justifyContent: "center", padding: "11px", marginTop: 8 }} onClick={onBackHome}>
                <Icon name="arrow_left" size={14} /> Voltar para login administrativo
              </button>
            )}
          </>
        ) : (
          <>
            <div style={{ ...S.grid(1), gap: 0 }}>
              {renderCadastroField("Nome", "nome")}
              {renderCadastroField("E-mail", "email", "email")}
              {renderCadastroField("Senha", "senha", "password")}
              {renderCadastroField("Confirmar senha", "confirmarSenha", "password")}
              {portalMode && (
                <>
                  {renderCadastroField("Razão Social", "razao_social")}
                  {renderCadastroField("Nome Fantasia", "nome_fantasia")}
                  {renderCadastroField("CNPJ", "cnpj")}
                  {renderCadastroField("Contato", "contato")}
                  {renderCadastroField("Telefone", "telefone")}
                  {renderCadastroField("Cidade", "cidade")}
                  {renderCadastroField("Estado", "estado", "text", ESTADOS)}
                </>
              )}
            </div>
            <button style={{ ...S.btn("success"), width: "100%", justifyContent: "center", padding: "11px", marginTop: 4 }} onClick={handleCadastro}>
              Salvar cadastro
            </button>
            <button style={{ ...S.btn("ghost"), width: "100%", justifyContent: "center", padding: "11px", marginTop: 8 }} onClick={() => { setError(""); setModo("login"); }}>
              Voltar para login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = ({ data, currentUser }) => {
  const totalDevido = data.fornecedores.reduce((s, f) => s + f.saldo_devido, 0);
  const totalPago = data.fornecedores.reduce((s, f) => s + f.saldo_pago, 0);
  const totalBonif = data.fornecedores.reduce((s, f) => s + f.saldo_bonificado, 0);
  const recentPagamentos = [...data.pagamentos].sort((a, b) => b.id - a.id).slice(0, 6);

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  const pagByMonth = months.map((_, i) => data.pagamentos.filter(p => new Date(p.data_pagamento).getMonth() === i && p.forma_pagamento !== "Bonificação").reduce((s, p) => s + p.valor, 0));
  const bonByMonth = months.map((_, i) => data.pagamentos.filter(p => new Date(p.data_pagamento).getMonth() === i && p.forma_pagamento === "Bonificação").reduce((s, p) => s + p.valor, 0));

  return (
    <div>
      <h1 style={S.pageTitle}>Dashboard</h1>
      <p style={S.pageSub}>Visão geral do sistema financeiro</p>
      <div style={S.grid(3)}>
        <MetricCard label="Total Devido" value={fmt(totalDevido)} icon="payments" color={COLORS.danger} sub={`${data.fornecedores.length} fornecedores`} />
        <MetricCard label="Total Pago" value={fmt(totalPago)} icon="check" color={COLORS.success} sub={`${data.pagamentos.length} pagamentos`} />
        <MetricCard label="Total Bonificado" value={fmt(totalBonif)} icon="info" color={COLORS.warning} />
      </div>
      <div style={{ ...S.grid(2), marginTop: 16 }}>
        <MetricCard label="Fornecedores Ativos" value={data.fornecedores.length} icon="suppliers" color={COLORS.primary} />
        <MetricCard label="Saldo Pendente" value={fmt(totalDevido)} icon="filter" color="#9333ea" />
      </div>
      <div style={{ ...S.grid(2), marginTop: 16 }}>
        <div style={S.card}>
          <p style={{ ...S.cardTitle, marginBottom: 12, fontSize: 14, fontWeight: 600, color: COLORS.text }}>Pagamentos por Mês</p>
          <SimpleChart type="bar" data={pagByMonth} labels={months} color={COLORS.primary} height={160} />
        </div>
        <div style={S.card}>
          <p style={{ ...S.cardTitle, marginBottom: 12, fontSize: 14, fontWeight: 600, color: COLORS.text }}>Evolução Financeira</p>
          <SimpleChart type="line" data={pagByMonth} labels={months} color={COLORS.success} height={160} />
        </div>
      </div>
      <div style={{ ...S.card, marginTop: 16 }}>
        <p style={{ ...S.cardTitle, fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 14 }}>Últimos Pagamentos</p>
        <table style={S.table}>
          <thead>
            <tr>
              {["Fornecedor", "Valor", "Forma", "NF-e", "Data"].map(h => <th key={h} style={S.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {recentPagamentos.map(p => {
              const forn = data.fornecedores.find(f => f.id === p.fornecedor_id);
              return (
                <tr key={p.id}>
                  <td style={S.td}>{forn?.nome_fantasia || forn?.razao_social || "-"}</td>
                  <td style={{ ...S.td, color: COLORS.success, fontWeight: 600 }}>{fmt(p.valor)}</td>
                  <td style={S.td}><StatusBadge status={p.forma_pagamento === "Bonificação" ? "Bonificado" : "Pago"} /></td>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{p.numero_nfe}</td>
                  <td style={S.td}>{fmtDate(p.data_pagamento)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── SUPPLIERS SCREEN ─────────────────────────────────────────────────────────
const SuppliersScreen = ({ data, setData, currentUser, addLog }) => {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [detail, setDetail] = useState(null);

  const canEdit = currentUser.tipo === "Administrador";
  const canDelete = currentUser.tipo === "Administrador";

  const filtered = data.fornecedores.filter(f =>
    f.razao_social.toLowerCase().includes(search.toLowerCase()) ||
    f.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
    f.cnpj?.includes(search)
  );

  const openNew = () => { setForm({ estado: "SP" }); setModal("new"); };
  const openEdit = (f) => { setForm({ ...f }); setModal("edit"); };
  const openDetail = (f) => setDetail(f);

  const saveForm = () => {
    if (!form.razao_social || !form.cnpj) return alert("Razão social e CNPJ são obrigatórios.");
    const next = { ...data };
    if (modal === "new") {
      const id = next.nextId.fornecedores++;
      next.fornecedores.push({ ...form, id, saldo_devido: 0, saldo_pago: 0, saldo_bonificado: 0, created_at: new Date().toISOString().slice(0, 10) });
      addLog(`Fornecedor ${form.razao_social} cadastrado`);
    } else {
      next.fornecedores = next.fornecedores.map(f => f.id === form.id ? { ...f, ...form } : f);
      addLog(`Fornecedor ${form.razao_social} atualizado`);
    }
    setData(next);
    setModal(null);
  };

  const doDelete = (id) => {
    const forn = data.fornecedores.find(f => f.id === id);
    const next = { ...data };
    next.fornecedores = next.fornecedores.filter(f => f.id !== id);
    next.pagamentos = next.pagamentos.filter(p => p.fornecedor_id !== id);
    addLog(`Fornecedor ${forn?.razao_social} excluído`);
    setData(next);
    setConfirm(null);
  };

  const F = ({ label, field, type = "text", opts }) => (
    <div style={S.formRow}>
      <label style={S.label}>{label}</label>
      {opts ? (
        <select style={S.select} value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}>
          <option value="">Selecione...</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input style={S.input} type={type} value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
      )}
    </div>
  );

  return (
    <div>
      <h1 style={S.pageTitle}>Fornecedores</h1>
      <p style={S.pageSub}>Gerenciar cadastro de fornecedores</p>
      <div style={S.searchBar}>
        <div style={{ position: "relative", flex: 1 }}>
          <Icon name="search" size={15} color={COLORS.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input style={{ ...S.input, paddingLeft: 34 }} placeholder="Buscar por nome, fantasia ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {canEdit && <button style={S.btn("primary")} onClick={openNew}><Icon name="plus" size={15} color="#fff" /> Novo Fornecedor</button>}
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>{["Razão Social / Fantasia", "CNPJ", "Contato", "Cidade/UF", "Saldo Devido", "Saldo Pago", "Ações"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted, padding: 32 }}>Nenhum fornecedor encontrado</td></tr>}
            {filtered.map(f => (
              <tr key={f.id} style={{ cursor: "pointer" }}>
                <td style={S.td}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{f.razao_social}</p>
                  <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>{f.nome_fantasia}</p>
                </td>
                <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{f.cnpj}</td>
                <td style={S.td}>{f.contato || f.email}</td>
                <td style={S.td}>{f.cidade}/{f.estado}</td>
                <td style={{ ...S.td, color: COLORS.danger, fontWeight: 600 }}>{fmt(f.saldo_devido)}</td>
                <td style={{ ...S.td, color: COLORS.success, fontWeight: 600 }}>{fmt(f.saldo_pago)}</td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ ...S.btn("outline", "sm"), padding: "5px 8px" }} onClick={() => openDetail(f)} title="Ver detalhes"><Icon name="eye" size={13} /></button>
                    {canEdit && <button style={{ ...S.btn("outline", "sm"), padding: "5px 8px" }} onClick={() => openEdit(f)} title="Editar"><Icon name="edit" size={13} /></button>}
                    {canDelete && <button style={{ ...S.btn("danger", "sm"), padding: "5px 8px" }} onClick={() => setConfirm(f.id)} title="Excluir"><Icon name="trash" size={13} color="#fff" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detail && (
        <Modal title={detail.razao_social} onClose={() => setDetail(null)} wide>
          <div style={S.grid(2)}>
            {[
              ["Razão Social", detail.razao_social], ["Nome Fantasia", detail.nome_fantasia],
              ["CNPJ", detail.cnpj], ["Inscrição Estadual", detail.inscricao_estadual],
              ["Contato", detail.contato], ["Telefone", detail.telefone],
              ["Celular", detail.celular], ["E-mail", detail.email],
              ["Endereço", detail.endereco], ["Cidade", detail.cidade],
              ["Estado", detail.estado], ["CEP", detail.cep],
            ].map(([l, v]) => (
              <div key={l} style={{ marginBottom: 12 }}>
                <p style={{ ...S.label, marginBottom: 2 }}>{l}</p>
                <p style={{ margin: 0, fontSize: 13, color: COLORS.text }}>{v || "-"}</p>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, marginTop: 8 }}>
            <div style={S.grid(3)}>
              <MetricCard label="Saldo Devido" value={fmt(detail.saldo_devido)} color={COLORS.danger} />
              <MetricCard label="Total Pago" value={fmt(detail.saldo_pago)} color={COLORS.success} />
              <MetricCard label="Bonificado" value={fmt(detail.saldo_bonificado)} color={COLORS.warning} />
            </div>
          </div>
          {detail.observacoes && <div style={{ marginTop: 14, background: "#f8fafc", borderRadius: 8, padding: 12 }}>
            <p style={S.label}>Observações</p>
            <p style={{ margin: 0, fontSize: 13 }}>{detail.observacoes}</p>
          </div>}
        </Modal>
      )}

      {/* Edit / New Modal */}
      {(modal === "new" || modal === "edit") && (
        <Modal title={modal === "new" ? "Novo Fornecedor" : "Editar Fornecedor"} onClose={() => setModal(null)} wide>
          <div style={S.grid(2)}>
            <F label="Razão Social *" field="razao_social" />
            <F label="Nome Fantasia" field="nome_fantasia" />
            <F label="CNPJ *" field="cnpj" />
            <F label="Inscrição Estadual" field="inscricao_estadual" />
            <F label="Contato" field="contato" />
            <F label="Telefone" field="telefone" />
            <F label="Celular" field="celular" />
            <F label="E-mail" field="email" type="email" />
            <div style={{ gridColumn: "span 2" }}><F label="Endereço" field="endereco" /></div>
            <F label="Cidade" field="cidade" />
            <F label="Estado" field="estado" opts={ESTADOS} />
            <F label="CEP" field="cep" />
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Observações</label>
            <textarea style={{ ...S.input, minHeight: 72, resize: "vertical" }} value={form.observacoes || ""} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button style={S.btn("outline")} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btn("primary")} onClick={saveForm}>Salvar</button>
          </div>
        </Modal>
      )}

      {confirm && <ConfirmModal message="Tem certeza que deseja excluir este fornecedor? Todos os pagamentos vinculados também serão removidos." onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
};

// ─── PAYMENTS SCREEN ──────────────────────────────────────────────────────────
const PaymentsScreen = ({ data, setData, currentUser, addLog }) => {
  const [search, setSearch] = useState("");
  const [filterForn, setFilterForn] = useState("");
  const [filterForma, setFilterForma] = useState("");
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ data_pagamento: new Date().toISOString().slice(0, 10), forma_pagamento: "PIX", tipo_anexo: "Comprovante" });

  const enviarPagamentoFornecedor = () => {
    if (!payForm.valor) return alert("Informe o valor do pagamento.");
    if (!payForm.anexo_file && !payForm.anexo_nome) return alert("Anexe o comprovante ou a nota de bonificação.");
    const next = { ...data, pagamentos: [...data.pagamentos], anexos: [...(data.anexos || [])] };
    const id = next.nextId.pagamentos++;
    const anexoNome = payForm.anexo_file?.name || payForm.anexo_nome || "";
    const novo = {
      id,
      fornecedor_id: currentUser.fornecedor_id,
      valor: Number(payForm.valor),
      forma_pagamento: payForm.forma_pagamento || "PIX",
      numero_nfe: payForm.numero_nfe || "",
      observacao: payForm.observacao || "Enviado pelo fornecedor para validação do administrador",
      data_pagamento: payForm.data_pagamento || new Date().toISOString().slice(0, 10),
      anexo_nome: anexoNome,
      tipo_anexo: payForm.tipo_anexo || (payForm.forma_pagamento === "Bonificação" ? "Nota de bonificação" : "Comprovante"),
      enviado_por: "Fornecedor",
      confirmado: false,
      status_confirmacao: "Aguardando confirmação",
      created_at: new Date().toISOString()
    };
    next.pagamentos.push(novo);
    next.anexos.push({ id: next.nextId.anexos++, pagamento_id: id, nome_arquivo: anexoNome, tipo_arquivo: novo.tipo_anexo, created_at: new Date().toISOString() });
    next.logs = [...(next.logs || []), { id: next.nextId.logs++, usuario_id: currentUser.id, acao: "Envio", descricao: "Fornecedor enviou comprovante/nota para confirmação", ip: "127.0.0.1", created_at: new Date().toISOString() }];
    setData(next);
    setPayModal(false);
    setPayForm({ data_pagamento: new Date().toISOString().slice(0, 10), forma_pagamento: "PIX", tipo_anexo: "Comprovante" });
    alert("Enviado para validação do administrador.");
  };

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ data_pagamento: new Date().toISOString().slice(0, 10), forma_pagamento: "PIX" });
  const [confirm, setConfirm] = useState(null);
  const canDelete = currentUser.tipo === "Administrador";

  const statusPagamento = (p) => p.status_confirmacao || (p.confirmado === false ? "Aguardando confirmação" : "Confirmado");

  const filtered = data.pagamentos.filter(p => {
    const forn = data.fornecedores.find(f => f.id === p.fornecedor_id);
    const matchSearch = !search || p.numero_nfe?.includes(search) || forn?.razao_social?.toLowerCase().includes(search.toLowerCase()) || p.anexo_nome?.toLowerCase().includes(search.toLowerCase());
    const matchForn = !filterForn || p.fornecedor_id === Number(filterForn);
    const matchForma = !filterForma || p.forma_pagamento === filterForma;
    return matchSearch && matchForn && matchForma;
  }).sort((a, b) => b.id - a.id);

  const aplicarSaldo = (next, pagamento) => {
    const fIdx = next.fornecedores.findIndex(f => f.id === Number(pagamento.fornecedor_id));
    if (fIdx !== -1) {
      const valor = Number(pagamento.valor);
      if (pagamento.forma_pagamento === "Bonificação") {
        next.fornecedores[fIdx].saldo_bonificado += valor;
        next.fornecedores[fIdx].saldo_devido = Math.max(0, next.fornecedores[fIdx].saldo_devido - valor);
      } else {
        next.fornecedores[fIdx].saldo_pago += valor;
        next.fornecedores[fIdx].saldo_devido = Math.max(0, next.fornecedores[fIdx].saldo_devido - valor);
      }
    }
  };

  const savePayment = () => {
    if (!form.fornecedor_id || !form.valor) return alert("Fornecedor e valor são obrigatórios.");
    const next = { ...data, pagamentos: [...data.pagamentos], fornecedores: data.fornecedores.map(f => ({ ...f })), anexos: [...(data.anexos || [])] };
    const id = next.nextId.pagamentos++;
    const valor = Number(form.valor);
    const anexoNome = form.anexo_file?.name || form.anexo_nome || "";
    const novo = {
      ...form,
      id,
      fornecedor_id: Number(form.fornecedor_id),
      valor,
      anexo_nome: anexoNome,
      tipo_anexo: form.tipo_anexo || (form.forma_pagamento === "Bonificação" ? "Nota de bonificação" : "Comprovante"),
      enviado_por: currentUser.tipo,
      confirmado: true,
      status_confirmacao: "Confirmado",
      confirmado_por: currentUser.nome,
      confirmado_em: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    delete novo.anexo_file;
    next.pagamentos.push(novo);
    if (anexoNome) {
      next.anexos.push({ id: next.nextId.anexos++, pagamento_id: id, nome_arquivo: anexoNome, tipo_arquivo: novo.tipo_anexo, created_at: new Date().toISOString() });
    }
    aplicarSaldo(next, novo);
    const fIdx = next.fornecedores.findIndex(f => f.id === Number(form.fornecedor_id));
    addLog(`Pagamento de ${fmt(valor)} registrado para ${next.fornecedores[fIdx]?.razao_social}`);
    setData(next);
    setModal(false);
    setForm({ data_pagamento: new Date().toISOString().slice(0, 10), forma_pagamento: "PIX" });
  };

  const confirmarPagamento = (id) => {
    const pagamento = data.pagamentos.find(p => p.id === id);
    if (!pagamento) return;
    const next = { ...data, pagamentos: data.pagamentos.map(p => ({ ...p })), fornecedores: data.fornecedores.map(f => ({ ...f })) };
    const idx = next.pagamentos.findIndex(p => p.id === id);
    next.pagamentos[idx] = { ...next.pagamentos[idx], confirmado: true, status_confirmacao: "Confirmado", confirmado_por: currentUser.nome, confirmado_em: new Date().toISOString() };
    aplicarSaldo(next, next.pagamentos[idx]);
    addLog(`Pagamento ${pagamento.numero_nfe || "#" + pagamento.id} confirmado pelo administrador`);
    setData(next);
  };

  const doDelete = (id) => {
    const pag = data.pagamentos.find(p => p.id === id);
    const next = { ...data, pagamentos: [...data.pagamentos], fornecedores: data.fornecedores.map(f => ({ ...f })), anexos: [...(data.anexos || [])] };
    const fIdx = next.fornecedores.findIndex(f => f.id === pag.fornecedor_id);
    if (fIdx !== -1 && pag.confirmado !== false && statusPagamento(pag) === "Confirmado") {
      if (pag.forma_pagamento === "Bonificação") next.fornecedores[fIdx].saldo_bonificado -= pag.valor;
      else next.fornecedores[fIdx].saldo_pago -= pag.valor;
      next.fornecedores[fIdx].saldo_devido += pag.valor;
    }
    next.pagamentos = next.pagamentos.filter(p => p.id !== id);
    next.anexos = next.anexos.filter(a => a.pagamento_id !== id);
    addLog(`Pagamento ${pag.numero_nfe || "#" + pag.id} excluído`);
    setData(next);
    setConfirm(null);
  };

  return (
    <div>
      <h1 style={S.pageTitle}>Pagamentos</h1>
      <p style={S.pageSub}>Registrar, anexar comprovantes/notas e confirmar pagamentos enviados pelo fornecedor</p>
      <div style={S.searchBar}>
        <input style={{ ...S.input, flex: 1 }} placeholder="Buscar por NF-e, fornecedor ou anexo..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...S.select, width: 200 }} value={filterForn} onChange={e => setFilterForn(e.target.value)}>
          <option value="">Todos fornecedores</option>
          {data.fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
        </select>
        <select style={{ ...S.select, width: 180 }} value={filterForma} onChange={e => setFilterForma(e.target.value)}>
          <option value="">Todas as formas</option>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button style={S.btn("primary")} onClick={() => setModal(true)}><Icon name="plus" size={15} color="#fff" /> Novo Pagamento</button>
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>{["#", "Fornecedor", "Valor", "Forma", "Anexo", "Status", "NF-e", "Data", "Ações"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted, padding: 32 }}>Nenhum pagamento encontrado</td></tr>}
            {filtered.map(p => {
              const forn = data.fornecedores.find(f => f.id === p.fornecedor_id);
              const st = statusPagamento(p);
              return (
                <tr key={p.id}>
                  <td style={{ ...S.td, color: COLORS.textMuted, fontFamily: "monospace" }}>#{p.id}</td>
                  <td style={S.td}>{forn?.nome_fantasia || forn?.razao_social || "-"}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: p.forma_pagamento === "Bonificação" ? COLORS.warning : COLORS.success }}>{fmt(p.valor)}</td>
                  <td style={S.td}><StatusBadge status={p.forma_pagamento === "Bonificação" ? "Bonificado" : "Pago"} /></td>
                  <td style={S.td}>{p.anexo_nome ? <span style={{ fontSize: 12 }}>📎 {p.tipo_anexo}: {p.anexo_nome}</span> : "-"}</td>
                  <td style={S.td}><StatusBadge status={st} /></td>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{p.numero_nfe || "-"}</td>
                  <td style={S.td}>{fmtDate(p.data_pagamento)}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {currentUser.tipo === "Administrador" && st === "Aguardando confirmação" && (
                        <button style={{ ...S.btn("success", "sm"), padding: "4px 7px" }} onClick={() => confirmarPagamento(p.id)}>Confirmar</button>
                      )}
                      {canDelete && <button style={{ ...S.btn("danger", "sm"), padding: "4px 7px" }} onClick={() => setConfirm(p.id)}><Icon name="trash" size={12} color="#fff" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Registrar Pagamento" onClose={() => setModal(false)}>
          <div style={S.formRow}>
            <label style={S.label}>Fornecedor *</label>
            <select style={S.select} value={form.fornecedor_id || ""} onChange={e => setForm(p => ({ ...p, fornecedor_id: e.target.value }))}>
              <option value="">Selecione...</option>
              {data.fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
            </select>
          </div>
          <div style={S.grid(2)}>
            <div style={S.formRow}>
              <label style={S.label}>Valor (R$) *</label>
              <input style={S.input} type="number" value={form.valor || ""} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} />
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Data do Pagamento</label>
              <input style={S.input} type="date" value={form.data_pagamento || ""} onChange={e => setForm(p => ({ ...p, data_pagamento: e.target.value }))} />
            </div>
          </div>
          <div style={S.grid(2)}>
            <div style={S.formRow}>
              <label style={S.label}>Forma de Pagamento</label>
              <select style={S.select} value={form.forma_pagamento || ""} onChange={e => setForm(p => ({ ...p, forma_pagamento: e.target.value, tipo_anexo: e.target.value === "Bonificação" ? "Nota de bonificação" : "Comprovante" }))}>
                <option value="">Selecione...</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Número NF-e</label>
              <input style={S.input} value={form.numero_nfe || ""} onChange={e => setForm(p => ({ ...p, numero_nfe: e.target.value }))} placeholder="NF-000" />
            </div>
          </div>
          <div style={S.grid(2)}>
            <div style={S.formRow}>
              <label style={S.label}>Tipo de anexo</label>
              <select style={S.select} value={form.tipo_anexo || ""} onChange={e => setForm(p => ({ ...p, tipo_anexo: e.target.value }))}>
                <option value="">Selecione...</option>
                <option value="Comprovante">Comprovante</option>
                <option value="Nota de bonificação">Nota de bonificação</option>
              </select>
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Anexar arquivo</label>
              <input style={S.input} type="file" accept=".pdf,.jpg,.jpeg,.png,.xml" onChange={e => setForm(p => ({ ...p, anexo_file: e.target.files?.[0], anexo_nome: e.target.files?.[0]?.name || "" }))} />
            </div>
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Observação</label>
            <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} value={form.observacao || ""} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={S.btn("outline")} onClick={() => setModal(false)}>Cancelar</button>
            <button style={S.btn("primary")} onClick={savePayment}>Registrar e confirmar pagamento</button>
          </div>
        </Modal>
      )}
      {confirm && <ConfirmModal message="Excluir este pagamento? O saldo do fornecedor será revertido somente se ele já estiver confirmado." onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
};

// ─── FINANCIAL CONTROL SCREEN ─────────────────────────────────────────────────
const FinancialScreen = ({ data, setData, currentUser, addLog }) => {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const canEdit = currentUser.tipo === "Administrador";

  const saveFinancial = () => {
    if (!form.fornecedor_id || !form.valor_devido) return alert("Fornecedor e valor são obrigatórios.");
    const next = { ...data };
    const fIdx = next.fornecedores.findIndex(f => f.id === Number(form.fornecedor_id));
    if (fIdx !== -1) {
      next.fornecedores[fIdx].saldo_devido += Number(form.valor_devido);
      addLog(`Saldo devedor atualizado para ${next.fornecedores[fIdx].razao_social}`);
    }
    setData(next);
    setModal(null);
    setForm({});
  };

  return (
    <div>
      <h1 style={S.pageTitle}>Controle Financeiro</h1>
      <p style={S.pageSub}>Gerenciar saldos e valores devidos por fornecedor</p>
      {canEdit && (
        <div style={{ marginBottom: 16 }}>
          <button style={S.btn("primary")} onClick={() => setModal("add")}><Icon name="plus" size={15} color="#fff" /> Lançar Valor Devido</button>
        </div>
      )}
      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>{["Fornecedor", "CNPJ", "Valor Devido", "Total Pago", "Bonificado", "Saldo", "Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.fornecedores.map(f => {
              const saldo = f.saldo_devido;
              const status = saldo <= 0 ? "Pago" : f.saldo_pago > 0 ? "Parcial" : "Pendente";
              return (
                <tr key={f.id}>
                  <td style={S.td}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{f.razao_social}</p>
                    <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>{f.nome_fantasia}</p>
                  </td>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{f.cnpj}</td>
                  <td style={{ ...S.td, color: COLORS.danger, fontWeight: 700 }}>{fmt(f.saldo_devido)}</td>
                  <td style={{ ...S.td, color: COLORS.success, fontWeight: 700 }}>{fmt(f.saldo_pago)}</td>
                  <td style={{ ...S.td, color: COLORS.warning, fontWeight: 700 }}>{fmt(f.saldo_bonificado)}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{fmt(saldo)}</td>
                  <td style={S.td}><StatusBadge status={status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal === "add" && (
        <Modal title="Lançar Valor Devido" onClose={() => setModal(null)}>
          <div style={S.formRow}>
            <label style={S.label}>Fornecedor *</label>
            <select style={S.select} value={form.fornecedor_id || ""} onChange={e => setForm(p => ({ ...p, fornecedor_id: e.target.value }))}>
              <option value="">Selecione...</option>
              {data.fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
            </select>
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Valor Devido (R$) *</label>
            <input style={S.input} type="number" value={form.valor_devido || ""} onChange={e => setForm(p => ({ ...p, valor_devido: e.target.value }))} placeholder="0,00" />
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Data de Vencimento</label>
            <input style={S.input} type="date" value={form.vencimento || ""} onChange={e => setForm(p => ({ ...p, vencimento: e.target.value }))} />
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Status</label>
            <select style={S.select} value={form.status || ""} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="">Selecione...</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={S.btn("outline")} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btn("primary")} onClick={saveFinancial}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── DOCUMENTS SCREEN ─────────────────────────────────────────────────────────
const DocumentsScreen = ({ data, setData, currentUser, addLog }) => {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const canDelete = currentUser.tipo === "Administrador";

  const addAnexo = () => {
    if (!form.pagamento_id || !form.nome_arquivo) return alert("Selecione o pagamento e informe o nome do arquivo.");
    const next = { ...data };
    const id = next.nextId.anexos++;
    next.anexos.push({ id, pagamento_id: Number(form.pagamento_id), nome_arquivo: form.nome_arquivo, tipo_arquivo: form.tipo || "PDF", created_at: new Date().toISOString().slice(0, 10) });
    addLog(`Documento ${form.nome_arquivo} anexado`);
    setData(next);
    setModal(false);
    setForm({});
  };

  const doDelete = (id) => {
    const an = data.anexos.find(a => a.id === id);
    const next = { ...data };
    next.anexos = next.anexos.filter(a => a.id !== id);
    addLog(`Documento ${an?.nome_arquivo} excluído`);
    setData(next);
    setConfirm(null);
  };

  return (
    <div>
      <h1 style={S.pageTitle}>Documentos</h1>
      <p style={S.pageSub}>Gerenciar NF-es, comprovantes e contratos</p>
      <div style={{ marginBottom: 16 }}>
        <button style={S.btn("primary")} onClick={() => setModal(true)}><Icon name="upload" size={15} color="#fff" /> Anexar Documento</button>
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>{["Arquivo", "Tipo", "Pagamento", "Fornecedor", "Data", "Ações"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.anexos.length === 0 && <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted, padding: 32 }}>Nenhum documento encontrado</td></tr>}
            {data.anexos.map(a => {
              const pag = data.pagamentos.find(p => p.id === a.pagamento_id);
              const forn = data.fornecedores.find(f => f.id === pag?.fornecedor_id);
              return (
                <tr key={a.id}>
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, background: COLORS.dangerLight, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="docs" size={14} color={COLORS.danger} />
                      </div>
                      <span style={{ fontWeight: 500 }}>{a.nome_arquivo}</span>
                    </div>
                  </td>
                  <td style={S.td}><span style={S.badge("danger")}>{a.tipo_arquivo}</span></td>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{pag?.numero_nfe || `#${a.pagamento_id}`}</td>
                  <td style={S.td}>{forn?.nome_fantasia || forn?.razao_social || "-"}</td>
                  <td style={S.td}>{fmtDate(a.created_at)}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...S.btn("outline", "sm"), padding: "5px 8px" }} title="Download"><Icon name="download" size={13} /></button>
                      {canDelete && <button style={{ ...S.btn("danger", "sm"), padding: "5px 8px" }} onClick={() => setConfirm(a.id)}><Icon name="trash" size={13} color="#fff" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Anexar Documento" onClose={() => setModal(false)}>
          <div style={S.formRow}>
            <label style={S.label}>Pagamento vinculado</label>
            <select style={S.select} value={form.pagamento_id || ""} onChange={e => setForm(p => ({ ...p, pagamento_id: e.target.value }))}>
              <option value="">Selecione...</option>
              {data.pagamentos.map(p => {
                const f = data.fornecedores.find(f => f.id === p.fornecedor_id);
                return <option key={p.id} value={p.id}>{p.numero_nfe || `#${p.id}`} — {f?.nome_fantasia || f?.razao_social}</option>;
              })}
            </select>
          </div>
          <div style={S.grid(2)}>
            <div style={S.formRow}>
              <label style={S.label}>Nome do Arquivo</label>
              <input style={S.input} value={form.nome_arquivo || ""} onChange={e => setForm(p => ({ ...p, nome_arquivo: e.target.value }))} placeholder="NF-000.pdf" />
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Tipo</label>
              <select style={S.select} value={form.tipo || "PDF"} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                {["PDF", "XML", "JPG", "PNG"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ background: "#f8fafc", border: `2px dashed ${COLORS.border}`, borderRadius: 8, padding: "28px 20px", textAlign: "center", marginBottom: 14 }}>
            <Icon name="upload" size={24} color={COLORS.textMuted} />
            <p style={{ margin: "8px 0 4px", fontSize: 13, fontWeight: 500 }}>Clique ou arraste o arquivo aqui</p>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>PDF, XML, JPG, PNG — máx. 10MB</p>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={S.btn("outline")} onClick={() => setModal(false)}>Cancelar</button>
            <button style={S.btn("primary")} onClick={addAnexo}>Salvar</button>
          </div>
        </Modal>
      )}
      {confirm && <ConfirmModal message="Excluir este documento permanentemente?" onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
};

// ─── REPORTS SCREEN ───────────────────────────────────────────────────────────
const ReportsScreen = ({ data }) => {
  const [filterForn, setFilterForn] = useState("");
  const [filterForma, setFilterForma] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tab, setTab] = useState("payments");

  const filtered = data.pagamentos.filter(p => {
    const mForn = !filterForn || p.fornecedor_id === Number(filterForn);
    const mForma = !filterForma || p.forma_pagamento === filterForma;
    const mFrom = !dateFrom || p.data_pagamento >= dateFrom;
    const mTo = !dateTo || p.data_pagamento <= dateTo;
    return mForn && mForma && mFrom && mTo;
  });

  const totalFiltrado = filtered.reduce((s, p) => s + p.valor, 0);

  const exportCSV = () => {
    const rows = [["ID","Fornecedor","Valor","Forma","NF-e","Data","Observação"]];
    filtered.forEach(p => {
      const f = data.fornecedores.find(f => f.id === p.fornecedor_id);
      rows.push([p.id, f?.razao_social || "", p.valor, p.forma_pagamento, p.numero_nfe, p.data_pagamento, p.observacao]);
    });
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "relatorio.csv"; a.click();
  };

  return (
    <div>
      <h1 style={S.pageTitle}>Relatórios</h1>
      <p style={S.pageSub}>Exportar e analisar dados financeiros</p>
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={S.grid(4)}>
          <div style={S.formRow}>
            <label style={S.label}>Fornecedor</label>
            <select style={S.select} value={filterForn} onChange={e => setFilterForn(e.target.value)}>
              <option value="">Todos</option>
              {data.fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
            </select>
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Forma de Pagamento</label>
            <select style={S.select} value={filterForma} onChange={e => setFilterForma(e.target.value)}>
              <option value="">Todas</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Data Inicial</label>
            <input style={S.input} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Data Final</label>
            <input style={S.input} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: COLORS.textMuted }}>{filtered.length} registros — Total: <strong style={{ color: COLORS.success }}>{fmt(totalFiltrado)}</strong></span>
          <div style={{ flex: 1 }} />
          <button style={S.btn("success")} onClick={exportCSV}><Icon name="download" size={14} color="#fff" /> Exportar CSV</button>
        </div>
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>{["Data", "Fornecedor", "Valor", "Forma", "NF-e", "Observação"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted, padding: 32 }}>Nenhum registro encontrado com os filtros aplicados</td></tr>}
            {filtered.map(p => {
              const forn = data.fornecedores.find(f => f.id === p.fornecedor_id);
              return (
                <tr key={p.id}>
                  <td style={S.td}>{fmtDate(p.data_pagamento)}</td>
                  <td style={S.td}>{forn?.nome_fantasia || forn?.razao_social}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: p.forma_pagamento === "Bonificação" ? COLORS.warning : COLORS.success }}>{fmt(p.valor)}</td>
                  <td style={S.td}><StatusBadge status={p.forma_pagamento === "Bonificação" ? "Bonificado" : "Pago"} /></td>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{p.numero_nfe || "-"}</td>
                  <td style={S.td}>{p.observacao || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── USERS SCREEN ─────────────────────────────────────────────────────────────
const UsersScreen = ({ data, setData, currentUser, addLog }) => {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);

  const openNew = () => { setForm({ tipo: "Operador", ativo: true }); setModal("new"); };
  const openEdit = (u) => { setForm({ ...u }); setModal("edit"); };

  const saveUser = () => {
    if (!form.nome || !form.email) return alert("Nome e e-mail são obrigatórios.");
    const next = { ...data };
    if (modal === "new") {
      const id = next.nextId.users++;
      next.users.push({ ...form, id, created_at: new Date().toISOString().slice(0, 10), fornecedor_id: form.fornecedor_id ? Number(form.fornecedor_id) : null });
      addLog(`Usuário ${form.nome} cadastrado`);
    } else {
      next.users = next.users.map(u => u.id === form.id ? { ...form, fornecedor_id: form.fornecedor_id ? Number(form.fornecedor_id) : null, ativo: form.tipo === "Fornecedor" && form.fornecedor_id ? true : form.ativo, status_cadastro: form.tipo === "Fornecedor" && form.fornecedor_id ? "Ativo" : (form.status_cadastro || (form.ativo ? "Ativo" : "Em análise")) } : u);
      addLog(`Usuário ${form.nome} atualizado`);
    }
    setData(next);
    setModal(null);
  };

  const toggleActive = (id) => {
    const next = { ...data };
    next.users = next.users.map(u => u.id === id ? { ...u, ativo: !u.ativo, status_cadastro: !u.ativo ? "Ativo" : "Inativo" } : u);
    setData(next);
  };

  const doDelete = (id) => {
    const u = data.users.find(u => u.id === id);
    if (u.id === currentUser.id) return alert("Você não pode excluir seu próprio usuário.");
    const next = { ...data };
    next.users = next.users.filter(u => u.id !== id);
    addLog(`Usuário ${u.nome} excluído`);
    setData(next);
    setConfirm(null);
  };

  return (
    <div>
      <h1 style={S.pageTitle}>Usuários</h1>
      <p style={S.pageSub}>Gerenciar usuários e permissões de acesso</p>
      <div style={{ marginBottom: 16 }}>
        <button style={S.btn("primary")} onClick={openNew}><Icon name="plus" size={15} color="#fff" /> Novo Usuário</button>
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>{["Usuário", "E-mail", "Tipo", "Fornecedor Vinculado", "Solicitação", "Status", "Cadastro", "Ações"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.users.map(u => {
              const forn = u.fornecedor_id ? data.fornecedores.find(f => Number(f.id) === Number(u.fornecedor_id)) : null;
              return (
                <tr key={u.id}>
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={S.avatar(32)}>{u.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}</div>
                      <span style={{ fontWeight: 500 }}>{u.nome}</span>
                    </div>
                  </td>
                  <td style={{ ...S.td, fontSize: 12 }}>{u.email}</td>
                  <td style={S.td}><StatusBadge status={u.tipo} /></td>
                  <td style={S.td}>{forn ? <span style={{ fontSize: 12 }}>{forn.nome_fantasia || forn.razao_social}</span> : <span style={{ color: COLORS.textMuted, fontSize: 12 }}>—</span>}</td>
                  <td style={S.td}>{u.fornecedor_pendente?.razao_social ? <span style={{ fontSize: 12 }}>{u.fornecedor_pendente.razao_social}<br />{u.fornecedor_pendente.cnpj || ""}</span> : <span style={{ color: COLORS.textMuted, fontSize: 12 }}>—</span>}</td>
                  <td style={S.td}><StatusBadge status={u.status_cadastro || (u.ativo ? "Ativo" : "Em análise")} /></td>
                  <td style={{ ...S.td, fontSize: 12 }}>{fmtDate(u.created_at)}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...S.btn("outline", "sm"), padding: "5px 8px" }} onClick={() => openEdit(u)}><Icon name="edit" size={13} /></button>
                      <button style={{ ...S.btn(u.ativo ? "warning" : "success", "sm"), padding: "5px 8px" }} onClick={() => toggleActive(u.id)} title={u.ativo ? "Desativar" : "Ativar"}>
                        <Icon name={u.ativo ? "x" : "check"} size={13} color="#fff" />
                      </button>
                      {u.id !== currentUser.id && <button style={{ ...S.btn("danger", "sm"), padding: "5px 8px" }} onClick={() => setConfirm(u.id)}><Icon name="trash" size={13} color="#fff" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(modal === "new" || modal === "edit") && (
        <Modal title={modal === "new" ? "Novo Usuário" : "Editar Usuário"} onClose={() => setModal(null)}>
          {[
            { label: "Nome Completo *", field: "nome" },
            { label: "E-mail *", field: "email", type: "email" },
            { label: "Senha", field: "senha", type: "password" },
          ].map(({ label, field, type = "text" }) => (
            <div key={field} style={S.formRow}>
              <label style={S.label}>{label}</label>
              <input style={S.input} type={type} value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
            </div>
          ))}
          <div style={S.formRow}>
            <label style={S.label}>Tipo de Usuário</label>
            <select style={S.select} value={form.tipo || ""} onChange={e => setForm(p => ({ ...p, tipo: e.target.value, fornecedor_id: e.target.value !== "Fornecedor" ? null : p.fornecedor_id }))}>
              {USER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {form.tipo === "Fornecedor" && (
            <div style={S.formRow}>
              <label style={S.label}>Fornecedor Vinculado *</label>
              <select style={S.select} value={form.fornecedor_id || ""} onChange={e => setForm(p => ({ ...p, fornecedor_id: e.target.value }))}>
                <option value="">Selecione o fornecedor...</option>
                {data.fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
              </select>
              <p style={{ fontSize: 11, color: COLORS.textMuted, margin: "4px 0 0" }}>O fornecedor vinculado só poderá visualizar suas próprias informações.</p>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button style={S.btn("outline")} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btn("primary")} onClick={saveUser}>Salvar</button>
          </div>
        </Modal>
      )}
      {confirm && <ConfirmModal message="Excluir este usuário permanentemente?" onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
};

// ─── AUDIT SCREEN ─────────────────────────────────────────────────────────────
const AuditScreen = ({ data }) => (
  <div>
    <h1 style={S.pageTitle}>Auditoria</h1>
    <p style={S.pageSub}>Registro de ações e acessos ao sistema</p>
    <div style={S.card}>
      <table style={S.table}>
        <thead>
          <tr>{["Data/Hora", "Usuário", "Ação", "Descrição", "IP"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {[...data.logs].reverse().map(l => {
            const u = data.users.find(u => u.id === l.usuario_id);
            return (
              <tr key={l.id}>
                <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                <td style={S.td}>{u?.nome || "Sistema"}</td>
                <td style={S.td}><StatusBadge status={l.acao === "Login" ? "Pago" : l.acao === "Exclusão" ? "Pendente" : "Parcial"} /></td>
                <td style={S.td}>{l.descricao}</td>
                <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{l.ip}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

// ─── SUPPLIER PORTAL ──────────────────────────────────────────────────────────
const SupplierPortal = ({ data, setData, currentUser, onLogout }) => {
  const forn = data.fornecedores.find(f => Number(f.id) === Number(currentUser.fornecedor_id));
  const pagamentos = data.pagamentos.filter(p => Number(p.fornecedor_id) === Number(currentUser.fornecedor_id)).sort((a, b) => b.id - a.id);
  const anexos = data.anexos.filter(a => pagamentos.some(p => p.id === a.pagamento_id));
  const [tab, setTab] = useState("dashboard");
  const [filterForma, setFilterForma] = useState("");
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ data_pagamento: new Date().toISOString().slice(0, 10), forma_pagamento: "PIX", tipo_anexo: "Comprovante" });

  const enviarPagamentoFornecedor = () => {
    if (!payForm.valor) return alert("Informe o valor do pagamento.");
    if (!payForm.anexo_file && !payForm.anexo_nome) return alert("Anexe o comprovante ou a nota de bonificação.");
    const next = { ...data, pagamentos: [...(data.pagamentos || [])], anexos: [...(data.anexos || [])], logs: [...(data.logs || [])] };
    const id = next.nextId.pagamentos++;
    const anexoNome = payForm.anexo_file?.name || payForm.anexo_nome || "";
    const novo = {
      id,
      fornecedor_id: Number(currentUser.fornecedor_id),
      valor: Number(payForm.valor),
      forma_pagamento: payForm.forma_pagamento || "PIX",
      numero_nfe: payForm.numero_nfe || "",
      observacao: payForm.observacao || "Enviado pelo fornecedor para validação do administrador",
      data_pagamento: payForm.data_pagamento || new Date().toISOString().slice(0, 10),
      anexo_nome: anexoNome,
      tipo_anexo: payForm.tipo_anexo || (payForm.forma_pagamento === "Bonificação" ? "Nota de bonificação" : "Comprovante"),
      enviado_por: "Fornecedor",
      confirmado: false,
      status_confirmacao: "Aguardando confirmação",
      created_at: new Date().toISOString()
    };
    next.pagamentos.push(novo);
    next.anexos.push({ id: next.nextId.anexos++, pagamento_id: id, nome_arquivo: anexoNome, tipo_arquivo: novo.tipo_anexo, created_at: new Date().toISOString() });
    next.logs.push({ id: next.nextId.logs++, usuario_id: currentUser.id, acao: "Envio", descricao: "Fornecedor enviou comprovante/nota para confirmação", ip: "127.0.0.1", created_at: new Date().toISOString() });
    setData(next);
    setPayModal(false);
    setPayForm({ data_pagamento: new Date().toISOString().slice(0, 10), forma_pagamento: "PIX", tipo_anexo: "Comprovante" });
    alert("Enviado para validação do administrador.");
  };

  if (!forn) return (
    <div style={{ ...S.loginBox, textAlign: "center" }}>
      <div style={{ color: "#fff" }}>
        <Icon name="info" size={48} color="#fff" />
        <h2>Cadastro em análise</h2>
        <p>Seu cadastro foi para análise. Aguarde o administrador vincular sua conta ao fornecedor correto.</p>
        <button style={{ ...S.btn("outline"), color: "#fff", borderColor: "#fff" }} onClick={onLogout}>Voltar para login</button>
      </div>
    </div>
  );

  const filteredPag = pagamentos.filter(p => !filterForma || p.forma_pagamento === filterForma);

  return (
    <div style={{ ...S.app, background: "#f8fafc" }}>
      <div style={{ ...S.sidebar, background: COLORS.sidebar }}>
        <div style={S.sidebarLogo}>
          <img src="/logo-gigantao.png" alt="Gigantão" style={{ maxWidth: 150, background: "#fff", borderRadius: 10, padding: 8 }} />
          <p style={{ ...S.sidebarLogoSub, color: "#B7E7CB" }}>{forn.nome_fantasia || forn.razao_social}</p>
        </div>
        <nav style={S.sidebarNav}>
          {[
            { key: "dashboard", label: "Dashboard", icon: "dashboard" },
            { key: "payments", label: "Histórico de Pagamentos", icon: "payments" },
            { key: "docs", label: "Documentos", icon: "docs" },
            { key: "reports", label: "Relatórios", icon: "reports" },
          ].map(({ key, label, icon }) => (
            <div key={key} style={{ ...S.sidebarItem(tab === key), borderLeftColor: tab === key ? COLORS.secondary : "transparent" }} onClick={() => setTab(key)}>
              <Icon name={icon} size={16} /> {label}
            </div>
          ))}
        </nav>
        <div style={S.sidebarUser}>
          <div style={{ ...S.avatar(32), background: COLORS.primaryDark, color: COLORS.secondary }}>{currentUser.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.nome}</p>
            <p style={{ margin: 0, fontSize: 11, color: COLORS.sidebarText }}>Fornecedor</p>
          </div>
          <button style={{ ...S.btn("ghost"), padding: 6, color: COLORS.sidebarText }} onClick={onLogout} title="Sair"><Icon name="logout" size={15} /></button>
        </div>
      </div>
      <div style={S.main}>
        <div style={{ ...S.topbar, background: "#fff", borderColor: "#e2e8f0" }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{forn.razao_social}</p>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>CNPJ: {forn.cnpj}</p>
          </div>
          <button style={S.btn("outline")} onClick={onLogout}><Icon name="logout" size={14} /> Sair</button>
        </div>
        <div style={S.content}>
          {tab === "dashboard" && (
            <div>
              <h1 style={S.pageTitle}>Meu Painel</h1>
              <p style={S.pageSub}>Visão geral da sua conta financeira</p>
              <div style={S.grid(2)}>
                <MetricCard label="Saldo Devido" value={fmt(forn.saldo_devido)} icon="payments" color={COLORS.danger} />
                <MetricCard label="Total Pago" value={fmt(forn.saldo_pago)} icon="check" color={COLORS.success} />
                <MetricCard label="Bonificações" value={fmt(forn.saldo_bonificado)} icon="info" color={COLORS.warning} />
                <MetricCard label="Pagamentos" value={pagamentos.length} icon="docs" color={COLORS.primary} />
              </div>
              <div style={{ ...S.card, marginTop: 16 }}>
                <p style={{ ...S.cardTitle, fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 14 }}>Últimos Pagamentos</p>
                <table style={S.table}>
                  <thead><tr>{["Data", "Valor", "Forma", "Anexo", "Status", "NF-e"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {pagamentos.slice(0, 5).map(p => (
                      <tr key={p.id}>
                        <td style={S.td}>{fmtDate(p.data_pagamento)}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: p.forma_pagamento === "Bonificação" ? COLORS.warning : COLORS.success }}>{fmt(p.valor)}</td>
                        <td style={S.td}><StatusBadge status={p.forma_pagamento === "Bonificação" ? "Bonificado" : "Pago"} /></td>
                        <td style={S.td}>{p.anexo_nome ? `📎 ${p.anexo_nome}` : "-"}</td>
                        <td style={S.td}><StatusBadge status={p.status_confirmacao || (p.confirmado === false ? "Aguardando confirmação" : "Confirmado")} /></td>
                        <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{p.numero_nfe || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab === "payments" && (
            <div>
              <h1 style={S.pageTitle}>Histórico de Pagamentos</h1>
              <p style={S.pageSub}>Todos os pagamentos registrados na sua conta</p>
              <div style={{ ...S.searchBar, marginBottom: 16 }}>
                <button style={S.btn("primary")} onClick={() => setPayModal(true)}><Icon name="plus" size={15} color="#fff" /> Enviar comprovante/nota</button>
                <select style={{ ...S.select, width: 200 }} value={filterForma} onChange={e => setFilterForma(e.target.value)}>
                  <option value="">Todas as formas</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={S.card}>
                <table style={S.table}>
                  <thead><tr>{["Data", "Valor", "Forma", "Anexo", "Status", "NF-e", "Observação"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredPag.length === 0 && <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted, padding: 32 }}>Nenhum pagamento encontrado</td></tr>}
                    {filteredPag.map(p => (
                      <tr key={p.id}>
                        <td style={S.td}>{fmtDate(p.data_pagamento)}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: p.forma_pagamento === "Bonificação" ? COLORS.warning : COLORS.success }}>{fmt(p.valor)}</td>
                        <td style={S.td}><StatusBadge status={p.forma_pagamento === "Bonificação" ? "Bonificado" : "Pago"} /></td>
                        <td style={S.td}>{p.anexo_nome ? `📎 ${p.anexo_nome}` : "-"}</td>
                        <td style={S.td}><StatusBadge status={p.status_confirmacao || (p.confirmado === false ? "Aguardando confirmação" : "Confirmado")} /></td>
                        <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{p.numero_nfe || "-"}</td>
                        <td style={S.td}>{p.observacao || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab === "docs" && (
            <div>
              <h1 style={S.pageTitle}>Meus Documentos</h1>
              <p style={S.pageSub}>NF-es e comprovantes disponíveis</p>
              <div style={S.card}>
                <table style={S.table}>
                  <thead><tr>{["Arquivo", "Tipo", "NF-e", "Data", "Download"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {anexos.length === 0 && <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted, padding: 32 }}>Nenhum documento disponível</td></tr>}
                    {anexos.map(a => {
                      const pag = data.pagamentos.find(p => p.id === a.pagamento_id);
                      return (
                        <tr key={a.id}>
                          <td style={S.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 30, height: 30, background: COLORS.dangerLight, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon name="docs" size={14} color={COLORS.danger} />
                              </div>
                              <span style={{ fontWeight: 500 }}>{a.nome_arquivo}</span>
                            </div>
                          </td>
                          <td style={S.td}><span style={S.badge("danger")}>{a.tipo_arquivo}</span></td>
                          <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{pag?.numero_nfe || "-"}</td>
                          <td style={S.td}>{fmtDate(a.created_at)}</td>
                          <td style={S.td}><button style={{ ...S.btn("primary", "sm") }}><Icon name="download" size={12} color="#fff" /> Baixar</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {payModal && (
            <Modal title="Enviar comprovante ou nota" onClose={() => setPayModal(false)}>
              <div style={S.grid(2)}>
                <div style={S.formRow}>
                  <label style={S.label}>Valor (R$) *</label>
                  <input style={S.input} type="number" value={payForm.valor || ""} onChange={e => setPayForm(p => ({ ...p, valor: e.target.value }))} />
                </div>
                <div style={S.formRow}>
                  <label style={S.label}>Data do pagamento</label>
                  <input style={S.input} type="date" value={payForm.data_pagamento || ""} onChange={e => setPayForm(p => ({ ...p, data_pagamento: e.target.value }))} />
                </div>
              </div>
              <div style={S.grid(2)}>
                <div style={S.formRow}>
                  <label style={S.label}>Forma</label>
                  <select style={S.select} value={payForm.forma_pagamento || ""} onChange={e => setPayForm(p => ({ ...p, forma_pagamento: e.target.value, tipo_anexo: e.target.value === "Bonificação" ? "Nota de bonificação" : "Comprovante" }))}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={S.formRow}>
                  <label style={S.label}>Número NF-e</label>
                  <input style={S.input} value={payForm.numero_nfe || ""} onChange={e => setPayForm(p => ({ ...p, numero_nfe: e.target.value }))} placeholder="NF-000" />
                </div>
              </div>
              <div style={S.grid(2)}>
                <div style={S.formRow}>
                  <label style={S.label}>Tipo de anexo *</label>
                  <select style={S.select} value={payForm.tipo_anexo || ""} onChange={e => setPayForm(p => ({ ...p, tipo_anexo: e.target.value }))}>
                    <option value="Comprovante">Comprovante</option>
                    <option value="Nota de bonificação">Nota de bonificação</option>
                  </select>
                </div>
                <div style={S.formRow}>
                  <label style={S.label}>Arquivo *</label>
                  <input style={S.input} type="file" accept=".pdf,.jpg,.jpeg,.png,.xml" onChange={e => setPayForm(p => ({ ...p, anexo_file: e.target.files?.[0], anexo_nome: e.target.files?.[0]?.name || "" }))} />
                </div>
              </div>
              <div style={S.formRow}>
                <label style={S.label}>Observação</label>
                <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} value={payForm.observacao || ""} onChange={e => setPayForm(p => ({ ...p, observacao: e.target.value }))} />
              </div>
              <div style={{ background: COLORS.warningLight, color: COLORS.warning, padding: 10, borderRadius: 7, fontSize: 12, marginBottom: 14 }}>
                O envio ficará como "Aguardando confirmação" até o administrador validar.
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button style={S.btn("outline")} onClick={() => setPayModal(false)}>Cancelar</button>
                <button style={S.btn("primary")} onClick={enviarPagamentoFornecedor}>Enviar para validação</button>
              </div>
            </Modal>
          )}
          {tab === "reports" && (
            <div>
              <h1 style={S.pageTitle}>Meus Relatórios</h1>
              <p style={S.pageSub}>Extratos e relatórios financeiros</p>
              <div style={S.grid(3)}>
                {[
                  { label: "Extrato Financeiro", desc: "Resumo completo de créditos e débitos", icon: "reports" },
                  { label: "Relatório de Pagamentos", desc: "Histórico detalhado de pagamentos recebidos", icon: "payments" },
                  { label: "Relatório de Bonificações", desc: "Histórico de bonificações aplicadas", icon: "info" },
                ].map(({ label, desc, icon }) => (
                  <div key={label} style={{ ...S.card, textAlign: "center", cursor: "pointer" }}>
                    <div style={{ width: 48, height: 48, background: COLORS.primaryLight, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                      <Icon name={icon} size={22} color={COLORS.primary} />
                    </div>
                    <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 14 }}>{label}</p>
                    <p style={{ margin: "0 0 14px", fontSize: 12, color: COLORS.textMuted }}>{desc}</p>
                    <button style={{ ...S.btn("primary", "sm"), width: "100%", justifyContent: "center" }}><Icon name="download" size={12} color="#fff" /> Gerar PDF</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── SIDEBAR NAV CONFIG ───────────────────────────────────────────────────────
const adminNav = [
  { section: "Principal" },
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { section: "Cadastros" },
  { key: "suppliers", label: "Fornecedores", icon: "suppliers" },
  { key: "financial", label: "Controle Financeiro", icon: "payments" },
  { key: "payments", label: "Pagamentos", icon: "payments" },
  { section: "Documentos & Relatórios" },
  { key: "documents", label: "Documentos", icon: "docs" },
  { key: "reports", label: "Relatórios", icon: "reports" },
  { section: "Administração" },
  { key: "users", label: "Usuários", icon: "users" },
  { key: "audit", label: "Auditoria", icon: "audit" },
];

const operatorNav = [
  { section: "Principal" },
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { section: "Consultas" },
  { key: "suppliers", label: "Fornecedores", icon: "suppliers" },
  { key: "financial", label: "Controle Financeiro", icon: "payments" },
  { key: "payments", label: "Pagamentos", icon: "payments" },
  { key: "documents", label: "Documentos", icon: "docs" },
  { key: "reports", label: "Relatórios", icon: "reports" },
];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login"); // login | app | portal
  const [currentUser, setCurrentUser] = useState(null);
  const [data, setDataState] = useState(initData);
  const [page, setPage] = useState("dashboard");
  const [toast, setToast] = useState(null);

  const setData = useCallback((next) => {
    setDataState(next);
    localStorage.setItem("saas_data", JSON.stringify(next));
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addLog = useCallback((desc) => {
    setData(prev => {
      const next = { ...prev };
      const id = next.nextId.logs++;
      next.logs = [...next.logs, { id, usuario_id: currentUser?.id, acao: "Alteração", descricao: desc, ip: "127.0.0.1", created_at: new Date().toISOString() }];
      return next;
    });
  }, [currentUser, setData]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    // Log login
    const next = { ...data };
    const id = next.nextId.logs++;
    next.logs = [...next.logs, { id, usuario_id: user.id, acao: "Login", descricao: `Login realizado com sucesso`, ip: "127.0.0.1", created_at: new Date().toISOString() }];
    setData(next);
    setScreen(user.tipo === "Fornecedor" ? "portal" : "app");
    setPage("dashboard");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setScreen("login");
  };

  // Portal de fornecedor
  if (screen === "portal-login") return <LoginScreen onLogin={handleLogin} portalMode data={data} setData={setData} onBackHome={() => setScreen("login")} />;
  if (screen === "portal" && currentUser?.tipo === "Fornecedor") return <SupplierPortal data={data} setData={setData} currentUser={currentUser} onLogout={handleLogout} />;
  if (screen === "login") {
    return (
      <div>
        <LoginScreen onLogin={handleLogin} data={data} setData={setData} />
        <div style={{ position: "fixed", bottom: 24, right: 24 }}>
          <button style={{ ...S.btn("primary"), background: COLORS.primary, color: "#fff", boxShadow: "0 10px 30px rgba(0,155,78,0.35)", padding: "14px 24px", fontSize: 15, borderRadius: 12 }} onClick={() => setScreen("portal-login")}>
            <Icon name="portal" size={18} color="#fff" /> Portal do Fornecedor
          </button>
        </div>
      </div>
    );
  }

  const nav = currentUser?.tipo === "Administrador" ? adminNav : operatorNav;

  const renderPage = () => {
    const props = { data, setData, currentUser, addLog };
    switch (page) {
      case "dashboard": return <Dashboard {...props} />;
      case "suppliers": return <SuppliersScreen {...props} />;
      case "financial": return <FinancialScreen {...props} />;
      case "payments": return <PaymentsScreen {...props} />;
      case "documents": return <DocumentsScreen {...props} />;
      case "reports": return <ReportsScreen {...props} />;
      case "users": return <UsersScreen {...props} />;
      case "audit": return <AuditScreen {...props} />;
      default: return <Dashboard {...props} />;
    }
  };

  return (
    <div style={S.app}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <img src="/logo-gigantao.png" alt="Gigantão" style={{ maxWidth: 150, background: "#fff", borderRadius: 10, padding: 8 }} />
          <p style={S.sidebarLogoSub}>Gestão de Fornecedores</p>
        </div>
        <nav style={S.sidebarNav}>
          {nav.map((item, i) => item.section ? (
            <p key={i} style={S.sidebarSection}>{item.section}</p>
          ) : (
            <div key={item.key} style={S.sidebarItem(page === item.key)} onClick={() => setPage(item.key)}>
              <Icon name={item.icon} size={16} /> {item.label}
            </div>
          ))}
        </nav>
        <div style={S.sidebarUser}>
          <div style={S.avatar(32)}>{currentUser?.nome?.split(" ").map(n => n[0]).slice(0, 2).join("") || "U"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser?.nome}</p>
            <p style={{ margin: 0, fontSize: 11, color: COLORS.sidebarText }}>{currentUser?.tipo}</p>
          </div>
          <button style={{ ...S.btn("ghost"), padding: 6, color: COLORS.sidebarText }} onClick={handleLogout} title="Sair"><Icon name="logout" size={15} /></button>
        </div>
      </div>

      {/* Main */}
      <div style={S.main}>
        <div style={S.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.success }} />
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>Sistema Online</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button style={{ ...S.btn("primary"), padding: "10px 18px", fontSize: 14, borderRadius: 10 }} onClick={() => setScreen("portal-login")}>
              <Icon name="portal" size={15} color="#fff" /> Portal do Fornecedor
            </button>
            <button style={{ ...S.btn("ghost", "sm"), color: COLORS.textMuted }} onClick={handleLogout}>
              <Icon name="logout" size={14} /> Sair
            </button>
          </div>
        </div>
        <div style={S.content}>
          {renderPage()}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "success" ? COLORS.success : COLORS.danger, color: "#fff", padding: "12px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
