import { Router } from "express";

import { AuthController } from "../controllers/AuthController";
import { auth } from "../middleware/auth";

const router = Router();
const authController = new AuthController();

router.post(
  "/login",
  (req, res, next) =>
    authController.login(req, res, next)
);

router.get(
  "/me",
  auth,
  (req, res, next) =>
    authController.me(req, res, next)
);

router.put(
  "/me/perfil",
  auth,
  (req, res, next) =>
    authController.atualizarMeuPerfil(req, res, next)
);

router.put(
  "/me/senha",
  auth,
  (req, res, next) =>
    authController.alterarMinhaSenha(req, res, next)
);

export default router;
