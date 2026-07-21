# Auditoria: Edge Function `evolution-webhook` Existente

## 📋 Objetivo

Documentar o código atual de integração da Evolution API e identificar seus requisitos técnicos, sem implementações ou suposições sobre segurança/autenticação que careçam de evidência.

---

## 1️⃣ Formato de Payload Esperado

**Fonte**: `supabase/functions/evolution-webhook/index.ts` (linhas 66-87)

O webhook atualmente processa apenas eventos do tipo `messages.upsert` (linha 72):

```typescript
if (payload.event !== "messages.upsert") return new Response("OK", { status: 200 });
```

### Estrutura de Payload Observada no Código:

```json
{
  "event": "messages.upsert",
  "instance": "string (nome-da-instancia)",
  "data": {
    "key": {
      "id": "string (identificador da mensagem)",
      "fromMe": boolean,
      "remoteJid": "5511999999999@s.whatsapp.net"
    },
    "message": {
      "conversation": "string | null",
      "extendedTextMessage": { "text": "string" } | null,
      "imageMessage": { "url": "string", "caption": "string | null", "fileLength": number } | null,
      "audioMessage": { "url": "string", "fileLength": number } | null,
      "pttMessage": { "url": "string", "fileLength": number } | null,
      "videoMessage": { "url": "string", "caption": "string | null", "fileLength": number } | null,
      "documentMessage": {
        "url": "string",
        "fileName": "string",
        "caption": "string | null",
        "fileLength": number,
        "mimetype": "string"
      } | null,
      "documentWithCaptionMessage": {
        "message": { "documentMessage": { ... } }
      } | null,
      "stickerMessage": { "url": "string" } | null,
      "locationMessage": {
        "degreesLatitude": number,
        "degreesLongitude": number
      } | null,
      "contactMessage": { "displayName": "string" } | null
    },
    "pushName": "string (nome do contato)",
    "messageTimestamp": number (unix timestamp em segundos)
  }
}
```

### Filtros/Validações Aplicadas no Código:

| Linha | Validação | Ação |
|---|---|---|
| 72 | `event !== "messages.upsert"` | Retorna 200 OK (ignora evento) |
| 74 | `!data` (payload.data vazio) | Retorna 200 OK |
| 78 | `key.fromMe === true` | Retorna 200 OK (ignora msg enviada por bot) |
| 80-81 | `!remoteJid \|\| remoteJid.endsWith("@g.us")` | Retorna 200 OK (ignora grupos) |
| 89-93 | Valida `instance_name` contra `integrations.configuration` | Retorna 200 OK se não corresponder |

---

## 2️⃣ Identificador Único da Mensagem

**Fonte**: Linhas 123-124 (metadata da mensagem armazenada)

```typescript
metadata: {
  provider_msg_id: key?.id,    // ← Identificador do provedor (Evolution/WhatsApp)
  remote_jid: remoteJid        // ← JID do contato
}
```

### Análise de Unicidade:

- **Campo extraído**: `data.key.id`
- **Tipo**: String (conforme payload Evolution)
- **Escopo**: Parece ser único por instância Evolution (não confirmado)
- **Potencial colisão**: Se múltiplas instâncias Evolution enviarem eventos com mesmo `key.id`, haveria duplicação

### ⚠️ Questão Aberta para Investigação:

**`data.key.id` é globalmente único ou apenas único por instância?**

- Se apenas por instância: idempotência exige chave composta `(instance, key.id)`
- Se global: chave simples `key.id` é suficiente

**Decisão Adiada**: Aguarda payload real de Evolution em produção.

---

## 3️⃣ Headers Recebidos e Validados

**Fonte**: Linhas 66-70 (entrada do webhook)

```typescript
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
```

### Headers Atualmente Processados:

