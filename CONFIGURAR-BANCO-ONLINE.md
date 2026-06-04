# Configurar dados compartilhados entre aparelhos

O problema acontecia porque o sistema usava `localStorage`, que salva os dados somente no navegador/dispositivo da pessoa. Por isso o cadastro criado no celular aparecia só no celular e não aparecia para o administrador aprovar no computador.

Esta versão já está preparada para sincronizar com Supabase.

## 1. Crie um projeto no Supabase
Acesse https://supabase.com e crie um projeto grátis.

## 2. Crie a tabela
No Supabase, vá em SQL Editor e rode:

```sql
create table if not exists public.app_state (
  id integer primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.app_state enable row level security;

drop policy if exists "app_state_read" on public.app_state;
drop policy if exists "app_state_write" on public.app_state;

create policy "app_state_read" on public.app_state
for select using (true);

create policy "app_state_write" on public.app_state
for insert with check (true);

create policy "app_state_update" on public.app_state
for update using (true) with check (true);
```

## 3. Coloque as variáveis no Vercel
No projeto do Vercel, vá em:
Settings > Environment Variables

Crie:

```text
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC
```

Depois clique em Redeploy.

## 4. Como fica funcionando
- Cadastro feito em outro celular/computador aparece para o administrador aprovar.
- Login aprovado entra em qualquer dispositivo.
- Alterações sincronizam automaticamente a cada poucos segundos.

Sem configurar Supabase, o sistema continua funcionando apenas no aparelho/navegador onde foi cadastrado.
