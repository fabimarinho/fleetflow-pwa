import bcrypt from "bcrypt";
import { Perfil } from "@prisma/client";

import prisma from "../lib/prisma";

interface UsuarioInput {
  nome?: string;
  email?: string;
  senha?: string;
  matricula?: string | null;
  telefone?: string | null;
  perfil?: string;
  secretariaId?: string | null;
}

const camposUsuario = {
  id: true,
  nome: true,
  email: true,
  matricula: true,
  telefone: true,
  perfil: true,
  ativo: true,
  secretariaId: true,
  secretaria: {
    select: {
      id: true,
      nome: true,
      sigla: true,
    },
  },
  createdAt: true,
  updatedAt: true,
};

export class UsuarioService {
  private validarPerfil(perfil: string): Perfil {
    if (!Object.values(Perfil).includes(perfil as Perfil)) {
      throw new Error("Perfil de usuário inválido.");
    }

    return perfil as Perfil;
  }

  private async validarSecretaria(
    secretariaId?: string | null
  ) {
    if (!secretariaId) {
      return null;
    }

    const secretaria = await prisma.secretaria.findUnique({
      where: { id: secretariaId },
      select: {
        id: true,
        ativa: true,
      },
    });

    if (!secretaria || !secretaria.ativa) {
      throw new Error("Secretaria não encontrada ou inativa.");
    }

    return secretaria.id;
  }

  private async protegerUltimoAdministrador(
    usuarioId: string,
    novoPerfil?: Perfil,
    novoAtivo?: boolean
  ) {
    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      select: {
        perfil: true,
        ativo: true,
      },
    });

    if (!usuario) {
      throw new Error("Usuário não encontrado.");
    }

    const deixaraDeSerAdministrador =
      usuario.perfil === Perfil.ADMINISTRADOR &&
      usuario.ativo &&
      (
        novoPerfil !== undefined &&
        novoPerfil !== Perfil.ADMINISTRADOR ||
        novoAtivo === false
      );

    if (!deixaraDeSerAdministrador) {
      return;
    }

    const totalAdministradoresAtivos =
      await prisma.user.count({
        where: {
          perfil: Perfil.ADMINISTRADOR,
          ativo: true,
        },
      });

    if (totalAdministradoresAtivos <= 1) {
      throw new Error(
        "Não é possível remover ou desativar o último administrador ativo."
      );
    }
  }

  async listar() {
    return prisma.user.findMany({
      select: camposUsuario,
      orderBy: {
        nome: "asc",
      },
    });
  }

  async buscarPorId(id: string) {
    const usuario = await prisma.user.findUnique({
      where: { id },
      select: camposUsuario,
    });

    if (!usuario) {
      throw new Error("Usuário não encontrado.");
    }

    return usuario;
  }

  async criar(data: UsuarioInput) {
    const nome = data.nome?.trim();
    const email = data.email?.trim().toLowerCase();
    const senha = data.senha;

    if (!nome) {
      throw new Error("Nome do usuário é obrigatório.");
    }

    if (!email) {
      throw new Error("E-mail do usuário é obrigatório.");
    }

    if (!senha || senha.length < 8) {
      throw new Error(
        "A senha deve possuir pelo menos 8 caracteres."
      );
    }

    const perfil = this.validarPerfil(
      data.perfil || "MOTORISTA"
    );

    const existente = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    if (existente) {
      throw new Error("Já existe um usuário com este e-mail.");
    }

    const secretariaId =
      await this.validarSecretaria(data.secretariaId);

    const senhaHash = await bcrypt.hash(senha, 10);

    return prisma.user.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        matricula: data.matricula?.trim() || null,
        telefone: data.telefone?.trim() || null,
        perfil,
        secretariaId,
      },
      select: camposUsuario,
    });
  }

  async atualizar(
    id: string,
    data: UsuarioInput,
    administradorId: string
  ) {
    if (id === administradorId && data.perfil) {
      const perfilInformado = this.validarPerfil(data.perfil);

      const usuarioAtual = await prisma.user.findUnique({
        where: { id },
        select: { perfil: true },
      });

      if (
        usuarioAtual &&
        usuarioAtual.perfil !== perfilInformado
      ) {
        throw new Error(
          "Você não pode alterar seu próprio perfil."
        );
      }
    }

    await this.buscarPorId(id);

    const dadosAtualizacao: {
      nome?: string;
      email?: string;
      matricula?: string | null;
      telefone?: string | null;
      perfil?: Perfil;
      secretariaId?: string | null;
      senha?: string;
    } = {};

    if (data.nome !== undefined) {
      const nome = data.nome.trim();

      if (!nome) {
        throw new Error("Nome do usuário é obrigatório.");
      }

      dadosAtualizacao.nome = nome;
    }

    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();

      if (!email) {
        throw new Error("E-mail do usuário é obrigatório.");
      }

      const existente = await prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: "insensitive",
          },
          NOT: { id },
        },
      });

      if (existente) {
        throw new Error(
          "Já existe um usuário com este e-mail."
        );
      }

      dadosAtualizacao.email = email;
    }

    if (data.matricula !== undefined) {
      dadosAtualizacao.matricula =
        data.matricula?.trim() || null;
    }

    if (data.telefone !== undefined) {
      dadosAtualizacao.telefone =
        data.telefone?.trim() || null;
    }

    if (data.perfil !== undefined) {
      const perfil = this.validarPerfil(data.perfil);

      await this.protegerUltimoAdministrador(
        id,
        perfil
      );

      dadosAtualizacao.perfil = perfil;
    }

    if (data.secretariaId !== undefined) {
      dadosAtualizacao.secretariaId =
        await this.validarSecretaria(data.secretariaId);
    }

    if (data.senha !== undefined && data.senha !== "") {
      if (data.senha.length < 8) {
        throw new Error(
          "A senha deve possuir pelo menos 8 caracteres."
        );
      }

      dadosAtualizacao.senha =
        await bcrypt.hash(data.senha, 10);
    }

    return prisma.user.update({
      where: { id },
      data: dadosAtualizacao,
      select: camposUsuario,
    });
  }

  async atualizarStatus(
    id: string,
    ativo: boolean,
    administradorId: string
  ) {
    if (typeof ativo !== "boolean") {
      throw new Error("Informe um status válido.");
    }

    if (id === administradorId && !ativo) {
      throw new Error(
        "Você não pode desativar sua própria conta."
      );
    }

    await this.protegerUltimoAdministrador(
      id,
      undefined,
      ativo
    );

    return prisma.user.update({
      where: { id },
      data: { ativo },
      select: camposUsuario,
    });
  }
}
