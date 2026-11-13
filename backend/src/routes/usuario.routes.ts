import { Router } from "express";

import { UsuarioController } from "../controllers/UsuarioController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";

const router = Router();
const controller = new UsuarioController();

router.use(auth);
router.use(authorize(["ADMINISTRADOR"]));

router.get(
  "/",
  controller.listar.bind(controller)
);

router.get(
  "/:id",
  controller.buscarPorId.bind(controller)
);

router.post(
  "/",
  controller.criar.bind(controller)
);

router.put(
  "/:id",
  controller.atualizar.bind(controller)
);

router.patch(
  "/:id/status",
  controller.atualizarStatus.bind(controller)
);

export default router;
