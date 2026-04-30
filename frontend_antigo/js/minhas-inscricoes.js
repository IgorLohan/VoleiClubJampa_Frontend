import { listarMinhasInscricoes } from "./api.js";

const participanteLogadoBox = document.getElementById("participante-logado-box");
const botaoLogoutParticipante = document.getElementById("botao-logout-participante");
const mensagemMinhasInscricoes = document.getElementById("mensagem-minhas-inscricoes");
const listaMinhasInscricoes = document.getElementById("lista-minhas-inscricoes");

function obterParticipanteLogado() {
  const dados = localStorage.getItem("participanteLogado");
  return dados ? JSON.parse(dados) : null;
}

function obterTokenParticipante() {
  return localStorage.getItem("tokenParticipante");
}

function protegerPaginaParticipante() {
  if (!obterTokenParticipante()) {
    window.location.href = "./participante.html";
  }
}

function configurarSessaoParticipante() {
  const participante = obterParticipanteLogado();

  if (!participante) {
    participanteLogadoBox.innerHTML = "<p>Nenhum participante autenticado.</p>";
    return;
  }

  participanteLogadoBox.innerHTML = `
    <p><strong>Participante logado:</strong> ${participante.nome}</p>
    <p><strong>E-mail:</strong> ${participante.email}</p>
  `;
}

function sairParticipante() {
  localStorage.removeItem("tokenParticipante");
  localStorage.removeItem("participanteLogado");
  window.location.href = "./campeonatos-publicos.html";
}

function formatarData(data) {
  if (!data) return "Não informada";

  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: "UTC"
  });
}

function traduzirTipoParticipante(tipo) {
  const mapa = {
    DUPLA: "Dupla",
    TIME: "Quarteto"
  };

  return mapa[tipo] || tipo;
}

function traduzirFormato(formato) {
  const mapa = {
    MATA_MATA: "Mata-mata",
    DUPLA_ELIMINACAO: "Upper/Lower",
    TODOS_CONTRA_TODOS: "Todos contra todos"
  };

  return mapa[formato] || formato;
}

function renderizarMinhasInscricoes(inscricoes) {
  if (!inscricoes.length) {
    listaMinhasInscricoes.innerHTML =
      "<p>Você ainda não realizou nenhuma inscrição.</p>";
    return;
  }

  listaMinhasInscricoes.innerHTML = inscricoes
    .map((inscricao) => {
      const campeonato = inscricao.campeonato;

      return `
        <div class="item-campeonato">
          <h3>${campeonato.nome}</h3>
          <p><strong>Equipe:</strong> ${inscricao.nomeEquipe}</p>
          <p><strong>Capitã(o):</strong> ${inscricao.responsavel}</p>
          <p><strong>Contato:</strong> ${inscricao.contato || "Não informado"}</p>
          <p><strong>Status da inscrição:</strong> ${inscricao.statusInscricao}</p>
          <p><strong>Data do campeonato:</strong> ${formatarData(campeonato.data)}</p>
          <p><strong>Local:</strong> ${campeonato.local || "Não informado"}</p>
          <p><strong>Tipo:</strong> ${traduzirTipoParticipante(campeonato.tipoParticipante)}</p>
          <p><strong>Categoria:</strong> ${campeonato.categoria}</p>
          <p><strong>Formato:</strong> ${traduzirFormato(campeonato.formato)}</p>

          <div class="acoes-card">
            <a href="./campeonato-publico.html?id=${campeonato.id}">
              Ver campeonato
            </a>
          </div>
        </div>
      `;
    })
    .join("");
}

async function carregarMinhasInscricoes() {
  try {
    mensagemMinhasInscricoes.textContent = "Carregando inscrições...";
    const inscricoes = await listarMinhasInscricoes();
    renderizarMinhasInscricoes(inscricoes);
    mensagemMinhasInscricoes.textContent = "";
  } catch (error) {
    mensagemMinhasInscricoes.textContent = `Erro ao carregar inscrições: ${error.message}`;
  }
}

botaoLogoutParticipante.addEventListener("click", sairParticipante);

protegerPaginaParticipante();
configurarSessaoParticipante();
carregarMinhasInscricoes();