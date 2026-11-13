import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, apiDownload } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Camera,
  MapPin,
  Gauge,
  Clock,
  User,
  RefreshCw,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Checklist,
  ChecklistSummary,
  type ChecklistState,
} from "@/components/frota/Checklist";
import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/frota/SignaturePad";

export const Route = createFileRoute("/_authenticated/viagens/$id")({
  component: ViagemDetail,
});

interface ViagemResponse {
  success: boolean;
  message: string;
  data: any;
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

function ImagemProtegida({
  titulo,
  caminho,
}: {
  titulo: string;
  caminho: string | null | undefined;
}) {
  const [imagem, setImagem] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    let urlTemporaria: string | null = null;

    async function carregarImagem() {
      setImagem(null);
      setErro(false);
      setCarregando(true);

      if (!caminho) {
        setCarregando(false);
        return;
      }

      const filename = caminho.split("/").pop();

      const nomeValido =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

      if (!filename || !nomeValido.test(filename)) {
        setErro(true);
        setCarregando(false);
        return;
      }

      try {
        const arquivo = await apiDownload(
          `/arquivos/${encodeURIComponent(filename)}`
        );

        if (cancelado) return;

        urlTemporaria = URL.createObjectURL(arquivo);
        setImagem(urlTemporaria);
      } catch {
        if (!cancelado) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    carregarImagem();

    return () => {
      cancelado = true;

      if (urlTemporaria) {
        URL.revokeObjectURL(urlTemporaria);
      }
    };
  }, [caminho]);

  if (!caminho) return null;

  return (
    <div className="space-y-2 min-w-0">
      <p className="text-sm font-medium flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        {titulo}
      </p>

      <div className="rounded-lg border bg-muted/20 min-h-32 flex items-center justify-center overflow-hidden p-2">
        {carregando && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Carregando imagem...
          </div>
        )}

        {!carregando && erro && (
          <p className="text-sm text-muted-foreground text-center">
            Não foi possível carregar este arquivo.
          </p>
        )}

        {!carregando && imagem && (
          <a
            href={imagem}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full"
            title="Abrir imagem em tamanho maior"
          >
            <img
              src={imagem}
              alt={titulo}
              className="max-h-80 w-full object-contain rounded"
            />
          </a>
        )}
      </div>
    </div>
  );
}

function ViagemDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const fileRef = useRef<HTMLInputElement>(null);
  const signRef = useRef<SignaturePadHandle>(null);

  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistState>({});

  const [form, setForm] = useState({
    km_retorno: "",
    combustivel: "",
    ocorrencias: "",
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

  function removerFoto() {
    setFoto(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  const {
    data: v,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["viagem", id],
    queryFn: async () => {
      const response = await apiRequest<ViagemResponse>(
        `/viagens/${encodeURIComponent(id)}`
      );

      return response.data;
    },
  });

  const finalizar = useMutation({
    mutationFn: async () => {
      if (!v) {
        throw new Error("Viagem não encontrada.");
      }

      const kmRet = Number(form.km_retorno);

      if (
        !Number.isInteger(kmRet) ||
        kmRet < v.km_saida
      ) {
        throw new Error(
          "Km de retorno deve ser um número inteiro maior ou igual ao km de saída."
        );
      }

      let foto_url: string | null = null;

      if (foto) {
        foto_url = await enviarArquivo(foto, foto.name);
      }

      let assinatura_retorno_url: string | null = null;

      if (signRef.current && !signRef.current.isEmpty()) {
        const blob = await signRef.current.toBlob();

        if (blob) {
          assinatura_retorno_url = await enviarArquivo(
            blob,
            "assinatura-retorno.png"
          );
        }
      }

      const response = await apiRequest<ViagemResponse>(
        `/viagens/${encodeURIComponent(id)}/finalizar`,
        {
          method: "PATCH",
          body: JSON.stringify({
            km_retorno: kmRet,
            combustivel: form.combustivel || null,
            ocorrencias: form.ocorrencias || null,
            foto_hodometro_retorno_url: foto_url,
            checklist_retorno: checklist,
            assinatura_retorno_url,
          }),
        }
      );

      return response.data;
    },

    onSuccess: () => {
      toast.success("Viagem finalizada com sucesso!");

      qc.invalidateQueries({
        queryKey: ["viagem", id],
      });

      qc.invalidateQueries({
        queryKey: ["viagens-list"],
      });

      qc.invalidateQueries({
        queryKey: ["dashboard-stats"],
      });

      qc.invalidateQueries({
        queryKey: ["veiculo-viagens"],
      });

      navigate({ to: "/viagens" });
    },

    onError: (e: Error) => {
      toast.error(e.message || "Não foi possível finalizar a viagem.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">
          Carregando dados da viagem...
        </p>
      </div>
    );
  }

  if (isError || !v) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <Button asChild variant="ghost">
          <Link to="/viagens">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para viagens
          </Link>
        </Button>

        <Card className="p-5 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">
            Não foi possível carregar a viagem
          </h2>

          <p className="text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Registro não encontrado ou erro de comunicação com o servidor."}
          </p>

          <Button onClick={() => refetch()} variant="outline" className="min-h-11">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  const km =
    v.km_retorno != null
      ? v.km_retorno - v.km_saida
      : null;

  const minutos = v.hora_chegada
    ? differenceInMinutes(
        new Date(v.hora_chegada),
        new Date(v.hora_saida)
      )
    : null;

  const isAndamento = v.status === "em_andamento";

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link to="/viagens">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-mono">
            Viagem #{String(v.numero).padStart(6, "0")}
          </p>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            {isAndamento ? "Retorno" : "Detalhes"}
          </h1>
        </div>

        <Badge
          className={
            v.status === "finalizada"
              ? "bg-brand-green/15 text-brand-green hover:bg-brand-green/20"
              : "bg-brand-orange/15 text-brand-orange hover:bg-brand-orange/20"
          }
        >
          {v.status === "finalizada"
            ? "Finalizada"
            : v.status === "cancelada"
              ? "Cancelada"
              : "Em andamento"}
        </Badge>
      </div>

      <Card className="p-4 sm:p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          <InfoRow
            icon={MapPin}
            label="Trajeto"
            value={`${v.origem} → ${v.destino}`}
          />

          <InfoRow
            icon={User}
            label="Motorista"
            value={v.profiles?.nome ?? "—"}
          />

          <InfoRow
            icon={Gauge}
            label="Veículo"
            value={`${v.veiculos?.modelo ?? "—"} · ${v.veiculos?.placa ?? "—"}`}
          />

          <InfoRow
            icon={Clock}
            label="Saída"
            value={format(
              new Date(v.hora_saida),
              "dd/MM/yyyy HH:mm",
              { locale: ptBR }
            )}
          />

          {v.hora_chegada && (
            <InfoRow
              icon={Clock}
              label="Chegada"
              value={format(
                new Date(v.hora_chegada),
                "dd/MM/yyyy HH:mm",
                { locale: ptBR }
              )}
            />
          )}

          <InfoRow
            icon={Gauge}
            label="Km saída"
            value={`${v.km_saida.toLocaleString("pt-BR")} km`}
          />

          {v.km_retorno != null && (
            <InfoRow
              icon={Gauge}
              label="Km retorno"
              value={`${v.km_retorno.toLocaleString("pt-BR")} km`}
            />
          )}

          {km != null && (
            <InfoRow
              icon={Gauge}
              label="Km rodado"
              value={`${km} km`}
              highlight
            />
          )}

          {minutos != null && (
            <InfoRow
              icon={Clock}
              label="Tempo"
              value={`${Math.floor(minutos / 60)}h ${minutos % 60}min`}
              highlight
            />
          )}

          {v.secretarias?.nome && (
            <InfoRow
              icon={User}
              label="Secretaria"
              value={v.secretarias.nome}
            />
          )}

          {v.objetivo && (
            <InfoRow
              icon={MapPin}
              label="Objetivo"
              value={v.objetivo}
            />
          )}

          {v.ocorrencias && (
            <InfoRow
              icon={MapPin}
              label="Ocorrências"
              value={v.ocorrencias}
            />
          )}

          {v.combustivel && (
            <InfoRow
              icon={Gauge}
              label="Combustível no retorno"
              value={v.combustivel}
            />
          )}
        </div>

        {(v.checklist_saida || v.checklist_retorno) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            {v.checklist_saida && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Saída
                </p>

                <ChecklistSummary
                  value={v.checklist_saida as ChecklistState}
                />
              </div>
            )}

            {v.checklist_retorno && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Retorno
                </p>

                <ChecklistSummary
                  value={v.checklist_retorno as ChecklistState}
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {(v.foto_hodometro_saida_url ||
        v.assinatura_url ||
        v.foto_hodometro_retorno_url ||
        v.assinatura_retorno_url) && (
        <Card className="p-4 sm:p-5 space-y-5">
          <h2 className="font-semibold text-lg">
            Fotos e assinaturas da viagem
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ImagemProtegida
              titulo="Foto do hodômetro — saída"
              caminho={v.foto_hodometro_saida_url}
            />

            <ImagemProtegida
              titulo="Assinatura do motorista — saída"
              caminho={v.assinatura_url}
            />

            <ImagemProtegida
              titulo="Foto do hodômetro — retorno"
              caminho={v.foto_hodometro_retorno_url}
            />

            <ImagemProtegida
              titulo="Assinatura do motorista — retorno"
              caminho={v.assinatura_retorno_url}
            />
          </div>
        </Card>
      )}

      {isAndamento && (
        <Card className="p-4 sm:p-5 space-y-5">
          <div>
            <h2 className="font-semibold text-lg">
              Finalizar viagem
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Registre os dados de chegada do veículo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Km retorno *</Label>

              <Input
                className="h-11 text-base"
                type="number"
                inputMode="numeric"
                min={v.km_saida}
                step="1"
                value={form.km_retorno}
                onChange={(e) =>
                  setForm({
                    ...form,
                    km_retorno: e.target.value,
                  })
                }
                placeholder={String(v.km_saida)}
              />

              <p className="text-xs text-muted-foreground">
                Km de saída: {v.km_saida.toLocaleString("pt-BR")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Combustível</Label>

              <Select
                value={form.combustivel}
                onValueChange={(val) =>
                  setForm({
                    ...form,
                    combustivel: val,
                  })
                }
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="cheio">Cheio</SelectItem>
                  <SelectItem value="3/4">3/4</SelectItem>
                  <SelectItem value="1/2">1/2</SelectItem>
                  <SelectItem value="1/4">1/4</SelectItem>
                  <SelectItem value="reserva">Reserva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label>Ocorrências</Label>

              <Textarea
                className="text-base min-h-24"
                rows={3}
                value={form.ocorrencias}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ocorrencias: e.target.value,
                  })
                }
                placeholder="Registre aqui qualquer ocorrência durante a viagem."
              />
            </div>

            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label>Foto do hodômetro de retorno</Label>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(e) =>
                  setFoto(e.target.files?.[0] ?? null)
                }
              />

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 justify-center text-base"
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
                      className="h-9 shrink-0 text-destructive"
                      onClick={removerFoto}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>

                  <img
                    src={fotoPreview}
                    alt="Prévia da foto do hodômetro de retorno"
                    className="w-full max-h-64 rounded-md object-contain bg-muted"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t space-y-5">
            <Checklist
              value={checklist}
              onChange={setChecklist}
              title="Check-list de retorno"
            />

            <SignaturePad
              ref={signRef}
              label="Assinatura do motorista (retorno)"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto min-h-11"
            >
              <Link to="/viagens">Cancelar</Link>
            </Button>

            <Button
              className="w-full sm:w-auto min-h-12 px-6 bg-brand-green hover:bg-brand-green/90 text-white text-base"
              disabled={
                !form.km_retorno ||
                !Number.isInteger(Number(form.km_retorno)) ||
                Number(form.km_retorno) < v.km_saida ||
                finalizar.isPending
              }
              onClick={() => finalizar.mutate()}
            >
              {finalizar.isPending
                ? "Finalizando..."
                : "FINALIZAR VIAGEM"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />

      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>

        <p
          className={`break-words ${
            highlight
              ? "font-semibold text-foreground"
              : "text-foreground"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
