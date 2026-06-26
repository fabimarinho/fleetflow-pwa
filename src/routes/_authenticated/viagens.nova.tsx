import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Camera } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";

export const Route = createFileRoute("/_authenticated/viagens/nova")({
  component: NovaViagem,
});

function NovaViagem() {
  const navigate = useNavigate();
  const { data: me } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<File | null>(null);

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos-disponiveis"],
    queryFn: async () => {
      const { data } = await supabase
        .from("veiculos")
        .select("*")
        .neq("status", "em_manutencao")
        .order("modelo");
      return data ?? [];
    },
  });

  const { data: secretarias } = useQuery({
    queryKey: ["secretarias"],
    queryFn: async () => (await supabase.from("secretarias").select("*").order("nome")).data ?? [],
  });

  const [form, setForm] = useState({
    veiculo_id: "",
    secretaria_id: "",
    servidor_nome: "",
    servidor_matricula: "",
    origem: "",
    destino: "",
    objetivo: "",
    km_saida: "",
  });

  const selectedVeiculo = veiculos?.find((v) => v.id === form.veiculo_id);

  const mut = useMutation({
    mutationFn: async () => {
      if (!me?.user) throw new Error("Usuário não identificado");
      let foto_url: string | null = null;
      if (foto) {
        const path = `hodometro/${me.user.id}/${Date.now()}-${foto.name}`;
        const up = await supabase.storage.from("frota").upload(path, foto);
        if (up.error) throw up.error;
        foto_url = up.data.path;
      }
      const { data, error } = await supabase
        .from("viagens")
        .insert({
          veiculo_id: form.veiculo_id,
          motorista_id: me.user.id,
          secretaria_id: form.secretaria_id || null,
          servidor_nome: form.servidor_nome || null,
          servidor_matricula: form.servidor_matricula || null,
          origem: form.origem,
          destino: form.destino,
          objetivo: form.objetivo || null,
          km_saida: Number(form.km_saida),
          hora_saida: new Date().toISOString(),
          foto_hodometro_saida_url: foto_url,
          status: "em_andamento",
        })
        .select("id")
        .single();
      if (error) throw error;
      // mark vehicle as in use
      await supabase.from("veiculos").update({ status: "em_uso", km_atual: Number(form.km_saida) }).eq("id", form.veiculo_id);
      return data;
    },
    onSuccess: (data) => {
      toast.success("Viagem iniciada");
      navigate({ to: "/viagens/$id", params: { id: data!.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/viagens"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova Viagem · Saída</h1>
          <p className="text-sm text-muted-foreground">Registre o início da viagem</p>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Secretaria</Label>
            <Select value={form.secretaria_id} onValueChange={(v) => setForm({ ...form, secretaria_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {(secretarias ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Servidor solicitante</Label>
            <Input value={form.servidor_nome} onChange={(e) => setForm({ ...form, servidor_nome: e.target.value })} placeholder="Nome do servidor" />
          </div>
          <div className="space-y-1">
            <Label>Matrícula</Label>
            <Input value={form.servidor_matricula} onChange={(e) => setForm({ ...form, servidor_matricula: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Motorista</Label>
            <Input disabled value={me?.profile?.nome ?? me?.user?.email ?? ""} />
          </div>
          <div className="col-span-1 sm:col-span-2 space-y-1">
            <Label>Veículo *</Label>
            <Select value={form.veiculo_id} onValueChange={(v) => {
              const sel = veiculos?.find((x) => x.id === v);
              setForm({ ...form, veiculo_id: v, km_saida: sel ? String(sel.km_atual ?? 0) : "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione um veículo" /></SelectTrigger>
              <SelectContent>
                {(veiculos ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.modelo} - {v.placa}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedVeiculo && (
              <p className="text-xs text-muted-foreground mt-1">
                Km atual cadastrado: {selectedVeiculo.km_atual?.toLocaleString("pt-BR")} km
              </p>
            )}
          </div>
          <div className="col-span-1 sm:col-span-2 space-y-1">
            <Label>Origem *</Label>
            <Input value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} placeholder="Unidade Básica de Saúde Central" />
          </div>
          <div className="col-span-1 sm:col-span-2 space-y-1">
            <Label>Destino *</Label>
            <Input value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} placeholder="Hospital Regional" />
          </div>
          <div className="col-span-1 sm:col-span-2 space-y-1">
            <Label>Objetivo da viagem</Label>
            <Textarea rows={2} value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} placeholder="Transporte de paciente para consulta" />
          </div>
          <div className="space-y-1">
            <Label>Km saída *</Label>
            <Input type="number" value={form.km_saida} onChange={(e) => setForm({ ...form, km_saida: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Foto do hodômetro</Label>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
            <Button type="button" variant="outline" className="w-full justify-start" onClick={() => fileRef.current?.click()}>
              <Camera className="mr-2 h-4 w-4" />
              {foto ? foto.name.slice(0, 24) : "Tirar/anexar foto"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" asChild><Link to="/viagens">Cancelar</Link></Button>
        <Button
          className="bg-brand-green hover:bg-brand-green/90 text-white"
          disabled={!form.veiculo_id || !form.origem || !form.destino || !form.km_saida || mut.isPending}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? "Iniciando..." : "INICIAR VIAGEM"}
        </Button>
      </div>
    </div>
  );
}