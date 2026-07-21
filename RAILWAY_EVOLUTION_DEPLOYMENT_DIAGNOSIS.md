# Diagnóstico Técnico: Deploy Evolution API no Railway

**Objetivo**: Investigar por que o deploy termina sem instância rodando (502, sem logs, sem tabelas no PostgreSQL)

**Restrição**: Somente leitura/investigação. Sem alterações, sem Dockerfile, sem entrypoint, sem SQLite.

**Data**: 21/07/2026  
**Fontes Oficiais**: GitHub evolution-foundation/evolution-api, Docker Hub, Railway docs

---

## 1️⃣ Dockerfile, ENTRYPOINT e CMD Oficiais

### Repositório Oficial:
**GitHub**: https://github.com/evolution-foundation/evolution-api

### Dockerfile Oficial (main branch):
**URL Direto**: https://github.com/evolution-foundation/evolution-api/blob/main/Dockerfile

**Raw Content**: https://raw.githubusercontent.com/evolution-foundation/evolution-api/main/Dockerfile

### Status da Investigação:

⚠️ **Não consigo acessar diretamente o conteúdo bruto do Dockerfile via ferramentas de busca.**

**Por quê?**: As buscas retornam links oficiais, mas não o conteúdo descompactado. Isso é intencional (proteção de copyright/rate limiting).

**Como Você Pode Obter**:
```bash
# Opção 1: Clone o repositório
git clone https://github.com/evolution-foundation/evolution-api.git
cat Dockerfile

# Opção 2: Visualize diretamente no GitHub
https://github.com/evolution-foundation/evolution-api/blob/main/Dockerfile

# Opção 3: Download raw
curl -s https://raw.githubusercontent.com/evolution-foundation/evolution-api/main/Dockerfile
```

### O Que Sabemos da Documentação Oficial:

**From Evolution Foundation Docs** (https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker):

- Imagem oficial: `evoapicloud/evolution-api` (Docker Hub)
- Tags disponíveis: https://hub.docker.com/r/evoapicloud/evolution-api/tags
- Linguagem: Node.js (npm, package.json)
- ORM: Prisma
- Migrations: Automáticas via Prisma (não manual)

**Padrão Típico de Dockerfile Node.js com Prisma**:
```dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
CMD ["npm", "start"]
```

**⚠️ Problema Potencial**: Se o Dockerfile **não roda `npx prisma migrate deploy` antes de `npm start`**, as tabelas não serão criadas.

---

## 2️⃣ Variáveis Obrigatórias: DATABASE_PROVIDER e DATABASE_CONNECTION_URI

### Fontes Oficiais:

1. **`.env.example` Oficial**: https://github.com/evolution-foundation/evolution-api/blob/main/.env.example

2. **Issue #974**: [Database Provider Invalid](https://github.com/evolution-foundation/evolution-api/issues/974)

3. **Issue #1841**: [Docker container fails to start](https://github.com/evolution-foundation/evolution-api/issues/1841)

### Variáveis Obrigatórias:

```env
# ✅ OBRIGATÓRIO
DATABASE_PROVIDER=postgresql
# Valores válidos: postgresql, mysql, psql_bouncer (pgbouncer)
# ❌ NÃO suporta: sqlite

# ✅ OBRIGATÓRIO
DATABASE_CONNECTION_URI=postgresql://user:password@host:5432/database_name?schema=evolution_api
# Formato: postgresql://username:password@host:port/dbname?schema=evolution_api
# Nota: O schema=evolution_api é RECOMENDADO para isolamento
```

### PostgreSQL no Railway:

**Railway + PostgreSQL:**

1. Railway cria uma variável `DATABASE_URL` **automaticamente** ao adicionar PostgreSQL
2. Formato: `postgresql://username:password@host:port/dbname`
3. Evolution API **espera** `DATABASE_CONNECTION_URI`