| Header | Status | Ação |
|---|---|---|
| `Content-Type` | ✅ Implícito | Validado via `req.json()` |
| `X-Webhook-Signature` | ❌ Não processado | Nenhuma |
| `X-Webhook-Signature-256` | ❌ Não processado | Nenhuma |
| `Authorization` | ❌ Não processado | Nenhuma |
| Qualquer header HMAC | ❌ Não processado | Nenhuma |

### Status de Autenticação:

**❌ Nenhuma autenticação de webhook está implementada.**

O webhook aceita qualquer POST válido com estrutura `{ event, instance, data }` sem validação de origem ou assinatura.

### 📌 Nota Importante:

**HMAC/Assinatura NÃO é confirmado como requisito da Evolution API nesta versão.**

Sem acesso à documentação oficial da versão específica de Evolution que será implantada:
- ❌ Não assumir que Evolution envia header HMAC
- ❌ Não assumir algoritmo específico (SHA256, SHA512, etc.)
- ❌ Não implementar validação de assinatura "preventivamente"

**Decisão Adiada**: Investigar payload real de Evolution; verificar se há header de assinatura e qual algoritmo usa.

---

## 4️⃣ Variáveis de Ambiente e Configuração Evolution

### A. Variáveis de Ambiente da Edge Function

**Fonte**: Linhas 3-5

```typescript
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
```

**Variáveis Atualmente Esperadas**:

| Variável | Obrigatorória | Tipo | Uso |
|---|---|---|---|
| `SUPABASE_URL` | ✅ Sim | String | URL da instância Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Sim | String | Chave de serviço (acesso admin ao Supabase) |
| `EVOLUTION_WEBHOOK_SECRET` | ❌ Não | String | **Não usado atualmente** |

**Como Configurar** (Supabase CLI ou Railway):
```bash
supabase secrets set SUPABASE_URL="https://xxxxx.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
```

### B. Configuração da Instância Evolution (Armazenada em BD)

**Fonte**: `src/routes/_authenticated/configuracoes.tsx` (linhas 247-260) + `supabase/migrations/20260718_settings.sql` (linhas 26-50)

**Tabela**: `public.integrations`

```sql
CREATE TABLE public.integrations (
  id            UUID PRIMARY KEY,
  owner_id      UUID NOT NULL,
  provider      TEXT NOT NULL,  -- 'whatsapp'
  status        TEXT NOT NULL,  -- 'connected', 'disconnected', 'error', 'pending'
  configuration JSONB NOT NULL,
  last_sync     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ,
  UNIQUE (owner_id, provider)
);
```

**Estructura de `configuration` JSONB** (conforme UI em configuracoes.tsx):

```json
{
  "base_url": "https://api.seu-servidor.com",
  "api_key": "sua-chave-api-evolution",
  "instance_name": "minha-instancia"
}
```

**Campos**:

| Campo | Obrigatório | Tipo | Nota |
|---|---|---|---|
| `base_url` | ✅ Sim | String | URL base da API Evolution (sem barra final) |
| `api_key` | ✅ Sim | String | Chave de autenticação para API Evolution |
| `instance_name` | ✅ Sim | String | Nome da instância configurada na Evolution |

**Como é Recuperado no Webhook** (linhas 89-93):

```typescript
const { data: integration } = await supabase
  .from("integrations")
  .select("owner_id, configuration")
  .eq("provider", "whatsapp")
  .eq("status", "connected")
  .maybeSingle();

const config = integration.configuration as Record<string, unknown>;
if (config?.instance_name && config.instance_name !== instanceName)
  return new Response("Instance mismatch", { status: 200 });
```

**Segurança Observada**:
- ✅ `api_key` é armazenada em BD (apenas `service_role` acessa via RLS)
- ✅ `api_key` não é exposta no frontend (apenas configurada via dialog)
- ⚠️ `api_key` é armazenada em **texto plano** (sem encriptação)

---

## 5️⃣ Onde a Chave Evolution é Armazenada/Exposta

### Armazenamento:

**Local**: `integrations.configuration` (JSONB, Supabase)

