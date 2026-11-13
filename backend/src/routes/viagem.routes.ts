import { Router } from "express";
import { Perfil } from "@prisma/client";
import { ViagemController } from "../controllers/ViagemController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";

const router = Router();
const controller = new ViagemController();

const perfisPermitidos: Perfil[] = [
  Perfil.ADMINISTRADOR,
  Perfil.GESTOR,
  Perfil.MOTORISTA,
];

router.use(auth);

router.get(
  "/",
  authorize(perfisPermitidos),
  controller.listar.bind(controller)
);

router.get(
  "/:id",
  authorize(perfisPermitidos),
  controller.buscarPorId.bind(controller)
);

router.post(
  "/",
  authorize(perfisPermitidos),
  controller.criar.bind(controller)
);

router.patch(
  "/:id/finalizar",
  authorize(perfisPermitidos),
  controller.finalizar.bind(controller)
);

export default router;