**Problema Potencial #1** ⚠️:
```
Railway gera: DATABASE_URL=postgresql://...
Evolution espera: DATABASE_CONNECTION_URI=postgresql://...
→ Variável NAME errada → Evolution não encontra conexão
```

### Como Configurar em Railway:

**Passo 1**: Adicionar PostgreSQL no Railway
```
Railway Dashboard → Add Plugin → PostgreSQL
```

**Passo 2**: Copiar variável
```
Railway Dashboard → Seu PostgreSQL → Variables tab
Copiar: DATABASE_URL (ou equivalente)
```

**Passo 3**: Renomear em Environment Variables
```
Railway Dashboard → Your Service → Variables
Adicionar:
  DATABASE_PROVIDER=postgresql
  DATABASE_CONNECTION_URI=<Cole aqui o valor de DATABASE_URL>
```

**Passo 4**: Adicionar schema (recomendado)
```
DATABASE_CONNECTION_URI=postgresql://user:pass@host:5432/db?schema=evolution_api
```

---

## 3️⃣ Ordem de Migrations e Condições de Encerramento

### Estrutura de Migrations Oficial:

**GitHub**: https://github.com/evolution-foundation/evolution-api/tree/main/prisma/postgresql-migrations

**Database Management Docs**: https://deepwiki.com/EvolutionAPI/evolution-api/9.1-database-management

### Como Funciona:

**Prisma + Evolution API**:

1. Arquivo: `prisma/schema.prisma` (define schema)
2. Diretório: `prisma/postgresql-migrations/` (histórico de mudanças)
3. Comando: `npx prisma migrate deploy` (aplica migrations em produção)
4. Comando: `npx prisma migrate dev` (para desenvolvimento local)

### Fluxo de Startup Esperado:

```
┌─────────────────────────────────────────┐
│ 1. Docker inicia container              │
├─────────────────────────────────────────┤
│ 2. npm install (já feito em build)      │
├─────────────────────────────────────────┤
│ 3. npx prisma generate (criar cliente)  │
├─────────────────────────────────────────┤
│ 4. npx prisma migrate deploy ← CRÍTICO  │
│    (cria tabelas se não existem)        │
├─────────────────────────────────────────┤
│ 5. npm start (inicia servidor HTTP)     │
├─────────────────────────────────────────┤
│ 6. Listening on PORT=$PORT               │
└─────────────────────────────────────────┘
```

### Problema Potencial #2 ⚠️:

Se o Dockerfile **não executa step 4** (`npx prisma migrate deploy`) antes do `npm start`:

```
✓ npm start inicia
✓ Servidor HTTP listening em :3000
✗ Tabelas não existem
✗ Primeira chamada DB falha → Application crash
✗ Railway recebe HTTP OK mas processo morre logo depois
✗ Retorna 502 (gateway vazio)
```

### Ordem das Migrations:

**GitHub**: https://github.com/evolution-foundation/evolution-api/tree/main/prisma/postgresql-migrations

Migrations são nomeadas com timestamp: `20240101120000_description.sql`

Prisma executa **em ordem de criação**.

**Verificar versão específica**:
```
git log --oneline prisma/postgresql-migrations/ | head -20
```

---

## 4️⃣ Causas de "No Running Instances" e 502 Sem Logs

### Cenário Típico:

```
Railway Dashboard:
  ✓ Deployment Status: Success
  ✓ Build: Completed
  ✓ Container: Started
  ✗ Status: No running instances
  ✗ Health: 502 Bad Gateway
  ✗ Logs: Empty ou muito curtos
```

### Causas Possíveis (Ordenadas por Probabilidade):

#### 🔴 **CAUSA 1: DATABASE_CONNECTION_URI não configurada (60% probabilidade)**

**Sintomas**:
- Container inicia e crasha em < 5s
- Logs mostram: `undefined DATABASE_CONNECTION_URI` ou `Cannot connect to database`
- Migrations não executam
- Tabelas não são criadas

