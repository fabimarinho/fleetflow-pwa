import { Router } from "express";

import prisma from "../lib/prisma";
import authRoutes from "./auth.routes";
import secretariaRoutes from "./secretaria.routes";
import veiculoRoutes from "./veiculo.routes";

const router = Router();

router.get("/api/health", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      message: "Controle de Frota API funcionando.",
      database: "conectado",
    });
  } catch (error) {
    next(error);
  }
});

router.use("/api/auth", authRoutes);
router.use("/api/secretarias", secretariaRoutes);
router.use("/api/veiculos", veiculoRoutes);

export default router;
