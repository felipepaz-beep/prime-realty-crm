# WhatsApp AI Agent v2 — Plano de Evolução

## Visão Geral

Evolução do módulo WhatsApp Agent para incluir:
- Serviço de IA desacoplado para análise de contexto de conversa
- Classificação automática (status, prioridade, intenção, sentimento, próximo passo)
- Geração de até 3 rascunhos com tons configuráveis (formal, friendly, concise)
- Sugestão de follow-up com data e motivo
- Painel no CRM para visualizar análise, rascunhos e histórico
- Ações manuais com auditoria completa
- Limites de custo, timeouts, retries e tratamento de falha

## Princípios Obrigatórios

✅ IA apenas **sugere**; nunca envia WhatsApp sem aprovação humana explícita
✅ Não incluir dados sensíveis (PII, documentos, dados bancários) no prompt
✅ Sem SQLite, Dockerfile próprio ou entrypoint
✅ Não alterar nem apagar dados existentes
✅ Sem deploy automático no código
✅ Feature flags para desabilitar automações
✅ Trilha de auditoria completa em `client_timeline`

## Roadmap de Implementação

### PR #1: Segurança e Confiabilidade do Webhook Evolution ✅
**Escopo**: Validação segura, idempotência, sem chaves sensíveis no frontend

**Arquivos**:
- Migrations: `whatsapp_evolution_events`, `message_drafts`, `conversation_pending_analysis`
- Services: `evolution-webhook.service.ts`, `message-normalization.service.ts`, `contact-matching.service.ts`
- Routes: `POST /api/webhooks/evolution` (autenticado)
- Types & Schemas: validação Zod completa
- Testes: autenticação, idempotência, normalização, matching
- Docs: README.md, variáveis de ambiente, payload exemplo

**Variáveis de Ambiente**:
```
EVOLUTION_WEBHOOK_SECRET=<chave-segura>
EVOLUTION_WEBHOOK_URL=https://seu-crm.com/api/webhooks/evolution
```

**Garantias**:
- ✅ Secret validado via HMAC-SHA256
- ✅ Segredo nunca aparece em logs
- ✅ Idempotência via `evolution_event_id` UNIQUE
- ✅ Mensagens normalizadas e associadas a clientes
- ✅ Contatos fuzzy matched ou criados
- ✅ Sem chave da Evolution exposta no frontend

---

### PR #2: Análise de Conversa com IA (Próxima Etapa)
**Escopo**: Serviço de IA desacoplado, classificação, análise de contexto

**Arquivos** (a implementar):
- Integrations: `src/integrations/ai/` (abstrações genéricas)
- Services: `conversation-analysis.service.ts`
- Migrations: `ai_conversation_analysis`, `ai_cost_tracking`
- Testes: análise, classificação, custo
- Docs: prompt engineering, privacidade de dados

**Variáveis de Ambiente**:
```
AI_PROVIDER=claude  # claude | openai | mock
AI_MODEL=claude-3-5-sonnet-20241022
AI_API_KEY=<chave-segura>
AI_COST_LIMIT_BRL=0.10
AI_TIMEOUT_MS=10000
AI_RETRY_MAX_ATTEMPTS=3
```

---

### PR #3: Geração de Rascunhos e Follow-ups
**Escopo**: Criar 3 rascunhos com tons, sugerir follow-ups

**Arquivos** (a implementar):
- Services: `draft-generator.service.ts`, `followup-suggestor.service.ts`
- Migrations: alterações em `message_drafts` (tone, reasoning, estimated_cost)
- Testes: geração, tons, follow-ups

---

### PR #4: Painel de IA no CRM
**Escopo**: UI para visualizar análise, rascunhos, histórico, ações manuais

**Arquivos** (a implementar):
- Components: `conversation-ai-panel.tsx`, `draft-card.tsx`, `analysis-summary.tsx`
- Hooks: `use-conversation-analysis.ts`, `use-draft-actions.ts`
- Routes: `GET /api/conversations/:id/analysis` (retorna dados de análise)
- Routes: `POST /api/drafts/:id/approve|reject|edit` (ações manuais)
- Testes: componentes, ações, auditoria

---

### PR #5: Auditoria e Histórico Completo
**Escopo**: Registrar todas as decisões humanas, timeline visual

**Arquivos** (a implementar):
- Services: `audit-trail.service.ts` (integrado com `client_timeline`)
- Components: `audit-timeline.tsx` (visualizar decisões)
- Testes: auditoria, timeline, rastreabilidade

---

## Impacto no Banco de Dados (PR #1)

### Migrations Novas:

1. **`whatsapp_evolution_events`** — Deduplicação de eventos
   ```sql
   id UUID PRIMARY KEY
   owner_id UUID (FK auth.users)
   evolution_event_id TEXT UNIQUE  -- SHA256(payload)
   event_type TEXT  -- message.received, contact.sync, etc.
   raw_payload JSONB
   processed_at TIMESTAMPTZ
   created_at TIMESTAMPTZ
   ```

