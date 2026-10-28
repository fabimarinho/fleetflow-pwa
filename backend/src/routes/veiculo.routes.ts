import { Router } from "express";

import { VeiculoController } from "../controllers/VeiculoController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";

const router = Router();
const controller = new VeiculoController();

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

router.get(
  "/:id",
  authorize([
    "ADMINISTRADOR",
    "GESTOR",
    "MOTORISTA",
  ]),
  controller.buscarPorId.bind(controller)
);

router.post(
  "/",
  authorize([
    "ADMINISTRADOR",
    "GESTOR",
  ]),
  controller.criar.bind(controller)
);

router.put(
  "/:id",
  authorize([
    "ADMINISTRADOR",
    "GESTOR",
  ]),
  controller.atualizar.bind(controller)
);

router.delete(
  "/:id",
  authorize([
    "ADMINISTRADOR",
  ]),
  controller.excluir.bind(controller)
);

export default router;
