import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Layers, Palette, Shield } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: Index,
});

const foundations = [
  {
    icon: Layers,
    title: "Arquitetura modular",
    description: "Clean Architecture, SOLID e camadas isoladas prontas para escalar.",
  },
  {
    icon: Palette,
    title: "Design System",
    description: "Tokens semânticos, tema claro/escuro e componentes reutilizáveis.",
  },
  {
    icon: Shield,
    title: "Tipagem completa",
    description: "TypeScript estrito, validação Zod e formulários com React Hook Form.",
  },
  {
    icon: Sparkles,
    title: "Pronto para crescer",
    description: "Módulos, hooks, services e integrações separados por responsabilidade.",
  },
];

function Index() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <div className="flex flex-col items-start gap-4">
          <Badge variant="secondary" className="rounded-full">
            Fundação · v0.1
          </Badge>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            Corretor CRM Premium
          </h1>
          <p className="max-w-2xl text-muted-foreground leading-relaxed">
            Estrutura base do sistema pronta. Sidebar, topbar, tema claro/escuro,
            design system e providers globais configurados. Os módulos de
            negócio serão construídos nas próximas etapas mediante aprovação.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {foundations.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="border-border/60 hover:border-border transition-colors"
              >
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {item.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent />
              </Card>
            );
          })}
        </div>

        <div className="mt-10 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          Área principal — pronta para receber os módulos: Dashboard, Clientes,
          Agenda, Kanban, Timeline, Financeiro, IA, WhatsApp, Relatórios e
          Configurações.
        </div>
      </div>
    </AppShell>
  );
}
