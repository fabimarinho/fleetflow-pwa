import prisma from "../lib/prisma";

interface SecretariaInput {
  nome: string;
  sigla?: string | null;
}

export class SecretariaService {
  async listar() {
    return prisma.secretaria.findMany({
      orderBy: {
        nome: "asc",
      },
    });
  }

  async buscarPorId(id: string) {
    const secretaria = await prisma.secretaria.findUnique({
      where: { id },
    });

    if (!secretaria) {
      throw new Error("Secretaria não encontrada.");
    }

    return secretaria;
  }

  async criar(data: SecretariaInput) {
    const nome = data.nome?.trim();
    const sigla = data.sigla?.trim() || null;

    if (!nome) {
      throw new Error("Nome da secretaria é obrigatório.");
    }

    const existente = await prisma.secretaria.findFirst({
      where: {
        nome: {
          equals: nome,
          mode: "insensitive",
        },
      },
    });

    if (existente) {
      throw new Error(
        "Já existe uma secretaria com este nome."
      );
    }

    return prisma.secretaria.create({
      data: {
        nome,
        sigla,
      },
    });
  }

  async atualizar(
    id: string,
    data: SecretariaInput
  ) {
    const nome = data.nome?.trim();
    const sigla = data.sigla?.trim() || null;

    if (!nome) {
      throw new Error("Nome da secretaria é obrigatório.");
    }

    await this.buscarPorId(id);

    const duplicada = await prisma.secretaria.findFirst({
      where: {
        nome: {
          equals: nome,
          mode: "insensitive",
        },
        NOT: {
          id,
        },
      },
    });

    if (duplicada) {
      throw new Error(
        "Já existe uma secretaria com este nome."
      );
    }

    return prisma.secretaria.update({
      where: { id },
      data: {
        nome,
        sigla,
      },
    });
  }

  async excluir(id: string) {
    await this.buscarPorId(id);

    const vinculos = await prisma.secretaria.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            usuarios: true,
            veiculos: true,
            viagens: true,
            abastecimentos: true,
          },
        },
      },
    });

    if (!vinculos) {
      throw new Error("Secretaria não encontrada.");
    }

    const totalVinculos =
      vinculos._count.usuarios +
      vinculos._count.veiculos +
      vinculos._count.viagens +
      vinculos._count.abastecimentos;

    if (totalVinculos > 0) {
      throw new Error(
        "Não é possível excluir uma secretaria que possui registros vinculados."
      );
    }

    await prisma.secretaria.delete({
      where: { id },
    });
  }
}