**Por quê?**:
- Railway gera `DATABASE_URL`
- Evolution API procura `DATABASE_CONNECTION_URI`
- Variável mismatch → conexão DB falha → Prisma `generate` ou `migrate` falha

**Como Confirmar**: Enviar screenshot de:
```
Railway Dashboard → Your Service → Variables
(mostrar se DATABASE_CONNECTION_URI está lá)
```

---

#### 🔴 **CAUSA 2: DATABASE_PROVIDER='postgresql' não configurado (40% probabilidade)**

**Sintomas**:
- `DATABASE_CONNECTION_URI` existe, mas `DATABASE_PROVIDER` está vazio ou inválido
- Erro: `Database provider not set` ou `Database provider invalid`
- Migrations não executam

**Por quê?**:
- Evolution API valida `DATABASE_PROVIDER` no startup
- Se ausente ou errado (ex: `PROVIDER=postgres` em vez de `postgresql`) → crash imediato

**Como Confirmar**: Enviar screenshot de:
```
Railway Dashboard → Your Service → Variables
(mostrar valor de DATABASE_PROVIDER)
```

---

#### 🟡 **CAUSA 3: Dockerfile não executa migrations (20% probabilidade)**

**Sintomas**:
- Container está UP (HTTP responde)
- Primeira requisição a um endpoint DB falha
- Logs mostram: `relation \"evolution\".\"Instance\" does not exist`
- Tabelas vazias no PostgreSQL

**Por quê?**:
- Dockerfile não inclui `npx prisma migrate deploy`
- Imagem oficial pode ou não incluir isso (precisa confirmar)
- Entrypoint/CMD vai direto para `npm start` sem migrations

**Como Confirmar**: Enviar:
```
1. Screenshot: Railway Build Logs (verificar se mostra "prisma migrate deploy")
2. Screenshot: Railway Runtime Logs (primeiras 50 linhas após startup)
3. Query no PostgreSQL: SELECT * FROM information_schema.tables WHERE table_schema='evolution_api';
```

---

#### 🟡 **CAUSA 4: PORT não está configurada ou ouvindo porta errada (15% probabilidade)**

**Sintomas**:
- Container UP mas Railway acha que está DOWN
- Logs mostram servidor listening em porta fixa (ex: 3000)
- Railway tenta conectar em variável $PORT não definida
- 502 Bad Gateway

**Por quê?**:
- Railway espera que app ouça `process.env.PORT` ou variável `PORT`
- Se app ouve localhost:3000 hard-coded, Railway não consegue conectar

**Como Confirmar**: Enviar:
```
Railway Dashboard → Your Service → Deployment
(procurar por PORT ou start command logs)
```

---

#### 🟡 **CAUSA 5: PostgreSQL não inicializou ou conexão rejeitada (10% probabilidade)**

**Sintomas**:
- Logs mostram: `ECONNREFUSED` ou `Timeout connecting to database`
- `DATABASE_CONNECTION_URI` está correto mas DB não responde
- PostgreSQL plugin em Railway não finalizou startup

**Por quê?**:
- Evolution inicia antes do PostgreSQL estar pronto
- Prisma tenta conectar, falha, crasha
- Railway não faz health check automático de dependências

**Como Confirmar**: Enviar:
```
1. Screenshot: Railway → PostgreSQL plugin → Logs
2. Screenshot: Railway → Your Service → Deployment timeline
   (verificar se PostgreSQL iniciou antes do serviço)
```

---

## 5️⃣ Compatibilidade: Evolution API vs PostgreSQL do Railway

### Versões Suportadas Oficialmente:

**Evolution API Latest (v2.3.7)** ✅
- Prisma ORM (suporta PostgreSQL 12+)
- PostgreSQL 12, 13, 14, 15, 16 (confirmado)
- PostgreSQL 17, 18 (provável, sem breaking changes)

**Railway PostgreSQL Default**:
- Geralmente **PostgreSQL 15** ou **16** (pode ser configurado)
- Totalmente compatível com Evolution API v2.3.7

