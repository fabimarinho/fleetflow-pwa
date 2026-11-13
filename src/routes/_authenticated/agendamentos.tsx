
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
  CalendarDays,
  Plus,
  Search,
  Trash2,
  Clock,
  Gauge,
  Wrench,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { format, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDebounced } from "@/hooks/useDebounced";
import { Pagination } from "@/components/Pagination";

export const Route = createFileRoute("/_authenticated/agendamentos")({
  component: AgendamentosPage,
});

type Status = "agendada" | "realizada" | "cancelada";

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  km_atual?: number;
}

interface Agendamento {
  id: string;
  veiculo_id: string;
  tipo: string;
  status: Status;
  descricao: string;
  oficina?: string | null;
  data_agendada: string;
  km_previsto?: number | null;
  observacoes?: string | null;
  veiculos?: {
    id: string;
    placa: string;
    modelo: string;
    km_atual?: number;
  } | null;
}

interface ListaAgendamentos {
  rows: Agendamento[];
  total: number;
  page: number;
  pageSize: number;
}

function AgendamentosPage() {
  const { data: me } = useProfile();

  const podeEditar =
    !!me?.isAdmin ||
    me?.role === "administrador" ||
    me?.role === "gestor";

  const podeExcluir = me?.role === "administrador";

  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<Agendamento | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
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
    data_agendada: "",
    km_previsto: "",
    observacoes: "",
  });

  const { data: resultado, isLoading } =
    useQuery<ListaAgendamentos>({
      queryKey: [
        "agendamentos",
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
          `/agendamentos-manutencao?${params.toString()}`
        );

        return response.data;
      },
    });

  const {
    data: veiculos = [],
    isLoading: carregandoVeiculos,
  } = useQuery<Veiculo[]>({
    queryKey: ["veiculos-all"],

    queryFn: async () => {
      const response = await apiRequest<any>(
        "/veiculos?page=0&pageSize=100"
      );

      return response.data?.rows ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      await apiRequest("/agendamentos-manutencao", {
        method: "POST",

        body: JSON.stringify({
          veiculo_id: form.veiculo_id,
          tipo: form.tipo,
          descricao: form.descricao.trim(),
          oficina: form.oficina.trim() || null,
          data_agendada: form.data_agendada,
          km_previsto: form.km_previsto
            ? Number(form.km_previsto)
            : null,
          observacoes: form.observacoes.trim() || null,
        }),
      });
    },

    onSuccess: () => {
      toast.success("Agendamento cadastrado com sucesso.");

      qc.invalidateQueries({
        queryKey: ["agendamentos"],
      });

      setOpen(false);

      setForm({
        veiculo_id: "",
        tipo: "preventiva",
        descricao: "",
        oficina: "",
        data_agendada: "",
        km_previsto: "",
        observacoes: "",
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const statusMut = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Status;
    }) => {
      await apiRequest(
        `/agendamentos-manutencao/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );
    },

    onSuccess: () => {
      toast.success("Status do agendamento atualizado.");

      qc.invalidateQueries({
        queryKey: ["agendamentos"],
      });

      qc.invalidateQueries({
        queryKey: ["agendamentos-veiculo"],
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/agendamentos-manutencao/${id}`, {
        method: "DELETE",
      });
    },

    onSuccess: () => {
      toast.success("Agendamento excluído.");

      qc.invalidateQueries({
        queryKey: ["agendamentos"],
      });

      qc.invalidateQueries({
        queryKey: ["agendamentos-veiculo"],
      });

      setExcluir(null);
    },

    onError: (error: Error) => {
      toast.error(error.message);
      setExcluir(null);
    },
  });

  const registros = resultado?.rows ?? [];
  const total = resultado?.total ?? 0;

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            Agendamentos
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Programação de manutenções preventivas e corretivas
          </p>
        </div>

        {podeEditar && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Novo agendamento
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Agendar manutenção
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
                        km_previsto: selecionado
                          ? String(selecionado.km_atual ?? "")
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
                        <SelectItem key={v.id} value={v.id}>
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
                  <Label>Quilometragem prevista</Label>

                  <Input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={form.km_previsto}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        km_previsto: e.target.value,
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
                    placeholder="Ex.: Troca de óleo e filtros"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Oficina prevista</Label>

                  <Input
                    value={form.oficina}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        oficina: e.target.value,
                      })
                    }
                    placeholder="Nome da oficina"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Data e horário *</Label>

                  <Input
                    type="datetime-local"
                    value={form.data_agendada}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        data_agendada: e.target.value,
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
                    placeholder="Informações adicionais..."
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
                    !form.data_agendada ||
                    createMut.isPending
                  }
                  onClick={() => createMut.mutate()}
                >
                  {createMut.isPending
                    ? "Salvando..."
                    : "Agendar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

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
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="todos">
              Todos os status
            </SelectItem>

            <SelectItem value="agendada">
              Agendada
            </SelectItem>

            <SelectItem value="realizada">
              Realizada
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

      <div className="grid min-w-0 gap-3">
        {isLoading && (
          <Card className="p-8 text-center text-muted-foreground">
            Carregando agendamentos...
          </Card>
        )}

        {!isLoading &&
          registros.map((a) => {
            const data = new Date(a.data_agendada);
            const atrasada =
              a.status === "agendada" &&
              isBefore(data, new Date());

            return (
              <Card
                key={a.id}
                className="min-w-0 p-3 sm:p-4"
              >
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-orange/10 text-brand-orange">
                      <CalendarDays className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words font-semibold">
                          {a.veiculos?.modelo ?? "Veículo"} ·{" "}
                          {a.veiculos?.placa ?? ""}
                        </p>

                        <Badge
                          variant="outline"
                          className="capitalize"
                        >
                          {a.tipo}
                        </Badge>

                        <StatusBadge
                          status={a.status}
                          atrasada={atrasada}
                        />
                      </div>

                      <p className="mt-2 break-words text-sm">
                        {a.descricao}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(data, "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>

                        {a.oficina && (
                          <span>
                            Oficina: {a.oficina}
                          </span>
                        )}

                        {a.km_previsto != null && (
                          <span className="flex items-center gap-1">
                            <Gauge className="h-3.5 w-3.5" />
                            {a.km_previsto.toLocaleString("pt-BR")} km
                          </span>
                        )}
                      </div>

                      {a.observacoes && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                          {a.observacoes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full sm:w-auto"
                      onClick={() => setDetalhe(a)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalhes
                    </Button>

                    {podeEditar && (
                      <Select
                        value={a.status}
                        onValueChange={(v: Status) =>
                          statusMut.mutate({
                            id: a.id,
                            status: v,
                          })
                        }
                      >
                        <SelectTrigger className="h-10 w-full sm:w-[150px]">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="agendada">
                            Agendada
                          </SelectItem>

                          <SelectItem value="realizada">
                            Realizada
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
                            id: a.id,
                            label: `${a.veiculos?.placa ?? ""} · ${a.descricao.slice(0, 40)}`,
                          })
                        }
                        aria-label="Excluir agendamento"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

        {!isLoading && registros.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            {total === 0 && !buscaDeb && filtroStatus === "todos"
              ? "Nenhum agendamento cadastrado."
              : "Nenhum resultado para esses filtros."}
          </Card>
        )}
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPage={setPage}
      />

      <Dialog
        open={!!detalhe}
        onOpenChange={(aberto) => !aberto && setDetalhe(null)}
      >
        <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes da manutenção
            </DialogTitle>
          </DialogHeader>

          {detalhe && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Veículo
                </p>
                <p className="font-semibold">
                  {detalhe.veiculos?.modelo ?? "Veículo"} ·{" "}
                  {detalhe.veiculos?.placa ?? "Placa não informada"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {detalhe.tipo}
                </Badge>

                <StatusBadge
                  status={detalhe.status}
                  atrasada={
                    detalhe.status === "agendada" &&
                    isBefore(
                      new Date(detalhe.data_agendada),
                      new Date()
                    )
                  }
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Descrição
                </p>
                <p className="whitespace-pre-wrap break-words">
                  {detalhe.descricao}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Oficina
                </p>
                <p>
                  {detalhe.oficina || "Não informada"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Data agendada
                </p>
                <p>
                  {format(
                    new Date(detalhe.data_agendada),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR }
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Quilometragem prevista
                </p>
                <p>
                  {detalhe.km_previsto != null
                    ? `${detalhe.km_previsto.toLocaleString("pt-BR")} km`
                    : "Não informada"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Observações
                </p>
                <p className="whitespace-pre-wrap break-words">
                  {detalhe.observacoes ||
                    "Nenhuma observação registrada."}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetalhe(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
      >
        <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir agendamento?
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

function StatusBadge({
  status,
  atrasada,
}: {
  status: string;
  atrasada: boolean;
}) {
  if (status === "realizada") {
    return (
      <Badge className="bg-brand-green/15 text-brand-green hover:bg-brand-green/20">
        Realizada
      </Badge>
    );
  }

  if (status === "cancelada") {
    return <Badge variant="outline">Cancelada</Badge>;
  }

  if (atrasada) {
    return (
      <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20">
        Atrasada
      </Badge>
    );
  }

  return (
    <Badge className="bg-brand-blue/15 text-brand-blue hover:bg-brand-blue/20">
      Agendada
    </Badge>
  );
}
