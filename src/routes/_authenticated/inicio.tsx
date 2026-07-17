import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User as UserIcon, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Início — Corretor CRM" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InicioPage,
});

function InicioPage() {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, display_name")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (cancelled) return;
      setName(profile?.display_name || profile?.full_name || userData.user.email || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Bem-vindo</p>
        {loading ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <h1 className="text-3xl font-semibold tracking-tight">
            Olá, {name?.split(" ")[0] ?? "corretor"} 👋
          </h1>
        )}
        <p className="text-muted-foreground">
          A fundação do sistema está pronta. Os módulos de negócio serão
          liberados nas próximas etapas.
        </p>
      </div>

      <Card className="mt-8 border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="h-4 w-4 text-primary" />
            Complete seu perfil
          </CardTitle>
          <CardDescription>
            Preencha seus dados profissionais para acelerar o uso das próximas
            funcionalidades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/perfil">
              Ir para o perfil <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
