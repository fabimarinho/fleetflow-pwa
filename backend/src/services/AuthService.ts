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

  async atualizarMeuPerfil(
    usuarioId: string,
    dados: {
      nome?: unknown;
      telefone?: unknown;
      matricula?: unknown;
    }
  ) {
    await this.me(usuarioId);

    const atualizacao: {
      nome?: string;
      telefone?: string | null;
      matricula?: string | null;
    } = {};

    if (dados.nome !== undefined) {
      if (typeof dados.nome !== "string") {
        throw new Error("Informe um nome válido.");
      }

      const nome = dados.nome.trim();

      if (nome.length < 2 || nome.length > 100) {
        throw new Error(
          "O nome deve ter entre 2 e 100 caracteres."
        );
      }

      atualizacao.nome = nome;
    }

    if (dados.telefone !== undefined) {
      if (
        dados.telefone !== null &&
        typeof dados.telefone !== "string"
      ) {
        throw new Error("Informe um telefone válido.");
      }

      const telefone =
        typeof dados.telefone === "string"
          ? dados.telefone.trim()
          : "";

      if (telefone.length > 20) {
        throw new Error(
          "O telefone deve ter no máximo 20 caracteres."
        );
      }

      atualizacao.telefone = telefone || null;
    }

    if (dados.matricula !== undefined) {
      if (
        dados.matricula !== null &&
        typeof dados.matricula !== "string"
      ) {
        throw new Error("Informe uma matrícula válida.");
      }

      const matricula =
        typeof dados.matricula === "string"
          ? dados.matricula.trim()
          : "";

      if (matricula.length > 30) {
        throw new Error(
          "A matrícula deve ter no máximo 30 caracteres."
        );
      }

      atualizacao.matricula = matricula || null;
    }

    if (Object.keys(atualizacao).length === 0) {
      throw new Error("Nenhum dado foi informado para atualização.");
    }

    const usuario = await prisma.user.update({
      where: {
        id: usuarioId,
      },
      data: atualizacao,
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

  async alterarMinhaSenha(
    usuarioId: string,
    senhaAtual: unknown,
    novaSenha: unknown
  ) {
    if (
      typeof senhaAtual !== "string" ||
      !senhaAtual
    ) {
      throw new Error("Informe sua senha atual.");
    }

    if (
      typeof novaSenha !== "string" ||
      novaSenha.length < 8 ||
      novaSenha.length > 72
    ) {
      throw new Error(
        "A nova senha deve ter entre 8 e 72 caracteres."
      );
    }

    const usuario = await prisma.user.findUnique({
      where: {
        id: usuarioId,
      },
      select: {
        id: true,
        senha: true,
        ativo: true,
      },
    });

    if (!usuario) {
      throw new Error("Usuário não encontrado.");
    }

    if (!usuario.ativo) {
      throw new Error("Usuário inativo.");
    }

    const senhaCorreta = await bcrypt.compare(
      senhaAtual,
      usuario.senha
    );

    if (!senhaCorreta) {
      throw new Error("A senha atual está incorreta.");
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await prisma.user.update({
      where: {
        id: usuarioId,
      },
      data: {
        senha: senhaHash,
      },
    });

    return {
      sucesso: true,
    };
  }
}
