import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  type SignInInput,
  type SignUpInput,
  type ForgotPasswordInput,
} from "@/features/auth/schemas";
import { translateAuthError } from "@/features/auth/error-messages";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Corretor CRM" },
      { name: "description", content: "Acesse sua conta do Corretor CRM Premium." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");

  // Se já estiver logado, redireciona.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/inicio", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between bg-muted/30 p-10 border-r">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          Corretor CRM
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Gestão premium para corretores autônomos
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Centralize clientes, agenda, negociações e finanças em um único
            ambiente moderno, rápido e feito sob medida para você.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Corretor CRM
        </p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden flex items-center gap-2 text-foreground font-semibold">
            <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            Corretor CRM
          </div>

          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">
                {tab === "signin" && "Entrar"}
                {tab === "signup" && "Criar conta"}
                {tab === "forgot" && "Recuperar senha"}
              </CardTitle>
              <CardDescription>
                {tab === "signin" && "Acesse sua conta para continuar."}
                {tab === "signup" && "Comece a organizar seu funil de imóveis."}
                {tab === "forgot" && "Enviaremos um link para o seu e-mail."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tab === "forgot" ? (
                <ForgotForm onBack={() => setTab("signin")} />
              ) : (
                <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="signin">Entrar</TabsTrigger>
                    <TabsTrigger value="signup">Criar conta</TabsTrigger>
                  </TabsList>
                  <TabsContent value="signin">
                    <SignInForm onForgot={() => setTab("forgot")} />
                  </TabsContent>
                  <TabsContent value="signup">
                    <SignUpForm onSuccess={() => setTab("signin")} />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              ← Voltar para o início
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = async (values: SignInInput) => {
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error(translateAuthError(error));
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/inicio", replace: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">E-mail</Label>
        <Input id="signin-email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Senha</Label>
          <button
            type="button"
            onClick={onForgot}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Esqueci minha senha
          </button>
        </div>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Entrar
      </Button>
    </form>
  );
}

function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = async (values: SignUpInput) => {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/inicio`,
        data: { full_name: values.fullName },
      },
    });
    if (error) {
      toast.error(translateAuthError(error));
      return;
    }
    toast.success("Conta criada! Você já pode entrar.");
    reset();
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Nome completo</Label>
        <Input id="signup-name" autoComplete="name" {...register("fullName")} />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">E-mail</Label>
        <Input id="signup-email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Senha</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Criar conta
      </Button>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordInput) => {
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(translateAuthError(error));
      return;
    }
    setSent(true);
    toast.success("Link enviado! Verifique seu e-mail.");
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Enviamos um link de recuperação para o seu e-mail. Verifique também
            a caixa de spam.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="w-full" onClick={onBack}>
          Voltar para o login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">E-mail</Label>
        <Input id="forgot-email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar link de recuperação
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        Voltar
      </Button>
    </form>
  );
}
