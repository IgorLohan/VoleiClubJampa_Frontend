type HeadersInitLike = Record<string, string>;

type FazerRequisicaoOpcoes = Omit<RequestInit, "headers"> & {
  headers?: HeadersInitLike;
  usarTokenAdmin?: boolean;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://localhost:3333";

function obterTokenAdmin(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tokenAdmin");
}

function obterCabecalhos(
  headersExtras: HeadersInitLike = {},
  usarTokenAdmin = true
): HeadersInitLike {
  const headers: HeadersInitLike = {
    "Content-Type": "application/json",
    ...headersExtras
  };

  if (usarTokenAdmin) {
    const token = obterTokenAdmin();
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

export async function fazerRequisicao<T = any>(
  caminho: string,
  opcoes: FazerRequisicaoOpcoes = {}
): Promise<T> {
  const { headers, usarTokenAdmin = true, ...restoOpcoes } = opcoes;

  const resposta = await fetch(`${API_BASE}${caminho}`, {
    ...restoOpcoes,
    headers: obterCabecalhos(headers, usarTokenAdmin)
  });

  const dados = (await resposta.json().catch(() => ({}))) as any;

  if (!resposta.ok) {
    throw new Error(dados.erro || dados.detalhe || "Erro na requisição.");
  }

  return dados as T;
}

export async function loginAdmin(dados: { email: string; senha: string }) {
  return fazerRequisicao("/admin/login", {
    method: "POST",
    body: JSON.stringify(dados)
  });
}

export async function cadastrarParticipante(dados: {
  nome: string;
  email: string;
  contato: string;
  sexo: string;
  senha: string;
  dataNascimento: string;
}) {
  return fazerRequisicao("/usuarios/cadastro", {
    method: "POST",
    body: JSON.stringify(dados),
    usarTokenAdmin: false
  });
}

export async function loginParticipante(dados: { email: string; senha: string }) {
  return fazerRequisicao("/usuarios/login", {
    method: "POST",
    body: JSON.stringify(dados),
    usarTokenAdmin: false
  });
}

export async function verificarEmail(token: string) {
  return fazerRequisicao(`/usuarios/verificar-email?token=${encodeURIComponent(token)}`, {
    method: "GET",
    usarTokenAdmin: false
  });
}

export async function reenviarVerificacao(email: string) {
  return fazerRequisicao("/usuarios/reenviar-verificacao", {
    method: "POST",
    body: JSON.stringify({ email }),
    usarTokenAdmin: false
  });
}

export async function listarMinhasInscricoes(tokenParticipante: string | null) {
  return fazerRequisicao("/usuarios/minhas-inscricoes", {
    method: "GET",
    headers: tokenParticipante
      ? { Authorization: `Bearer ${tokenParticipante}` }
      : {},
    usarTokenAdmin: false
  });
}

export async function listarCampeonatos() {
  return fazerRequisicao("/campeonatos", { usarTokenAdmin: false });
}

export async function listarCampeonatosAdmin() {
  return fazerRequisicao("/campeonatos");
}

export async function criarCampeonato(dadosCampeonato: any) {
  return fazerRequisicao("/campeonatos", {
    method: "POST",
    body: JSON.stringify(dadosCampeonato)
  });
}

export async function buscarResumoCampeonato(id: string | number) {
  return fazerRequisicao(`/campeonatos/${id}/resumo`);
}

export async function buscarResumoCampeonatoPublico(id: string | number) {
  return fazerRequisicao(`/campeonatos/${id}/resumo-publico`, {
    usarTokenAdmin: false
  });
}

export async function encerrarInscricoes(id: string | number) {
  return fazerRequisicao(`/campeonatos/${id}/encerrar-inscricoes`, {
    method: "PATCH"
  });
}

export async function reabrirInscricoes(id: string | number) {
  return fazerRequisicao(`/campeonatos/${id}/reabrir-inscricoes`, {
    method: "PATCH"
  });
}

export async function gerarChaveamento(id: string | number) {
  return fazerRequisicao(`/campeonatos/${id}/chaveamento`, {
    method: "POST"
  });
}

export async function buscarCampeonatoPorId(id: string | number) {
  return fazerRequisicao(`/campeonatos/${id}`, { usarTokenAdmin: false });
}

export async function criarInscricao(
  campeonatoId: string | number,
  dadosInscricao: any,
  tokenParticipante: string | null
) {
  return fazerRequisicao(`/campeonatos/${campeonatoId}/inscricoes`, {
    method: "POST",
    headers: tokenParticipante
      ? { Authorization: `Bearer ${tokenParticipante}` }
      : {},
    body: JSON.stringify(dadosInscricao),
    usarTokenAdmin: false
  });
}

/** Inscrição na tabela InscricaoIndividual (modo INDIVIDUAL no campeonato). */
export async function criarInscricaoIndividual(
  campeonatoId: string | number,
  dados: { tamanhoCamisa: string; comprovantePagamento: string },
  tokenParticipante: string | null
) {
  return fazerRequisicao(`/campeonatos/${campeonatoId}/inscricoes-individuais`, {
    method: "POST",
    headers: tokenParticipante
      ? { Authorization: `Bearer ${tokenParticipante}` }
      : {},
    body: JSON.stringify(dados),
    usarTokenAdmin: false
  });
}

export async function registrarPlacar(jogoId: string | number, sets: any) {
  return fazerRequisicao(`/jogos/${jogoId}/placar`, {
    method: "PATCH",
    body: JSON.stringify({ sets })
  });
}

export async function excluirInscricao(inscricaoId: string | number) {
  return fazerRequisicao(`/campeonatos/inscricoes/${inscricaoId}`, {
    method: "DELETE"
  });
}

export async function excluirCampeonato(campeonatoId: string | number) {
  return fazerRequisicao(`/campeonatos/${campeonatoId}`, {
    method: "DELETE"
  });
}

export async function listarMeusCampeonatos() {
  return fazerRequisicao("/campeonatos/meus");
}

export async function listarCampeonatosPublicos() {
  return fazerRequisicao("/campeonatos/publicos", { usarTokenAdmin: false });
}

export async function atualizarCampeonato(
  campeonatoId: string | number,
  dadosCampeonato: any
) {
  return fazerRequisicao(`/campeonatos/${campeonatoId}`, {
    method: "PUT",
    body: JSON.stringify(dadosCampeonato)
  });
}

export async function atualizarInscricao(inscricaoId: string | number, dadosInscricao: any) {
  return fazerRequisicao(`/campeonatos/inscricoes/${inscricaoId}`, {
    method: "PUT",
    body: JSON.stringify(dadosInscricao)
  });
}

export async function listarInscricoesIndividuaisPorCampeonato(
  campeonatoId: string | number
) {
  return fazerRequisicao(`/campeonatos/${campeonatoId}/inscricoes-individuais`, {
    method: "GET"
  });
}

export async function aprovarInscricaoIndividual(inscricaoId: string | number) {
  return fazerRequisicao(`/campeonatos/inscricoes-individuais/${inscricaoId}/aprovar`, {
    method: "PATCH"
  });
}

export async function reprovarInscricaoIndividual(
  inscricaoId: string | number,
  observacaoAdmin: string
) {
  return fazerRequisicao(`/campeonatos/inscricoes-individuais/${inscricaoId}/reprovar`, {
    method: "PATCH",
    body: JSON.stringify({ observacaoAdmin })
  });
}

export async function atualizarInscricaoIndividual(
  inscricaoId: string | number,
  payload: { tamanhoCamisa?: string; valorTotalCentavos?: number; observacaoAdmin?: string }
) {
  return fazerRequisicao(`/campeonatos/inscricoes-individuais/${inscricaoId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function excluirInscricaoIndividual(inscricaoId: string | number) {
  return fazerRequisicao(`/campeonatos/inscricoes-individuais/${inscricaoId}`, {
    method: "DELETE"
  });
}

export async function montarEquipeComInscricoesIndividuais(
  campeonatoId: string | number,
  payload: {
    nomeEquipe: string;
    responsavel: string;
    contato?: string | null;
    inscricaoIds: Array<string | number>;
  }
) {
  return fazerRequisicao(`/campeonatos/${campeonatoId}/inscricoes-individuais/montar-equipe`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

