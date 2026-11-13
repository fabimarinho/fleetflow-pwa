import { Router } from "express";
import prisma from "../lib/prisma";

import authRoutes from "./auth.routes";
import usuarioRoutes from "./usuario.routes";
import secretariaRoutes from "./secretaria.routes";
import veiculoRoutes from "./veiculo.routes";
import viagemRoutes from "./viagem.routes";
import abastecimentoRoutes from "./abastecimento.routes";
import arquivoRoutes from "./arquivo.routes";
import manutencaoRoutes from "./manutencao.routes";
import agendamentoManutencaoRoutes from "./agendamentoManutencao.routes";
import configuracaoSistemaRoutes from "./configuracaoSistema.routes";

const router = Router();

router.get("/api/health", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "Controle de Frota API funcionando.",
      database: "conectado",
    });
  } catch (error) {
    next(error);
  }
});

router.use("/api/auth", authRoutes);
router.use("/api/usuarios", usuarioRoutes);
router.use("/api/secretarias", secretariaRoutes);
router.use("/api/veiculos", veiculoRoutes);
router.use("/api/viagens", viagemRoutes);
router.use("/api/abastecimentos", abastecimentoRoutes);
router.use("/api/arquivos", arquivoRoutes);
router.use("/api/manutencoes", manutencaoRoutes);
router.use("/api/agendamentos-manutencao", agendamentoManutencaoRoutes);
router.use("/api/configuracoes-sistema", configuracaoSistemaRoutes);

export default router;
