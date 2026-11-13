import { Router } from "express";

import { ManutencaoController } from "../controllers/ManutencaoController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";

const router = Router();
const controller = new ManutencaoController();

router.use(auth);

router.get(
  "/",
  authorize([
    "ADMINISTRADOR",
    "GESTOR",
    "MOTORISTA",
  ]),
  controller.listar.bind(controller)
);

router.post(
  "/",
  authorize([
    "ADMINISTRADOR",
    "GESTOR",
  ]),
  controller.criar.bind(controller)
);

router.patch(
  "/:id/status",
  authorize([
    "ADMINISTRADOR",
    "GESTOR",
  ]),
  controller.atualizarStatus.bind(controller)
);

router.delete(
  "/:id",
  authorize([
    "ADMINISTRADOR",
  ]),
  controller.excluir.bind(controller)
);

export default router;
