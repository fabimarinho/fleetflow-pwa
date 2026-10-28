import { Router } from "express";

import prisma from "../lib/prisma";
import authRoutes from "./auth.routes";

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

export default router;
