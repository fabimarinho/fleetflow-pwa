import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  senha: z.string().min(6).max(72),
  telefone: z.string().trim().max(30).optional().or(z.literal("")),
  matricula: z.string().trim().max(50).optional().or(z.literal("")),
  secretaria_id: z.string().uuid().optional().or(z.literal("")),
  role: z.enum(["administrador", "gestor", "motorista"]),
});

export const criarServidor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Only administrators can create users
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Apenas administradores podem cadastrar servidores.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Falha ao criar usuário.");
    }

    const userId = created.user.id;

    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({
        nome: data.nome,
        telefone: data.telefone || null,
        matricula: data.matricula || null,
        secretaria_id: data.secretaria_id || null,
      })
      .eq("id", userId);
    if (profErr) throw new Error(profErr.message);

    // Replace default role with requested role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleInsErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (roleInsErr) throw new Error(roleInsErr.message);

    return { id: userId };
  });

export const excluirServidor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Apenas administradores podem excluir servidores.");
    if (data.id === context.userId) throw new Error("Você não pode excluir a própria conta.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });