import { Router } from "express";

import { SecretariaController } from "../controllers/SecretariaController";
import { auth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";

const router = Router();
const controller = new SecretariaController();

router.use(auth);

router.get(
  "/",
  authorize([
    "ADMINISTRADOR",
    "GESTOR",
    "MOTORISTA",
  ]),
  (req, res, next) =>
    controller.listar(req, res, next)
);

router.get(
  "/:id",
  authorize([
    "ADMINISTRADOR",
    "GESTOR",
    "MOTORISTA",
  ]),
  (req, res, next) =>
    controller.buscarPorId(req, res, next)
);

router.post(
  "/",
  authorize(["ADMINISTRADOR"]),
  (req, res, next) =>
    controller.criar(req, res, next)
);

router.put(
  "/:id",
  authorize(["ADMINISTRADOR"]),
  (req, res, next) =>
    controller.atualizar(req, res, next)
);

router.delete(
  "/:id",
  authorize(["ADMINISTRADOR"]),
  (req, res, next) =>
    controller.excluir(req, res, next)
);

export default router;