```typescript
// Leitura no webhook (linha 89-92)
const { data: integration } = await supabase
  .from("integrations")
  .select("owner_id, configuration")
  .eq("provider", "whatsapp")
  .eq("status", "connected")
  .maybeSingle();
```

**Proteção via RLS**: Apenas o `owner_id` e `service_role` podem acessar.

**Proteção via Tipo**: JSONB (não encriptada).

### Exposição no Frontend:

**Local**: `src/routes/_authenticated/configuracoes.tsx` (linhas 247-275)

```tsx
<Dialog open={wpDialog} onOpenChange={setWpDialog}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Configurar WhatsApp — Evolution API</DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-2">
      <div>
        <Label className="text-xs">API Key *</Label>
        <Input
          className="mt-1"
          type="password"
          placeholder="••••••••••••"
          value={wpForm.api_key}
          onChange={(e) => setWpForm((p) => ({ ...p, api_key: e.target.value }))}
        />
      </div>
      {/* ... */}
    </div>
  </DialogContent>
</Dialog>
```

**Status**: 
- ✅ Não é usada para chamadas do frontend (não há requisições diretas à Evolution API)
- ✅ Campo de entrada usa `type="password"` (mascarado na UI)
- ❌ É armazenada em estado React local (`wpForm.api_key`), potencialmente exposível em memory

### Fluxo Atual de Uso:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuário configura WhatsApp no CRM (configuracoes.tsx)   │
│    └─ Insere: base_url, api_key, instance_name             │
│    └─ Salva em integrations.configuration (BD)             │
├─────────────────────────────────────────────────────────────┤
│ 2. Evolution API envia webhook POST                         │
│    └─ /functions/v1/evolution-webhook                      │
│    └─ Corpo: { event, instance, data }                     │
├─────────────────────────────────────────────────────────────┤
│ 3. Webhook valida instância contra BD                       │
│    └─ Lê integrations.configuration.instance_name           │
│    └─ NÃO usa api_key nesta etapa                          │
├─────────────────────────────────────────────────────────────┤
│ 4. Webhook salva mensagem em conversations + messages       │
│    └─ Armazena metadata.provider_msg_id (de key.id)        │
│    └─ Armazena metadata.remote_jid                         │
├─────────────────────────────────────────────────────────────┤
│ 5. CRM Frontend lê conversas via RLS (sem expor chave)      │
│    └─ GET /conversations + /messages                        │
└─────────────────────────────────────────────────────────────┘
```

**Conclusão**: `api_key` Evolution é apenas configurada e armazenada; não é usada pelo webhook atual.

---

## 6️⃣ Processamento de Mensagens e Normalização

**Fonte**: Linhas 16-54 (função `extractMessage`)

### Tipos de Mensagem Suportados:

| Tipo Evolution | Campo | Tipo CRM | Anexo |
|---|---|---|---|
| Text | `conversation` ou `extendedTextMessage.text` | `text` | Nenhum |
| Image | `imageMessage` | `image` | URL + caption |
| Audio | `audioMessage` \| `pttMessage` | `audio` | URL |
| Video | `videoMessage` | `video` | URL + caption |
| Document | `documentMessage` | `pdf` | URL + filename |
| Sticker | `stickerMessage` | `sticker` | URL |
| Location | `locationMessage` | `location` | Lat/Long |
| Contact | `contactMessage` | `contact` | Display name |
| Não suportado | Outro | `text` | `[mensagem não suportada]` |

### Normalização de Telefone:

**Fonte**: Linhas 56-64 (função `normalizePhone`)

```typescript
function normalizePhone(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  const variants: string[] = [digits, `+${digits}`];
  if (digits.startsWith("55") && digits.length === 13) {
    const without9 = digits.slice(0, 4) + digits.slice(5);
    variants.push(without9, `+${without9}`);
  }
  return variants;
}
```

**Exemplo**:
- Input: `5511999999999` (de `remoteJid: "5511999999999@s.whatsapp.net"")`
- Output: `["5511999999999", "+5511999999999", "551999999999", "+551999999999"]` (remove 9 dígito)

