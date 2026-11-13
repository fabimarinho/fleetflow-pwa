import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
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
import { ArrowLeft, Camera, ImageIcon, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { Checklist, type ChecklistState } from "@/components/frota/Checklist";
import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/frota/SignaturePad";

export const Route = createFileRoute("/_authenticated/viagens/nova")({
  component: NovaViagem,
});

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  km_atual: number;
  status: string;
}

interface Secretaria {
  id: string;
  nome: string;
}

interface VeiculosResponse {
  success: boolean;
  data: {
    rows: Veiculo[];
  };
}

interface SecretariasResponse {
  success: boolean;
  data: Secretaria[];
}

interface ViagemResponse {
  success: boolean;
  data: {
    id: string;
  };
}

interface ArquivoResponse {
  success: boolean;
  data: {
    path: string;
    filename: string;
    mimetype: string;
    size: number;
  };
}

const etapas = [
  "Identificação",
  "Percurso",
  "Hodômetro",
  "Conferência",
];

async function enviarArquivo(
  arquivo: File | Blob,
  nomeArquivo: string
): Promise<string> {
  const formData = new FormData();

  formData.append("arquivo", arquivo, nomeArquivo);

  const response = await apiRequest<ArquivoResponse>("/arquivos", {
    method: "POST",
    body: formData,
  });

  if (!response.success || !response.data?.path) {
    throw new Error("Não foi possível armazenar o arquivo enviado.");
  }

  return response.data.path;
}

