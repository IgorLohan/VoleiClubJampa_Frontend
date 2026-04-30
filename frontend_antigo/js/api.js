const URL_BASE = "http://localhost:3333";

function obterToken() {
  return localStorage.getItem("tokenAdmin");
}

function obterTokenParticipante() {
  return localStorage.getItem("tokenParticipante");
}

function obterCabecalhos(headersExtras = {}, usarTokenAdmin = true) {
  const headers = {
    "Content-Type": "application/json",
    ...headersExtras
  };

  if (usarTokenAdmin) {
    const token = obterToken();

    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

function obterCabecalhoParticipante() {
  const tokenParticipante = obterTokenParticipante();

  return tokenParticipante
    ? { Authorization: `Bearer ${tokenParticipante}` }
    : {};
}

async function fazerRequisicao(caminho, opcoes = {}) {
  const {
    headers,
    usarTokenAdmin = true,
    ...restoOpcoes
  } = opcoes;

  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    ...restoOpcoes,
    headers: obterCabecalhos(headers, usarTokenAdmin)
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || dados.detalhe || "Erro na requisição.");
  }

  return dados;
}

async function loginAdmin(dados) {
  return fazerRequisicao("/admin/login", {
    method: "POST",
    body: JSON.stringify(dados)
  });
}

async function cadastrarParticipante(dados) {
  return fazerRequisicao("/usuarios/cadastro", {
    method: "POST",
    body: JSON.stringify(dados),
    usarTokenAdmin: false
  });
}

async function loginParticipante(dados) {
  return fazerRequisicao("/usuarios/login", {
    method: "POST",
    body: JSON.stringify(dados),
    usarTokenAdmin: false
  });
}

async function listarMinhasInscricoes() {
  return fazerRequisicao("/usuarios/minhas-inscricoes", {
    method: "GET",
    headers: obterCabecalhoParticipante(),
    usarTokenAdmin: false
  });
}

async function listarCampeonatos() {
  return fazerRequisicao("/campeonatos", {
    usarTokenAdmin: false
  });
}

async function criarCampeonato(dadosCampeonato) {
  return fazerRequisicao("/campeonatos", {
    method: "POST",
    body: JSON.stringify(dadosCampeonato)
  });
}

async function buscarResumoCampeonato(id) {
  return fazerRequisicao(`/campeonatos/${id}/resumo`);
}

async function buscarResumoCampeonatoPublico(id) {
  return fazerRequisicao(`/campeonatos/${id}/resumo-publico`, {
    usarTokenAdmin: false
  });
}

async function encerrarInscricoes(id) {
  return fazerRequisicao(`/campeonatos/${id}/encerrar-inscricoes`, {
    method: "PATCH"
  });
}

async function reabrirInscricoes(id) {
  return fazerRequisicao(`/campeonatos/${id}/reabrir-inscricoes`, {
    method: "PATCH"
  });
}

async function gerarChaveamento(id) {
  return fazerRequisicao(`/campeonatos/${id}/chaveamento`, {
    method: "POST"
  });
}

async function buscarCampeonatoPorId(id) {
  return fazerRequisicao(`/campeonatos/${id}`, {
    usarTokenAdmin: false
  });
}

async function criarInscricao(campeonatoId, dadosInscricao) {
  return fazerRequisicao(`/campeonatos/${campeonatoId}/inscricoes`, {
    method: "POST",
    headers: obterCabecalhoParticipante(),
    body: JSON.stringify(dadosInscricao),
    usarTokenAdmin: false
  });
}

async function criarInscricaoIndividual(campeonatoId, dadosInscricaoIndividual) {
  return fazerRequisicao(`/campeonatos/${campeonatoId}/inscricoes-individuais`, {
    method: "POST",
    headers: obterCabecalhoParticipante(),
    body: JSON.stringify(dadosInscricaoIndividual),
    usarTokenAdmin: false
  });
}

async function listarInscricoesIndividuaisCampeonato(campeonatoId) {
  return fazerRequisicao(`/campeonatos/${campeonatoId}/inscricoes-individuais`, {
    method: "GET"
  });
}

async function aprovarInscricaoIndividual(inscricaoId) {
  return fazerRequisicao(
    `/campeonatos/inscricoes-individuais/${inscricaoId}/aprovar`,
    {
      method: "PATCH"
    }
  );
}

async function reprovarInscricaoIndividual(inscricaoId, observacaoAdmin = "") {
  return fazerRequisicao(
    `/campeonatos/inscricoes-individuais/${inscricaoId}/reprovar`,
    {
      method: "PATCH",
      body: JSON.stringify({
        observacaoAdmin
      })
    }
  );
}

async function montarEquipeComInscricoesIndividuais(campeonatoId, dadosEquipe) {
  return fazerRequisicao(
    `/campeonatos/${campeonatoId}/inscricoes-individuais/montar-equipe`,
    {
      method: "POST",
      body: JSON.stringify(dadosEquipe)
    }
  );
}

async function registrarPlacar(jogoId, sets) {
  return fazerRequisicao(`/jogos/${jogoId}/placar`, {
    method: "PATCH",
    body: JSON.stringify({ sets })
  });
}

async function excluirInscricao(inscricaoId) {
  return fazerRequisicao(`/campeonatos/inscricoes/${inscricaoId}`, {
    method: "DELETE"
  });
}

async function excluirCampeonato(campeonatoId) {
  return fazerRequisicao(`/campeonatos/${campeonatoId}`, {
    method: "DELETE"
  });
}

