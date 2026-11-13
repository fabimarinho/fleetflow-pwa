import { Router } from "express";

import { AbastecimentoController } from "../controllers/AbastecimentoController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";

const router = Router();
const controller = new AbastecimentoController();

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
    "MOTORISTA",
  ]),
  controller.criar.bind(controller)
);

router.delete(
  "/:id",
  authorize([
    "ADMINISTRADOR",
  ]),
  controller.excluir.bind(controller)
);

export default router;
