import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { traduzErroAuth } from "@/lib/authErrors";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // signup
  const [nome, setNome] = useState("");
  const [emailS, setEmailS] = useState("");
  const [passwordS, setPasswordS] = useState("");
  // forgot
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .object({
        email: z.string().trim().email("E-mail inválido").max(255),
        password: z.string().min(1, "Informe sua senha").max(72),
      })
      .safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) toast.error(traduzErroAuth(error.message));
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .object({
        nome: z.string().trim().min(2, "Informe seu nome completo").max(100),
        email: z.string().trim().email("E-mail inválido").max(255),
        password: z
          .string()
          .min(8, "A senha deve ter no mínimo 8 caracteres")
          .max(72, "A senha é longa demais"),
      })
      .safeParse({ nome, email: emailS, password: passwordS });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { nome: parsed.data.nome },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);
    if (error) return toast.error(traduzErroAuth(error.message));
    toast.success("Conta criada! Verifique seu e-mail para confirmar.");
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (result.error) toast.error(traduzErroAuth(result.error.message));
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .string()
      .trim()
      .email("Informe um e-mail válido")
      .max(255)
      .safeParse(forgotEmail);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(traduzErroAuth(error.message));
      return;
    }
    toast.success("Enviamos um link de redefinição para seu e-mail.");
    setForgotOpen(false);
    setForgotEmail("");
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-sidebar to-primary px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-white">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Truck className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold">Prefeitura Municipal</h1>
          <p className="text-white/80 text-sm">Sistema de Gestão de Frota</p>
        </div>
        <Card className="p-6">
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "ENTRAR"}
                </Button>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                    <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84Z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
                  </svg>
                  Continuar com Google
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailS">E-mail</Label>
                  <Input id="emailS" type="email" autoComplete="email" value={emailS} onChange={(e) => setEmailS(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordS">Senha</Label>
                  <Input id="passwordS" type="password" autoComplete="new-password" value={passwordS} onChange={(e) => setPasswordS(e.target.value)} minLength={8} required />
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Cadastrando..." : "CRIAR CONTA"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  O primeiro usuário cadastrado torna-se administrador.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
        <p className="text-center text-white/70 text-xs mt-6">© 2026 Prefeitura Municipal · v1.0.0</p>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
            <DialogDescription>
              Informe seu e-mail e enviaremos um link para você criar uma nova senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgotEmail">E-mail</Label>
              <Input
                id="forgotEmail"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setForgotOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}