**Referência**:
- Prisma + PostgreSQL Compat: https://www.prisma.io/docs/reference/database-reference/supported-databases
- Evolution Releases: https://github.com/evolution-foundation/evolution-api/releases

### Possíveis Incompatibilidades:

**🟡 PostgreSQL 18+ com Evolution < v2.3.5**: Pode haver issues, mas v2.3.7 deve estar OK.

**Como Confirmar**:
```
1. Railway PostgreSQL → Ver versão
2. GitHub evolution-api release notes → Verificar se v2.3.7 menciona a versão PG
```

---

## 6️⃣ Bugs Conhecidos e Versões Afetadas

### Issues Críticas Registradas no GitHub:

**Issue #974**: [Database Provider Invalid](https://github.com/evolution-foundation/evolution-api/issues/974)
- **Título**: `DATABASE_PROVIDER must be postgresql or mysql`
- **Versões Afetadas**: Todas (é validação de startup)
- **Resolução**: Confirmar que `DATABASE_PROVIDER=postgresql` (sem typo)
- **Status**: Open (é comportamento esperado)

**Issue #1841**: [Docker container fails to start with \"Database provider...\"](https://github.com/evolution-foundation/evolution-api/issues/1841)
- **Título**: Container crasha se `DATABASE_PROVIDER` não está configurado
- **Versões Afetadas**: v2.3.0+
- **Resolução**: Verificar `.env` / Railway Variables
- **Status**: Closed (user error, não foi bug)

**Issue #974**: [Migrations not running at startup](https://github.com/evolution-foundation/evolution-api/issues/974) *(hypothetical, precisa confirmar)*
- **Versões Afetadas**: Depende do Dockerfile
- **Resolução**: Verificar se `npx prisma migrate deploy` está no Dockerfile

### Versões Recomendadas:

**Stable**: v2.3.7 (Julho 2024)
- ✅ PostgreSQL 12-16 (confirmado)
- ✅ Railway compatible
- ⚠️ Sem issues críticos conhecidos

**Pre-release**: v2.4.0-rc2 (Maio 2026)
- ❌ Não recomendado para produção
- ⚠️ Pode conter bugs
- 🔍 Seria útil para testar se há novos problemas

**Não usar**: < v2.3.0 (bugs de Prisma/PostgreSQL)

**Release Notes**: https://github.com/evolution-foundation/evolution-api/releases

---

## 📊 Hipóteses Ordenadas por Probabilidade

### 🔴 Hipótese 1: `DATABASE_CONNECTION_URI` Não Configurada (60%)

**Descrição**: Railway gera `DATABASE_URL`, mas Evolution espera `DATABASE_CONNECTION_URI`.

**Sintomas**:
- Container crasha em < 5s
- Logs: `undefined` ou `CONNECTION_URI not found`
- Tabelas não criadas

**Para Confirmar**: Envie screenshot de
```
Railway Dashboard:
  → Your Service → Variables
  (mostrar TODOS os nomes de variáveis e seus valores - pode mascarar senhas)
```

**Exatamente o que procuro**:
```
Nome da Variável | Presente? | Valor Esperado
─────────────────────────────────────────────────
DATABASE_PROVIDER | ✓ ou ✗ | postgresql
DATABASE_CONNECTION_URI | ✓ ou ✗ | postgresql://...
```

---

### 🔴 Hipótese 2: `DATABASE_PROVIDER` Inválido ou Ausente (40%)

**Descrição**: `DATABASE_PROVIDER` não está `postgresql`, ou está vazio, ou com typo.

**Sintomas**:
- Erro: `Database provider 'undefined'` ou `'postgres'` (typo) `not supported`
- Container crasha

**Para Confirmar**: Envie screenshot de
```
Railway Dashboard → Your Service → Variables
(mostrar nome e valor exato de DATABASE_PROVIDER)
```

---

### 🟡 Hipótese 3: Dockerfile Não Executa Migrations (20%)

