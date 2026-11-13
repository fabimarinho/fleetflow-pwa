import prisma from "../lib/prisma";

const NOME_PADRAO = "Gestão de Frota";

export class ConfiguracaoSistemaService {
  async buscar() {
    return prisma.configuracaoSistema.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        nomeSistema: NOME_PADRAO,
      },
      update: {},
    });
  }

  async atualizar(nomeSistema: string) {
    return prisma.configuracaoSistema.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        nomeSistema,
      },
      update: {
        nomeSistema,
      },
    });
  }
}