**Uso**: Busca cliente existente por telefone com múltiplos formatos.

---

## 7️⃣ Dados Salvos em BD

**Fonte**: Linhas 100-124 (inserções no Supabase)

### Fluxo de Salvamento:

```typescript
// 1. Buscar ou criar cliente
const { data: client } = await supabase.from("clients")
  .select("id")
  .eq("owner_id", ownerId)
  .is("deleted_at", null)
  .or(phoneVariants.flatMap(p => [`telefone.eq.${p}`, `whatsapp.eq.${p}`]).join(","))
  .maybeSingle();

if (!client) {
  // Criar novo cliente
  const { data: newClient } = await supabase.from("clients").insert({
    owner_id: ownerId,
    nome: pushName,
    whatsapp: `+${rawPhone}`,
    origem: "whatsapp",
    etapa_funil: "novo_lead",
    tags: ["lead_inbound"]
  }).select("id").single();
  clientId = newClient.id;
}

// 2. Buscar ou criar conversa
const { data: existingConv } = await supabase.from("conversations")
  .select("id")
  .eq("client_id", clientId)
  .eq("channel", "whatsapp")
  .eq("status", "open")
  .is("deleted_at", null)
  .maybeSingle();

if (!existingConv) {
  const { data: newConv } = await supabase.from("conversations").insert({
    owner_id: ownerId,
    client_id: clientId,
    channel: "whatsapp",
    status: "open",
    metadata: { remote_jid: remoteJid }
  }).select("id").single();
  conversationId = newConv.id;
}

// 3. Salvar mensagem
await supabase.from("messages").insert({
  conversation_id: conversationId,
  direction: "incoming",
  sender: pushName,
  type,
  content,
  attachment,
  status: "delivered",
  sent_at: sentAt,
  metadata: {
    provider_msg_id: key?.id,
    remote_jid: remoteJid
  }
});
```

### Tabelas Modificadas:

| Tabela | Ação | Campos |
|---|---|---|
| `clients` | INSERT ou SELECT | `owner_id`, `nome`, `whatsapp`, `origem`, `etapa_funil`, `tags` |
| `conversations` | INSERT ou SELECT | `owner_id`, `client_id`, `channel`, `status`, `metadata` |
| `messages` | INSERT | `conversation_id`, `direction`, `sender`, `type`, `content`, `attachment`, `status`, `sent_at`, `metadata` |

**Comportamento em Duplicação**:
- Se `messages.provider_msg_id` for duplicado → BD **não previne duplicação** (sem UNIQUE constraint)
- Resultado: **Mensagens podem ser inseridas múltiplas vezes**

---

## ❌ Problemas Identificados (Sem Implementação)

### 1. Sem Idempotência

**Problema**: Não há garantia de que a mesma mensagem não será inserida múltiplas vezes.

**Causa**: Nenhum campo único em `messages` baseado em `provider_msg_id` ou similar.

**Impacto**: Se o webhook for chamado 2x com mesmo payload → 2 rows em `messages` (duplicação).

**Investigação Necessária**:
- Confirmar se `data.key.id` é único globalmente ou apenas por instância
- Definir chave única como `(instance_name, provider_msg_id)` ou similar

### 2. Sem Autenticação/Validação do Webhook

**Problema**: Qualquer POST pode ativar processamento.

**Status**: HMAC/assinatura **não é confirmado** como requisito da Evolution nesta versão.

**Investigação Necessária**:
- Capturar payload real de Evolution em produção
- Verificar se há header de assinatura
- Consultar documentação oficial da versão implantada

### 3. Sem Rate Limiting

**Problema**: Sem limite de requisições por usuário/instância.

**Status**: Não é bloqueador para MVP.

---

## ✅ O Que Está Funcionando Corretamente

