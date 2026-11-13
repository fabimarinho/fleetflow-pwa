import { Router } from "express";
import { ConfiguracaoSistemaController } from "../controllers/ConfiguracaoSistemaController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";

const router = Router();
const controller = new ConfiguracaoSistemaController();

router.use(auth);

router.get("/", controller.buscar.bind(controller));

router.put(
  "/",
  authorize(["ADMINISTRADOR"]),
  controller.atualizar.bind(controller)
);

export default router;
