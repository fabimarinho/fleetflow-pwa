import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import prisma from "../lib/prisma";

export class AuthService {
  async login(email: string, senha: string) {
    if (!email || !senha) {
      throw new Error("E-mail e senha são obrigatórios.");
    }

    const emailNormalizado = email.trim().toLowerCase();

    const usuario = await prisma.user.findUnique({
      where: {
        email: emailNormalizado,
      },
      include: {
        secretaria: {
          select: {
            id: true,
            nome: true,
            sigla: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new Error("E-mail ou senha inválidos.");
    }

    if (!usuario.ativo) {
      throw new Error("Usuário inativo.");
    }

    const senhaCorreta = await bcrypt.compare(
      senha,
      usuario.senha
    );

    if (!senhaCorreta) {
      throw new Error("E-mail ou senha inválidos.");
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET não configurado.");
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        perfil: usuario.perfil,
      },
      jwtSecret,
      {
        expiresIn: "8h",
      }
    );

    return {
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        matricula: usuario.matricula,
        telefone: usuario.telefone,
        perfil: usuario.perfil,
        ativo: usuario.ativo,
        secretaria: usuario.secretaria,
      },
      token,
    };
  }

  async me(usuarioId: string) {
    const usuario = await prisma.user.findUnique({
      where: {
        id: usuarioId,
      },
      include: {
        secretaria: {
          select: {
            id: true,
            nome: true,
            sigla: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new Error("Usuário não encontrado.");
    }

    if (!usuario.ativo) {
      throw new Error("Usuário inativo.");
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      matricula: usuario.matricula,
      telefone: usuario.telefone,
      perfil: usuario.perfil,
      ativo: usuario.ativo,
      secretaria: usuario.secretaria,
    };
  }
}
