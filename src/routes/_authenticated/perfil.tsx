import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Corretor CRM" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PerfilPage,
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome"),
  display_name: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  creci: z.string().trim().max(30).optional().or(z.literal("")),
  avatar_url: z.string().trim().url("URL inválida").optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  signature: z.string().trim().max(500).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(2).optional().or(z.literal("")),
  locale: z.string(),
  timezone: z.string(),
  theme: z.enum(["light", "dark", "system"]),
  date_format: z.string(),
  currency_format: z.string(),
});

type ProfileForm = z.infer<typeof profileSchema>;

function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      display_name: "",
      phone: "",
      creci: "",
      avatar_url: "",
      bio: "",
      signature: "",
      city: "",
      state: "",
      locale: "pt-BR",
      timezone: "America/Sao_Paulo",
      theme: "system",
      date_format: "dd/MM/yyyy",
      currency_format: "BRL",
    },
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user.id)
        .maybeSingle();
      if (error) {
        toast.error("Não foi possível carregar o perfil.");
      } else if (profile) {
        form.reset({
          full_name: profile.full_name ?? "",
          display_name: profile.display_name ?? "",
          phone: profile.phone ?? "",
          creci: profile.creci ?? "",
          avatar_url: profile.avatar_url ?? "",
          bio: profile.bio ?? "",
          signature: profile.signature ?? "",
          city: profile.city ?? "",
          state: profile.state ?? "",
          locale: profile.locale ?? "pt-BR",
          timezone: profile.timezone ?? "America/Sao_Paulo",
          theme: (profile.theme ?? "system") as "light" | "dark" | "system",
          date_format: profile.date_format ?? "dd/MM/yyyy",
          currency_format: profile.currency_format ?? "BRL",
        });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: ProfileForm) => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setSaving(false);
      return;
    }
    const payload = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === "" ? null : v]),
    ) as Partial<ProfileForm>;
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", u.user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Perfil atualizado.");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">
          Dados profissionais e preferências de uso do sistema.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Informações profissionais</CardTitle>
            <CardDescription>Como você é identificado no sistema.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="E-mail" hint="Vinculado à sua conta">
              <Input value={email} disabled />
            </Field>
            <Field label="Nome completo *" error={form.formState.errors.full_name?.message}>
              <Input {...form.register("full_name")} />
            </Field>
            <Field label="Nome de exibição">
              <Input {...form.register("display_name")} />
            </Field>
            <Field label="Telefone / WhatsApp">
              <Input {...form.register("phone")} placeholder="(11) 99999-9999" />
            </Field>
            <Field label="CRECI">
              <Input {...form.register("creci")} />
            </Field>
            <Field label="Avatar (URL)">
              <Input {...form.register("avatar_url")} placeholder="https://…" />
            </Field>
            <Field label="Cidade">
              <Input {...form.register("city")} />
            </Field>
            <Field label="Estado (UF)">
              <Input {...form.register("state")} maxLength={2} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Bio">
                <Textarea rows={3} {...form.register("bio")} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Assinatura" hint="Usada em e-mails e propostas">
                <Textarea rows={3} {...form.register("signature")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Preferências</CardTitle>
            <CardDescription>Idioma, fuso e formatos.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Idioma">
              <Select
                value={form.watch("locale")}
                onValueChange={(v) => form.setValue("locale", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es-ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fuso horário">
              <Select
                value={form.watch("timezone")}
                onValueChange={(v) => form.setValue("timezone", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                  <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                  <SelectItem value="America/Rio_Branco">Rio Branco (GMT-5)</SelectItem>
                  <SelectItem value="America/Noronha">Noronha (GMT-2)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tema">
              <Select
                value={form.watch("theme")}
                onValueChange={(v) => form.setValue("theme", v as "light" | "dark" | "system")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Formato de data">
              <Select
                value={form.watch("date_format")}
                onValueChange={(v) => form.setValue("date_format", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/MM/yyyy">31/12/2026</SelectItem>
                  <SelectItem value="MM/dd/yyyy">12/31/2026</SelectItem>
                  <SelectItem value="yyyy-MM-dd">2026-12-31</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Moeda">
              <Select
                value={form.watch("currency_format")}
                onValueChange={(v) => form.setValue("currency_format", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (BRL)</SelectItem>
                  <SelectItem value="USD">Dólar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
