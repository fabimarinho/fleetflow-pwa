import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import {
  getMe,
  isAuthenticated,
  login,
} from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  ssr: false,

  beforeLoad: async () => {
    if (!isAuthenticated()) {
      return;
    }

    const usuario = await getMe();

    if (usuario) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },

  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(false);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const parsed = z
      .object({
        email: z
          .string()
          .trim()
          .email("E-mail inválido")
          .max(255),

        password: z
          .string()
          .min(1, "Informe sua senha")
          .max(72),
      })
      .safeParse({
        email,
        password,
      });

    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0].message
      );
      return;
    }

    try {
      setLoading(true);

      await login(
        parsed.data.email,
        parsed.data.password
      );

      toast.success(
        "Login realizado com sucesso."
      );

      await navigate({
        to: "/dashboard",
        replace: true,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o login."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-sidebar to-primary px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-white">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Truck
              className="h-8 w-8"
              aria-hidden
            />
          </div>

          <h1 className="text-2xl font-bold">
            Prefeitura Municipal
          </h1>

          <p className="text-white/80 text-sm">
            Sistema de Gestão de Frota
          </p>
        </div>

        <Card className="p-6">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold">
              Entrar
            </h2>

            <p className="text-sm text-muted-foreground">
              Informe seu e-mail e senha para
              acessar o sistema.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">
                E-mail
              </Label>

              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Senha
              </Label>

              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading
                ? "Entrando..."
                : "ENTRAR"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Cadastro e recuperação de senha serão
            disponibilizados pela administração
            do sistema.
          </p>
        </Card>

        <p className="text-center text-white/70 text-xs mt-6">
          © 2026 Prefeitura Municipal · v1.0.0
        </p>
      </div>
    </div>
  );
}
