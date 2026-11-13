import prisma from "../lib/prisma";
import {
  TipoManutencao,
  StatusAgendamentoManutencao,
} from "@prisma/client";

const includeRelacionamentos = {
  veiculo: {
    select: {
      id: true,
      placa: true,
      modelo: true,
      kmAtual: true,
    },
  },
  user: {
    select: {
      id: true,
      nome: true,
    },
  },
};

function tipoParaBanco(tipo: string): TipoManutencao {
  const valor = tipo?.trim().toUpperCase();

  if (
    !Object.values(TipoManutencao).includes(
      valor as TipoManutencao
    )
  ) {
    throw new Error("Tipo de manutenção inválido.");
  }

  return valor as TipoManutencao;
}

function statusParaBanco(
  status: string
): StatusAgendamentoManutencao {
  const valor = status?.trim().toUpperCase();

  if (
    !Object.values(StatusAgendamentoManutencao).includes(
      valor as StatusAgendamentoManutencao
    )
  ) {
    throw new Error("Status do agendamento inválido.");
  }

  return valor as StatusAgendamentoManutencao;
}

function formatarAgendamento(item: any) {
  return {
    id: item.id,
    veiculo_id: item.veiculoId,
    tipo: item.tipo.toLowerCase(),
    status: item.status.toLowerCase(),
    descricao: item.descricao,
    oficina: item.oficina,
    data_agendada: item.dataAgendada,
    km_previsto: item.kmPrevisto,
    observacoes: item.observacoes,

    veiculos: item.veiculo
      ? {
          id: item.veiculo.id,
          placa: item.veiculo.placa,
          modelo: item.veiculo.modelo,
          km_atual: item.veiculo.kmAtual,
        }
      : null,

    profiles: item.user
      ? {
          id: item.user.id,
          nome: item.user.nome,
        }
      : null,

    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export class AgendamentoManutencaoService {
  async listar(
    busca = "",
    status?: string,
    veiculoId?: string,
    page = 0,
    pageSize = 20
  ) {
    const pagina =
      Number.isInteger(page) && page >= 0 ? page : 0;

    const tamanho =
      Number.isInteger(pageSize) && pageSize > 0
        ? Math.min(pageSize, 100)
        : 20;

    const where: any = {};
    const termo = busca.trim();

    if (status && status !== "todos") {
      where.status = statusParaBanco(status);
    }

    if (veiculoId) {
      where.veiculoId = veiculoId;
    }

    if (termo) {
      where.OR = [
        {
          descricao: {
            contains: termo,
            mode: "insensitive",
          },
        },
        {
          oficina: {
            contains: termo,
            mode: "insensitive",
          },
        },
        {
          veiculo: {
            is: {
              placa: {
                contains: termo,
                mode: "insensitive",
              },
            },
          },
        },
        {
          veiculo: {
            is: {
              modelo: {
                contains: termo,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    const [registros, total] = await prisma.$transaction([
      prisma.agendamentoManutencao.findMany({
        where,
        include: includeRelacionamentos,
        orderBy: {
          dataAgendada: "asc",
        },
        skip: pagina * tamanho,
        take: tamanho,
      }),

      prisma.agendamentoManutencao.count({ where }),
    ]);

    return {
      rows: registros.map(formatarAgendamento),
      total,
      page: pagina,
      pageSize: tamanho,
    };
  }

  async criar(data: {
    veiculoId: string;
    tipo: string;
    descricao: string;
    oficina?: string | null;
    dataAgendada: string;
    kmPrevisto?: number | null;
    observacoes?: string | null;
    userId?: string | null;
  }) {
    if (!data.veiculoId) {
      throw new Error("Veículo é obrigatório.");
    }

    const descricao = data.descricao?.trim();

    if (!descricao) {
      throw new Error("Descrição do agendamento é obrigatória.");
    }

    if (!data.dataAgendada) {
      throw new Error("Data do agendamento é obrigatória.");
    }

    const dataAgendada = new Date(data.dataAgendada);

    if (Number.isNaN(dataAgendada.getTime())) {
      throw new Error("Data do agendamento inválida.");
    }

    if (
      data.kmPrevisto != null &&
      (!Number.isInteger(data.kmPrevisto) ||
        data.kmPrevisto < 0)
    ) {
      throw new Error("Quilometragem prevista inválida.");
    }

    const tipo = tipoParaBanco(data.tipo);

    const veiculo = await prisma.veiculo.findUnique({
      where: {
        id: data.veiculoId,
      },
      select: {
        id: true,
      },
    });

    if (!veiculo) {
      throw new Error("Veículo não encontrado.");
    }

    if (data.userId) {
      const usuario = await prisma.user.findUnique({
        where: {
          id: data.userId,
        },
        select: {
          id: true,
          ativo: true,
        },
      });

      if (!usuario || !usuario.ativo) {
        throw new Error("Usuário responsável não encontrado ou inativo.");
      }
    }

    const criada = await prisma.agendamentoManutencao.create({
      data: {
        veiculoId: data.veiculoId,
        tipo,
        descricao,
        oficina: data.oficina?.trim() || null,
        dataAgendada,
        kmPrevisto: data.kmPrevisto ?? null,
        observacoes: data.observacoes?.trim() || null,
        userId: data.userId || null,
      },
      include: includeRelacionamentos,
    });

    return formatarAgendamento(criada);
  }

  async atualizarStatus(id: string, statusRecebido: string) {
    if (!id) {
      throw new Error("Agendamento não informado.");
    }

    const status = statusParaBanco(statusRecebido);

    const existente = await prisma.agendamentoManutencao.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existente) {
      throw new Error("Agendamento não encontrado.");
    }

    const atualizada = await prisma.agendamentoManutencao.update({
      where: { id },
      data: { status },
      include: includeRelacionamentos,
    });

    return formatarAgendamento(atualizada);
  }

  async excluir(id: string) {
    if (!id) {
      throw new Error("Agendamento não informado.");
    }

    const existente = await prisma.agendamentoManutencao.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existente) {
      throw new Error("Agendamento não encontrado.");
    }

    await prisma.agendamentoManutencao.delete({
      where: { id },
    });
  }
}