1. ✅ Parseia múltiplos tipos de mensagem (text, image, audio, video, etc.)
2. ✅ Normaliza números telefônicos com variações (com/sem +55, com/sem 9)
3. ✅ Busca cliente existente por telefone (fuzzy via normalização)
4. ✅ Cria novo cliente se não encontrar
5. ✅ Busca conversa aberta ou cria nova
6. ✅ Insere mensagem com tipo, conteúdo e anexo normalizados
7. ✅ Registra metadados (provider_msg_id, remote_jid) para auditoria
8. ✅ Retorna 200 OK para eventos não suportados (messages.upsert) sem erro
9. ✅ Ignora mensagens do bot (fromMe=true) e grupos (@g.us)
10. ✅ Valida instância contra configuração em BD

---

## 📌 Próximos Passos (Bloqueadores Técnicos)

### Bloqueador 1: Instância Evolution em Produção

**Status**: ❌ Não implementada no Railway

**Ação Necessária**:
1. Restaurar/configurar instância Evolution no Railway
2. Registrar URL do webhook: `https://seu-crm.supabase.co/functions/v1/evolution-webhook`
3. Gerar/obter credenciais da instância (base_url, api_key, instance_name)

### Bloqueador 2: Capturar Payload Real Sanitizado

**Status**: ❌ Não capturado

**Ação Necessária**:
1. Evolution online no Railway
2. Configurar webhook no CRM
3. Simular envio de mensagem de teste (sem PII real)
4. Capturar payload bruto em logs
5. Sanitizar (remover números reais, nomes, etc.)
6. Documentar estrutura exata

### Bloqueador 3: Confirmar Autenticação de Webhook

**Status**: ❌ Desconhecido

**Ação Necessária**:
1. Obter documentação oficial da versão Evolution implantada
2. Verificar:
   - Há header HMAC? Qual nome?
   - Qual algoritmo (SHA256, SHA512, etc.)?
   - Como gerar a assinatura?
   - Exemplo de validação na linguagem usada?
3. Registrar em evidência técnica

### Bloqueador 4: Confirmar Unicidade de event_id

**Status**: ❌ Desconhecido

**Ação Necessária**:
1. Com payload real em mão:
   - Verificar se `data.key.id` é globalmente único
   - Testar: Enviar mesma mensagem 2x → mesmo `key.id`?
   - Testar: Múltiplas instâncias → colisão de `key.id`?
2. Decidir:
   - Chave simples: `provider_msg_id = key.id`
   - Chave composta: `provider_msg_id = hash(instance_name + key.id)`
3. Registrar em evidência técnica

---

## 📄 Conclusão da Auditoria

### Estado Atual:

✅ **Funcionando**: Webhook processa mensagens do WhatsApp e armazena em BD

❌ **Faltando**: Autenticação, deduplicação, garantias de idempotência

⚠️ **Incerto**: Autenticação HMAC é requisito? Qual? Como?

### Requisitos Confirmados:

1. Edge Function espera `{ event: "messages.upsert", instance, data }`
2. `data.key.id` é usado como `provider_msg_id` (meta não duplicar)
3. Tabela `integrations` armazena `base_url`, `api_key`, `instance_name`
4. Webhook valida `instance_name` contra BD
5. Múltiplos tipos de mensagem são suportados

### Requisitos Pendentes (Evidência Técnica):

1. **Estrutura exata do payload real da Evolution**
2. **Como garantir unicidade de `key.id` (global ou por instância?)**
3. **Header e algoritmo de autenticação/assinatura (se houver)**
4. **Documentação oficial da versão Evolution implantada**

### Próximo Trabalho:

🔴 **Não é PR #1 (Webhook Seguro)**

✅ **É: Restaurar Evolution no Railway + Capturar Webhook Real Sanitizado**

Apenas com payload real em mão, com documentação oficial da versão, podemos definir com confiança:
- Como validar autenticidade do webhook (se aplicável)
- Como garantir idempotência sem falsos positivos
- Como estruturar migrations sem suposições

---

**Auditoria concluída**: 21/07/2026  
**Próxima revisão**: Após Evolution online + payload real capturado
