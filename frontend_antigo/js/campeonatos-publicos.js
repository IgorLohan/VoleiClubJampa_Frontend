import { listarCampeonatosPublicos } from "./api.js";

const listaCampeonatosPublicos = document.getElementById("lista-campeonatos-publicos");
const buscaPublica = document.getElementById("busca-publica");
const filtroStatusPublico = document.getElementById("filtro-status-publico");
const filtroCategoriaPublico = document.getElementById("filtro-categoria-publico");
const filtroTipoPublico = document.getElementById("filtro-tipo-publico");
const participanteLogadoBox = document.getElementById("participante-logado-box");
const botaoLogoutParticipante = document.getElementById("botao-logout-participante");
const linkParticipante = document.getElementById("link-participante");
const linkMeuPerfil = document.getElementById("link-meu-perfil");

let campeonatos = [];

function obterParticipanteLogado() {
  const dados = localStorage.getItem("participanteLogado");
  return dados ? JSON.parse(dados) : null;
}

function obterTokenParticipante() {
  return localStorage.getItem("tokenParticipante");
}

function configurarSessaoParticipante() {
  const participante = obterParticipanteLogado();
  const token = obterTokenParticipante();

  if (!participante || !token) {
    participanteLogadoBox.classList.add("oculto");
    botaoLogoutParticipante.classList.add("oculto");
    linkParticipante.classList.remove("oculto");
    linkMeuPerfil.classList.add("oculto");
    return;
  }

  participanteLogadoBox.innerHTML = `
    <p><strong>Participante logado:</strong> ${participante.nome}</p>
    <p><strong>E-mail:</strong> ${participante.email}</p>
  `;

  participanteLogadoBox.classList.remove("oculto");
  botaoLogoutParticipante.classList.remove("oculto");
  linkParticipante.classList.add("oculto");
  linkMeuPerfil.classList.remove("oculto");
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

function traduzirStatus(status) {
  const mapa = {
    INSCRICOES_ABERTAS: "Inscrições abertas",
    AGUARDANDO_CHAVEAMENTO: "Aguardando chaveamento",
    EM_ANDAMENTO: "Em andamento",
    FINALIZADO: "Finalizado"
  };

  return mapa[status] || status;
}

function classeStatusCampeonato(status) {
  const mapa = {
    INSCRICOES_ABERTAS: "status-inscricoes",
    AGUARDANDO_CHAVEAMENTO: "status-aguardando",
    EM_ANDAMENTO: "status-andamento",
    FINALIZADO: "status-finalizado"
  };

  return mapa[status] || "status-aguardando";
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

function aplicarFiltros(lista) {
  const textoBusca = buscaPublica.value.trim().toLowerCase();
  const status = filtroStatusPublico.value;
  const categoria = filtroCategoriaPublico.value;
  const tipo = filtroTipoPublico.value;

  return lista.filter((campeonato) => {
    const nomeOk = campeonato.nome.toLowerCase().includes(textoBusca);
    const statusOk = status === "TODOS" || campeonato.statusCampeonato === status;
    const categoriaOk = categoria === "TODAS" || campeonato.categoria === categoria;
    const tipoOk = tipo === "TODOS" || campeonato.tipoParticipante === tipo;

    return nomeOk && statusOk && categoriaOk && tipoOk;
  });
}

function renderizarCampeonatos(lista) {
  if (!lista.length) {
    listaCampeonatosPublicos.innerHTML =
      "<p>Nenhum campeonato encontrado com os filtros atuais.</p>";
    return;
  }

  listaCampeonatosPublicos.innerHTML = lista
    .map((campeonato) => {
      const textoStatus = traduzirStatus(campeonato.statusCampeonato);
      const classeStatus = classeStatusCampeonato(campeonato.statusCampeonato);

      return `
        <div class="item-campeonato">
          <h3>${campeonato.nome}</h3>
          <p><strong>Data:</strong> ${formatarData(campeonato.data)}</p>
          <p><strong>Local:</strong> ${campeonato.local || "Não informado"}</p>
          <p><strong>Tipo:</strong> ${traduzirTipoParticipante(campeonato.tipoParticipante)}</p>
          <p><strong>Categoria:</strong> ${campeonato.categoria}</p>
          <p><strong>Formato:</strong> ${traduzirFormato(campeonato.formato)}</p>
          <p><strong>Participantes:</strong> ${campeonato.totais.participantes}</p>
          <p><strong>Jogos:</strong> ${campeonato.totais.jogos}</p>
          <p><strong>Inscrições abertas:</strong> ${
            campeonato.inscricoesAbertas ? "Sim" : "Não"
          }</p>

          <span class="badge-lista status-badge ${classeStatus}">
            ${textoStatus}
          </span>

          <div class="acoes-card">
            <a href="./campeonato-publico.html?id=${campeonato.id}">
              Ver detalhes
            </a>
            ${
              campeonato.inscricoesAbertas
                ? `<a href="./inscricao.html?id=${campeonato.id}">Participar</a>`
                : ""
            }
          </div>
        </div>
      `;
    })
    .join("");
}

function atualizarLista() {
  const listaFiltrada = aplicarFiltros(campeonatos);
  renderizarCampeonatos(listaFiltrada);
}

async function carregarCampeonatosPublicos() {
  try {
    listaCampeonatosPublicos.innerHTML = "<p>Carregando campeonatos...</p>";
    campeonatos = await listarCampeonatosPublicos();
    atualizarLista();
  } catch (error) {
    listaCampeonatosPublicos.innerHTML = `<p>Erro ao carregar campeonatos: ${error.message}</p>`;
  }
}

buscaPublica.addEventListener("input", atualizarLista);
filtroStatusPublico.addEventListener("change", atualizarLista);
filtroCategoriaPublico.addEventListener("change", atualizarLista);
filtroTipoPublico.addEventListener("change", atualizarLista);
botaoLogoutParticipante.addEventListener("click", sairParticipante);

configurarSessaoParticipante();
carregarCampeonatosPublicos();