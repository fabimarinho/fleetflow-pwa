
import { createFileRoute } from "@tanstack/react-router";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Wrench,
  Plus,
  Search,
  Trash2,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDebounced } from "@/hooks/useDebounced";
import { Pagination } from "@/components/Pagination";

export const Route = createFileRoute("/_authenticated/manutencoes")({
  component: ManutencoesPage,
});

type Status =
  | "aberta"
  | "em_andamento"
  | "concluida"
  | "cancelada";

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  km_atual?: number;
}

interface Manutencao {
  id: string;
  veiculo_id: string;
  tipo: string;
  status: Status;
  descricao: string;
  oficina?: string | null;
  km?: number | null;
  custo?: number | null;
  data_abertura: string;
  data_conclusao?: string | null;
  observacoes?: string | null;
  veiculos?: {
    id: string;
    placa: string;
    modelo: string;
    km_atual?: number;
  } | null;
}

interface ListaManutencoes {
  rows: Manutencao[];
  total: number;
  page: number;
  pageSize: number;
}

function ManutencoesPage() {
  const { data: me } = useProfile();

  const podeEditar = !!me?.isAdmin;
  const podeExcluir = me?.role === "administrador";

  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<Manutencao | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] =
    useState<string>("todos");
  const [page, setPage] = useState(0);

  const pageSize = 20;
  const buscaDeb = useDebounced(busca, 300);

  const [excluir, setExcluir] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const [form, setForm] = useState({
    veiculo_id: "",
    tipo: "preventiva" as "preventiva" | "corretiva",
    descricao: "",
    oficina: "",
    km: "",
    custo: "",
    observacoes: "",
  });

  // Lista de manutenções pela API PostgreSQL.
  const { data: resultado, isLoading } =
    useQuery<ListaManutencoes>({
      queryKey: [
        "manutencoes",
        {
          q: buscaDeb,
          status: filtroStatus,
          page,
          pageSize,
        },
      ],

      queryFn: async () => {
        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("pageSize", String(pageSize));

        if (buscaDeb.trim()) {
          params.set("q", buscaDeb.trim());
        }

        if (filtroStatus !== "todos") {
          params.set("status", filtroStatus);
        }

        const response = await apiRequest<any>(
          `/manutencoes?${params.toString()}`
        );

        return response.data;
      },
    });

  // Lista de veículos pela mesma API utilizada no cadastro.
  const { data: veiculos = [], isLoading: carregandoVeiculos } =
    useQuery<Veiculo[]>({
      queryKey: ["veiculos-all"],

      queryFn: async () => {
        const response = await apiRequest<any>(
          "/veiculos?page=0&pageSize=100"
        );

        return response.data?.rows ?? [];
      },
    });

  // Cadastro de manutenção.
  const createMut = useMutation({
    mutationFn: async () => {
      await apiRequest("/manutencoes", {
        method: "POST",

        body: JSON.stringify({
          veiculo_id: form.veiculo_id,
          tipo: form.tipo,
          descricao: form.descricao.trim(),
          oficina: form.oficina.trim() || null,
          km: form.km ? Number(form.km) : null,
          custo: form.custo ? Number(form.custo) : null,
          observacoes: form.observacoes.trim() || null,
        }),
      });
    },

    onSuccess: () => {
      toast.success("Manutenção registrada com sucesso.");

      qc.invalidateQueries({
        queryKey: ["manutencoes"],
      });

      qc.invalidateQueries({
        queryKey: ["veiculos"],
      });

      qc.invalidateQueries({
        queryKey: ["veiculos-all"],
      });

      setOpen(false);

      setForm({
        veiculo_id: "",
        tipo: "preventiva",
        descricao: "",
        oficina: "",
        km: "",
        custo: "",
        observacoes: "",
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Exclusão de manutenção.
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/manutencoes/${id}`, {
        method: "DELETE",
      });
    },

    onSuccess: () => {
      toast.success("Manutenção excluída.");

      qc.invalidateQueries({
        queryKey: ["manutencoes"],
      });

      qc.invalidateQueries({
        queryKey: ["veiculos"],
      });

      setExcluir(null);
    },

    onError: (error: Error) => {
      toast.error(error.message);
      setExcluir(null);
    },
  });

  // Alteração de status.
  const statusMut = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Status;
    }) => {
      await apiRequest(`/manutencoes/${id}/status`, {
        method: "PATCH",

        body: JSON.stringify({
          status,
        }),
      });
    },

    onSuccess: () => {
      toast.success("Status atualizado.");

      qc.invalidateQueries({
        queryKey: ["manutencoes"],
      });

      qc.invalidateQueries({
        queryKey: ["veiculos"],
      });

      qc.invalidateQueries({
        queryKey: ["veiculos-all"],
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filtradas = resultado?.rows ?? [];
  const total = resultado?.total ?? 0;

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            Manutenções
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Ordens de serviço preventivas e corretivas
          </p>
        </div>

        {podeEditar && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nova manutenção
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Abrir manutenção
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Veículo *</Label>

                  <Select
                    value={form.veiculo_id}
                    onValueChange={(v) => {
                      const selecionado = veiculos.find(
                        (x) => x.id === v
                      );

                      setForm({
                        ...form,
                        veiculo_id: v,
                        km: selecionado
                          ? String(selecionado.km_atual ?? 0)
                          : "",
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          carregandoVeiculos
                            ? "Carregando veículos..."
                            : "Selecione um veículo..."
                        }
                      />
                    </SelectTrigger>

                    <SelectContent>
                      {veiculos.map((v) => (
                        <SelectItem
                          key={v.id}
                          value={v.id}
                        >
                          {v.modelo} · {v.placa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!carregandoVeiculos &&
                    veiculos.length === 0 && (
                      <p className="text-xs text-destructive">
                        Nenhum veículo cadastrado foi encontrado.
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <Label>Tipo *</Label>

                  <Select
                    value={form.tipo}
                    onValueChange={(v: "preventiva" | "corretiva") =>
                      setForm({
                        ...form,
                        tipo: v,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="preventiva">
                        Preventiva
                      </SelectItem>

                      <SelectItem value="corretiva">
                        Corretiva
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Km</Label>

                  <Input
                    type="number"
                    inputMode="numeric"
                    value={form.km}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        km: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Descrição *</Label>

                  <Textarea
                    rows={3}
                    value={form.descricao}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        descricao: e.target.value,
                      })
                    }
                    placeholder="Troca de óleo e filtros"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Oficina</Label>

                  <Input
                    value={form.oficina}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        oficina: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Custo (R$)</Label>

                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={form.custo}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        custo: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Observações</Label>

                  <Textarea
                    rows={3}
                    value={form.observacoes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        observacoes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={
                    !form.veiculo_id ||
                    !form.descricao.trim() ||
                    createMut.isPending
                  }
                  onClick={() => createMut.mutate()}
                >
                  {createMut.isPending
                    ? "Salvando..."
                    : "Abrir"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pesquisa e filtros */}
      <Card className="flex flex-col items-stretch gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full min-w-0 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />

          <Input
            placeholder="Buscar por veículo, descrição ou oficina"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPage(0);
            }}
            className="w-full pl-8"
          />
        </div>

        <Select
          value={filtroStatus}
          onValueChange={(v) => {
            setFiltroStatus(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="todos">
              Todos os status
            </SelectItem>

            <SelectItem value="aberta">
              Aberta
            </SelectItem>

            <SelectItem value="em_andamento">
              Em andamento
            </SelectItem>

            <SelectItem value="concluida">
              Concluída
            </SelectItem>

            <SelectItem value="cancelada">
              Cancelada
            </SelectItem>
          </SelectContent>
        </Select>

        <span className="text-right text-xs text-muted-foreground sm:ml-auto">
          {total} resultado(s)
        </span>
      </Card>

      {/* Lista de manutenções */}
      <div className="grid min-w-0 gap-3">
        {isLoading && (
          <Card className="p-8 text-center text-muted-foreground">
            Carregando manutenções...
          </Card>
        )}

        {!isLoading &&
          filtradas.map((m) => (
            <Card
              key={m.id}
              className="min-w-0 p-3 sm:p-4"
            >
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-orange/10 text-brand-orange">
                    <Wrench className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-semibold">
                        {m.veiculos?.modelo} · {m.veiculos?.placa}
                      </p>

                      <Badge
                        variant="outline"
                        className="capitalize"
                      >
                        {m.tipo}
                      </Badge>

                      <StatusBadge status={m.status} />
                    </div>

                    <p className="mt-2 break-words text-sm">
                      {m.descricao}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Aberta{" "}
                        {format(
                          new Date(m.data_abertura),
                          "dd/MM/yy",
                          { locale: ptBR }
                        )}
                      </span>

                      {m.oficina && (
                        <span>{m.oficina}</span>
                      )}

                      {m.km != null && (
                        <span>
                          {m.km.toLocaleString("pt-BR")} km
                        </span>
                      )}

                      {m.custo != null && (
                        <span>
                          R$ {Number(m.custo).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 sm:flex-none"
                    onClick={() => setDetalhe(m)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalhes
                  </Button>

                  {podeEditar &&
                    m.status !== "concluida" &&
                    m.status !== "cancelada" && (
                      <Select
                        value={m.status}
                        onValueChange={(v: Status) =>
                          statusMut.mutate({
                            id: m.id,
                            status: v,
                          })
                        }
                      >
                        <SelectTrigger className="h-10 w-full sm:w-[160px]">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="aberta">
                            Aberta
                          </SelectItem>

                          <SelectItem value="em_andamento">
                            Em andamento
                          </SelectItem>

                          <SelectItem value="concluida">
                            Concluída
                          </SelectItem>

                          <SelectItem value="cancelada">
                            Cancelada
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                  {podeExcluir && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                      onClick={() =>
                        setExcluir({
                          id: m.id,
                          label: `${m.veiculos?.placa} · ${m.descricao?.slice(0, 40)}`,
                        })
                      }
                      aria-label="Excluir manutenção"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

        {!isLoading && filtradas.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            {total === 0 && !buscaDeb && filtroStatus === "todos"
              ? "Nenhuma manutenção registrada."
              : "Nenhum resultado para esses filtros."}
          </Card>
        )}
      </div>

      {/* Janela de detalhes da manutenção */}
      <Dialog
        open={!!detalhe}
        onOpenChange={(aberto) => {
          if (!aberto) setDetalhe(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes da manutenção
            </DialogTitle>
          </DialogHeader>

          {detalhe && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Veículo
                </p>

                <p className="mt-1 font-semibold">
                  {detalhe.veiculos?.modelo ?? "Veículo não informado"}
                </p>

                <p className="text-sm text-muted-foreground">
                  Placa: {detalhe.veiculos?.placa ?? "Não informada"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Tipo de manutenção
                  </p>
                  <p className="mt-1 font-medium capitalize">
                    {detalhe.tipo}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Situação
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={detalhe.status} />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Data de abertura
                  </p>
                  <p className="mt-1 font-medium">
                    {detalhe.data_abertura
                      ? format(
                          new Date(detalhe.data_abertura),
                          "dd/MM/yyyy",
                          { locale: ptBR }
                        )
                      : "Não informada"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Data de conclusão
                  </p>
                  <p className="mt-1 font-medium">
                    {detalhe.data_conclusao
                      ? format(
                          new Date(detalhe.data_conclusao),
                          "dd/MM/yyyy",
                          { locale: ptBR }
                        )
                      : "Não concluída ou não informada"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Quilometragem
                  </p>
                  <p className="mt-1 font-medium">
                    {detalhe.km != null
                      ? `${Number(detalhe.km).toLocaleString("pt-BR")} km`
                      : "Não informada"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Custo
                  </p>
                  <p className="mt-1 font-medium">
                    {detalhe.custo != null
                      ? Number(detalhe.custo).toLocaleString(
                          "pt-BR",
                          {
                            style: "currency",
                            currency: "BRL",
                          }
                        )
                      : "Não informado"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Descrição do serviço
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                  {detalhe.descricao || "Não informada"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Oficina
                </p>
                <p className="mt-1 text-sm">
                  {detalhe.oficina || "Não informada"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Observações
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                  {detalhe.observacoes || "Nenhuma observação registrada."}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetalhe(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPage={setPage}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
      >
        <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir manutenção?
            </AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro{" "}
              <strong>{excluir?.label}</strong> será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
              disabled={deleteMut.isPending}
              onClick={() =>
                excluir && deleteMut.mutate(excluir.id)
              }
            >
              {deleteMut.isPending
                ? "Excluindo..."
                : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "concluida") {
    return (
      <Badge className="bg-brand-green/15 text-brand-green hover:bg-brand-green/20">
        Concluída
      </Badge>
    );
  }

  if (status === "em_andamento") {
    return (
      <Badge className="bg-brand-orange/15 text-brand-orange hover:bg-brand-orange/20">
        Em andamento
      </Badge>
    );
  }

  if (status === "cancelada") {
    return (
      <Badge variant="outline">
        Cancelada
      </Badge>
    );
  }

  return (
    <Badge className="bg-brand-blue/15 text-brand-blue hover:bg-brand-blue/20">
      Aberta
    </Badge>
  );
}
