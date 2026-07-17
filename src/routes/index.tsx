import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Layers, Palette, Shield, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Corretor CRM — Gestão premium para corretores autônomos" },
      {
        name: "description",
        content:
          "CRM premium para corretores de imóveis autônomos. Clientes, agenda, pipeline e finanças em um só lugar.",
      },
    ],
  }),
  component: Landing,
});

const foundations = [
  { icon: Layers, title: "Arquitetura modular", description: "Clean Architecture e camadas isoladas, prontas para escalar." },
  { icon: Palette, title: "Design System", description: "Tokens semânticos, tema claro/escuro e componentes reutilizáveis." },
  { icon: Shield, title: "Segurança nativa", description: "Autenticação, RLS e políticas de acesso configuradas." },
  { icon: Sparkles, title: "Pronto para crescer", description: "Módulos, hooks e integrações separados por responsabilidade." },
];

function Landing() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
    });
  }, []);

  const primaryTo = signedIn ? "/inicio" : "/auth";
  const primaryLabel = signedIn ? "Ir para o painel" : "Entrar";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-primary-foreground text-xs font-bold">
              C
            </div>
            Corretor CRM
          </div>
          <div className="flex items-center gap-2">
            {signedIn === false && (
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/auth" })}>
                Entrar
              </Button>
            )}
            <Button size="sm" asChild>
              <Link to={primaryTo}>
                {primaryLabel} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <div className="flex flex-col items-start gap-4">
          <Badge variant="secondary" className="rounded-full">
            Fundação · v0.2
          </Badge>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            O CRM premium para o corretor autônomo.
          </h1>
          <p className="max-w-2xl text-muted-foreground text-lg leading-relaxed">
            Centralize seus clientes, agenda, pipeline e finanças em um sistema
            moderno, rápido e feito para escalar com você — sem equipe, sem
            multiempresa, sem complicação.
          </p>
          <div className="flex gap-2 mt-2">
            <Button size="lg" asChild>
              <Link to={primaryTo}>
                {primaryLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
          {foundations.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-border/60 hover:border-border transition-colors">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <div className="h-9 w-9 rounded-md bg-primary/10 grid place-items-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Corretor CRM</span>
          <span>Feito para corretores autônomos.</span>
        </div>
      </footer>
    </div>
  );
}
