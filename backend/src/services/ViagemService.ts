
import prisma from "../lib/prisma";
import {
  Prisma,
  StatusViagem,
  StatusVeiculo,
} from "@prisma/client";

interface CriarViagemInput {
  veiculoId: string;
  motoristaId: string;
  secretariaId?: string | null;
  servidorNome?: string | null;
  servidorMatricula?: string | null;
  origem: string;
  destino: string;
  objetivo?: string | null;
  kmSaida: number;
  fotoHodometroSaidaUrl?: string | null;
  assinaturaUrl?: string | null;
  checklistSaida?: unknown;
}

interface FinalizarViagemInput {
  kmRetorno: number;
  combustivel?: string | null;
  ocorrencias?: string | null;
  fotoHodometroRetornoUrl?: string | null;
  checklistRetorno?: unknown;
  assinaturaRetornoUrl?: string | null;
}

const incluirRelacoes = {
  veiculo: {
    select: {
      id: true,
      placa: true,
      modelo: true,
      kmAtual: true,
    },
  },
  motorista: {
    select: {
      id: true,
      nome: true,
    },
  },
  secretaria: {
    select: {
      id: true,
      nome: true,
    },
  },
};

function statusParaFrontend(status: StatusViagem): string {
  switch (status) {
    case StatusViagem.FINALIZADA:
      return "finalizada";

    case StatusViagem.CANCELADA:
      return "cancelada";

    default:
      return "em_andamento";
  }
}

function formatarViagem(viagem: any) {
  return {
    id: viagem.id,
    numero: viagem.numero.toString(),

    veiculo_id: viagem.veiculoId,
    motorista_id: viagem.motoristaId,
    secretaria_id: viagem.secretariaId,

    servidor_nome: viagem.servidorNome,
    servidor_matricula: viagem.servidorMatricula,

    origem: viagem.origem,
    destino: viagem.destino,
    objetivo: viagem.objetivo,

    km_saida: viagem.kmSaida,
    km_retorno: viagem.kmRetorno,

    hora_saida: viagem.horaSaida,
    hora_chegada: viagem.horaChegada,

    foto_hodometro_saida_url: viagem.fotoHodometroSaidaUrl,
    foto_hodometro_retorno_url: viagem.fotoHodometroRetornoUrl,

    assinatura_url: viagem.assinaturaUrl,
    assinatura_retorno_url: viagem.assinaturaRetornoUrl,

    checklist_saida: viagem.checklistSaida,
    checklist_retorno: viagem.checklistRetorno,

    combustivel: viagem.combustivel,
    ocorrencias: viagem.ocorrencias,

    status: statusParaFrontend(viagem.status),

    created_at: viagem.createdAt,
    updated_at: viagem.updatedAt,

    veiculos: viagem.veiculo
      ? {
          id: viagem.veiculo.id,
          placa: viagem.veiculo.placa,
          modelo: viagem.veiculo.modelo,
          km_atual: viagem.veiculo.kmAtual,
        }
      : null,

    profiles: viagem.motorista
      ? {
          id: viagem.motorista.id,
          nome: viagem.motorista.nome,
        }
      : null,

    secretarias: viagem.secretaria
      ? {
          id: viagem.secretaria.id,
          nome: viagem.secretaria.nome,
        }
      : null,
  };
}

export class ViagemService {
  async listar(
    veiculoId = "",
    pesquisa = "",
    limit = 100,
    offset = 0
  ) {
    const limite =
      Number.isInteger(limit) && limit > 0
        ? Math.min(limit, 500)
        : 100;

    const deslocamento =
      Number.isInteger(offset) && offset >= 0
        ? offset
        : 0;

    const termo = pesquisa.trim();

    const where: Prisma.ViagemWhereInput = {};

    if (veiculoId) {
      where.veiculoId = veiculoId;
    }

    if (termo) {
      where.OR = [
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
        {
          motorista: {
            is: {
              nome: {
                contains: termo,
                mode: "insensitive",
              },
            },
          },
        },
        {
          secretaria: {
            is: {
              nome: {
                contains: termo,
                mode: "insensitive",
              },
            },
          },
        },
        {
          origem: {
            contains: termo,
            mode: "insensitive",
          },
        },
        {
          destino: {
            contains: termo,
            mode: "insensitive",
          },
        },
      ];
    }

    const viagens = await prisma.viagem.findMany({
      where,
      include: incluirRelacoes,
      orderBy: {
        horaSaida: "desc",
      },
      skip: deslocamento,
      take: limite,
    });

    return viagens.map(formatarViagem);
  }

  async buscarPorId(id: string) {
    if (!id?.trim()) {
      throw new Error("Identificador da viagem não informado.");
    }

    const viagem = await prisma.viagem.findUnique({
      where: { id },
      include: incluirRelacoes,
    });

    if (!viagem) {
      throw new Error("Viagem não encontrada.");
    }

    return formatarViagem(viagem);
  }

  async listarPorVeiculo(
    veiculoId: string,
    limit = 10
  ) {
    if (!veiculoId) {
      throw new Error(
        "Veículo é obrigatório para consultar as viagens."
      );
    }

    const veiculo = await prisma.veiculo.findUnique({
      where: {
        id: veiculoId,
      },
      select: {
        id: true,
      },
    });

    if (!veiculo) {
      throw new Error("Veículo não encontrado.");
    }

    return this.listar(veiculoId, "", limit);
  }

