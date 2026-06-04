# Configurar banco online Supabase

Esta versão grava e lê os dados na tabela `app_state` do Supabase. Assim cadastros feitos em celular, outro navegador ou outro computador aparecem para o administrador.

## 1. Variáveis no Vercel

No Vercel > Environment Variables, cadastre:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC
```

Depois faça Redeploy.

## 2. SQL obrigatório no Supabase

No Supabase > SQL Editor, execute este código completo. Ele recria as permissões corretamente para leitura e gravação pública da tabela única do aplicativo:

```sql
create table if not exists public.app_state (
  id bigint primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.app_state enable row level security;

drop policy if exists "public_read" on public.app_state;
drop policy if exists "public_insert" on public.app_state;
drop policy if exists "public_update" on public.app_state;
drop policy if exists "app_state_read" on public.app_state;
drop policy if exists "app_state_write" on public.app_state;
drop policy if exists "app_state_update" on public.app_state;

create policy "public_read"
on public.app_state
for select
using (true);

create policy "public_insert"
on public.app_state
for insert
with check (true);

create policy "public_update"
on public.app_state
for update
using (true)
with check (true);

insert into public.app_state (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;
```

## 3. Teste

Execute:

```sql
select * from public.app_state;
```

Deve aparecer 1 linha com `id = 1`.

Depois abra o site, faça um cadastro e rode novamente:

```sql
select * from public.app_state;
```

O campo `data` deve deixar de ser `{}` e virar um JSON com usuários, fornecedores, pagamentos etc.
