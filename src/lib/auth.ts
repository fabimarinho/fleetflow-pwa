import {
  apiRequest,
  getToken,
  removeToken,
  setToken,
} from "./api";

export type Perfil =
  | "ADMINISTRADOR"
  | "GESTOR"
  | "MOTORISTA";

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  matricula: string | null;
  telefone: string | null;
  perfil: Perfil;
  ativo: boolean;
  secretaria: {
    id: string;
    nome: string;
    sigla: string | null;
  } | null;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: UsuarioAutenticado;
    token: string;
  };
}

interface MeResponse {
  success: boolean;
  message: string;
  data: UsuarioAutenticado;
}

export async function login(
  email: string,
  senha: string
) {
  const response = await apiRequest<LoginResponse>(
    "/auth/login",
    {
      method: "POST",
      auth: false,
      body: JSON.stringify({
        email,
        senha,
      }),
    }
  );

  setToken(response.data.token);

  return response.data.user;
}

export async function getMe() {
  if (!getToken()) {
    return null;
  }

  try {
    const response = await apiRequest<MeResponse>(
      "/auth/me"
    );

    return response.data;
  } catch {
    removeToken();
    return null;
  }
}

export function logout() {
  removeToken();
}

export function isAuthenticated() {
  return !!getToken();
}