async function listarMeusCampeonatos() {
  return fazerRequisicao("/campeonatos/meus");
}

async function listarCampeonatosPublicos() {
  return fazerRequisicao("/campeonatos/publicos", {
    usarTokenAdmin: false
  });
}

async function atualizarCampeonato(campeonatoId, dadosCampeonato) {
  return fazerRequisicao(`/campeonatos/${campeonatoId}`, {
    method: "PUT",
    body: JSON.stringify(dadosCampeonato)
  });
}

async function atualizarInscricao(inscricaoId, dadosInscricao) {
  return fazerRequisicao(`/campeonatos/inscricoes/${inscricaoId}`, {
    method: "PUT",
    body: JSON.stringify(dadosInscricao)
  });
}

async function buscarPerfilParticipante() {
  return fazerRequisicao("/usuarios/perfil", {
    method: "GET",
    headers: obterCabecalhoParticipante(),
    usarTokenAdmin: false
  });
}

async function atualizarFotoPerfilParticipante(arquivo) {
  const tokenParticipante = obterTokenParticipante();

  if (!arquivo) {
    throw new Error("Nenhum arquivo selecionado.");
  }

  const formData = new FormData();
  formData.append("foto", arquivo);

  const resposta = await fetch(`${URL_BASE}/usuarios/perfil/foto`, {
    method: "PATCH",
    headers: tokenParticipante
      ? { Authorization: `Bearer ${tokenParticipante}` }
      : {},
    body: formData
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || dados.detalhe || "Erro no upload da foto.");
  }

  return dados;
}

async function atualizarPerfilParticipante(dados) {
  return fazerRequisicao("/usuarios/perfil", {
    method: "PUT",
    headers: obterCabecalhoParticipante(),
    body: JSON.stringify(dados),
    usarTokenAdmin: false
  });
}

async function criarEquipe(dadosEquipe) {
  return fazerRequisicao("/equipes", {
    method: "POST",
    headers: obterCabecalhoParticipante(),
    body: JSON.stringify(dadosEquipe),
    usarTokenAdmin: false
  });
}

async function listarMinhasEquipes() {
  return fazerRequisicao("/equipes/minhas", {
    method: "GET",
    headers: obterCabecalhoParticipante(),
    usarTokenAdmin: false
  });
}

async function buscarEquipe(equipeId) {
  return fazerRequisicao(`/equipes/${equipeId}`, {
    method: "GET",
    headers: obterCabecalhoParticipante(),
    usarTokenAdmin: false
  });
}

async function atualizarEquipe(equipeId, dadosEquipe) {
  return fazerRequisicao(`/equipes/${equipeId}`, {
    method: "PUT",
    headers: obterCabecalhoParticipante(),
    body: JSON.stringify(dadosEquipe),
    usarTokenAdmin: false
  });
}

async function excluirEquipe(equipeId) {
  return fazerRequisicao(`/equipes/${equipeId}`, {
    method: "DELETE",
    headers: obterCabecalhoParticipante(),
    usarTokenAdmin: false
  });
}

async function removerMembroEquipe(equipeId, membroId) {
  return fazerRequisicao(`/equipes/${equipeId}/membros/${membroId}`, {
    method: "DELETE",
    headers: obterCabecalhoParticipante(),
    usarTokenAdmin: false
  });
}

async function gerarConviteEquipe(equipeId) {
  return fazerRequisicao(`/equipes/${equipeId}/convites`, {
    method: "POST",
    headers: obterCabecalhoParticipante(),
    usarTokenAdmin: false
  });
}

async function buscarConviteEquipe(token) {
  return fazerRequisicao(`/equipes/convites/${token}`, {
    method: "GET",
    usarTokenAdmin: false
  });
}

async function aceitarConviteEquipe(token) {
  return fazerRequisicao(`/equipes/convites/${token}/aceitar`, {
    method: "POST",
    headers: obterCabecalhoParticipante(),
    usarTokenAdmin: false
  });
}

async function buscarMinhaInscricaoIndividual(campeonatoId) {
  return fazerRequisicao(`/campeonatos/${campeonatoId}/minha-inscricao-individual`, {
    method: "GET",
    headers: obterCabecalhoParticipante(),
    usarTokenAdmin: false
  });
}

export {
  loginAdmin,
  cadastrarParticipante,
  loginParticipante,
  listarMinhasInscricoes,
  listarCampeonatos,
  listarMeusCampeonatos,
  listarCampeonatosPublicos,
  criarCampeonato,
  buscarResumoCampeonato,
  buscarResumoCampeonatoPublico,
  encerrarInscricoes,
  reabrirInscricoes,
  gerarChaveamento,
  buscarCampeonatoPorId,
  criarInscricao,
  criarInscricaoIndividual,
  buscarMinhaInscricaoIndividual,
  listarInscricoesIndividuaisCampeonato,
  aprovarInscricaoIndividual,
  reprovarInscricaoIndividual,
  montarEquipeComInscricoesIndividuais,
  registrarPlacar,
  excluirInscricao,
  excluirCampeonato,
  atualizarInscricao,
  atualizarCampeonato,
  buscarPerfilParticipante,
  atualizarPerfilParticipante,
  atualizarFotoPerfilParticipante,
  criarEquipe,
  listarMinhasEquipes,
  buscarEquipe,
  atualizarEquipe,
  excluirEquipe,
  removerMembroEquipe,
  gerarConviteEquipe,
  buscarConviteEquipe,
  aceitarConviteEquipe,
  obterToken,
  obterTokenParticipante
};