  async criar(data: CriarViagemInput) {
    const veiculoId = data.veiculoId?.trim();
    const motoristaId = data.motoristaId?.trim();
    const origem = data.origem?.trim();
    const destino = data.destino?.trim();
    const kmSaida = Number(data.kmSaida);

    if (!veiculoId) {
      throw new Error("Selecione um veículo.");
    }

    if (!motoristaId) {
      throw new Error("Motorista não identificado.");
    }

    if (!origem || !destino) {
      throw new Error("Origem e destino são obrigatórios.");
    }

    if (
      !Number.isInteger(kmSaida) ||
      kmSaida < 0
    ) {
      throw new Error("Quilometragem de saída inválida.");
    }

    if (
      data.checklistSaida !== undefined &&
      data.checklistSaida !== null &&
      (
        typeof data.checklistSaida !== "object" ||
        Array.isArray(data.checklistSaida)
      )
    ) {
      throw new Error("Checklist de saída inválido.");
    }

    const viagem = await prisma.$transaction(async (tx) => {
      const motorista = await tx.user.findUnique({
        where: {
          id: motoristaId,
        },
        select: {
          id: true,
          ativo: true,
        },
      });

      if (!motorista || !motorista.ativo) {
        throw new Error(
          "Motorista não encontrado ou inativo."
        );
      }

      const veiculo = await tx.veiculo.findUnique({
        where: {
          id: veiculoId,
        },
      });

      if (!veiculo) {
        throw new Error("Veículo não encontrado.");
      }

      if (veiculo.status !== StatusVeiculo.DISPONIVEL) {
        throw new Error(
          "Este veículo não está disponível para iniciar uma viagem."
        );
      }

      if (kmSaida < veiculo.kmAtual) {
        throw new Error(
          `A quilometragem informada não pode ser menor que a atual (${veiculo.kmAtual} km).`
        );
      }

      if (data.secretariaId) {
        const secretaria = await tx.secretaria.findUnique({
          where: {
            id: data.secretariaId,
          },
          select: {
            id: true,
            ativa: true,
          },
        });

        if (!secretaria || !secretaria.ativa) {
          throw new Error(
            "Secretaria não encontrada ou inativa."
          );
        }
      }

      const novaViagem = await tx.viagem.create({
        data: {
          veiculoId,
          motoristaId,
          secretariaId: data.secretariaId || null,

          servidorNome:
            data.servidorNome?.trim() || null,

          servidorMatricula:
            data.servidorMatricula?.trim() || null,

          origem,
          destino,

          objetivo:
            data.objetivo?.trim() || null,

          kmSaida,

          fotoHodometroSaidaUrl:
            data.fotoHodometroSaidaUrl || null,

          assinaturaUrl:
            data.assinaturaUrl || null,

          checklistSaida:
            data.checklistSaida == null
              ? Prisma.JsonNull
              : (data.checklistSaida as Prisma.InputJsonValue),

          status: StatusViagem.EM_ANDAMENTO,
        },
      });

      await tx.veiculo.update({
        where: {
          id: veiculoId,
        },
        data: {
          status: StatusVeiculo.EM_USO,
          kmAtual: kmSaida,
        },
      });

      return novaViagem;
    });

    return formatarViagem(viagem);
  }

  async finalizar(
    id: string,
    data: FinalizarViagemInput
  ) {
    const kmRetorno = Number(data.kmRetorno);

    if (
      !Number.isInteger(kmRetorno) ||
      kmRetorno < 0
    ) {
      throw new Error("Quilometragem de retorno inválida.");
    }

    if (
      data.checklistRetorno !== undefined &&
      data.checklistRetorno !== null &&
      (
        typeof data.checklistRetorno !== "object" ||
        Array.isArray(data.checklistRetorno)
      )
    ) {
      throw new Error("Checklist de retorno inválido.");
    }

    const viagem = await prisma.$transaction(async (tx) => {
      const existente = await tx.viagem.findUnique({
        where: { id },
        include: {
          veiculo: true,
        },
      });

      if (!existente) {
        throw new Error("Viagem não encontrada.");
      }

      if (existente.status !== StatusViagem.EM_ANDAMENTO) {
        throw new Error("Esta viagem não está em andamento.");
      }

      if (kmRetorno < existente.kmSaida) {
        throw new Error(
          "Km de retorno deve ser maior ou igual ao km de saída."
        );
      }

      const atualizada = await tx.viagem.update({
        where: { id },
        data: {
          kmRetorno,
          combustivel: data.combustivel || null,
          ocorrencias: data.ocorrencias?.trim() || null,

          fotoHodometroRetornoUrl:
            data.fotoHodometroRetornoUrl || null,

          checklistRetorno:
            data.checklistRetorno == null
              ? Prisma.JsonNull
              : (data.checklistRetorno as Prisma.InputJsonValue),

          assinaturaRetornoUrl:
            data.assinaturaRetornoUrl || null,

          horaChegada: new Date(),
          status: StatusViagem.FINALIZADA,
        },
        include: incluirRelacoes,
      });

      await tx.veiculo.update({
        where: {
          id: existente.veiculoId,
        },
        data: {
          status: StatusVeiculo.DISPONIVEL,
          kmAtual: kmRetorno,
        },
      });

      return atualizada;
    });

    return formatarViagem(viagem);
  }
}