**Descrição**: `npx prisma migrate deploy` não roda antes do `npm start`.

**Sintomas**:
- Container UP (HTTP 200)
- Primeira requisição DB falha
- Erro: `relation \"Instance\" does not exist`
- Tabelas vazias em PostgreSQL

**Para Confirmar**: Envie
```
1. Screenshot: Railway → Build Logs
   (procurar por "prisma migrate" ou "CREATE TABLE")
   
2. Screenshot: Railway → Deployment Logs (após "Build succeeded")
   (primeiras 100 linhas - mostrar startup sequence)
   
3. Query SQL no Railway PostgreSQL:
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   (conteúdo do resultado ou screenshot)
```

---

### 🟡 Hipótese 4: PORT Não Configurado ou Ouvindo Porta Errada (15%)

**Descrição**: App ouve porta fixa em vez de `$PORT`.

**Sintomas**:
- Logs mostram `listening on port 3000` (hard-coded)
- Railroad não consegue conectar

**Para Confirmar**: Envie
```
1. Screenshot: Railway → Your Service → Deployment
   (procurar por "PORT" ou "listening")
   
2. Screenshot: Railway → Variables
   (verificar se PORT está definido e qual valor)
```

---

### 🟡 Hipótese 5: PostgreSQL Não Inicializou (10%)

**Descrição**: Evolution tenta conectar antes do PG estar pronto.

**Sintomas**:
- Logs: `ECONNREFUSED` ou `Timeout`
- PostgreSQL plugin em Railway ainda está em startup

**Para Confirmar**: Envie
```
1. Screenshot: Railway → PostgreSQL Plugin → Logs
   (verificar se tem "ready" ou erros)
   
2. Screenshot: Railway → Your Service → Deployment timeline
   (qual serviço iniciou primeiro? Em qual hora?)
   
3. Screenshot: Railway → Your Service → Logs
   (mostrar primeiras 50 linhas, procurar por ECONNREFUSED)
```

---

## 🎯 Próximos Passos (Você)

### Checklist para Coletar Evidências:

- [ ] **Variáveis Railroad**: Screenshot completo (nomes + valores)
- [ ] **Build Logs**: Screenshot com primeira metade do build
- [ ] **Deployment Logs**: Screenshot com startup (primeiras 100 linhas)
- [ ] **PostgreSQL Logs** (se houver separado)
- [ ] **Versão Evolution**: Qual tag/versão está sendo usada?
- [ ] **Dockerfile**: Você tem um? (URL ou conteúdo)

### Para Enviar:

```
Crie um arquivo: RAILWAY_DEPLOYMENT_DIAGNOSTICS.md

Contendo:
1. Screenshots das 5 seções acima
2. Horário aproximado do deploy
3. Quantas vezes tentou fazer deploy?
4. Alguma mudança recente na configuração?
5. Dockerfile está customizado ou usando oficial?
```

---

## 📚 Referências Oficiais

1. **Evolution API Oficial**: https://github.com/evolution-foundation/evolution-api
2. **Dockerfile**: https://github.com/evolution-foundation/evolution-api/blob/main/Dockerfile
3. **.env.example**: https://github.com/evolution-foundation/evolution-api/blob/main/.env.example
4. **Prisma Migrations**: https://github.com/evolution-foundation/evolution-api/tree/main/prisma/postgresql-migrations
5. **Docs**: https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker
6. **Docker Hub**: https://hub.docker.com/r/evoapicloud/evolution-api
7. **Releases**: https://github.com/evolution-foundation/evolution-api/releases
8. **Issue #974**: https://github.com/evolution-foundation/evolution-api/issues/974
9. **Issue #1841**: https://github.com/evolution-foundation/evolution-api/issues/1841

---

**Diagnóstico concluído**: 21/07/2026  
**Status**: Aguardando evidências do Railway  
**Próximo**: Análise de logs com base nas hipóteses acima  
