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

const PAYMENT_METHODS = ["PIX","Boleto","Bonificação","Depósito","TED","DOC","Transferência Bancária","Dinheiro"];
const DEBT_PAYMENT_TYPES = ["À Vista", "Parcelado"];
const STATUS_OPTIONS = ["Pendente","Pago","Parcial","Bonificado"];
const USER_TYPES = ["Administrador","Operador","Fornecedor"];
const ESTADOS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];


// ─── CLOUD SYNC (SUPABASE REST) ───────────────────────────────────────────────
// Para os cadastros aparecerem em todos os aparelhos, configure no Vercel:
// VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
// Tabela necessária no Supabase: app_state (id int primary key, data jsonb, updated_at timestamptz).
const CLOUD_URL = (import.meta?.env?.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const CLOUD_KEY = import.meta?.env?.VITE_SUPABASE_ANON_KEY || "";
const CLOUD_ENABLED = Boolean(CLOUD_URL && CLOUD_KEY);
const CLOUD_TABLE = "app_state";
const CLOUD_ROW_ID = 1;

function hasUsefulCloudData(value) {
  return Boolean(value && typeof value === "object" && Object.keys(value).length > 0);
}

async function loadCloudData() {
  if (!CLOUD_ENABLED) { localStorage.setItem("saas_cloud_status", "OFF: variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY não encontradas no build"); return null; }
  try {
    const res = await fetch(`${CLOUD_URL}/rest/v1/${CLOUD_TABLE}?id=eq.${CLOUD_ROW_ID}&select=data`, {
      headers: { apikey: CLOUD_KEY, Authorization: `Bearer ${CLOUD_KEY}` }
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`Falha ao carregar dados online: ${res.status} ${msg}`);
    }
    const rows = await res.json();
    const cloud = rows?.[0]?.data;
    return hasUsefulCloudData(cloud) ? normalizeData(cloud) : null;
  } catch (err) {
    console.warn("Sincronização online indisponível:", err);
    return null;
  }
}

async function saveCloudData(data) {
  if (!CLOUD_ENABLED) {
    localStorage.setItem("saas_cloud_status", "OFF: variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY não encontradas no build");
    return false;
  }

  const normalized = normalizeData(data);
  const body = JSON.stringify({
    id: CLOUD_ROW_ID,
    data: normalized,
    updated_at: new Date().toISOString()
  });

  try {
    // Upsert direto é a forma mais segura para Supabase REST.
    // Se a linha id=1 existir, atualiza. Se não existir, cria.
    const upsert = await fetch(`${CLOUD_URL}/rest/v1/${CLOUD_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: CLOUD_KEY,
        Authorization: `Bearer ${CLOUD_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body
    });

    if (!upsert.ok) {
      const upsertError = await upsert.text().catch(() => "");
      // Plano B: patch na linha existente.
      const patch = await fetch(`${CLOUD_URL}/rest/v1/${CLOUD_TABLE}?id=eq.${CLOUD_ROW_ID}`, {
        method: "PATCH",
        headers: {
          apikey: CLOUD_KEY,
          Authorization: `Bearer ${CLOUD_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({ data: normalized, updated_at: new Date().toISOString() })
      });
      if (!patch.ok) {
        const patchError = await patch.text().catch(() => "");
        throw new Error(`UPSERT: ${upsertError} | PATCH: ${patchError}`);
      }
    }

    localStorage.setItem("saas_cloud_status", `OK: salvo no Supabase em ${new Date().toLocaleString()}`);
    localStorage.removeItem("saas_cloud_error");
    return true;
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn("Falha ao salvar dados online:", err);
    localStorage.setItem("saas_cloud_status", "ERRO ao salvar no Supabase");
    localStorage.setItem("saas_cloud_error", msg);
    return false;
  }
}

// ─── INITIAL DATA ────────────────────────────────────────────────────────────
const initData = () => {
  const stored = localStorage.getItem("saas_data");
  if (stored) return normalizeData(JSON.parse(stored));
  return normalizeData({
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
    contratos: [
      { id: 1, numero_contrato: "CTR-001", fornecedor_id: 1, comprador_id: 1, descricao: "Contrato comercial ABC", valor_contrato: 12000, valor_arrecadado: 3000, forma_pagamento: "Boleto", parcelas: 3, data_inicio: "2024-04-01", data_fim: "2024-06-30", observacao: "Contrato inicial de fornecimento", historico_recebimentos: [{ valor: 3000, data: "2024-04-10", forma_pagamento: "Boleto", observacao: "Primeira parcela" }], created_at: "2024-04-01" },
    ],
    logs: [
      { id: 1, usuario_id: 1, acao: "Login", descricao: "Login realizado com sucesso", ip: "192.168.1.1", created_at: "2024-04-20T08:00:00" },
      { id: 2, usuario_id: 1, acao: "Cadastro", descricao: "Fornecedor ABC Distribuidora cadastrado", ip: "192.168.1.1", created_at: "2024-04-20T08:30:00" },
      { id: 3, usuario_id: 2, acao: "Login", descricao: "Login realizado com sucesso", ip: "192.168.1.2", created_at: "2024-04-20T09:00:00" },
    ],
    compradores: [
      { id: 1, nome: "Lucas Magalhães", email: "lucas@gigantao.com", cargo: "Comprador", centro_custo: "Comercial", ativo: true, status_cadastro: "Ativo", created_at: "2024-01-01" },
      { id: 2, nome: "João Comprador", email: "joao@gigantao.com", cargo: "Comprador", centro_custo: "Comercial", ativo: true, status_cadastro: "Ativo", created_at: "2024-01-02" },
    ],
    nextId: { users: 4, fornecedores: 4, pagamentos: 9, anexos: 4, logs: 4, compradores: 3, contratos: 2 },
  });
};

function normalizeData(raw) {
  const data = raw || {};
  data.users = Array.isArray(data.users) ? data.users : [];
  data.fornecedores = Array.isArray(data.fornecedores) ? data.fornecedores : [];
  data.pagamentos = Array.isArray(data.pagamentos) ? data.pagamentos : [];
  data.anexos = Array.isArray(data.anexos) ? data.anexos : [];
  data.logs = Array.isArray(data.logs) ? data.logs : [];
  data.contratos = Array.isArray(data.contratos) ? data.contratos : [];
  data.compradores = Array.isArray(data.compradores) ? data.compradores : [
    { id: 1, nome: "Lucas Magalhães", email: "lucas@gigantao.com", cargo: "Comprador", centro_custo: "Comercial", ativo: true, status_cadastro: "Ativo", created_at: "2024-01-01" },
    { id: 2, nome: "João Comprador", email: "joao@gigantao.com", cargo: "Comprador", centro_custo: "Comercial", ativo: true, status_cadastro: "Ativo", created_at: "2024-01-02" },
  ];
  data.nextId = data.nextId || {};
  data.nextId.users = data.nextId.users || (Math.max(0, ...data.users.map(x => Number(x.id) || 0)) + 1);
  data.nextId.fornecedores = data.nextId.fornecedores || (Math.max(0, ...data.fornecedores.map(x => Number(x.id) || 0)) + 1);
  data.nextId.pagamentos = data.nextId.pagamentos || (Math.max(0, ...data.pagamentos.map(x => Number(x.id) || 0)) + 1);
  data.nextId.anexos = data.nextId.anexos || (Math.max(0, ...data.anexos.map(x => Number(x.id) || 0)) + 1);
  data.nextId.logs = data.nextId.logs || (Math.max(0, ...data.logs.map(x => Number(x.id) || 0)) + 1);
  data.nextId.compradores = data.nextId.compradores || (Math.max(0, ...data.compradores.map(x => Number(x.id) || 0)) + 1);
  data.nextId.contratos = data.nextId.contratos || (Math.max(0, ...data.contratos.map(x => Number(x.id) || 0)) + 1);
  data.users = data.users.map(u => ({ ...u, ativo: u.ativo === true, status_cadastro: u.status_cadastro || (u.ativo ? "Ativo" : "Em análise") }));
  data.compradores = data.compradores.map(c => ({ ...c, ativo: c.ativo !== false, status_cadastro: c.status_cadastro || (c.ativo === false ? "Em análise" : "Ativo") }));
  data.fornecedores = data.fornecedores.map(f => ({ ...f, ativo: f.ativo !== false, status_cadastro: f.status_cadastro || "Ativo" }));
  data.contratos = data.contratos.map(c => ({
    ...c,
    fornecedor_id: c.fornecedor_id ? Number(c.fornecedor_id) : null,
    comprador_id: c.comprador_id ? Number(c.comprador_id) : null,
    valor_contrato: Number(c.valor_contrato || 0),
    valor_arrecadado: Number(c.valor_arrecadado || 0),
    forma_pagamento: c.forma_pagamento || "Boleto",
    parcelas: Number(c.parcelas || 1),
    historico_recebimentos: Array.isArray(c.historico_recebimentos) ? c.historico_recebimentos : [],
    observacao: c.observacao || ""
  }));
  data.pagamentos = data.pagamentos.map(p => ({
    ...p,
    fornecedor_id: p.fornecedor_id ? Number(p.fornecedor_id) : null,
    comprador_id: p.comprador_id ? Number(p.comprador_id) : null,
    valor: Number(p.valor_pago ?? p.valor ?? 0),
    valor_pago: Number(p.valor_pago ?? p.valor ?? 0),
    valor_devido: Number(p.valor_devido ?? p.valor ?? 0),
    confirmado: p.confirmado === false ? false : true,
    status_confirmacao: p.status_confirmacao || (p.confirmado === false ? "Aguardando confirmação" : "Confirmado"),
    tipo_divida: p.tipo_divida || p.tipo_pagamento_divida || "À Vista",
    parcelas: Number(p.parcelas || 1),
    data_vencimento: p.data_vencimento || p.data_pagamento || p.created_at?.slice?.(0,10) || "",
    historico_pagamentos: Array.isArray(p.historico_pagamentos) ? p.historico_pagamentos : []
  }));
  return data;
}

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


const ResponsiveStyles = () => (
  <style>{`
    @media (max-width: 768px) {
      html, body, #root { width: 100%; max-width: 100%; overflow-x: hidden; }
      body { margin: 0; }
      [data-gig-app] { display: block !important; min-height: 100vh !important; width: 100% !important; }
      [data-gig-sidebar] { position: relative !important; width: 100% !important; height: auto !important; min-height: 0 !important; max-height: none !important; }
      [data-gig-sidebar] > div:first-child { padding: 12px 12px 8px !important; text-align: center !important; }
      [data-gig-sidebar] img { max-width: 122px !important; }
      [data-gig-sidebar] nav { display: flex !important; gap: 8px !important; overflow-x: auto !important; padding: 8px 10px 12px !important; -webkit-overflow-scrolling: touch !important; }
      [data-gig-sidebar] nav p { display: none !important; }
      [data-gig-sidebar] nav > div { flex: 0 0 auto !important; border-left: 0 !important; border-radius: 999px !important; padding: 10px 12px !important; white-space: nowrap !important; }
      [data-gig-sidebar] > div:last-child { display: none !important; }
      [data-gig-main] { margin-left: 0 !important; min-height: auto !important; width: 100% !important; }
      [data-gig-topbar] { position: relative !important; height: auto !important; min-height: 54px !important; padding: 10px 12px !important; flex-wrap: wrap !important; gap: 10px !important; }
      [data-gig-topbar] > div { flex-wrap: wrap !important; }
      [data-gig-content] { padding: 12px !important; width: 100% !important; box-sizing: border-box !important; }
      div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
      div[style*="display: flex"] { max-width: 100% !important; }
      input, select, textarea { font-size: 16px !important; min-height: 42px !important; }
      button { min-height: 38px !important; }
      table { display: block !important; width: 100% !important; overflow-x: auto !important; white-space: nowrap !important; -webkit-overflow-scrolling: touch !important; border-spacing: 0 !important; }
      th, td { padding: 10px 9px !important; font-size: 12px !important; }
      [data-gig-modal-box] { width: calc(100vw - 24px) !important; max-width: calc(100vw - 24px) !important; padding: 18px !important; }
      [data-gig-login-card] { width: calc(100vw - 28px) !important; padding: 24px 18px !important; }
      [data-gig-login-box] { padding: 14px !important; align-items: flex-start !important; padding-top: 30px !important; }
    }
    @media (min-width: 769px) {
      [data-gig-app] { min-width: 1024px; }
    }
  `}</style>
);

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
    <div style={{ ...S.modalBox, width: wide ? "min(94vw, 800px)" : undefined }} data-gig-modal-box>
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
    <div style={{ ...S.modalBox, width: "min(90vw, 400px)" }} data-gig-modal-box>
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
const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  if (!file) return resolve({ data_url: '', mime: '', nome: '' });
  const reader = new FileReader();
  reader.onload = () => resolve({ data_url: reader.result, mime: file.type || 'application/octet-stream', nome: file.name });
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const downloadArquivo = (arquivo, pagamento) => {
  const original = arquivo?.nome_arquivo || pagamento?.anexo_nome || pagamento?.numero_nfe || "arquivo";
  const dataUrl = arquivo?.data_url || pagamento?.anexo_data || "";
  const mime = arquivo?.mime || pagamento?.anexo_mime || "";
  const extFromMime = mime.includes("pdf") ? ".pdf" : mime.includes("jpeg") ? ".jpg" : mime.includes("png") ? ".png" : mime.includes("xml") ? ".xml" : "";
  const temExt = /\.[a-z0-9]{2,5}$/i.test(original);
  const nome = temExt ? original : `${original}${extFromMime || ".txt"}`;

  let href = dataUrl;
  let revoke = false;

  if (!href || !String(href).startsWith("data:")) {
    const texto = `Arquivo não possui conteúdo anexado.
Nome: ${nome}
NF-e: ${pagamento?.numero_nfe || "-"}
Valor: ${pagamento?.valor ? fmt(pagamento.valor) : "-"}
Observação: ${pagamento?.observacao || "-"}`;
    href = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
    revoke = true;
  }

  const a = document.createElement("a");
  a.href = href;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1000);
};
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "-";
const valorPagoLancamentoGlobal = (p) => Number(p?.valor_pago ?? p?.valor ?? 0);
const valorDevidoLancamentoGlobal = (p) => Number(p?.valor_devido || 0);
const saldoAbertoLancamentoGlobal = (p) => Math.max(0, valorDevidoLancamentoGlobal(p) - valorPagoLancamentoGlobal(p));
const resumoFornecedorFinanceiro = (data, fornecedorId) => {
  const itens = (data?.pagamentos || []).filter(p => p.confirmado !== false && Number(p.fornecedor_id) === Number(fornecedorId));
  const devido = itens.reduce((s, p) => s + valorDevidoLancamentoGlobal(p), 0);
  const pago = itens.reduce((s, p) => s + valorPagoLancamentoGlobal(p), 0);
  const bonificado = itens.reduce((s, p) => String(p.forma_pagamento || '').toLowerCase().includes('bonifica') ? s + valorPagoLancamentoGlobal(p) : s, 0);
  return { devido, pago, bonificado, saldoAberto: Math.max(0, devido - pago), saldoCarteira: pago - devido };
};
const resumoCompradorFinanceiro = (data, compradorId) => {
  const itens = (data?.pagamentos || []).filter(p => p.confirmado !== false && Number(p.comprador_id) === Number(compradorId));
  const devido = itens.reduce((s, p) => s + valorDevidoLancamentoGlobal(p), 0);
  const pago = itens.reduce((s, p) => s + valorPagoLancamentoGlobal(p), 0);
  return { devido, pago, saldoAberto: Math.max(0, devido - pago), saldoCarteira: pago - devido };
};


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


const CloudStatus = () => {
  const [status, setStatus] = useState(() => localStorage.getItem("saas_cloud_status") || (CLOUD_ENABLED ? "Conectando ao Supabase..." : "Banco online NÃO configurado"));
  const [error, setError] = useState(() => localStorage.getItem("saas_cloud_error") || "");
  useEffect(() => {
    const timer = setInterval(() => {
      setStatus(localStorage.getItem("saas_cloud_status") || (CLOUD_ENABLED ? "Conectando ao Supabase..." : "Banco online NÃO configurado"));
      setError(localStorage.getItem("saas_cloud_error") || "");
    }, 1500);
    return () => clearInterval(timer);
  }, []);
  const ok = status.startsWith("OK");
  const off = status.startsWith("OFF") || status.includes("NÃO");
  return (
    <div style={{ position:"fixed", left:12, bottom:12, zIndex:99999, maxWidth:420, background: ok ? COLORS.successLight : off ? COLORS.warningLight : COLORS.dangerLight, color: ok ? COLORS.success : off ? COLORS.warning : COLORS.danger, border:`1px solid ${ok ? COLORS.success : off ? COLORS.warning : COLORS.danger}`, borderRadius:10, padding:"10px 12px", fontSize:12, boxShadow:"0 8px 25px rgba(0,0,0,.12)" }}>
      <b>Banco online:</b> {status}
      {error && <div style={{ marginTop:4, wordBreak:"break-word" }}>Erro: {error}</div>}
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
      const base = normalizeData(data || initData());
      const user = base.users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase() && u.senha === senha);
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
      ativo: false,
      fornecedor_pendente: portalMode ? {
        razao_social: cadastro.razao_social,
        nome_fantasia: cadastro.nome_fantasia,
        cnpj: cadastro.cnpj,
        contato: cadastro.contato || cadastro.nome,
        telefone: cadastro.telefone,
        cidade: cadastro.cidade,
        estado: cadastro.estado || "SP"
      } : null,
      status_cadastro: "Em análise",
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
    setError(portalMode ? "Seu cadastro foi para análise. Aguarde o administrador vincular sua conta ao fornecedor." : `Cadastro realizado como ${tipo}. Aguarde aprovação do administrador para acessar.`);
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
    <div style={S.loginBox} data-gig-login-box>
      <div style={S.loginCard} data-gig-login-card>
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
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [compradorFiltro, setCompradorFiltro] = useState("");
  const inPeriod = (p) => {
    const d = p.data_pagamento || p.created_at?.slice(0, 10) || "";
    return (!inicio || d >= inicio) && (!fim || d <= fim);
  };
  const pagamentosPeriodo = (data.pagamentos || []).filter(inPeriod).filter(p => p.confirmado !== false).filter(p => !compradorFiltro || Number(p.comprador_id) === Number(compradorFiltro));
  const totalDevido = pagamentosPeriodo.reduce((s, p) => s + Number(p.valor_devido || 0), 0);
  const totalPago = pagamentosPeriodo.reduce((s, p) => s + Number(p.valor_pago ?? p.valor ?? 0), 0);
  const saldoTotalCarteira = totalPago - totalDevido;

  const porComprador = (data.compradores || []).map(c => {
    const itens = pagamentosPeriodo.filter(p => Number(p.comprador_id) === Number(c.id));
    const devido = itens.reduce((s, p) => s + Number(p.valor_devido || 0), 0);
    const pago = itens.reduce((s, p) => s + Number(p.valor_pago ?? p.valor ?? 0), 0);
    return { ...c, devido, pago, saldo: pago - devido, positivo: Math.max(0, pago - devido) };
  }).filter(c => c.devido || c.pago).sort((a, b) => b.pago - a.pago);

  const recentPagamentos = [...pagamentosPeriodo].sort((a, b) => b.id - a.id).slice(0, 6);
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  const pagByMonth = months.map((_, i) => pagamentosPeriodo.filter(p => new Date(p.data_pagamento).getMonth() === i).reduce((s, p) => s + Number(p.valor_pago ?? p.valor ?? 0), 0));

  return (
    <div>
      <h1 style={S.pageTitle}>Dashboard de Despesas</h1>
      <p style={S.pageSub}>Visão geral de despesas por período, comprador, fornecedor e pagamentos confirmados</p>

      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <div style={S.formRow}>
            <label style={S.label}>Data inicial</label>
            <input style={S.input} type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Data final</label>
            <input style={S.input} type="date" value={fim} onChange={e => setFim(e.target.value)} />
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Comprador</label>
            <select style={S.select} value={compradorFiltro} onChange={e => setCompradorFiltro(e.target.value)}>
              <option value="">Todos compradores</option>
              {(data.compradores || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <button style={S.btn("outline")} onClick={() => { setInicio(""); setFim(""); setCompradorFiltro(""); }}>Limpar filtro</button>
        </div>
      </div>

      <div style={S.grid(3)}>
        <MetricCard label="Valor Total Geral Devido" value={fmt(totalDevido)} icon="payments" color={COLORS.danger} sub={`${pagamentosPeriodo.length} lançamentos`} />
        <MetricCard label="Valor Total Pago" value={fmt(totalPago)} icon="check" color={COLORS.success} sub="Pagamentos confirmados" />
        <MetricCard label="Saldo Total Carteira" value={fmt(saldoTotalCarteira)} icon="info" color={saldoTotalCarteira >= 0 ? COLORS.success : COLORS.danger} sub="Total pago menos total devido" />
      </div>

      <div style={{ ...S.grid(2), marginTop: 16 }}>
        <MetricCard label="Compradores Cadastrados" value={(data.compradores || []).length} icon="users" color={COLORS.primary} />
        <MetricCard label="Fornecedores Cadastrados" value={(data.fornecedores || []).length} icon="suppliers" color="#9333ea" />
      </div>

      <div style={{ ...S.grid(2), marginTop: 16 }}>
        <div style={S.card}>
          <p style={{ ...S.cardTitle, marginBottom: 12, fontSize: 14, fontWeight: 600, color: COLORS.text }}>Pagamentos por Mês</p>
          <SimpleChart type="bar" data={pagByMonth} labels={months} color={COLORS.primary} height={160} />
        </div>
        <div style={S.card}>
          <p style={{ ...S.cardTitle, marginBottom: 12, fontSize: 14, fontWeight: 600, color: COLORS.text }}>Carteira por Comprador</p>
          <table style={S.table}>
            <thead><tr>{["Comprador", "Total Devido", "Total Pago", "Saldo"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {porComprador.length === 0 && <tr><td colSpan={4} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted }}>Sem movimentação no período</td></tr>}
              {porComprador.map(c => (
                <tr key={c.id}>
                  <td style={S.td}>{c.nome}</td>
                  <td style={{ ...S.td, color: COLORS.danger, fontWeight: 600 }}>{fmt(c.devido)}</td>
                  <td style={{ ...S.td, color: COLORS.success, fontWeight: 600 }}>{fmt(c.pago)}</td>
                  <td style={{ ...S.td, color: c.saldo >= 0 ? COLORS.success : COLORS.danger, fontWeight: 700 }}>{fmt(c.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...S.card, marginTop: 16 }}>
        <p style={{ ...S.cardTitle, fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 14 }}>Últimos Pagamentos</p>
        <table style={S.table}>
          <thead>
            <tr>{["Fornecedor", "Comprador", "Devido", "Pago", "Saldo", "NF-e", "Data"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {recentPagamentos.map(p => {
              const forn = data.fornecedores.find(f => f.id === p.fornecedor_id);
              const comp = data.compradores?.find(c => Number(c.id) === Number(p.comprador_id));
              const devido = Number(p.valor_devido || 0);
              const pago = Number(p.valor_pago ?? p.valor ?? 0);
              return (
                <tr key={p.id}>
                  <td style={S.td}>{forn?.nome_fantasia || forn?.razao_social || "-"}</td>
                  <td style={S.td}>{comp?.nome || "Sem comprador"}</td>
                  <td style={{ ...S.td, color: COLORS.danger, fontWeight: 600 }}>{fmt(devido)}</td>
                  <td style={{ ...S.td, color: COLORS.success, fontWeight: 600 }}>{fmt(pago)}</td>
                  <td style={{ ...S.td, color: pago - devido >= 0 ? COLORS.success : COLORS.danger, fontWeight: 700 }}>{fmt(pago - devido)}</td>
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

// ─── SUPPLIERS SCREEN// ─── SUPPLIERS SCREEN ─────────────────────────────────────────────────────────
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

  const openNew = () => { setForm({ estado: "SP", ativo: true, status_cadastro: "Ativo" }); setModal("new"); };
  const openEdit = (f) => { setForm({ ...f }); setModal("edit"); };
  const openDetail = (f) => setDetail(f);

  const saveForm = () => {
    if (!form.razao_social || !form.cnpj) return alert("Razão social e CNPJ são obrigatórios.");
    const next = { ...data };
    if (modal === "new") {
      const id = next.nextId.fornecedores++;
      next.fornecedores.push({ ...form, id, ativo: true, status_cadastro: "Ativo", saldo_devido: 0, saldo_pago: 0, saldo_bonificado: 0, created_at: new Date().toISOString().slice(0, 10) });
      addLog(`Fornecedor ${form.razao_social} cadastrado como ativo`);
    } else {
      next.fornecedores = next.fornecedores.map(f => f.id === form.id ? { ...f, ...form } : f);
      addLog(`Fornecedor ${form.razao_social} atualizado`);
    }
    setData(next);
    setModal(null);
  };

  const aprovarFornecedor = (id) => {
    setData(prev => ({
      ...prev,
      fornecedores: (prev.fornecedores || []).map(f => Number(f.id) === Number(id) ? { ...f, ativo: true, status_cadastro: "Ativo" } : f)
    }));
    addLog("Fornecedor aprovado pelo administrador");
    alert("Fornecedor aprovado com sucesso.");
  };

  const rejeitarFornecedor = (id) => {
    setData(prev => ({
      ...prev,
      fornecedores: (prev.fornecedores || []).map(f => Number(f.id) === Number(id) ? { ...f, ativo: false, status_cadastro: "Rejeitado" } : f)
    }));
    addLog("Fornecedor rejeitado pelo administrador");
    alert("Fornecedor rejeitado.");
  };

  const inativarFornecedor = (id) => {
    setData(prev => ({
      ...prev,
      fornecedores: (prev.fornecedores || []).map(f => Number(f.id) === Number(id) ? { ...f, ativo: false, status_cadastro: "Inativo" } : f)
    }));
    addLog("Fornecedor inativado pelo administrador");
    alert("Fornecedor inativado.");
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

  const renderField = (label, field, type = "text", opts) => (
    <div style={S.formRow} key={field}>
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
            <tr>{["Razão Social / Fantasia", "CNPJ", "Contato", "Cidade/UF", "Status", "Saldo Devido", "Saldo Pago", "Ações"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted, padding: 32 }}>Nenhum fornecedor encontrado</td></tr>}
            {filtered.map(f => {
              const fin = resumoFornecedorFinanceiro(data, f.id);
              return (
              <tr key={f.id} style={{ cursor: "pointer" }}>
                <td style={S.td}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{f.razao_social}</p>
                  <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>{f.nome_fantasia}</p>
                </td>
                <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{f.cnpj}</td>
                <td style={S.td}>{f.contato || f.email}</td>
                <td style={S.td}>{f.cidade}/{f.estado}</td>
                <td style={S.td}><StatusBadge status={f.status_cadastro || (f.ativo === false ? "Em análise" : "Ativo")} /></td>
                <td style={{ ...S.td, color: COLORS.danger, fontWeight: 600 }}>{fmt(fin.saldoAberto)}</td>
                <td style={{ ...S.td, color: COLORS.success, fontWeight: 600 }}>{fmt(fin.pago)}</td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" style={{ ...S.btn("outline", "sm"), padding: "5px 8px" }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDetail(f); }} title="Ver detalhes"><Icon name="eye" size={13} /></button>
                    {canEdit && <button type="button" style={{ ...S.btn("outline", "sm"), padding: "5px 8px" }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(f); }} title="Editar"><Icon name="edit" size={13} /></button>}
                    {canDelete && <button type="button" style={{ ...S.btn("danger", "sm"), padding: "5px 8px" }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirm(f.id); }} title="Excluir"><Icon name="trash" size={13} color="#fff" /></button>}
                  </div>
                </td>
              </tr>
              );
            })}
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
              <MetricCard label="Saldo Devido" value={fmt(resumoFornecedorFinanceiro(data, detail.id).saldoAberto)} color={COLORS.danger} />
              <MetricCard label="Total Pago" value={fmt(resumoFornecedorFinanceiro(data, detail.id).pago)} color={COLORS.success} />
              <MetricCard label="Bonificado" value={fmt(resumoFornecedorFinanceiro(data, detail.id).bonificado)} color={COLORS.warning} />
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
            {renderField("Razão Social *", "razao_social")}
            {renderField("Nome Fantasia", "nome_fantasia")}
            {renderField("CNPJ *", "cnpj")}
            {renderField("Inscrição Estadual", "inscricao_estadual")}
            {renderField("Contato", "contato")}
            {renderField("Telefone", "telefone")}
            {renderField("Celular", "celular")}
            {renderField("E-mail", "email", "email")}
            <div style={{ gridColumn: "span 2" }}>{renderField("Endereço", "endereco")}</div>
            {renderField("Cidade", "cidade")}
            {renderField("Estado", "estado", "text", ESTADOS)}
            {renderField("CEP", "cep")}
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

// ─── BUYERS SCREEN ────────────────────────────────────────────────────────────
const BuyersScreen = ({ data, setData, currentUser, addLog }) => {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [sort, setSort] = useState({ key: "nome", dir: 1 });

  const ordenar = (key) => setSort(prev => ({ key, dir: prev.key === key ? prev.dir * -1 : 1 }));
  const ativos = data.compradores || [];

  const resumoComprador = (id) => {
    const itens = (data.pagamentos || []).filter(p => p.confirmado !== false && Number(p.comprador_id) === Number(id));
    const devido = itens.reduce((s, p) => s + Number(p.valor_devido || 0), 0);
    const pago = itens.reduce((s, p) => s + Number(p.valor_pago ?? p.valor ?? 0), 0);
    return { devido, pago, saldo: pago - devido };
  };

  const filtered = ativos
    .filter(c => !search || [c.nome, c.email, c.cargo, c.centro_custo].join(" ").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = String(a[sort.key] || "").toLowerCase();
      const bv = String(b[sort.key] || "").toLowerCase();
      return av.localeCompare(bv) * sort.dir;
    });

  const openNew = () => { setForm({ ativo: true, status_cadastro: "Em análise", cargo: "Comprador" }); setModal("new"); };
  const openEdit = (c) => { setForm({ ...c }); setModal("edit"); };

  const saveBuyer = () => {
    if (!form.nome) return alert("Informe o nome do comprador.");
    const next = { ...data, compradores: [...(data.compradores || [])] };
    if (modal === "new") {
      const id = next.nextId.compradores++;
      next.compradores.push({
        ...form,
        id,
        ativo: false,
        status_cadastro: "Em análise",
        created_at: new Date().toISOString().slice(0, 10)
      });
      addLog(`Comprador ${form.nome} cadastrado e enviado para aprovação`);
      alert("Comprador cadastrado. O administrador precisa aprovar para ficar ativo.");
    } else {
      next.compradores = next.compradores.map(c => Number(c.id) === Number(form.id) ? { ...c, ...form } : c);
      addLog(`Comprador ${form.nome} atualizado`);
    }
    setData(next);
    setModal(null);
  };

  const aprovarBuyer = (id) => {
    setData(prev => ({
      ...prev,
      compradores: (prev.compradores || []).map(c => Number(c.id) === Number(id) ? { ...c, ativo: true, status_cadastro: "Ativo" } : c)
    }));
    addLog("Comprador aprovado pelo administrador");
    alert("Comprador aprovado com sucesso.");
  };

  const rejeitarBuyer = (id) => {
    setData(prev => ({
      ...prev,
      compradores: (prev.compradores || []).map(c => Number(c.id) === Number(id) ? { ...c, ativo: false, status_cadastro: "Rejeitado" } : c)
    }));
    addLog("Comprador rejeitado pelo administrador");
    alert("Comprador rejeitado.");
  };

  const inativarBuyer = (id) => {
    setData(prev => ({
      ...prev,
      compradores: (prev.compradores || []).map(c => Number(c.id) === Number(id) ? { ...c, ativo: false, status_cadastro: "Inativo" } : c)
    }));
    addLog("Comprador inativado pelo administrador");
    alert("Comprador inativado.");
  };

  const doDelete = (id) => {
    const next = { ...data, compradores: data.compradores.filter(c => Number(c.id) !== Number(id)) };
    setData(next);
    setConfirm(null);
    addLog("Comprador excluído");
  };

  return (
    <div>
      <h1 style={S.pageTitle}>Compradores</h1>
      <p style={S.pageSub}>Cadastro de compradores e carteira financeira por comprador</p>

      <div style={S.searchBar}>
        <input style={{ ...S.input, flex: 1 }} placeholder="Buscar comprador..." value={search} onChange={e => setSearch(e.target.value)} />
        <button style={S.btn("primary")} onClick={openNew}><Icon name="plus" size={15} color="#fff" /> Novo Comprador</button>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              {[
                ["nome", "Comprador"], ["email", "E-mail"], ["cargo", "Cargo"], ["centro_custo", "Centro de Custo"]
              ].map(([key, label]) => <th key={key} style={{ ...S.th, cursor: "pointer" }} onClick={() => ordenar(key)}>{label} {sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : ""}</th>)}
              {["Status", "Total Devido", "Total Pago", "Saldo", "Ações"].map(h => <th key={h} style={S.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted, padding: 32 }}>Nenhum comprador encontrado</td></tr>}
            {filtered.map(c => {
              const r = resumoComprador(c.id);
              return (
                <tr key={c.id}>
                  <td style={S.td}><strong>{c.nome}</strong></td>
                  <td style={S.td}>{c.email || "-"}</td>
                  <td style={S.td}>{c.cargo || "-"}</td>
                  <td style={S.td}>{c.centro_custo || "-"}</td>
                  <td style={S.td}><StatusBadge status={c.status_cadastro || (c.ativo ? "Ativo" : "Em análise")} /></td>
                  <td style={{ ...S.td, color: COLORS.danger, fontWeight: 600 }}>{fmt(r.devido)}</td>
                  <td style={{ ...S.td, color: COLORS.success, fontWeight: 600 }}>{fmt(r.pago)}</td>
                  <td style={{ ...S.td, color: r.saldo >= 0 ? COLORS.success : COLORS.danger, fontWeight: 700 }}>{fmt(r.saldo)}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" style={{ ...S.btn("outline", "sm"), padding: "5px 8px" }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(c); }}><Icon name="edit" size={13} /></button>
                      {currentUser.tipo === "Administrador" && <button type="button" style={{ ...S.btn("danger", "sm"), padding: "5px 8px" }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirm(c.id); }}><Icon name="trash" size={13} color="#fff" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(modal === "new" || modal === "edit") && (
        <Modal title={modal === "new" ? "Novo Comprador" : "Editar Comprador"} onClose={() => setModal(null)}>
          {[
            ["Nome *", "nome"], ["E-mail", "email"], ["Cargo", "cargo"], ["Centro de custo", "centro_custo"]
          ].map(([label, field]) => (
            <div style={S.formRow} key={field}>
              <label style={S.label}>{label}</label>
              <input style={S.input} value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
            </div>
          ))}
          {modal === "edit" && currentUser.tipo === "Administrador" && (
            <div style={S.formRow}>
              <label style={S.label}>Status</label>
              <select style={S.select} value={form.status_cadastro || ""} onChange={e => setForm(p => ({ ...p, status_cadastro: e.target.value, ativo: e.target.value === "Ativo" }))}>
                <option value="Em análise">Em análise</option>
                <option value="Ativo">Ativo</option>
                <option value="Rejeitado">Rejeitado</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button style={S.btn("outline")} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btn("primary")} onClick={saveBuyer}>Salvar</button>
          </div>
        </Modal>
      )}

      {confirm && <ConfirmModal message="Excluir este comprador? Os pagamentos antigos continuarão registrados, mas ficarão sem comprador cadastrado." onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
};

// ─── PAYMENTS SCREEN ──────────────────────────────────────────────────────────
const PaymentsScreen = ({ data, setData, currentUser, addLog }) => {
  const [search, setSearch] = useState("");
  const [filterForn, setFilterForn] = useState("");
  const [filterComp, setFilterComp] = useState("");
  const [filterForma, setFilterForma] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [modal, setModal] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [form, setForm] = useState({ data_vencimento: new Date().toISOString().slice(0, 10), tipo_divida: "À Vista", parcelas: 1 });
  const [payForm, setPayForm] = useState({ data_pagamento: new Date().toISOString().slice(0, 10), forma_pagamento: "PIX", tipo_anexo: "Comprovante" });
  const [confirm, setConfirm] = useState(null);
  const [sort, setSort] = useState({ key: "data_vencimento", dir: -1 });
  const canDelete = currentUser.tipo === "Administrador";

  const ordenar = (key) => setSort(prev => ({ key, dir: prev.key === key ? prev.dir * -1 : 1 }));
  const compradorNome = (id) => data.compradores?.find(c => Number(c.id) === Number(id))?.nome || "Sem comprador";
  const fornecedorNome = (id) => {
    const f = data.fornecedores.find(x => Number(x.id) === Number(id));
    return f?.nome_fantasia || f?.razao_social || "-";
  };
  const valorPagoLancamento = (p) => Number(p.valor_pago ?? p.valor ?? 0);
  const saldoLancamento = (p) => Number(p.valor_devido || 0) - valorPagoLancamento(p);
  const statusLancamento = (p) => {
    if (p.confirmado === false) return "Aguardando confirmação";
    const devido = Number(p.valor_devido || 0);
    const pago = valorPagoLancamento(p);
    if (pago <= 0) return "Pendente";
    if (devido > 0 && pago >= devido) return "Pago";
    return "Parcial";
  };

  const filtered = data.pagamentos.filter(p => {
    const forn = fornecedorNome(p.fornecedor_id);
    const comp = compradorNome(p.comprador_id);
    const d = p.data_vencimento || p.data_pagamento || "";
    const matchSearch = !search || [p.numero_nfe, p.anexo_nome, forn, comp, p.observacao].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchForn = !filterForn || Number(p.fornecedor_id) === Number(filterForn);
    const matchComp = !filterComp || Number(p.comprador_id) === Number(filterComp);
    const matchForma = !filterForma || p.tipo_divida === filterForma || p.forma_pagamento === filterForma;
    const matchData = (!inicio || d >= inicio) && (!fim || d <= fim);
    return matchSearch && matchForn && matchComp && matchForma && matchData;
  }).sort((a, b) => {
    const key = sort.key;
    let av = key === "fornecedor" ? fornecedorNome(a.fornecedor_id) : key === "comprador" ? compradorNome(a.comprador_id) : key === "saldo" ? saldoLancamento(a) : key === "valor_pago" ? valorPagoLancamento(a) : a[key];
    let bv = key === "fornecedor" ? fornecedorNome(b.fornecedor_id) : key === "comprador" ? compradorNome(b.comprador_id) : key === "saldo" ? saldoLancamento(b) : key === "valor_pago" ? valorPagoLancamento(b) : b[key];
    if (["valor_devido", "valor_pago", "valor", "saldo", "parcelas"].includes(key)) return (Number(av || 0) - Number(bv || 0)) * sort.dir;
    return String(av || "").localeCompare(String(bv || "")) * sort.dir;
  });

  const saveDebt = async () => {
    if (!form.fornecedor_id || !form.comprador_id) return alert("Fornecedor e comprador são obrigatórios.");
    if (!form.valor_devido || Number(form.valor_devido) <= 0) return alert("Informe o valor da dívida.");
    if (!form.tipo_divida) return alert("Informe se a dívida é à vista ou parcelada.");
    if (form.tipo_divida === "Parcelado" && (!form.parcelas || Number(form.parcelas) <= 1)) return alert("Informe a quantidade de parcelas.");
    if (!String(form.observacao || "").trim()) return alert("A observação é obrigatória.");
    const next = { ...data, pagamentos: [...data.pagamentos], anexos: [...(data.anexos || [])] };
    const id = next.nextId.pagamentos++;
    const valorDevido = Number(form.valor_devido || 0);
    const anexoNome = form.anexo_file?.name || form.anexo_nome || "";
    const arquivoData = await fileToDataUrl(form.anexo_file);
    const novo = {
      ...form,
      id,
      fornecedor_id: Number(form.fornecedor_id),
      comprador_id: Number(form.comprador_id),
      valor_devido: valorDevido,
      valor_pago: 0,
      valor: 0,
      tipo_divida: form.tipo_divida || "À Vista",
      parcelas: form.tipo_divida === "Parcelado" ? Number(form.parcelas || 1) : 1,
      data_vencimento: form.data_vencimento || new Date().toISOString().slice(0, 10),
      data_pagamento: "",
      forma_pagamento: "",
      anexo_nome: anexoNome,
      tipo_anexo: form.tipo_anexo || "NF-e",
      anexo_data: arquivoData.data_url,
      anexo_mime: arquivoData.mime,
      historico_pagamentos: [],
      enviado_por: currentUser.tipo,
      confirmado: true,
      status_confirmacao: "Pendente",
      confirmado_por: currentUser.nome,
      confirmado_em: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    delete novo.anexo_file;
    next.pagamentos.push(novo);
    if (anexoNome) {
      next.anexos.push({ id: next.nextId.anexos++, pagamento_id: id, nome_arquivo: anexoNome, tipo_arquivo: novo.tipo_anexo, data_url: arquivoData.data_url, mime: arquivoData.mime, created_at: new Date().toISOString() });
    }
    addLog(`Dívida de ${fmt(valorDevido)} registrada para ${fornecedorNome(novo.fornecedor_id)} / ${compradorNome(novo.comprador_id)}`);
    setData(next);
    setModal(false);
    setForm({ data_vencimento: new Date().toISOString().slice(0, 10), tipo_divida: "À Vista", parcelas: 1 });
  };

  const savePaymentOnDebt = async () => {
    if (!payModal) return;
    if (!payForm.valor || Number(payForm.valor) <= 0) return alert("Informe o valor pago.");
    const next = { ...data, pagamentos: [...data.pagamentos], anexos: [...(data.anexos || [])] };
    const anexoNome = payForm.anexo_file?.name || payForm.anexo_nome || "";
    const arquivoData = await fileToDataUrl(payForm.anexo_file);
    next.pagamentos = next.pagamentos.map(p => {
      if (Number(p.id) !== Number(payModal.id)) return p;
      const valorAnterior = Number(p.valor_pago ?? p.valor ?? 0);
      const valorPago = Number(payForm.valor || 0);
      const historico = Array.isArray(p.historico_pagamentos) ? p.historico_pagamentos : [];
      return {
        ...p,
        valor_pago: valorAnterior + valorPago,
        valor: valorAnterior + valorPago,
        forma_pagamento: payForm.forma_pagamento || "PIX",
        data_pagamento: payForm.data_pagamento || new Date().toISOString().slice(0, 10),
        numero_nfe: payForm.numero_nfe || p.numero_nfe || "",
        anexo_nome: anexoNome || p.anexo_nome || "",
        tipo_anexo: anexoNome ? (payForm.tipo_anexo || "Comprovante") : p.tipo_anexo,
        anexo_data: arquivoData.data_url || p.anexo_data,
        anexo_mime: arquivoData.mime || p.anexo_mime,
        status_confirmacao: (valorAnterior + valorPago) >= Number(p.valor_devido || 0) ? "Pago" : "Parcial",
        historico_pagamentos: [...historico, { valor: valorPago, data_pagamento: payForm.data_pagamento || new Date().toISOString().slice(0, 10), forma_pagamento: payForm.forma_pagamento || "PIX", observacao: payForm.observacao || "", anexo_nome: anexoNome }]
      };
    });
    if (anexoNome) {
      next.anexos.push({ id: next.nextId.anexos++, pagamento_id: payModal.id, nome_arquivo: anexoNome, tipo_arquivo: payForm.tipo_anexo || "Comprovante", data_url: arquivoData.data_url, mime: arquivoData.mime, created_at: new Date().toISOString() });
    }
    addLog(`Pagamento de ${fmt(Number(payForm.valor))} lançado na dívida #${payModal.id}`);
    setData(next);
    setPayModal(null);
    setPayForm({ data_pagamento: new Date().toISOString().slice(0, 10), forma_pagamento: "PIX", tipo_anexo: "Comprovante" });
  };

  const doDelete = (id) => {
    const pag = data.pagamentos.find(p => Number(p.id) === Number(id));
    const next = { ...data, pagamentos: data.pagamentos.filter(p => Number(p.id) !== Number(id)), anexos: (data.anexos || []).filter(a => Number(a.pagamento_id) !== Number(id)) };
    addLog(`Lançamento ${pag?.numero_nfe || "#" + id} excluído`);
    setData(next);
    setConfirm(null);
  };

  const totais = filtered.filter(p => p.confirmado !== false).reduce((acc, p) => {
    acc.devido += Number(p.valor_devido || 0);
    acc.pago += valorPagoLancamento(p);
    return acc;
  }, { devido: 0, pago: 0 });

  return (
    <div>
      <h1 style={S.pageTitle}>Pagamentos e Dívidas</h1>
      <p style={S.pageSub}>Primeiro registre a dívida; depois use o botão Pagar em cada transação.</p>

      <div style={S.grid(3)}>
        <MetricCard label="Total Devido Filtrado" value={fmt(totais.devido)} color={COLORS.danger} />
        <MetricCard label="Total Pago Filtrado" value={fmt(totais.pago)} color={COLORS.success} />
        <MetricCard label="Saldo Aberto Filtrado" value={fmt(totais.devido - totais.pago)} color={totais.devido - totais.pago <= 0 ? COLORS.success : COLORS.danger} />
      </div>

      <div style={{ ...S.searchBar, marginTop: 16 }}>
        <input style={{ ...S.input, flex: 1 }} placeholder="Buscar por NF-e, fornecedor, comprador, observação ou anexo..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...S.select, width: 190 }} value={filterForn} onChange={e => setFilterForn(e.target.value)}>
          <option value="">Todos fornecedores</option>
          {data.fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
        </select>
        <select style={{ ...S.select, width: 190 }} value={filterComp} onChange={e => setFilterComp(e.target.value)}>
          <option value="">Todos compradores</option>
          {(data.compradores || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select style={{ ...S.select, width: 170 }} value={filterForma} onChange={e => setFilterForma(e.target.value)}>
          <option value="">Todas as formas</option>
          {DEBT_PAYMENT_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input style={{ ...S.input, width: 145 }} type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
        <input style={{ ...S.input, width: 145 }} type="date" value={fim} onChange={e => setFim(e.target.value)} />
        <button style={S.btn("primary")} onClick={() => setModal(true)}><Icon name="plus" size={15} color="#fff" /> Nova Dívida</button>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              {[
                ["id", "#"], ["fornecedor", "Fornecedor"], ["comprador", "Comprador"], ["valor_devido", "Valor Devido"], ["valor_pago", "Valor Pago"], ["saldo", "Saldo Aberto"], ["tipo_divida", "Tipo"], ["parcelas", "Parcelas"], ["status_confirmacao", "Status"], ["numero_nfe", "NF-e"], ["data_vencimento", "Vencimento"]
              ].map(([key, label]) => <th key={key} style={{ ...S.th, cursor: "pointer" }} onClick={() => ordenar(key)}>{label} {sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : ""}</th>)}
              <th style={S.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={12} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted, padding: 32 }}>Nenhum lançamento encontrado</td></tr>}
            {filtered.map(p => {
              const st = statusLancamento(p);
              const devido = Number(p.valor_devido || 0);
              const pago = valorPagoLancamento(p);
              const saldo = saldoLancamento(p);
              return (
                <tr key={p.id}>
                  <td style={{ ...S.td, color: COLORS.textMuted, fontFamily: "monospace" }}>#{p.id}</td>
                  <td style={S.td}>{fornecedorNome(p.fornecedor_id)}</td>
                  <td style={S.td}>{compradorNome(p.comprador_id)}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: COLORS.danger }}>{fmt(devido)}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: COLORS.success }}>{fmt(pago)}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: saldo <= 0 ? COLORS.success : COLORS.danger }}>{fmt(saldo)}</td>
                  <td style={S.td}><StatusBadge status={p.tipo_divida || "À Vista"} /></td>
                  <td style={S.td}>{p.tipo_divida === "Parcelado" ? `${p.parcelas || 1}x` : "-"}</td>
                  <td style={S.td}><StatusBadge status={st} /></td>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{p.numero_nfe || "-"}</td>
                  <td style={S.td}>{fmtDate(p.data_vencimento || p.data_pagamento)}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {saldo > 0 && <button style={{ ...S.btn("success", "sm"), padding: "4px 7px" }} onClick={() => { setPayModal(p); setPayForm({ data_pagamento: new Date().toISOString().slice(0, 10), forma_pagamento: "PIX", tipo_anexo: "Comprovante" }); }}>Pagar</button>}
                      {p.anexo_nome && <button style={{ ...S.btn("outline", "sm"), padding: "4px 7px" }} onClick={() => downloadArquivo(data.anexos.find(a => Number(a.pagamento_id) === Number(p.id)), p)} title="Baixar anexo"><Icon name="download" size={12} /></button>}
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
        <Modal title="Registrar Nova Dívida" onClose={() => setModal(false)} wide>
          <div style={S.grid(2)}>
            <div style={S.formRow}>
              <label style={S.label}>Fornecedor *</label>
              <select style={S.select} value={form.fornecedor_id || ""} onChange={e => setForm(p => ({ ...p, fornecedor_id: e.target.value }))}>
                <option value="">Selecione...</option>
                {data.fornecedores.filter(f => f.ativo !== false).map(f => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
              </select>
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Comprador responsável pela dívida *</label>
              <select style={S.select} value={form.comprador_id || ""} onChange={e => setForm(p => ({ ...p, comprador_id: e.target.value }))}>
                <option value="">Selecione...</option>
                {(data.compradores || []).filter(c => c.ativo !== false && c.status_cadastro !== "Rejeitado").map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          <div style={S.grid(3)}>
            <div style={S.formRow}>
              <label style={S.label}>Valor da dívida (R$) *</label>
              <input style={S.input} type="number" value={form.valor_devido || ""} onChange={e => setForm(p => ({ ...p, valor_devido: e.target.value }))} />
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Tipo *</label>
              <select style={S.select} value={form.tipo_divida || "À Vista"} onChange={e => setForm(p => ({ ...p, tipo_divida: e.target.value, parcelas: e.target.value === "À Vista" ? 1 : p.parcelas }))}>
                {DEBT_PAYMENT_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Parcelas</label>
              <input style={S.input} type="number" min="1" disabled={form.tipo_divida !== "Parcelado"} value={form.parcelas || 1} onChange={e => setForm(p => ({ ...p, parcelas: e.target.value }))} />
            </div>
          </div>

          <div style={S.grid(3)}>
            <div style={S.formRow}>
              <label style={S.label}>Data de vencimento</label>
              <input style={S.input} type="date" value={form.data_vencimento || ""} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} />
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Número NF-e</label>
              <input style={S.input} value={form.numero_nfe || ""} onChange={e => setForm(p => ({ ...p, numero_nfe: e.target.value }))} placeholder="NF-000" />
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Anexo da dívida/NF-e</label>
              <input style={S.input} type="file" accept=".pdf,.jpg,.jpeg,.png,.xml" onChange={e => setForm(p => ({ ...p, anexo_file: e.target.files?.[0], anexo_nome: e.target.files?.[0]?.name || "", tipo_anexo: "NF-e" }))} />
            </div>
          </div>

          <div style={S.formRow}>
            <label style={S.label}>Observação *</label>
            <textarea style={{ ...S.input, minHeight: 70, resize: "vertical" }} value={form.observacao || ""} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} placeholder="Obrigatório: descreva do que se trata essa dívida." />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={S.btn("outline")} onClick={() => setModal(false)}>Cancelar</button>
            <button style={S.btn("primary")} onClick={saveDebt}>Registrar dívida</button>
          </div>
        </Modal>
      )}

      {payModal && (
        <Modal title={`Registrar pagamento da dívida #${payModal.id}`} onClose={() => setPayModal(null)}>
          <div style={{ background: COLORS.primaryLight, padding: 12, borderRadius: 8, marginBottom: 14 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>{fornecedorNome(payModal.fornecedor_id)} • {compradorNome(payModal.comprador_id)}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>Devido: {fmt(payModal.valor_devido)} | Pago: {fmt(valorPagoLancamento(payModal))} | Aberto: {fmt(saldoLancamento(payModal))}</p>
          </div>
          <div style={S.grid(2)}>
            <div style={S.formRow}>
              <label style={S.label}>Valor pago (R$) *</label>
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
              <select style={S.select} value={payForm.forma_pagamento || "PIX"} onChange={e => setPayForm(p => ({ ...p, forma_pagamento: e.target.value, tipo_anexo: e.target.value === "Bonificação" ? "Nota de bonificação" : "Comprovante" }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={S.formRow}>
              <label style={S.label}>Comprovante</label>
              <input style={S.input} type="file" accept=".pdf,.jpg,.jpeg,.png,.xml" onChange={e => setPayForm(p => ({ ...p, anexo_file: e.target.files?.[0], anexo_nome: e.target.files?.[0]?.name || "" }))} />
            </div>
          </div>
          <div style={S.formRow}>
            <label style={S.label}>Observação do pagamento</label>
            <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} value={payForm.observacao || ""} onChange={e => setPayForm(p => ({ ...p, observacao: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={S.btn("outline")} onClick={() => setPayModal(null)}>Cancelar</button>
            <button style={S.btn("primary")} onClick={savePaymentOnDebt}>Salvar pagamento</button>
          </div>
        </Modal>
      )}
      {confirm && <ConfirmModal message="Excluir este lançamento? O dashboard, o fornecedor e a carteira do comprador serão atualizados automaticamente." onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
};


// ─── CONTRACTS DASHBOARD SCREEN ──────────────────────────────────────────────
const ContractsScreen = ({ data, setData, currentUser, addLog }) => {
  const [search, setSearch] = useState("");
  const [filterComp, setFilterComp] = useState("");
  const [filterForn, setFilterForn] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [modal, setModal] = useState(false);
  const [receiveModal, setReceiveModal] = useState(null);
  const [form, setForm] = useState({ forma_pagamento: "Boleto", parcelas: 1, data_inicio: new Date().toISOString().slice(0, 10) });
  const [receiveForm, setReceiveForm] = useState({ valor: "", data: new Date().toISOString().slice(0, 10), forma_pagamento: "Boleto", observacao: "" });
  const [confirm, setConfirm] = useState(null);
  const [sort, setSort] = useState({ key: "data_inicio", dir: -1 });
  const canDelete = currentUser.tipo === "Administrador";

  const fornecedorNome = (id) => {
    const f = data.fornecedores.find(x => Number(x.id) === Number(id));
    return f?.nome_fantasia || f?.razao_social || "-";
  };
  const compradorNome = (id) => data.compradores?.find(c => Number(c.id) === Number(id))?.nome || "Sem comprador";
  const saldoContrato = (c) => Number(c.valor_contrato || 0) - Number(c.valor_arrecadado || 0);
  const statusContrato = (c) => {
    const saldo = saldoContrato(c);
    const arrec = Number(c.valor_arrecadado || 0);
    if (arrec <= 0) return "Pendente";
    if (saldo <= 0) return "Pago";
    return "Parcial";
  };
  const ordenar = (key) => setSort(prev => ({ key, dir: prev.key === key ? prev.dir * -1 : 1 }));

  const filtered = (data.contratos || []).filter(c => {
    const d = c.data_inicio || c.created_at?.slice?.(0,10) || "";
    const txt = [c.numero_contrato, c.descricao, c.observacao, fornecedorNome(c.fornecedor_id), compradorNome(c.comprador_id), c.forma_pagamento].join(" ").toLowerCase();
    return (!search || txt.includes(search.toLowerCase())) &&
      (!filterComp || Number(c.comprador_id) === Number(filterComp)) &&
      (!filterForn || Number(c.fornecedor_id) === Number(filterForn)) &&
      (!inicio || d >= inicio) && (!fim || d <= fim);
  }).sort((a,b) => {
    const key = sort.key;
    let av = key === "fornecedor" ? fornecedorNome(a.fornecedor_id) : key === "comprador" ? compradorNome(a.comprador_id) : key === "saldo" ? saldoContrato(a) : a[key];
    let bv = key === "fornecedor" ? fornecedorNome(b.fornecedor_id) : key === "comprador" ? compradorNome(b.comprador_id) : key === "saldo" ? saldoContrato(b) : b[key];
    if (["valor_contrato", "valor_arrecadado", "saldo", "parcelas"].includes(key)) return (Number(av || 0) - Number(bv || 0)) * sort.dir;
    return String(av || "").localeCompare(String(bv || "")) * sort.dir;
  });

  const totais = filtered.reduce((acc, c) => {
    acc.contratos += Number(c.valor_contrato || 0);
    acc.arrecadado += Number(c.valor_arrecadado || 0);
    return acc;
  }, { contratos: 0, arrecadado: 0 });

  const porComprador = (data.compradores || []).map(comp => {
    const itens = filtered.filter(c => Number(c.comprador_id) === Number(comp.id));
    const contratos = itens.reduce((s,c) => s + Number(c.valor_contrato || 0), 0);
    const arrecadado = itens.reduce((s,c) => s + Number(c.valor_arrecadado || 0), 0);
    return { ...comp, contratos, arrecadado, saldo: contratos - arrecadado, qtd: itens.length };
  }).filter(c => c.qtd > 0);

  const saveContract = () => {
    if (!form.numero_contrato && !form.descricao) return alert("Informe o número ou descrição do contrato.");
    if (!form.fornecedor_id || !form.comprador_id) return alert("Fornecedor e comprador são obrigatórios.");
    if (!form.valor_contrato || Number(form.valor_contrato) <= 0) return alert("Informe o valor do contrato.");
    if (!form.forma_pagamento) return alert("Informe a forma de pagamento.");
    if (!form.parcelas || Number(form.parcelas) < 1) return alert("Informe em quantas vezes será pago.");
    if (!String(form.observacao || "").trim()) return alert("A observação do contrato é obrigatória.");
    const next = { ...data, contratos: [...(data.contratos || [])] };
    const id = next.nextId.contratos++;
    next.contratos.push({
      ...form,
      id,
      fornecedor_id: Number(form.fornecedor_id),
      comprador_id: Number(form.comprador_id),
      valor_contrato: Number(form.valor_contrato || 0),
      valor_arrecadado: 0,
      parcelas: Number(form.parcelas || 1),
      historico_recebimentos: [],
      created_at: new Date().toISOString()
    });
    addLog(`Contrato ${form.numero_contrato || form.descricao} registrado`);
    setData(next);
    setModal(false);
    setForm({ forma_pagamento: "Boleto", parcelas: 1, data_inicio: new Date().toISOString().slice(0, 10) });
  };

  const saveReceive = () => {
    if (!receiveModal) return;
    if (!receiveForm.valor || Number(receiveForm.valor) <= 0) return alert("Informe o valor arrecadado.");
    const next = { ...data, contratos: [...(data.contratos || [])] };
    next.contratos = next.contratos.map(c => {
      if (Number(c.id) !== Number(receiveModal.id)) return c;
      const valor = Number(receiveForm.valor || 0);
      return {
        ...c,
        valor_arrecadado: Number(c.valor_arrecadado || 0) + valor,
        historico_recebimentos: [...(c.historico_recebimentos || []), { valor, data: receiveForm.data || new Date().toISOString().slice(0,10), forma_pagamento: receiveForm.forma_pagamento || "Boleto", observacao: receiveForm.observacao || "" }]
      };
    });
    addLog(`Arrecadação de contrato #${receiveModal.id}: ${fmt(Number(receiveForm.valor))}`);
    setData(next);
    setReceiveModal(null);
    setReceiveForm({ valor: "", data: new Date().toISOString().slice(0, 10), forma_pagamento: "Boleto", observacao: "" });
  };

  const doDelete = (id) => {
    const next = { ...data, contratos: (data.contratos || []).filter(c => Number(c.id) !== Number(id)) };
    addLog(`Contrato #${id} excluído`);
    setData(next);
    setConfirm(null);
  };

  return (
    <div>
      <h1 style={S.pageTitle}>Dashboard de Contratos</h1>
      <p style={S.pageSub}>Controle separado de contratos, valores arrecadados, observações e compradores responsáveis.</p>

      <div style={S.grid(3)}>
        <MetricCard label="Valor Total de Contratos" value={fmt(totais.contratos)} color={COLORS.primary} />
        <MetricCard label="Valores Arrecadados de Contrato" value={fmt(totais.arrecadado)} color={COLORS.success} />
        <MetricCard label="Saldo a Arrecadar" value={fmt(totais.contratos - totais.arrecadado)} color={totais.contratos - totais.arrecadado <= 0 ? COLORS.success : COLORS.warning} />
      </div>

      <div style={{ ...S.searchBar, marginTop: 16 }}>
        <input style={{ ...S.input, flex: 1 }} placeholder="Buscar contrato, fornecedor, comprador ou observação..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...S.select, width: 190 }} value={filterComp} onChange={e => setFilterComp(e.target.value)}>
          <option value="">Todos compradores</option>
          {(data.compradores || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select style={{ ...S.select, width: 190 }} value={filterForn} onChange={e => setFilterForn(e.target.value)}>
          <option value="">Todos fornecedores</option>
          {(data.fornecedores || []).map(f => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
        </select>
        <input style={{ ...S.input, width: 150 }} type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
        <input style={{ ...S.input, width: 150 }} type="date" value={fim} onChange={e => setFim(e.target.value)} />
        <button style={S.btn("primary")} onClick={() => setModal(true)}>+ Registrar Novo Contrato</button>
      </div>

      <div style={{ ...S.card, marginTop: 16 }}>
        <p style={{ ...S.cardTitle, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Resumo por comprador</p>
        <table style={S.table}>
          <thead><tr>{["Comprador", "Qtd", "Contratos", "Arrecadado", "Saldo"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {porComprador.length === 0 && <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted }}>Sem contratos no filtro</td></tr>}
            {porComprador.map(c => <tr key={c.id}><td style={S.td}>{c.nome}</td><td style={S.td}>{c.qtd}</td><td style={S.td}>{fmt(c.contratos)}</td><td style={{...S.td, color: COLORS.success, fontWeight: 700}}>{fmt(c.arrecadado)}</td><td style={S.td}>{fmt(c.saldo)}</td></tr>)}
          </tbody>
        </table>
      </div>

      <div style={{ ...S.card, marginTop: 16, overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              {[["id", "#"], ["numero_contrato", "Contrato"], ["fornecedor", "Fornecedor"], ["comprador", "Comprador"], ["valor_contrato", "Valor Contrato"], ["valor_arrecadado", "Arrecadado"], ["saldo", "Saldo"], ["forma_pagamento", "Forma"], ["parcelas", "Parcelas"], ["data_inicio", "Data"], ["observacao", "Observação"]].map(([key,label]) => <th key={key} style={{ ...S.th, cursor: "pointer" }} onClick={() => ordenar(key)}>{label} {sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : ""}</th>)}
              <th style={S.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={12} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted, padding: 32 }}>Nenhum contrato encontrado</td></tr>}
            {filtered.map(c => {
              const saldo = saldoContrato(c);
              return <tr key={c.id}>
                <td style={{ ...S.td, color: COLORS.textMuted }}>#{c.id}</td>
                <td style={S.td}>{c.numero_contrato || c.descricao || "Contrato"}<br/><span style={{ fontSize: 11, color: COLORS.textMuted }}>{statusContrato(c)}</span></td>
                <td style={S.td}>{fornecedorNome(c.fornecedor_id)}</td>
                <td style={S.td}>{compradorNome(c.comprador_id)}</td>
                <td style={{ ...S.td, fontWeight: 700 }}>{fmt(c.valor_contrato)}</td>
                <td style={{ ...S.td, color: COLORS.success, fontWeight: 700 }}>{fmt(c.valor_arrecadado)}</td>
                <td style={{ ...S.td, color: saldo <= 0 ? COLORS.success : COLORS.warning, fontWeight: 700 }}>{fmt(saldo)}</td>
                <td style={S.td}>{c.forma_pagamento || "-"}</td>
                <td style={S.td}>{c.parcelas || 1}x</td>
                <td style={S.td}>{fmtDate(c.data_inicio || c.created_at)}</td>
                <td style={{ ...S.td, minWidth: 220 }}>{c.observacao || "-"}</td>
                <td style={S.td}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {saldo > 0 && <button style={{ ...S.btn("success", "sm"), padding: "4px 7px" }} onClick={() => setReceiveModal(c)}>Receber</button>}
                  {canDelete && <button style={{ ...S.btn("danger", "sm"), padding: "4px 7px" }} onClick={() => setConfirm(c.id)}><Icon name="trash" size={12} color="#fff" /></button>}
                </div></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      {modal && <Modal title="Registrar Novo Contrato" onClose={() => setModal(false)} wide>
        <div style={S.grid(2)}>
          <div style={S.formRow}><label style={S.label}>Número/Identificação do contrato *</label><input style={S.input} value={form.numero_contrato || ""} onChange={e => setForm(p => ({...p, numero_contrato: e.target.value}))} placeholder="Ex: CTR-001" /></div>
          <div style={S.formRow}><label style={S.label}>Descrição</label><input style={S.input} value={form.descricao || ""} onChange={e => setForm(p => ({...p, descricao: e.target.value}))} placeholder="Contrato de fornecimento" /></div>
        </div>
        <div style={S.grid(2)}>
          <div style={S.formRow}><label style={S.label}>Fornecedor *</label><select style={S.select} value={form.fornecedor_id || ""} onChange={e => setForm(p => ({...p, fornecedor_id: e.target.value}))}><option value="">Selecione...</option>{(data.fornecedores || []).filter(f => f.ativo !== false).map(f => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}</select></div>
          <div style={S.formRow}><label style={S.label}>Comprador *</label><select style={S.select} value={form.comprador_id || ""} onChange={e => setForm(p => ({...p, comprador_id: e.target.value}))}><option value="">Selecione...</option>{(data.compradores || []).filter(c => c.ativo !== false).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        </div>
        <div style={S.grid(4)}>
          <div style={S.formRow}><label style={S.label}>Valor do contrato (R$) *</label><input style={S.input} type="number" value={form.valor_contrato || ""} onChange={e => setForm(p => ({...p, valor_contrato: e.target.value}))} /></div>
          <div style={S.formRow}><label style={S.label}>Forma de pagamento *</label><select style={S.select} value={form.forma_pagamento || "Boleto"} onChange={e => setForm(p => ({...p, forma_pagamento: e.target.value}))}>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          <div style={S.formRow}><label style={S.label}>Em quantas vezes *</label><input style={S.input} type="number" min="1" value={form.parcelas || 1} onChange={e => setForm(p => ({...p, parcelas: e.target.value}))} /></div>
          <div style={S.formRow}><label style={S.label}>Data do contrato</label><input style={S.input} type="date" value={form.data_inicio || ""} onChange={e => setForm(p => ({...p, data_inicio: e.target.value}))} /></div>
        </div>
        <div style={S.formRow}><label style={S.label}>Observação *</label><textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} value={form.observacao || ""} onChange={e => setForm(p => ({...p, observacao: e.target.value}))} placeholder="Obrigatório: detalhe regras, negociação, vencimentos ou observações do contrato." /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button style={S.btn("outline")} onClick={() => setModal(false)}>Cancelar</button><button style={S.btn("primary")} onClick={saveContract}>Salvar contrato</button></div>
      </Modal>}

      {receiveModal && <Modal title={`Registrar valor arrecadado do contrato #${receiveModal.id}`} onClose={() => setReceiveModal(null)}>
        <div style={{ background: COLORS.primaryLight, padding: 12, borderRadius: 8, marginBottom: 14 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>{receiveModal.numero_contrato || receiveModal.descricao}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted }}>Contrato: {fmt(receiveModal.valor_contrato)} | Arrecadado: {fmt(receiveModal.valor_arrecadado)} | Saldo: {fmt(saldoContrato(receiveModal))}</p>
        </div>
        <div style={S.grid(2)}>
          <div style={S.formRow}><label style={S.label}>Valor arrecadado (R$) *</label><input style={S.input} type="number" value={receiveForm.valor || ""} onChange={e => setReceiveForm(p => ({...p, valor: e.target.value}))} /></div>
          <div style={S.formRow}><label style={S.label}>Data</label><input style={S.input} type="date" value={receiveForm.data || ""} onChange={e => setReceiveForm(p => ({...p, data: e.target.value}))} /></div>
        </div>
        <div style={S.formRow}><label style={S.label}>Forma</label><select style={S.select} value={receiveForm.forma_pagamento || "Boleto"} onChange={e => setReceiveForm(p => ({...p, forma_pagamento: e.target.value}))}>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
        <div style={S.formRow}><label style={S.label}>Observação</label><textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} value={receiveForm.observacao || ""} onChange={e => setReceiveForm(p => ({...p, observacao: e.target.value}))} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button style={S.btn("outline")} onClick={() => setReceiveModal(null)}>Cancelar</button><button style={S.btn("primary")} onClick={saveReceive}>Salvar arrecadação</button></div>
      </Modal>}
      {confirm && <ConfirmModal message="Excluir este contrato?" onConfirm={() => doDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
};

// ─── FINANCIAL CONTROL SCREEN// ─── FINANCIAL CONTROL SCREEN// ─── FINANCIAL CONTROL SCREEN ─────────────────────────────────────────────────
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

  const addAnexo = async () => {
    if (!form.pagamento_id || (!form.nome_arquivo && !form.arquivo_file)) return alert("Selecione o pagamento e informe/anexe o arquivo.");
    const arquivoData = await fileToDataUrl(form.arquivo_file);
    const nomeArquivo = form.arquivo_file?.name || form.nome_arquivo;
    const next = { ...data, anexos: [...(data.anexos || [])] };
    const id = next.nextId.anexos++;
    next.anexos.push({ id, pagamento_id: Number(form.pagamento_id), nome_arquivo: nomeArquivo, tipo_arquivo: form.tipo || arquivoData.mime || "Arquivo", data_url: arquivoData.data_url, mime: arquivoData.mime, created_at: new Date().toISOString().slice(0, 10) });
    addLog(`Documento ${nomeArquivo} anexado`);
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
                      <button style={{ ...S.btn("outline", "sm"), padding: "5px 8px" }} title="Baixar arquivo" onClick={() => downloadArquivo(a, pag)}><Icon name="download" size={13} /></button>
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
                {["PDF", "NF-e", "XML", "JPG", "PNG", "Comprovante"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ background: "#f8fafc", border: `2px dashed ${COLORS.border}`, borderRadius: 8, padding: "28px 20px", textAlign: "center", marginBottom: 14 }}>
            <Icon name="upload" size={24} color={COLORS.textMuted} />
            <p style={{ margin: "8px 0 4px", fontSize: 13, fontWeight: 500 }}>Clique para importar PDF, XML/NF-e, JPG ou PNG</p>
            <input style={{ ...S.input, marginTop: 10 }} type="file" accept=".pdf,.jpg,.jpeg,.png,.xml" onChange={e => setForm(p => ({ ...p, arquivo_file: e.target.files?.[0], nome_arquivo: e.target.files?.[0]?.name || p.nome_arquivo, tipo: (e.target.files?.[0]?.name || '').toLowerCase().endsWith('.xml') ? 'NF-e' : (e.target.files?.[0]?.type?.startsWith('image/') ? 'JPG' : p.tipo) }))} />
            <p style={{ margin: "8px 0 0", fontSize: 12, color: COLORS.textMuted }}>PDF, XML/NF-e, JPG, PNG — máx. 10MB</p>
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
  const [filterComp, setFilterComp] = useState("");
  const [filterForma, setFilterForma] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tab, setTab] = useState("payments");

  const filtered = data.pagamentos.filter(p => {
    const dataBase = p.data_pagamento || p.data_vencimento || p.created_at?.slice?.(0,10) || "";
    const mForn = !filterForn || Number(p.fornecedor_id) === Number(filterForn);
    const mComp = !filterComp || Number(p.comprador_id) === Number(filterComp);
    const mForma = !filterForma || p.forma_pagamento === filterForma || p.tipo_divida === filterForma;
    const mFrom = !dateFrom || dataBase >= dateFrom;
    const mTo = !dateTo || dataBase <= dateTo;
    return mForn && mComp && mForma && mFrom && mTo && p.confirmado !== false;
  });

  const totalDevidoFiltrado = filtered.reduce((s, p) => s + valorDevidoLancamentoGlobal(p), 0);
  const totalPagoFiltrado = filtered.reduce((s, p) => s + valorPagoLancamentoGlobal(p), 0);
  const saldoAbertoFiltrado = Math.max(0, totalDevidoFiltrado - totalPagoFiltrado);

  const exportCSV = () => {
    const rows = [["ID","Fornecedor","Comprador","Valor Devido","Valor Pago","Saldo Aberto","Forma","Tipo","NF-e","Vencimento","Pagamento","Observação"]];
    filtered.forEach(p => {
      const f = data.fornecedores.find(f => Number(f.id) === Number(p.fornecedor_id));
      const c = (data.compradores || []).find(c => Number(c.id) === Number(p.comprador_id));
      rows.push([p.id, f?.razao_social || "", c?.nome || "", valorDevidoLancamentoGlobal(p), valorPagoLancamentoGlobal(p), saldoAbertoLancamentoGlobal(p), p.forma_pagamento, p.tipo_divida, p.numero_nfe, p.data_vencimento, p.data_pagamento, p.observacao]);
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
            <label style={S.label}>Comprador</label>
            <select style={S.select} value={filterComp} onChange={e => setFilterComp(e.target.value)}>
              <option value="">Todos</option>
              {(data.compradores || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
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
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: COLORS.textMuted }}>{filtered.length} registros — Devido: <strong style={{ color: COLORS.danger }}>{fmt(totalDevidoFiltrado)}</strong> | Pago: <strong style={{ color: COLORS.success }}>{fmt(totalPagoFiltrado)}</strong> | Saldo aberto: <strong style={{ color: saldoAbertoFiltrado > 0 ? COLORS.danger : COLORS.success }}>{fmt(saldoAbertoFiltrado)}</strong></span>
          <div style={{ flex: 1 }} />
          <button style={S.btn("success")} onClick={exportCSV}><Icon name="download" size={14} color="#fff" /> Exportar CSV</button>
        </div>
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>{["Data", "Fornecedor", "Comprador", "Valor Devido", "Valor Pago", "Saldo Aberto", "Forma", "NF-e", "Observação"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted, padding: 32 }}>Nenhum registro encontrado com os filtros aplicados</td></tr>}
            {filtered.map(p => {
              const forn = data.fornecedores.find(f => Number(f.id) === Number(p.fornecedor_id));
              const comp = (data.compradores || []).find(c => Number(c.id) === Number(p.comprador_id));
              const devido = valorDevidoLancamentoGlobal(p);
              const pago = valorPagoLancamentoGlobal(p);
              const saldo = saldoAbertoLancamentoGlobal(p);
              return (
                <tr key={p.id}>
                  <td style={S.td}>{fmtDate(p.data_pagamento || p.data_vencimento)}</td>
                  <td style={S.td}>{forn?.nome_fantasia || forn?.razao_social}</td>
                  <td style={S.td}>{comp?.nome || "-"}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: COLORS.danger }}>{fmt(devido)}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: COLORS.success }}>{fmt(pago)}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: saldo > 0 ? COLORS.danger : COLORS.success }}>{fmt(saldo)}</td>
                  <td style={S.td}><StatusBadge status={p.forma_pagamento || p.tipo_divida || "Pendente"} /></td>
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
  const [showPasswords, setShowPasswords] = useState({});

  const openNew = () => { setForm({ tipo: "Operador", ativo: false, status_cadastro: "Em análise" }); setModal("new"); };
  const openEdit = (u) => { setForm({ ...u }); setModal("edit"); };

  const saveUser = () => {
    if (!form.nome || !form.email) return alert("Nome e e-mail são obrigatórios.");
    const next = { ...data };
    if (modal === "new") {
      const id = next.nextId.users++;
      next.users.push({ ...form, id, ativo: false, status_cadastro: "Em análise", created_at: new Date().toISOString().slice(0, 10), fornecedor_id: form.fornecedor_id ? Number(form.fornecedor_id) : null });
      addLog(`Usuário ${form.nome} cadastrado`);
    } else {
      next.users = next.users.map(u => u.id === form.id ? { ...form, fornecedor_id: form.fornecedor_id ? Number(form.fornecedor_id) : null, ativo: Boolean(form.ativo), status_cadastro: form.status_cadastro || (form.ativo ? "Ativo" : "Em análise") } : u);
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
            <tr>{["Usuário", "E-mail", "Senha", "Tipo", "Fornecedor Vinculado", "Solicitação", "Status", "Cadastro", "Ações"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
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
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 12 }}>{showPasswords[u.id] ? (u.senha || "-") : "••••••"}</span>
                      <button style={{ ...S.btn("outline", "sm"), padding: "3px 6px" }} onClick={() => setShowPasswords(p => ({ ...p, [u.id]: !p[u.id] }))}>
                        <Icon name="eye" size={12} />
                      </button>
                    </div>
                  </td>
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

  const enviarPagamentoFornecedor = async () => {
    if (!payForm.valor) return alert("Informe o valor do pagamento.");
    if (!payForm.anexo_file && !payForm.anexo_nome) return alert("Anexe o comprovante ou a nota de bonificação.");
    const next = { ...data, pagamentos: [...(data.pagamentos || [])], anexos: [...(data.anexos || [])], logs: [...(data.logs || [])] };
    const id = next.nextId.pagamentos++;
    const anexoNome = payForm.anexo_file?.name || payForm.anexo_nome || "";
    const arquivoData = await fileToDataUrl(payForm.anexo_file);
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
      anexo_data: arquivoData.data_url,
      anexo_mime: arquivoData.mime,
      enviado_por: "Fornecedor",
      confirmado: false,
      status_confirmacao: "Aguardando confirmação",
      created_at: new Date().toISOString()
    };
    next.pagamentos.push(novo);
    next.anexos.push({ id: next.nextId.anexos++, pagamento_id: id, nome_arquivo: anexoNome, tipo_arquivo: novo.tipo_anexo, data_url: arquivoData.data_url, mime: arquivoData.mime, created_at: new Date().toISOString() });
    next.logs.push({ id: next.nextId.logs++, usuario_id: currentUser.id, acao: "Envio", descricao: "Fornecedor enviou comprovante/nota para confirmação", ip: "127.0.0.1", created_at: new Date().toISOString() });
    setData(next);
    setPayModal(false);
    setPayForm({ data_pagamento: new Date().toISOString().slice(0, 10), forma_pagamento: "PIX", tipo_anexo: "Comprovante" });
    alert("Enviado para validação do administrador.");
  };

  if (!forn) return (
    <div style={{ ...S.loginBox, textAlign: "center" }} data-gig-login-box>
      <div style={{ color: "#fff" }}>
        <Icon name="info" size={48} color="#fff" />
        <h2>Cadastro em análise</h2>
        <p>Seu cadastro foi para análise. Aguarde o administrador vincular sua conta ao fornecedor correto.</p>
        <button style={{ ...S.btn("outline"), color: "#fff", borderColor: "#fff" }} onClick={onLogout}>Voltar para login</button>
      </div>
    </div>
  );

  const valorPagoLancamento = (p) => Number(p.valor_pago ?? p.valor ?? 0);
  const saldoLancamento = (p) => Number(p.valor_devido || 0) - valorPagoLancamento(p);
  const statusLancamento = (p) => {
    const devido = Number(p.valor_devido || 0);
    const pago = valorPagoLancamento(p);
    if (p.confirmado === false) return "Aguardando confirmação";
    if (pago <= 0) return "Pendente";
    if (devido > 0 && pago >= devido) return "Pago";
    return "Parcial";
  };
  const totaisFornecedor = pagamentos.filter(p => p.confirmado !== false).reduce((acc, p) => {
    acc.devido += Number(p.valor_devido || 0);
    acc.pago += valorPagoLancamento(p);
    return acc;
  }, { devido: 0, pago: 0 });
  totaisFornecedor.saldo = totaisFornecedor.devido - totaisFornecedor.pago;
  const filteredPag = pagamentos.filter(p => !filterForma || p.forma_pagamento === filterForma || p.tipo_divida === filterForma);

  return (
    <div style={{ ...S.app, background: "#f8fafc" }} data-gig-app>
      <div style={{ ...S.sidebar, background: COLORS.sidebar }} data-gig-sidebar>
        <div style={S.sidebarLogo}>
          <img src="/logo-gigantao.png" alt="Gigantão" style={{ maxWidth: 150, background: "#fff", borderRadius: 10, padding: 8 }} />
          <p style={{ ...S.sidebarLogoSub, color: "#B7E7CB" }}>{forn.nome_fantasia || forn.razao_social}</p>
        </div>
        <nav style={S.sidebarNav}>
          {[
            { key: "dashboard", label: "Dashboard de Despesas", icon: "dashboard" },
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
      <div style={S.main} data-gig-main>
        <div style={{ ...S.topbar, background: "#fff", borderColor: "#e2e8f0" }} data-gig-topbar>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{forn.razao_social}</p>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted }}>CNPJ: {forn.cnpj}</p>
          </div>
          <button style={S.btn("outline")} onClick={onLogout}><Icon name="logout" size={14} /> Sair</button>
        </div>
        <div style={S.content} data-gig-content>
          {tab === "dashboard" && (
            <div>
              <h1 style={S.pageTitle}>Meu Painel</h1>
              <p style={S.pageSub}>Visão geral da sua conta financeira</p>
              <div style={S.grid(2)}>
                <MetricCard label="Total Devido" value={fmt(totaisFornecedor.devido)} icon="payments" color={COLORS.danger} />
                <MetricCard label="Total Pago" value={fmt(totaisFornecedor.pago)} icon="check" color={COLORS.success} />
                <MetricCard label="Saldo Aberto" value={fmt(totaisFornecedor.saldo)} icon="info" color={totaisFornecedor.saldo <= 0 ? COLORS.success : COLORS.danger} />
                <MetricCard label="Lançamentos" value={pagamentos.length} icon="docs" color={COLORS.primary} />
              </div>
              <div style={{ ...S.card, marginTop: 16 }}>
                <p style={{ ...S.cardTitle, fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 14 }}>Últimos Pagamentos</p>
                <table style={S.table}>
                  <thead><tr>{["Vencimento", "Valor Devido", "Valor Pago", "Saldo", "Tipo", "Anexo", "Status", "NF-e"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {pagamentos.slice(0, 5).map(p => (
                      <tr key={p.id}>
                        <td style={S.td}>{fmtDate(p.data_vencimento || p.data_pagamento)}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: COLORS.danger }}>{fmt(p.valor_devido)}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: COLORS.success }}>{fmt(valorPagoLancamento(p))}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: saldoLancamento(p) <= 0 ? COLORS.success : COLORS.danger }}>{fmt(saldoLancamento(p))}</td>
                        <td style={S.td}><StatusBadge status={p.tipo_divida || "À Vista"} /></td>
                        <td style={S.td}>{p.anexo_nome ? <button style={{ ...S.btn("outline", "sm") }} onClick={() => downloadArquivo(data.anexos.find(a => a.pagamento_id === p.id), p)}><Icon name="download" size={12} /> {p.anexo_nome}</button> : "-"}</td>
                        <td style={S.td}><StatusBadge status={statusLancamento(p)} /></td>
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
                <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Os pagamentos são lançados pelo administrador na tela de Pagamentos.</span>
                <select style={{ ...S.select, width: 200 }} value={filterForma} onChange={e => setFilterForma(e.target.value)}>
                  <option value="">Todas as formas</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={S.card}>
                <table style={S.table}>
                  <thead><tr>{["Vencimento", "Valor Devido", "Valor Pago", "Saldo", "Tipo", "Anexo", "Status", "NF-e", "Observação"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredPag.length === 0 && <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: COLORS.textMuted, padding: 32 }}>Nenhum pagamento encontrado</td></tr>}
                    {filteredPag.map(p => (
                      <tr key={p.id}>
                        <td style={S.td}>{fmtDate(p.data_vencimento || p.data_pagamento)}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: COLORS.danger }}>{fmt(p.valor_devido)}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: COLORS.success }}>{fmt(valorPagoLancamento(p))}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: saldoLancamento(p) <= 0 ? COLORS.success : COLORS.danger }}>{fmt(saldoLancamento(p))}</td>
                        <td style={S.td}><StatusBadge status={p.tipo_divida || "À Vista"} /></td>
                        <td style={S.td}>{p.anexo_nome ? <button style={{ ...S.btn("outline", "sm") }} onClick={() => downloadArquivo(data.anexos.find(a => a.pagamento_id === p.id), p)}><Icon name="download" size={12} /> {p.anexo_nome}</button> : "-"}</td>
                        <td style={S.td}><StatusBadge status={statusLancamento(p)} /></td>
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
                          <td style={S.td}><button style={{ ...S.btn("primary", "sm") }} onClick={() => downloadArquivo(a, pag)}><Icon name="download" size={12} color="#fff" /> Baixar</button></td>
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
                    <option value="NF-e">NF-e</option>
                    <option value="JPG / Imagem">JPG / Imagem</option>
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
  { key: "dashboard", label: "Dashboard de Despesas", icon: "dashboard" },
  { section: "Cadastros" },
  { key: "suppliers", label: "Fornecedores", icon: "suppliers" },
  { key: "buyers", label: "Compradores", icon: "users" },
  { key: "payments", label: "Pagamentos", icon: "payments" },
  { key: "contracts", label: "Contratos", icon: "docs" },
  { section: "Documentos & Relatórios" },
  { key: "documents", label: "Documentos", icon: "docs" },
  { key: "reports", label: "Relatórios", icon: "reports" },
  { section: "Administração" },
  { key: "users", label: "Usuários", icon: "users" },
  { key: "audit", label: "Auditoria", icon: "audit" },
];

const operatorNav = [
  { section: "Principal" },
  { key: "dashboard", label: "Dashboard de Despesas", icon: "dashboard" },
  { section: "Consultas" },
  { key: "suppliers", label: "Fornecedores", icon: "suppliers" },
  { key: "buyers", label: "Compradores", icon: "users" },
  { key: "payments", label: "Pagamentos", icon: "payments" },
  { key: "contracts", label: "Contratos", icon: "docs" },
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
    const normalized = typeof next === "function" ? normalizeData(next(data)) : normalizeData(next);
    setDataState(normalized);
    localStorage.setItem("saas_data", JSON.stringify(normalized));
    saveCloudData(normalized).then(ok => {
      if (!ok && CLOUD_ENABLED) {
        console.warn("Não salvou no Supabase. Veja saas_cloud_error no localStorage.");
      }
    });
  }, [data]);

  useEffect(() => {
    let mounted = true;
    loadCloudData().then(remote => {
      if (!mounted) return;
      if (remote) {
        setDataState(remote);
        localStorage.setItem("saas_data", JSON.stringify(remote));
      } else if (CLOUD_ENABLED) {
        // Se o Supabase está vazio (data = {}), manda os dados locais/iniciais para a nuvem.
        const local = normalizeData(JSON.parse(localStorage.getItem("saas_data") || "null") || data);
        saveCloudData(local);
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!CLOUD_ENABLED) return;
    const timer = setInterval(async () => {
      const remote = await loadCloudData();
      if (remote) {
        setDataState(remote);
        localStorage.setItem("saas_data", JSON.stringify(remote));
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "saas_data" && e.newValue) setDataState(normalizeData(JSON.parse(e.newValue)));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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
  if (screen === "portal-login") return <><ResponsiveStyles /><LoginScreen onLogin={handleLogin} portalMode data={data} setData={setData} onBackHome={() => setScreen("login")} /><CloudStatus /></>;
  if (screen === "portal" && currentUser?.tipo === "Fornecedor") return <><ResponsiveStyles /><SupplierPortal data={data} setData={setData} currentUser={currentUser} onLogout={handleLogout} /><CloudStatus /></>;
  if (screen === "login") {
    return (
      <div>
        <ResponsiveStyles />
        <LoginScreen onLogin={handleLogin} data={data} setData={setData} />
        <CloudStatus />
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
      case "buyers": return <BuyersScreen {...props} />;
      case "payments": return <PaymentsScreen {...props} />;
      case "contracts": return <ContractsScreen {...props} />;
      case "documents": return <DocumentsScreen {...props} />;
      case "reports": return <ReportsScreen {...props} />;
      case "users": return <UsersScreen {...props} />;
      case "audit": return <AuditScreen {...props} />;
      default: return <Dashboard {...props} />;
    }
  };

  return (
    <>
    <ResponsiveStyles />
    <div style={S.app} data-gig-app>
      {/* Sidebar */}
      <div style={S.sidebar} data-gig-sidebar>
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
      <div style={S.main} data-gig-main>
        <div style={S.topbar} data-gig-topbar>
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
        <div style={S.content} data-gig-content>
          {renderPage()}
        </div>
      </div>

      <CloudStatus />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "success" ? COLORS.success : COLORS.danger, color: "#fff", padding: "12px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}
    </div>
    </>
  );
}