2. **`message_drafts`** — Rascunhos de resposta (v1 simples, v2 com tone/reasoning)
   ```sql
   id UUID PRIMARY KEY
   owner_id UUID (FK auth.users)
   conversation_id UUID (FK conversations)
   suggested_text TEXT
   reasoning TEXT
   tone TEXT  -- formal | friendly | concise (v2)
   estimated_cost DECIMAL  -- custo IA (v2)
   status TEXT CHECK (pending|approved|rejected|sent)
   approved_by UUID (FK auth.users)
   approved_at TIMESTAMPTZ
   created_at TIMESTAMPTZ
   updated_at TIMESTAMPTZ
   ```

3. **`conversation_pending_analysis`** — Cache de pendências
   ```sql
   id UUID PRIMARY KEY
   owner_id UUID (FK auth.users)
   conversation_id UUID (FK conversations)
   last_incoming_message_id UUID (FK messages)
   reason TEXT  -- no_outgoing_response, timeout_24h, etc.
   analysis_result JSONB  -- sugestões (v2)
   analyzed_at TIMESTAMPTZ
   created_at TIMESTAMPTZ
   updated_at TIMESTAMPTZ
   ```

### Extensões Futuras (v2+):

4. **`ai_conversation_analysis`** — Resultado da análise de IA (v2)
   ```sql
   id UUID PRIMARY KEY
   owner_id UUID
   conversation_id UUID
   analysis_json JSONB  -- {status, priority, intent, sentiment, next_step}
   cost_used DECIMAL
   tokens_used INT
   model_used TEXT
   created_at TIMESTAMPTZ
   ```

5. **`ai_cost_tracking`** — Log de custos (v2)
   ```sql
   id UUID PRIMARY KEY
   owner_id UUID
   analysis_id UUID (FK ai_conversation_analysis)
   provider TEXT  -- claude, openai, etc.
   model TEXT
   cost_brl DECIMAL
   tokens_input INT
   tokens_output INT
   duration_ms INT
   created_at TIMESTAMPTZ
   ```

## Endpoints (PR #1 + Futuro)

### PR #1 (Webhook):
```
POST /api/webhooks/evolution
  Header: X-Evolution-Secret: <hmac-sha256>
  Body: { event_id, type, data, timestamp }
  Response: { success: true, deduplication_key: "..." }
  Security: ✅ Secret validado, ✅ Idempotência via DB
```

### PR #2 (Análise):
```
GET /api/conversations/:id/analysis
  Response: { status, priority, intent, sentiment, next_step, cost_used }
  Security: ✅ RLS
```

### PR #3 (Rascunhos):
```
GET /api/conversations/:id/drafts
  Response: [ { id, text, tone, reasoning, estimated_cost, status } ]

POST /api/drafts/:id/approve
  Body: { edit_text?: string }  -- opcional
  Response: { success, timeline_event_id }
  Auditoria: registra em client_timeline

POST /api/drafts/:id/reject
  Body: { reason?: string }
  Response: { success, timeline_event_id }
  Auditoria: registra em client_timeline
```

## Variáveis de Ambiente (PR #1)

```bash
# Webhook Evolution
EVOLUTION_WEBHOOK_SECRET=seu-segredo-super-secreto-aleatorio
EVOLUTION_WEBHOOK_URL=https://seu-crm.com/api/webhooks/evolution

# IA (v2+)
AI_PROVIDER=claude  # claude, openai, mock
AI_MODEL=claude-3-5-sonnet-20241022
AI_API_KEY=sk-ant-...
AI_COST_LIMIT_BRL=0.10
AI_TIMEOUT_MS=10000
AI_RETRY_MAX_ATTEMPTS=3
AI_ENABLE_CONVERSATION_ANALYSIS=true
```

## Testes (PR #1)

✅ **Autenticação webhook**:
- ✅ POST sem secret → 401
- ✅ POST com secret inválido → 401
- ✅ POST com secret correto → 200

✅ **Idempotência**:
- ✅ Mesmo `evolution_event_id` 2x → 1 row em BD
- ✅ Retry automático não duplica

✅ **Normalização**:
- ✅ Tipo text → type='text'
- ✅ Tipo image → type='image' com attachment
- ✅ Metadata preservada

✅ **Contact matching**:
- ✅ Match exato (nome + telefone)
- ✅ Fuzzy match (nome similar)
- ✅ Novo contato criado se nenhum match

✅ **E2E**:
- ✅ Evento → messages + conversations updated
- ✅ Pendência detectada

## Segurança (PR #1)

🔒 **Secret Management**:
- ✅ Secret em env var (`EVOLUTION_WEBHOOK_SECRET`)
- ✅ Validação via HMAC-SHA256
- ✅ Segredo NUNCA logged
- ✅ Sem chave Evolution no frontend

🔒 **Idempotência**:
- ✅ `evolution_event_id` UNIQUE em BD
- ✅ Deduplicação segura

🔒 **PII Protection**:
- ✅ Mensagens em `metadata` armazenadas com cuidado
- ✅ Soft-delete com `deleted_at`

🔒 **Rate Limiting** (futuro):
- ⏳ A implementar em v2 se necessário

## Próximas Etapas

1. ✅ **Commit atual**: Plano + auditoria
2. **PR #1**: Segurança e confiabilidade (webhook autenticado, idempotência)
3. **PR #2**: Análise de IA desacoplada
4. **PR #3**: Geração de rascunhos e follow-ups
5. **PR #4**: Painel UI no CRM
6. **PR #5**: Auditoria e histórico completo