function NovaViagem() {
  const navigate = useNavigate();
  const { data: me } = useProfile();

  const fileRef = useRef<HTMLInputElement>(null);
  const signRef = useRef<SignaturePadHandle>(null);

  const [etapa, setEtapa] = useState(1);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistState>({});

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

  useEffect(() => {
    if (!foto) {
      setFotoPreview(null);
      return;
    }

    const url = URL.createObjectURL(foto);
    setFotoPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos-disponiveis-api"],
    queryFn: async () => {
      const response = await apiRequest<VeiculosResponse>(
        "/veiculos?page=0&pageSize=100"
      );

      return (response.data?.rows ?? [])
        .filter((veiculo) => veiculo.status === "disponivel")
        .sort((a, b) => a.modelo.localeCompare(b.modelo));
    },
  });

  const { data: secretarias } = useQuery({
    queryKey: ["secretarias-api"],
    queryFn: async () => {
      const response = await apiRequest<SecretariasResponse>("/secretarias");
      return response.data ?? [];
    },
  });

  const selectedVeiculo = veiculos?.find(
    (veiculo) => veiculo.id === form.veiculo_id
  );

  const mut = useMutation({
    mutationFn: async () => {
      if (!me?.user) {
        throw new Error("Usuário não identificado.");
      }

      let foto_url: string | null = null;

      if (foto) {
        foto_url = await enviarArquivo(foto, foto.name);
      }

      let assinatura_url: string | null = null;

      if (signRef.current && !signRef.current.isEmpty()) {
        const blob = await signRef.current.toBlob();

        if (blob) {
          assinatura_url = await enviarArquivo(
            blob,
            "assinatura-saida.png"
          );
        }
      }

      const response = await apiRequest<ViagemResponse>("/viagens", {
        method: "POST",
        body: JSON.stringify({
          veiculo_id: form.veiculo_id,
          secretaria_id: form.secretaria_id || null,
          servidor_nome: form.servidor_nome || null,
          servidor_matricula: form.servidor_matricula || null,
          origem: form.origem,
          destino: form.destino,
          objetivo: form.objetivo || null,
          km_saida: Number(form.km_saida),
          foto_hodometro_saida_url: foto_url,
          checklist_saida: checklist,
          assinatura_url,
        }),
      });

      return response.data;
    },

    onSuccess: (data) => {
      toast.success("Viagem iniciada");

      navigate({
        to: "/viagens/$id",
        params: { id: data.id },
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  function atualizarCampo(campo: string, valor: string) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function validarEtapaAtual() {
    if (etapa === 2) {
      if (!form.veiculo_id) {
        toast.error("Selecione um veículo.");
        return false;
      }

      if (!form.origem.trim()) {
        toast.error("Informe a origem da viagem.");
        return false;
      }

      if (!form.destino.trim()) {
        toast.error("Informe o destino da viagem.");
        return false;
      }
    }

    if (etapa === 3) {
      if (
        !form.km_saida.trim() ||
        !Number.isFinite(Number(form.km_saida))
      ) {
        toast.error("Informe uma quilometragem válida.");
        return false;
      }
    }

    return true;
  }

  function avancarEtapa() {
    if (!validarEtapaAtual()) return;

    setEtapa((atual) => Math.min(atual + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function voltarEtapa() {
    setEtapa((atual) => Math.max(atual - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removerFoto() {
    setFoto(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  const podeIniciar =
    !!form.veiculo_id &&
    !!form.origem.trim() &&
    !!form.destino.trim() &&
    !!form.km_saida.trim() &&
    Number.isFinite(Number(form.km_saida)) &&
    !mut.isPending;

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link to="/viagens">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Nova Viagem · Saída
          </h1>
          <p className="text-sm text-muted-foreground">
            Registre o início da viagem
          </p>
        </div>
      </div>

      {/* Progresso das etapas: somente celular */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            Etapa {etapa} de 4
          </p>
          <p className="text-sm text-muted-foreground">
            {etapas[etapa - 1]}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {etapas.map((nome, index) => (
            <div key={nome} className="space-y-1">
              <div
                className={`h-2 rounded-full ${
                  index + 1 <= etapa
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
              <p
                className={`text-[10px] text-center leading-tight ${
                  index + 1 === etapa
                    ? "font-semibold text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {nome}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Card className="p-4 sm:p-5 space-y-5">
        {/* ETAPA 1 — IDENTIFICAÇÃO */}
        <section
          className={`space-y-4 ${
            etapa === 1 ? "block" : "hidden md:block"
          }`}
        >
          <div>
            <h2 className="text-lg font-semibold">Identificação</h2>
            <p className="text-sm text-muted-foreground">
              Informe os dados do solicitante.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-2">
              <Label>Secretaria</Label>

              <Select
                value={form.secretaria_id}
                onValueChange={(value) =>
                  atualizarCampo("secretaria_id", value)
                }
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>

                <SelectContent>
                  {(secretarias ?? []).map((secretaria) => (
                    <SelectItem key={secretaria.id} value={secretaria.id}>
                      {secretaria.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Servidor solicitante</Label>

              <Input
                className="h-12 text-base"
                value={form.servidor_nome}
                onChange={(event) =>
                  atualizarCampo("servidor_nome", event.target.value)
                }
                placeholder="Nome do servidor"
              />
            </div>

            <div className="space-y-2">
              <Label>Matrícula</Label>

              <Input
                className="h-12 text-base"
                value={form.servidor_matricula}
                onChange={(event) =>
                  atualizarCampo("servidor_matricula", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Motorista</Label>

              <Input
                className="h-12 text-base"
                disabled
                value={me?.profile?.nome ?? me?.user?.email ?? ""}
              />
            </div>
          </div>
        </section>

        {/* ETAPA 2 — VEÍCULO E PERCURSO */}
        <section
          className={`space-y-4 ${
            etapa === 2 ? "block" : "hidden md:block"
          }`}
        >
          <div>
            <h2 className="text-lg font-semibold">Veículo e percurso</h2>
            <p className="text-sm text-muted-foreground">
              Selecione o veículo e informe o trajeto.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Veículo *</Label>

              <Select
                value={form.veiculo_id}
                onValueChange={(value) => {
                  const selecionado = veiculos?.find(
                    (veiculo) => veiculo.id === value
                  );

                  setForm((atual) => ({
                    ...atual,
                    veiculo_id: value,
                    km_saida: selecionado
                      ? String(selecionado.km_atual ?? 0)
                      : "",
                  }));
                }}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecione um veículo" />
                </SelectTrigger>

                <SelectContent>
                  {(veiculos ?? []).map((veiculo) => (
                    <SelectItem key={veiculo.id} value={veiculo.id}>
                      {veiculo.modelo} - {veiculo.placa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedVeiculo && (
                <p className="text-sm text-muted-foreground mt-1">
                  Km atual cadastrado:{" "}
                  {selectedVeiculo.km_atual?.toLocaleString("pt-BR")} km
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Origem *</Label>

              <Input
                className="h-12 text-base"
                value={form.origem}
                onChange={(event) =>
                  atualizarCampo("origem", event.target.value)
                }
                placeholder="Unidade Básica de Saúde Central"
              />
            </div>

            <div className="space-y-2">
              <Label>Destino *</Label>

              <Input
                className="h-12 text-base"
                value={form.destino}
                onChange={(event) =>
                  atualizarCampo("destino", event.target.value)
                }
                placeholder="Hospital Regional"
              />
            </div>

            <div className="space-y-2">
              <Label>Objetivo da viagem</Label>

              <Textarea
                className="text-base min-h-24"
                rows={3}
                value={form.objetivo}
                onChange={(event) =>
                  atualizarCampo("objetivo", event.target.value)
                }
                placeholder="Transporte de paciente para consulta"
              />
            </div>
          </div>
        </section>

        {/* ETAPA 3 — HODÔMETRO E FOTOGRAFIA */}
        <section
          className={`space-y-4 ${
            etapa === 3 ? "block" : "hidden md:block"
          }`}
        >
          <div>
            <h2 className="text-lg font-semibold">Hodômetro</h2>
            <p className="text-sm text-muted-foreground">
              Confira a quilometragem e registre uma foto do painel.
            </p>
          </div>

          <div className="rounded-lg border p-3 sm:p-4 space-y-3">
            {selectedVeiculo && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Veículo selecionado
                </p>
                <p className="font-semibold">
                  {selectedVeiculo.modelo} · {selectedVeiculo.placa}
                </p>
                <p className="text-sm text-muted-foreground">
                  Quilometragem cadastrada:{" "}
                  {selectedVeiculo.km_atual?.toLocaleString("pt-BR")} km
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Km de saída *</Label>

              <Input
                className="h-14 text-xl font-semibold"
                type="number"
                inputMode="numeric"
                value={form.km_saida}
                onChange={(event) =>
                  atualizarCampo("km_saida", event.target.value)
                }
                placeholder="Digite a quilometragem"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Foto do hodômetro</Label>

            <p className="text-xs text-muted-foreground">
              Fotografe o painel do veículo de forma que a quilometragem
              fique nítida e legível.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(event) =>
                setFoto(event.target.files?.[0] ?? null)
              }
            />

            <Button
              type="button"
              variant="outline"
              className="w-full h-14 justify-center text-base"
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="mr-2 h-5 w-5" />
              {foto ? "Trocar fotografia" : "Tirar / anexar foto"}
            </Button>

            {fotoPreview && (
              <div className="mt-3 rounded-lg border p-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">
                      {foto.name}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 shrink-0 text-destructive"
                    onClick={removerFoto}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                </div>

                <img
                  src={fotoPreview}
                  alt="Prévia da foto do hodômetro"
                  className="w-full max-h-72 rounded-md object-contain bg-muted"
                />
              </div>
            )}
          </div>
        </section>

        {/* ETAPA 4 — CHECKLIST E ASSINATURA */}
        <section
          className={`space-y-5 ${
            etapa === 4 ? "block" : "hidden md:block"
          }`}
        >
          <div>
            <h2 className="text-lg font-semibold">Conferência de saída</h2>
            <p className="text-sm text-muted-foreground">
              Confira os itens do veículo e registre a assinatura.
            </p>
          </div>

          <Checklist
            value={checklist}
            onChange={setChecklist}
            title="Check-list de saída"
          />

          <div className="pt-4 border-t">
            <SignaturePad
              ref={signRef}
              label="Assinatura do motorista (saída)"
            />
          </div>
        </section>
      </Card>

      {/* Navegação por etapas: somente celular */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Button
          type="button"
          variant="outline"
          className="w-full h-12"
          disabled={etapa === 1 || mut.isPending}
          onClick={voltarEtapa}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {etapa < 4 ? (
          <Button
            type="button"
            className="w-full h-12"
            onClick={avancarEtapa}
            disabled={mut.isPending}
          >
            Continuar
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full h-12 bg-brand-green hover:bg-brand-green/90 text-white"
            disabled={!podeIniciar}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? "Iniciando..." : "INICIAR VIAGEM"}
          </Button>
        )}
      </div>

      {/* Ações originais: computador */}
      <div className="hidden md:flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Button
          variant="outline"
          asChild
          className="w-full sm:w-auto h-11"
        >
          <Link to="/viagens">Cancelar</Link>
        </Button>

        <Button
          className="w-full sm:w-auto min-h-12 px-6 bg-brand-green hover:bg-brand-green/90 text-white text-base"
          disabled={!podeIniciar}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? "Iniciando..." : "INICIAR VIAGEM"}
        </Button>
      </div>
    </div>
  );
}
