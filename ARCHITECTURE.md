# Arquitetura — Corretor CRM Premium

Estrutura organizada por responsabilidade, seguindo Clean Architecture e SOLID.

## Pastas

```
src/
├── routes/            # Rotas (TanStack Router, file-based)
│   └── api/           # Endpoints HTTP (webhooks, APIs públicas)
├── components/
│   ├── ui/            # Design System (shadcn base)
│   └── layout/        # Sidebar, Topbar, AppShell
├── layouts/           # Layouts compostos reutilizáveis
├── features/          # Módulos de negócio (clientes, agenda, etc.) — a criar
├── services/          # Casos de uso e regras de aplicação
├── hooks/             # Hooks React reutilizáveis
├── providers/         # Providers globais (tema, auth, etc.)
├── contexts/          # Contexts de escopo local
├── lib/               # Utilitários de baixo nível (fetchers, helpers)
├── utils/             # Funções puras de domínio geral
├── types/             # Tipos e contratos compartilhados
├── constants/         # Constantes globais
├── database/          # Schemas, migrations e queries
├── integrations/      # Clientes de APIs externas (Supabase, etc.)
├── ai/                # Prompts, agentes e helpers de IA
└── styles.css         # Design tokens (Tailwind v4 + oklch)
```

## Regras

- Componentes de UI usam **exclusivamente** tokens do Design System — nunca cores hardcoded.
- Toda entrada de usuário é validada com **Zod**.
- Toda chamada de dados usa **TanStack Query** (loader do router + `useSuspenseQuery` no componente).
- Toda lógica reutilizável mora em `hooks/` ou `services/`, nunca duplicada em rotas.
- `features/<modulo>/` agrupa: `components/`, `hooks/`, `services/`, `types.ts`, `schemas.ts`.

## Como crescer

Novo módulo → `src/features/<nome>/` + rota em `src/routes/`. O módulo consome
o Design System, expõe hooks e services próprios, e não vaza detalhes internos
para outros módulos.
