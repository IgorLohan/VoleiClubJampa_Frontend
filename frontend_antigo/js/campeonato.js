import {
  buscarResumoCampeonato,
  encerrarInscricoes,
  reabrirInscricoes,
  gerarChaveamento,
  registrarPlacar,
  excluirInscricao,
  excluirCampeonato,
  atualizarInscricao,
  atualizarCampeonato,
  listarInscricoesIndividuaisCampeonato,
  aprovarInscricaoIndividual,
  reprovarInscricaoIndividual,
  montarEquipeComInscricoesIndividuais,
  obterToken
} from "./api.js";

const params = new URLSearchParams(window.location.search);
const campeonatoId = params.get("id");

const dadosCampeonato = document.getElementById("dados-campeonato");
const listaParticipantes = document.getElementById("lista-participantes");
const listaJogadoresIndividuais = document.getElementById("lista-jogadores-individuais");
const listaJogos = document.getElementById("lista-jogos");
const podio = document.getElementById("podio");
const mensagemCampeonato = document.getElementById("mensagem-campeonato");
const botaoEncerrar = document.getElementById("botao-encerrar");
const botaoReabrir = document.getElementById("botao-reabrir");
const botaoChaveamento = document.getElementById("botao-chaveamento");
const botaoCopiarLink = document.getElementById("botao-copiar-link");
const botaoExcluirCampeonato = document.getElementById("botao-excluir-campeonato");
const botaoLogout = document.getElementById("botao-logout");
const usuarioLogadoBox = document.getElementById("usuario-logado-box");
const chaveCampeonato = document.getElementById("chave-campeonato");

let resumoAtual = null;
let inscricaoEmEdicaoId = null;
let campeonatoEmEdicao = false;
let inscricoesIndividuaisAtual = [];

function obterAdminLogado() {
  const dados = localStorage.getItem("adminLogado");
  return dados ? JSON.parse(dados) : null;
}

function estaAutenticado() {
  return Boolean(obterToken());
}

function protegerPagina() {
  if (!estaAutenticado()) {
    window.location.href = "./login.html";
  }
}

function configurarSessao() {
  const admin = obterAdminLogado();

  if (!admin) {
    usuarioLogadoBox.innerHTML = "<p>Nenhum administrador autenticado.</p>";
    return;
  }

  usuarioLogadoBox.innerHTML = `
    <p><strong>Administrador logado:</strong> ${admin.nome}</p>
    <p><strong>E-mail:</strong> ${admin.email}</p>
  `;
}

function sair() {
  localStorage.removeItem("tokenAdmin");
  localStorage.removeItem("adminLogado");
  window.location.href = "./login.html";
}

function formatarData(data) {
  if (!data) return "Não informada";

  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: "UTC"
  });
}

function formatarDataInput(data) {
  if (!data) return "";
  return new Date(data).toISOString().split("T")[0];
}

function formatarMoedaCentavos(valorCentavos) {
  const valor = Number(valorCentavos || 0) / 100;

  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function traduzirTipoParticipante(tipo) {
  const mapa = {
    DUPLA: "Dupla",
    TIME: "Quarteto"
  };

  return mapa[tipo] || tipo;
}

function traduzirModoInscricao(modoInscricao) {
  const mapa = {
    POR_EQUIPE: "Por equipe",
    INDIVIDUAL: "Individual"
  };

  return mapa[modoInscricao] || "Por equipe";
}

function traduzirSexoUsuario(sexo) {
  const mapa = {
    MASCULINO: "Masculino",
    FEMININO: "Feminino",
    OUTRO: "Outro",
    PREFIRO_NAO_INFORMAR: "Prefiro não informar"
  };

  return mapa[sexo] || "Não informado";
}

function traduzirStatusInscricaoIndividual(status) {
  const mapa = {
    PENDENTE: "Aguardando formação de equipe",
    USADA_EM_EQUIPE: "Já vinculado a uma equipe",
    CANCELADA: "Cancelada"
  };

  return mapa[status] || status;
}

function traduzirStatusAnaliseInscricaoIndividual(statusAnalise) {
  const mapa = {
    AGUARDANDO_ANALISE: "Aguardando análise do admin",
    APROVADA: "Aprovada",
    REPROVADA: "Reprovada"
  };

  return mapa[statusAnalise] || statusAnalise || "Não informado";
}

function traduzirFormato(formato) {
  const mapa = {
    MATA_MATA: "Mata-mata",
    GRUPOS_3X4_REPESCAGEM: "Fase de grupos + mata-mata",
    DUPLA_ELIMINACAO: "Upper/Lower",
    TODOS_CONTRA_TODOS: "Todos contra todos"
  };

  return mapa[formato] || formato;
}

function traduzirFase(fase) {
  const mapa = {
    FASE_GRUPOS: "Fase de grupos",
    REPESCAGEM: "Repescagem",
    REPESCAGEM_1: "Repescagem 1",
    REPESCAGEM_2: "Repescagem 2",
    SEMIFINAL_1: "Semifinal 1",
    SEMIFINAL_2: "Semifinal 2",
    FINAL: "Final",
    TERCEIRO_LUGAR: "3º Lugar",
    PRIMEIRA_FASE_1: "Primeira fase 1",
    PRIMEIRA_FASE_2: "Primeira fase 2",
    PRIMEIRA_FASE_3: "Primeira fase 3",
    PRIMEIRA_FASE_4: "Primeira fase 4",
    QUARTAS_1: "Quartas 1",
    QUARTAS_2: "Quartas 2",
    QUARTAS_3: "Quartas 3",
    QUARTAS_4: "Quartas 4",
    OITAVAS_1: "Oitavas 1",
    OITAVAS_2: "Oitavas 2",
    OITAVAS_3: "Oitavas 3",
    OITAVAS_4: "Oitavas 4",
    OITAVAS_5: "Oitavas 5",
    OITAVAS_6: "Oitavas 6",
    OITAVAS_7: "Oitavas 7",
    OITAVAS_8: "Oitavas 8"
  };

  return mapa[fase] || fase.replaceAll("_", " ");
}

function traduzirStatusCampeonato(status) {
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

function quantidadeMinimaParaChaveamento() {
  return 2;
}

function obterLimiteMembrosPorTipo(tipoParticipante) {
  if (tipoParticipante === "DUPLA") return 2;
  if (tipoParticipante === "TIME") return 4;
  return 0;
}

function contarJogadoresIndividuaisAtivos() {
  return inscricoesIndividuaisAtual.filter(
    (inscricao) => inscricao.status !== "CANCELADA"
  ).length;
}

function obterRotuloQuantidadeMaxima(modoInscricao) {
  if (modoInscricao === "INDIVIDUAL") {
    return "Quantidade máxima de jogadores";
  }

  return "Quantidade máxima de equipes";
}

function obterTextoAjudaQuantidadeMaxima(campeonato) {
  if (campeonato.modoInscricao === "INDIVIDUAL") {
    return "Em campeonatos individuais, este número representa jogadores. Inscrições reprovadas/canceladas não contam.";
  }

  if (campeonato.formato === "GRUPOS_3X4_REPESCAGEM") {
    return "No formato com grupos por equipe, use 8 ou 12 equipes.";
  }

  return "Em campeonatos por equipe, este número representa equipes inscritas.";
}

function obterMinimoQuantidadeMaxima(resumo) {
  if (resumo.campeonato.modoInscricao === "INDIVIDUAL") {
    return Math.max(2, contarJogadoresIndividuaisAtivos());
  }

  return Math.max(2, resumo.totais.participantes);
}

function inscricaoIndividualAguardandoAnalise(inscricao) {
  return (
    inscricao.status !== "CANCELADA" &&
    inscricao.statusAnalise === "AGUARDANDO_ANALISE"
  );
}

function inscricaoIndividualAprovada(inscricao) {
  return (
    inscricao.status !== "CANCELADA" &&
    inscricao.statusAnalise === "APROVADA"
  );
}

function inscricaoIndividualDisponivel(inscricao) {
  return (
    inscricao.status === "PENDENTE" &&
    inscricao.statusAnalise === "APROVADA" &&
    !inscricao.participanteId &&
    !inscricao.participante
  );
}

function quantidadeValidaParaGerarChaveamento(resumo) {
  if (resumo.campeonato.formato === "GRUPOS_3X4_REPESCAGEM") {
    return [8, 12].includes(resumo.totais.participantes);
  }

  return resumo.totais.participantes >= quantidadeMinimaParaChaveamento();
}

function obterBaseFase(fase) {
  if (fase === "FINAL") return "FINAL";
  if (fase === "TERCEIRO_LUGAR") return "TERCEIRO_LUGAR";
  if (fase === "REPESCAGEM" || fase.startsWith("REPESCAGEM")) return "REPESCAGEM";
  if (fase === "FASE_GRUPOS") return "FASE_GRUPOS";
  if (fase.startsWith("PRIMEIRA_FASE")) return "PRIMEIRA_FASE";
  if (fase.startsWith("OITAVAS")) return "OITAVAS";
  if (fase.startsWith("QUARTAS")) return "QUARTAS";
  if (fase.startsWith("SEMIFINAL")) return "SEMIFINAL";

  const match = fase.match(/^(.*)_\d+$/);
  if (match) return match[1];

  return fase;
}

function obterIndiceFase(fase) {
  const baseFase = obterBaseFase(fase);

  const ordem = [
    "FASE_GRUPOS",
    "REPESCAGEM",
    "PRIMEIRA_FASE",
    "OITAVAS",
    "QUARTAS",
    "SEMIFINAL",
    "FINAL",
    "TERCEIRO_LUGAR"
  ];

  const indice = ordem.indexOf(baseFase);
  return indice === -1 ? 999 : indice;
}

function obterTituloGrupoFase(baseFase) {
  const mapa = {
    FASE_GRUPOS: "Fase de grupos",
    REPESCAGEM: "Repescagem",
    PRIMEIRA_FASE: "Primeira fase",
    OITAVAS: "Oitavas",
    QUARTAS: "Quartas de final",
    SEMIFINAL: "Semifinais",
    FINAL: "Final",
    TERCEIRO_LUGAR: "3º Lugar"
  };

  return mapa[baseFase] || baseFase.replaceAll("_", " ");
}

function mensagemApoioChaveamento(resumo) {
  const total = resumo.totais.participantes;

  if (resumo.jogos.length > 0) {
    return "O chaveamento já foi gerado para este campeonato.";
  }

  if (resumo.campeonato.inscricoesAbertas) {
    return "Feche as inscrições antes de gerar o chaveamento.";
  }

  if (
    resumo.campeonato.formato === "GRUPOS_3X4_REPESCAGEM" &&
    ![8, 12].includes(total)
  ) {
    return `Este formato precisa ter 8 ou 12 equipes aprovadas. Atualmente há ${total}.`;
  }

  if (total < 2) {
    return "É necessário ter pelo menos 2 equipes formadas para gerar o chaveamento.";
  }

  return "Campeonato pronto para gerar chaveamento.";
}

function atualizarEstadoBotoes(resumo) {
  const inscricoesFechadas = !resumo.campeonato.inscricoesAbertas;
  const jaTemJogos = resumo.jogos.length > 0;
  const finalizado = resumo.statusCampeonato === "FINALIZADO";
  const podeGerar = quantidadeValidaParaGerarChaveamento(resumo);

  botaoEncerrar.disabled = inscricoesFechadas || finalizado;

  if (botaoReabrir) {
    botaoReabrir.disabled = !inscricoesFechadas || jaTemJogos || finalizado;
  }

  botaoChaveamento.disabled =
    jaTemJogos ||
    finalizado ||
    resumo.campeonato.inscricoesAbertas ||
    !podeGerar;
}

function renderizarFormularioEdicaoCampeonato(resumo) {
  const campeonato = resumo.campeonato;
  const possuiInscritos =
    resumo.totais.participantes > 0 ||
    inscricoesIndividuaisAtual.some((inscricao) => inscricao.status !== "CANCELADA");

  const minimoQuantidade = obterMinimoQuantidadeMaxima(resumo);
  const rotuloQuantidade = obterRotuloQuantidadeMaxima(campeonato.modoInscricao);
  const textoAjudaQuantidade = obterTextoAjudaQuantidadeMaxima(campeonato);

  return `
    <div class="area-edicao-campeonato">
      <h4>Editar campeonato</h4>

      ${
        possuiInscritos
          ? `
            <p class="info-auxiliar">
              Como já existem equipes ou jogadores inscritos, os campos Tipo, Categoria, Formato e Forma de inscrição não podem mais ser alterados.
            </p>
          `
          : ""
      }

      <form id="form-edicao-campeonato" class="formulario-edicao-campeonato">
        <div class="grupo-formulario">
          <label>Nome</label>
          <input type="text" name="nome" value="${campeonato.nome}" required />
        </div>

        <div class="grupo-formulario">
          <label>Data</label>
          <input type="date" name="data" value="${formatarDataInput(campeonato.data)}" />
        </div>

        <div class="grupo-formulario">
          <label>Local</label>
          <input type="text" name="local" value="${campeonato.local || ""}" />
        </div>

        <div class="grupo-formulario">
          <label>Tipo</label>
          <select name="tipoParticipante" ${possuiInscritos ? "disabled" : ""} required>
            <option value="DUPLA" ${campeonato.tipoParticipante === "DUPLA" ? "selected" : ""}>Dupla</option>
            <option value="TIME" ${campeonato.tipoParticipante === "TIME" ? "selected" : ""}>Quarteto</option>
          </select>
        </div>

        <div class="grupo-formulario">
          <label>Categoria</label>
          <select name="categoria" ${possuiInscritos ? "disabled" : ""} required>
            <option value="MASCULINO" ${campeonato.categoria === "MASCULINO" ? "selected" : ""}>Masculino</option>
            <option value="FEMININO" ${campeonato.categoria === "FEMININO" ? "selected" : ""}>Feminino</option>
            <option value="MISTA" ${campeonato.categoria === "MISTA" ? "selected" : ""}>Mista</option>
          </select>
        </div>

        <div class="grupo-formulario">
          <label>Forma de inscrição</label>
          <select name="modoInscricao" ${possuiInscritos ? "disabled" : ""} required>
            <option value="POR_EQUIPE" ${campeonato.modoInscricao === "POR_EQUIPE" ? "selected" : ""}>Por equipe</option>
            <option value="INDIVIDUAL" ${campeonato.modoInscricao === "INDIVIDUAL" ? "selected" : ""}>Individual</option>
          </select>
        </div>

        <div class="grupo-formulario">
          <label>Formato</label>
          <select name="formato" ${possuiInscritos ? "disabled" : ""} required>
            <option value="MATA_MATA" ${campeonato.formato === "MATA_MATA" ? "selected" : ""}>Mata-mata</option>
            <option value="GRUPOS_3X4_REPESCAGEM" ${campeonato.formato === "GRUPOS_3X4_REPESCAGEM" ? "selected" : ""}>Fase de grupos + mata-mata</option>
            <option value="DUPLA_ELIMINACAO" ${campeonato.formato === "DUPLA_ELIMINACAO" ? "selected" : ""}>Upper/Lower</option>
            <option value="TODOS_CONTRA_TODOS" ${campeonato.formato === "TODOS_CONTRA_TODOS" ? "selected" : ""}>Todos contra todos</option>
          </select>
        </div>

        <div class="grupo-formulario">
          <label>${rotuloQuantidade}</label>
          <input
            type="number"
            name="quantidadeMaxima"
            min="${minimoQuantidade}"
            value="${campeonato.quantidadeMaxima ?? ""}"
          />
          <small class="texto-ajuda">
            ${textoAjudaQuantidade}
          </small>
        </div>

        <div class="acoes-card">
          <button type="submit" class="botao-pequeno">Salvar campeonato</button>
          <button type="button" id="botao-cancelar-edicao-campeonato" class="botao-pequeno secundario">
            Cancelar
          </button>
        </div>

        <p id="mensagem-edicao-campeonato" class="mensagem-edicao-inscricao"></p>
      </form>
    </div>
  `;
}

function renderizarResumo(resumo) {
  const campeonato = resumo.campeonato;
  const textoStatus = traduzirStatusCampeonato(resumo.statusCampeonato);
  const classeStatus = classeStatusCampeonato(resumo.statusCampeonato);
  const mensagemChaveamento = mensagemApoioChaveamento(resumo);
  const podeEditarCampeonato = resumo.jogos.length === 0;
  const rotuloQuantidade = obterRotuloQuantidadeMaxima(campeonato.modoInscricao);

  const jogadoresIndividuaisAtivos = contarJogadoresIndividuaisAtivos();

  const jogadoresAguardandoAnalise = inscricoesIndividuaisAtual.filter(
    inscricaoIndividualAguardandoAnalise
  ).length;

  const jogadoresAprovados = inscricoesIndividuaisAtual.filter(
    inscricaoIndividualAprovada
  ).length;

  dadosCampeonato.innerHTML = `
    <div class="bloco-informacoes">
      <p><strong>Nome:</strong> ${campeonato.nome}</p>
      <p><strong>Data:</strong> ${formatarData(campeonato.data)}</p>
      <p><strong>Local:</strong> ${campeonato.local || "Não informado"}</p>
      <p><strong>Tipo:</strong> ${traduzirTipoParticipante(campeonato.tipoParticipante)}</p>
      <p><strong>Categoria:</strong> ${campeonato.categoria}</p>
      <p><strong>Formato:</strong> ${traduzirFormato(campeonato.formato)}</p>
      <p><strong>Forma de inscrição:</strong> ${traduzirModoInscricao(campeonato.modoInscricao)}</p>
      <p><strong>${rotuloQuantidade}:</strong> ${campeonato.quantidadeMaxima ?? "Não definida"}</p>
      <p><strong>Inscrições abertas:</strong> ${campeonato.inscricoesAbertas ? "Sim" : "Não"}</p>
      <p><strong>Total de equipes:</strong> ${resumo.totais.participantes}</p>
      <p><strong>Jogadores individuais ativos:</strong> ${jogadoresIndividuaisAtivos}</p>
      <p><strong>Aguardando análise:</strong> ${jogadoresAguardandoAnalise}</p>
      <p><strong>Jogadores aprovados:</strong> ${jogadoresAprovados}</p>
      <p><strong>Total de jogos:</strong> ${resumo.totais.jogos}</p>
      <p><strong>Jogos finalizados:</strong> ${resumo.totais.jogosFinalizados}</p>
      <span class="status-badge ${classeStatus}">${textoStatus}</span>
      <p class="info-auxiliar">Use o botão de copiar link para enviar a página pública de inscrição aos participantes.</p>
      <p class="info-auxiliar"><strong>Chaveamento:</strong> ${mensagemChaveamento}</p>

      ${
        podeEditarCampeonato
          ? `
            <div class="acoes-card" style="margin-top: 16px;">
              <button id="botao-editar-campeonato" class="botao-pequeno" type="button">
                Editar campeonato
              </button>
            </div>
          `
          : `
            <p class="info-auxiliar">
              A edição do campeonato fica indisponível após gerar o chaveamento.
            </p>
          `
      }

      ${campeonatoEmEdicao && podeEditarCampeonato ? renderizarFormularioEdicaoCampeonato(resumo) : ""}
    </div>
  `;

  if (podeEditarCampeonato) {
    conectarEventosEdicaoCampeonato();
    conectarFormularioEdicaoCampeonato();
    conectarCancelarEdicaoCampeonato();
  }
}

function renderizarFormularioEdicao(participante) {
  return `
    <form class="formulario-edicao-inscricao" data-form-edicao-id="${participante.id}">
      <div class="grupo-formulario">
        <label>Nome da equipe</label>
        <input
          type="text"
          name="nomeEquipe"
          value="${participante.nomeEquipe}"
          required
        />
      </div>

      <div class="grupo-formulario">
        <label>Capitã(o)</label>
        <input
          type="text"
          name="responsavel"
          value="${participante.responsavel}"
          required
        />
      </div>

      <div class="grupo-formulario">
        <label>Telefone para contato</label>
        <input
          type="tel"
          name="contato"
          value="${participante.contato || ""}"
          placeholder="(83) 99999-9999"
        />
      </div>

      <div class="bloco-jogadores-edicao">
        ${participante.jogadores
          .map(
            (jogador, index) => `
              <div class="card-jogador">
                <h4>Jogador ${index + 1}</h4>

                <div class="grupo-formulario">
                  <label>Nome</label>
                  <input
                    type="text"
                    name="jogador-nome-${index}"
                    value="${jogador.nome}"
                    required
                  />
                </div>

                <div class="grupo-formulario">
                  <label>Gênero</label>
                  <select name="jogador-genero-${index}" required>
                    <option value="M" ${jogador.genero === "M" ? "selected" : ""}>Masculino</option>
                    <option value="F" ${jogador.genero === "F" ? "selected" : ""}>Feminino</option>
                  </select>
                </div>
              </div>
            `
          )
          .join("")}
      </div>

      <div class="acoes-card">
        <button type="submit" class="botao-pequeno">Salvar alterações</button>
        <button
          type="button"
          class="botao-pequeno secundario"
          data-cancelar-edicao-id="${participante.id}"
        >
          Cancelar
        </button>
      </div>

      <p class="mensagem-edicao-inscricao" id="mensagem-edicao-${participante.id}"></p>
    </form>
  `;
}

function renderizarEquipes(participantes) {
  if (!participantes.length) {
    listaParticipantes.innerHTML = "<p>Nenhuma equipe inscrita ainda.</p>";
    return;
  }

  const podeEditarOuExcluir = resumoAtual ? resumoAtual.jogos.length === 0 : false;

  listaParticipantes.innerHTML = `
    <div class="lista-simples">
      ${participantes
        .map((participante) => {
          const estaEditando = inscricaoEmEdicaoId === participante.id;

          return `
            <div class="item-lista">
              <h3>${participante.nomeEquipe}</h3>
              <p><strong>Capitã(o):</strong> ${participante.responsavel}</p>
              <p><strong>Telefone:</strong> ${participante.contato || "Não informado"}</p>
              <p><strong>Status:</strong> ${participante.statusInscricao}</p>

              <p><strong>Jogadores da equipe:</strong></p>
              <ul>
                ${participante.jogadores
                  .map((jogador) => `<li>${jogador.nome} (${jogador.genero})</li>`)
                  .join("")}
              </ul>

              ${
                podeEditarOuExcluir
                  ? `
                    <div class="acoes-card">
                      <button
                        class="botao-pequeno"
                        data-editar-inscricao-id="${participante.id}"
                      >
                        Editar equipe inscrita
                      </button>

                      <button
                        class="botao-pequeno botao-excluir"
                        data-inscricao-id="${participante.id}"
                      >
                        Excluir equipe inscrita
                      </button>
                    </div>
                  `
                  : `
                    <p class="info-auxiliar">
                      A edição e exclusão de equipes ficam indisponíveis após gerar o chaveamento.
                    </p>
                  `
              }

              ${
                estaEditando && podeEditarOuExcluir
                  ? `
                    <div class="area-edicao-inscricao">
                      <h4>Editar equipe inscrita</h4>
                      ${renderizarFormularioEdicao(participante)}
                    </div>
                  `
                  : ""
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  if (podeEditarOuExcluir) {
    conectarEventosEdicaoInscricao();
    conectarEventosFormularioEdicaoInscricao();
    conectarEventosCancelarEdicaoInscricao();
    conectarEventosExclusaoInscricao();
  }
}

function renderizarFormularioMontarEquipe(inscricoesDisponiveis) {
  if (!resumoAtual) return "";

  const campeonato = resumoAtual.campeonato;
  const podeMontarEquipe =
    campeonato.modoInscricao === "INDIVIDUAL" &&
    resumoAtual.jogos.length === 0;

  if (!podeMontarEquipe) {
    return "";
  }

  const quantidadeNecessaria = obterLimiteMembrosPorTipo(campeonato.tipoParticipante);

  if (inscricoesDisponiveis.length < quantidadeNecessaria) {
    return `
      <div class="area-edicao-inscricao" style="margin-bottom: 16px;">
        <h4>Montar equipe</h4>
        <p class="info-auxiliar">
          Para montar uma equipe, é necessário ter pelo menos ${quantidadeNecessaria} jogador(es) aprovados e disponíveis.
        </p>
      </div>
    `;
  }

  return `
    <div class="area-edicao-inscricao" style="margin-bottom: 16px;">
      <h4>Montar equipe com jogadores aprovados</h4>

      <p class="info-auxiliar">
        Selecione exatamente ${quantidadeNecessaria} jogador(es) aprovados para formar uma equipe.
      </p>

      <form id="form-montar-equipe-individual" class="formulario-edicao-inscricao">
        <div class="grupo-formulario">
          <label for="nome-equipe-montada">Nome da equipe</label>
          <input
            type="text"
            id="nome-equipe-montada"
            name="nomeEquipe"
            placeholder="Ex: Equipe 1"
            required
          />
        </div>

        <div class="grupo-formulario">
          <label for="responsavel-equipe-montada">Capitã(o)</label>
          <input
            type="text"
            id="responsavel-equipe-montada"
            name="responsavel"
            placeholder="Opcional: se vazio, será usado o nome do primeiro jogador"
          />
        </div>

        <div class="grupo-formulario">
          <label for="contato-equipe-montada">Contato</label>
          <input
            type="text"
            id="contato-equipe-montada"
            name="contato"
            placeholder="Opcional"
          />
        </div>

        <div class="acoes-card">
          <button type="submit" class="botao-pequeno">
            Criar equipe com selecionados
          </button>
        </div>

        <p id="mensagem-montar-equipe" class="mensagem-edicao-inscricao"></p>
      </form>
    </div>
  `;
}

function renderizarComprovante(inscricao) {
  if (!inscricao.comprovantePagamento) {
    return "<p><strong>Comprovante:</strong> Não enviado</p>";
  }

  return `
    <div style="margin-top: 12px;">
      <p><strong>Comprovante de pagamento:</strong></p>

      <a
        href="${inscricao.comprovantePagamento}"
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir comprovante em nova aba"
      >
        <img
          src="${inscricao.comprovantePagamento}"
          alt="Comprovante de pagamento enviado"
          style="
            width: 220px;
            max-width: 100%;
            max-height: 260px;
            object-fit: contain;
            display: block;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            background: #ffffff;
            padding: 8px;
            margin-top: 8px;
            cursor: pointer;
          "
        />
      </a>

      <p class="info-auxiliar" style="margin-top: 6px;">
        Clique na imagem para abrir em tamanho maior.
      </p>
    </div>
  `;
}

function renderizarInscricoesAguardandoAnalise(inscricoesAguardando) {
  if (!inscricoesAguardando.length) {
    return `
      <div class="area-edicao-inscricao" style="margin-bottom: 16px;">
        <h4>Inscrições aguardando análise</h4>
        <p class="info-auxiliar">Nenhuma inscrição aguardando análise no momento.</p>
      </div>
    `;
  }

  return `
    <div class="area-edicao-inscricao" style="margin-bottom: 16px; border-color: #fde68a; background: #fffbeb;">
      <h4>Inscrições aguardando análise</h4>

      <p class="info-auxiliar">
        Confira o comprovante de pagamento e o tamanho da camisa antes de aprovar.
      </p>

      <div class="lista-simples" style="margin-top: 12px;">
        ${inscricoesAguardando
          .map((inscricao) => {
            const usuario = inscricao.usuario;

            return `
              <div class="item-lista">
                <h3>${usuario?.nome || "Jogador"}</h3>

                <p><strong>E-mail:</strong> ${usuario?.email || "Não informado"}</p>
                <p><strong>Contato:</strong> ${usuario?.contato || "Não informado"}</p>
                <p><strong>Sexo:</strong> ${traduzirSexoUsuario(usuario?.sexo)}</p>
                <p><strong>Tamanho da camisa:</strong> ${inscricao.tamanhoCamisa || "Não informado"}</p>
                <p><strong>Valor pago:</strong> ${formatarMoedaCentavos(inscricao.valorTotalCentavos)}</p>
                <p><strong>Status da análise:</strong> ${traduzirStatusAnaliseInscricaoIndividual(inscricao.statusAnalise)}</p>
                <p><strong>Enviado em:</strong> ${formatarData(inscricao.criadoEm)}</p>

                ${renderizarComprovante(inscricao)}

                <div class="acoes-card">
                  <button
                    type="button"
                    class="botao-pequeno"
                    data-aprovar-inscricao-individual-id="${inscricao.id}"
                  >
                    Aprovar inscrição
                  </button>

                  <button
                    type="button"
                    class="botao-pequeno botao-excluir"
                    data-reprovar-inscricao-individual-id="${inscricao.id}"
                  >
                    Reprovar inscrição
                  </button>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderizarListaJogadoresAprovados(inscricoesAprovadas) {
  if (!inscricoesAprovadas.length) {
    return `
      <div class="area-edicao-inscricao">
        <h4>Jogadores aprovados</h4>
        <p class="info-auxiliar">
          Nenhum jogador aprovado ainda. Aprove inscrições após conferir os comprovantes.
        </p>
      </div>
    `;
  }

  const inscricoesDisponiveis = inscricoesAprovadas.filter(inscricaoIndividualDisponivel);
  const podeSelecionar =
    resumoAtual?.campeonato?.modoInscricao === "INDIVIDUAL" &&
    resumoAtual?.jogos?.length === 0;

  return `
    ${renderizarFormularioMontarEquipe(inscricoesDisponiveis)}

    <div class="area-edicao-inscricao">
      <h4>Jogadores aprovados</h4>

      <div class="lista-simples" style="margin-top: 12px;">
        ${inscricoesAprovadas
          .map((inscricao) => {
            const usuario = inscricao.usuario;
            const participante = inscricao.participante;
            const disponivel = inscricaoIndividualDisponivel(inscricao);

            return `
              <div class="item-lista">
                <h3>${usuario?.nome || "Jogador"}</h3>

                ${
                  podeSelecionar && disponivel
                    ? `
                      <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <input
                          type="checkbox"
                          data-checkbox-inscricao-individual
                          value="${inscricao.id}"
                        />
                        Selecionar para montar equipe
                      </label>
                    `
                    : ""
                }

                <p><strong>E-mail:</strong> ${usuario?.email || "Não informado"}</p>
                <p><strong>Contato:</strong> ${usuario?.contato || "Não informado"}</p>
                <p><strong>Sexo:</strong> ${traduzirSexoUsuario(usuario?.sexo)}</p>
                <p><strong>Tamanho da camisa:</strong> ${inscricao.tamanhoCamisa || "Não informado"}</p>
                <p><strong>Status:</strong> ${traduzirStatusInscricaoIndividual(inscricao.status)}</p>
                <p><strong>Status da análise:</strong> ${traduzirStatusAnaliseInscricaoIndividual(inscricao.statusAnalise)}</p>
                <p><strong>Inscrito em:</strong> ${formatarData(inscricao.criadoEm)}</p>

                ${
                  participante
                    ? `
                      <p>
                        <strong>Equipe formada:</strong> ${participante.nomeEquipe}
                      </p>
                    `
                    : `
                      <p class="info-auxiliar">
                        Este jogador está aprovado e disponível para formação de equipe.
                      </p>
                    `
                }
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderizarInscricoesReprovadas(inscricoesReprovadas) {
  if (!inscricoesReprovadas.length) {
    return "";
  }

  return `
    <div class="area-edicao-inscricao" style="margin-top: 16px; border-color: #fecaca; background: #fef2f2;">
      <h4>Inscrições reprovadas/canceladas</h4>

      <div class="lista-simples" style="margin-top: 12px;">
        ${inscricoesReprovadas
          .map((inscricao) => {
            const usuario = inscricao.usuario;

            return `
              <div class="item-lista">
                <h3>${usuario?.nome || "Jogador"}</h3>
                <p><strong>E-mail:</strong> ${usuario?.email || "Não informado"}</p>
                <p><strong>Contato:</strong> ${usuario?.contato || "Não informado"}</p>
                <p><strong>Tamanho da camisa:</strong> ${inscricao.tamanhoCamisa || "Não informado"}</p>
                <p><strong>Status:</strong> ${traduzirStatusInscricaoIndividual(inscricao.status)}</p>
                <p><strong>Status da análise:</strong> ${traduzirStatusAnaliseInscricaoIndividual(inscricao.statusAnalise)}</p>
                <p><strong>Observação:</strong> ${inscricao.observacaoAdmin || "Não informada"}</p>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderizarJogadoresIndividuais(inscricoes) {
  if (!listaJogadoresIndividuais) {
    return;
  }

  if (!inscricoes || !inscricoes.length) {
    listaJogadoresIndividuais.innerHTML = `
      <p>Nenhum jogador inscrito individualmente ainda.</p>
    `;
    return;
  }

  const inscricoesAguardando = inscricoes.filter(inscricaoIndividualAguardandoAnalise);
  const inscricoesAprovadas = inscricoes.filter(inscricaoIndividualAprovada);
  const inscricoesReprovadas = inscricoes.filter(
    (inscricao) =>
      inscricao.status === "CANCELADA" ||
      inscricao.statusAnalise === "REPROVADA"
  );

  listaJogadoresIndividuais.innerHTML = `
    ${renderizarInscricoesAguardandoAnalise(inscricoesAguardando)}
    ${renderizarListaJogadoresAprovados(inscricoesAprovadas)}
    ${renderizarInscricoesReprovadas(inscricoesReprovadas)}
  `;

  conectarEventosAnaliseInscricaoIndividual();
  conectarEventosMontagemEquipeIndividual();
}

function conectarEventosAnaliseInscricaoIndividual() {
  const botoesAprovar = document.querySelectorAll("[data-aprovar-inscricao-individual-id]");

  botoesAprovar.forEach((botao) => {
    botao.addEventListener("click", async () => {
      const inscricaoId = Number(botao.dataset.aprovarInscricaoIndividualId);

      const confirmar = window.confirm(
        "Confirmar aprovação desta inscrição? O jogador ficará disponível para formação de equipe."
      );

      if (!confirmar) {
        return;
      }

      try {
        mensagemCampeonato.textContent = "Aprovando inscrição individual...";
        await aprovarInscricaoIndividual(inscricaoId);
        await carregarResumo(false);
        mensagemCampeonato.textContent = "Inscrição individual aprovada com sucesso.";
      } catch (error) {
        mensagemCampeonato.textContent = `Erro ao aprovar inscrição: ${error.message}`;
      }
    });
  });

  const botoesReprovar = document.querySelectorAll("[data-reprovar-inscricao-individual-id]");

  botoesReprovar.forEach((botao) => {
    botao.addEventListener("click", async () => {
      const inscricaoId = Number(botao.dataset.reprovarInscricaoIndividualId);

      const observacaoAdmin = window.prompt(
        "Informe uma observação para a reprovação, se desejar:"
      );

      const confirmar = window.confirm(
        "Confirmar reprovação desta inscrição? Ela não ficará disponível para formação de equipe."
      );

      if (!confirmar) {
        return;
      }

      try {
        mensagemCampeonato.textContent = "Reprovando inscrição individual...";
        await reprovarInscricaoIndividual(inscricaoId, observacaoAdmin || "");
        await carregarResumo(false);
        mensagemCampeonato.textContent = "Inscrição individual reprovada.";
      } catch (error) {
        mensagemCampeonato.textContent = `Erro ao reprovar inscrição: ${error.message}`;
      }
    });
  });
}

function conectarEventosMontagemEquipeIndividual() {
  const form = document.getElementById("form-montar-equipe-individual");

  if (!form || !resumoAtual) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mensagemMontarEquipe = document.getElementById("mensagem-montar-equipe");
    const quantidadeNecessaria = obterLimiteMembrosPorTipo(
      resumoAtual.campeonato.tipoParticipante
    );

    const checkboxesSelecionados = Array.from(
      document.querySelectorAll("[data-checkbox-inscricao-individual]:checked")
    );

    const inscricaoIds = checkboxesSelecionados.map((checkbox) =>
      Number(checkbox.value)
    );

    if (inscricaoIds.length !== quantidadeNecessaria) {
      mensagemMontarEquipe.textContent =
        `Selecione exatamente ${quantidadeNecessaria} jogador(es) para montar a equipe.`;
      return;
    }

    const nomeEquipe = form.querySelector('[name="nomeEquipe"]').value.trim();
    const responsavel = form.querySelector('[name="responsavel"]').value.trim();
    const contato = form.querySelector('[name="contato"]').value.trim();

    if (!nomeEquipe) {
      mensagemMontarEquipe.textContent = "Informe o nome da equipe.";
      return;
    }

    try {
      mensagemMontarEquipe.textContent = "Criando equipe...";

      await montarEquipeComInscricoesIndividuais(campeonatoId, {
        nomeEquipe,
        responsavel: responsavel || null,
        contato: contato || null,
        inscricaoIds
      });

      await carregarResumo(false);
      mensagemCampeonato.textContent = "Equipe montada com sucesso.";
    } catch (error) {
      mensagemMontarEquipe.textContent = `Erro ao montar equipe: ${error.message}`;
    }
  });
}

function montarSetsExistentes(jogo) {
  if (!jogo.sets.length) {
    return "<p>Nenhum set registrado.</p>";
  }

  return `
    <ul>
      ${jogo.sets
        .slice()
        .sort((a, b) => a.numeroSet - b.numeroSet)
        .map(
          (set) =>
            `<li>Set ${set.numeroSet}: ${set.pontosA} x ${set.pontosB}</li>`
        )
        .join("")}
    </ul>
  `;
}

function montarFormularioPlacar(jogo) {
  if (jogo.status === "FINALIZADO") {
    return "";
  }

  if (jogo.fase === "FINAL") {
    return `
      <form class="formulario-placar" data-jogo-id="${jogo.id}" data-fase="${jogo.fase}">
        <p class="info-auxiliar">
          Final em melhor de 3 sets. Se uma equipe vencer os dois primeiros sets, o 3º set não precisa ser preenchido.
        </p>

        <div class="grade-sets">
          <div class="linha-set">
            <strong>Set 1</strong>
            <div>
              <label>Pontos equipe A</label>
              <input type="number" name="set1a" min="0" required />
            </div>
            <div>
              <label>Pontos equipe B</label>
              <input type="number" name="set1b" min="0" required />
            </div>
          </div>

          <div class="linha-set">
            <strong>Set 2</strong>
            <div>
              <label>Pontos equipe A</label>
              <input type="number" name="set2a" min="0" required />
            </div>
            <div>
              <label>Pontos equipe B</label>
              <input type="number" name="set2b" min="0" required />
            </div>
          </div>

          <div class="linha-set">
            <strong>Set 3</strong>
            <div>
              <label>Pontos equipe A</label>
              <input type="number" name="set3a" min="0" />
            </div>
            <div>
              <label>Pontos equipe B</label>
              <input type="number" name="set3b" min="0" />
            </div>
          </div>
        </div>

        <button type="submit" class="botao-pequeno">Salvar placar</button>
        <p class="mensagem-jogo" id="mensagem-jogo-${jogo.id}"></p>
      </form>
    `;
  }

  return `
    <form class="formulario-placar" data-jogo-id="${jogo.id}" data-fase="${jogo.fase}">
      <p class="info-auxiliar">
        Este jogo será decidido em set único.
      </p>

      <div class="grade-sets">
        <div class="linha-set">
          <strong>Set único</strong>
          <div>
            <label>Pontos equipe A</label>
            <input type="number" name="set1a" min="0" required />
          </div>
          <div>
            <label>Pontos equipe B</label>
            <input type="number" name="set1b" min="0" required />
          </div>
        </div>
      </div>

      <button type="submit" class="botao-pequeno">Salvar placar</button>
      <p class="mensagem-jogo" id="mensagem-jogo-${jogo.id}"></p>
    </form>
  `;
}

function conectarEventosEdicaoCampeonato() {
  const botao = document.getElementById("botao-editar-campeonato");

  if (!botao) return;

  botao.addEventListener("click", () => {
    campeonatoEmEdicao = true;
    renderizarResumo(resumoAtual);
    mensagemCampeonato.textContent = "";
  });
}

function conectarFormularioEdicaoCampeonato() {
  const form = document.getElementById("form-edicao-campeonato");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mensagemEdicao = document.getElementById("mensagem-edicao-campeonato");

    try {
      mensagemEdicao.textContent = "Salvando campeonato...";

      const possuiInscritos =
        resumoAtual.totais.participantes > 0 ||
        inscricoesIndividuaisAtual.some((inscricao) => inscricao.status !== "CANCELADA");

      const formatoSelecionado = possuiInscritos
        ? resumoAtual.campeonato.formato
        : form.querySelector('[name="formato"]').value;

      const modoInscricaoSelecionado = possuiInscritos
        ? resumoAtual.campeonato.modoInscricao
        : form.querySelector('[name="modoInscricao"]').value;

      const quantidadeMaximaValor = form.querySelector('[name="quantidadeMaxima"]').value
        ? Number(form.querySelector('[name="quantidadeMaxima"]').value)
        : null;

      if (
        modoInscricaoSelecionado === "POR_EQUIPE" &&
        formatoSelecionado === "GRUPOS_3X4_REPESCAGEM" &&
        quantidadeMaximaValor !== null &&
        ![8, 12].includes(quantidadeMaximaValor)
      ) {
        mensagemEdicao.textContent =
          "Erro: no formato com grupos por equipe, a quantidade máxima precisa ser 8 ou 12 equipes.";
        return;
      }

      if (
        modoInscricaoSelecionado === "POR_EQUIPE" &&
        quantidadeMaximaValor !== null &&
        quantidadeMaximaValor < resumoAtual.totais.participantes
      ) {
        mensagemEdicao.textContent =
          `Erro: a quantidade máxima de equipes não pode ser menor que o total atual de equipes (${resumoAtual.totais.participantes}).`;
        return;
      }

      const totalJogadoresIndividuaisAtivos = contarJogadoresIndividuaisAtivos();

      if (
        modoInscricaoSelecionado === "INDIVIDUAL" &&
        quantidadeMaximaValor !== null &&
        quantidadeMaximaValor < totalJogadoresIndividuaisAtivos
      ) {
        mensagemEdicao.textContent =
          `Erro: a quantidade máxima de jogadores não pode ser menor que o total atual de jogadores individuais ativos (${totalJogadoresIndividuaisAtivos}).`;
        return;
      }

      await atualizarCampeonato(campeonatoId, {
        nome: form.querySelector('[name="nome"]').value.trim(),
        data: form.querySelector('[name="data"]').value || null,
        local: form.querySelector('[name="local"]').value.trim() || null,
        tipoParticipante: possuiInscritos
          ? resumoAtual.campeonato.tipoParticipante
          : form.querySelector('[name="tipoParticipante"]').value,
        categoria: possuiInscritos
          ? resumoAtual.campeonato.categoria
          : form.querySelector('[name="categoria"]').value,
        formato: formatoSelecionado,
        modoInscricao: modoInscricaoSelecionado,
        quantidadeMaxima: quantidadeMaximaValor
      });

      campeonatoEmEdicao = false;
      await carregarResumo(false);
      mensagemCampeonato.textContent = "Campeonato atualizado com sucesso.";
    } catch (error) {
      mensagemEdicao.textContent = `Erro: ${error.message}`;
    }
  });
}

function conectarCancelarEdicaoCampeonato() {
  const botao = document.getElementById("botao-cancelar-edicao-campeonato");

  if (!botao) return;

  botao.addEventListener("click", () => {
    campeonatoEmEdicao = false;
    renderizarResumo(resumoAtual);
    mensagemCampeonato.textContent = "Edição do campeonato cancelada.";
  });
}

function conectarEventosEdicaoInscricao() {
  const botoes = document.querySelectorAll("[data-editar-inscricao-id]");

  botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
      inscricaoEmEdicaoId = Number(botao.dataset.editarInscricaoId);
      renderizarEquipes(resumoAtual.participantes);
      mensagemCampeonato.textContent = "";
    });
  });
}

function conectarEventosFormularioEdicaoInscricao() {
  const formularios = document.querySelectorAll("[data-form-edicao-id]");

  formularios.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const inscricaoId = Number(form.dataset.formEdicaoId);
      const mensagemEdicao = document.getElementById(`mensagem-edicao-${inscricaoId}`);

      const participante = resumoAtual?.participantes?.find(
        (item) => item.id === inscricaoId
      );

      if (!participante) {
        mensagemEdicao.textContent = "Equipe não encontrada para edição.";
        return;
      }

      const jogadores = participante.jogadores.map((_, index) => ({
        nome: form.querySelector(`[name="jogador-nome-${index}"]`).value.trim(),
        genero: form.querySelector(`[name="jogador-genero-${index}"]`).value
      }));

      try {
        mensagemEdicao.textContent = "Atualizando equipe...";

        await atualizarInscricao(inscricaoId, {
          nomeEquipe: form.querySelector('[name="nomeEquipe"]').value.trim(),
          responsavel: form.querySelector('[name="responsavel"]').value.trim(),
          contato: form.querySelector('[name="contato"]').value.trim() || null,
          jogadores
        });

        inscricaoEmEdicaoId = null;
        await carregarResumo(false);
        mensagemCampeonato.textContent = "Equipe atualizada com sucesso.";
      } catch (error) {
        mensagemEdicao.textContent = `Erro: ${error.message}`;
      }
    });
  });
}

function conectarEventosCancelarEdicaoInscricao() {
  const botoes = document.querySelectorAll("[data-cancelar-edicao-id]");

  botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
      inscricaoEmEdicaoId = null;
      renderizarEquipes(resumoAtual.participantes);
      mensagemCampeonato.textContent = "Edição cancelada.";
    });
  });
}

function conectarEventosExclusaoInscricao() {
  const botoes = document.querySelectorAll("[data-inscricao-id]");

  botoes.forEach((botao) => {
    botao.addEventListener("click", async () => {
      const inscricaoId = botao.dataset.inscricaoId;
      const confirmar = window.confirm("Tem certeza que deseja excluir esta equipe inscrita?");

      if (!confirmar) {
        return;
      }

      try {
        mensagemCampeonato.textContent = "Excluindo equipe...";
        await excluirInscricao(inscricaoId);
        await carregarResumo(false);
        mensagemCampeonato.textContent = "Equipe excluída com sucesso.";
      } catch (error) {
        mensagemCampeonato.textContent = `Erro ao excluir equipe: ${error.message}`;
      }
    });
  });
}

function agruparJogosPorColunaMataMata(jogos) {
  const grupos = new Map();

  jogos.forEach((jogo) => {
    const baseFase = obterBaseFase(jogo.fase);

    if (!grupos.has(baseFase)) {
      grupos.set(baseFase, []);
    }

    grupos.get(baseFase).push(jogo);
  });

  return Array.from(grupos.entries()).sort((a, b) => {
    return obterIndiceFase(a[0]) - obterIndiceFase(b[0]);
  });
}

function ordenarJogos(lista) {
  return [...lista].sort((a, b) => {
    const indiceFaseA = obterIndiceFase(a.fase);
    const indiceFaseB = obterIndiceFase(b.fase);

    if (indiceFaseA !== indiceFaseB) {
      return indiceFaseA - indiceFaseB;
    }

    const grupoA = a.grupo || "";
    const grupoB = b.grupo || "";

    if (grupoA !== grupoB) {
      return grupoA.localeCompare(grupoB);
    }

    const rodadaA = a.rodada || 0;
    const rodadaB = b.rodada || 0;

    if (rodadaA !== rodadaB) {
      return rodadaA - rodadaB;
    }

    const ordemA = a.ordem || 0;
    const ordemB = b.ordem || 0;

    if (ordemA !== ordemB) {
      return ordemA - ordemB;
    }

    return (a.id || 0) - (b.id || 0);
  });
}

function jogoFoiFinalizado(jogo) {
  return jogo?.status === "FINALIZADO" && Boolean(jogo?.vencedorId);
}

function formatarPlacarCurto(jogo) {
  if (!Array.isArray(jogo.sets) || jogo.sets.length === 0) {
    return "Sem placar";
  }

  return jogo.sets
    .slice()
    .sort((a, b) => a.numeroSet - b.numeroSet)
    .map((set) => `${set.pontosA}x${set.pontosB}`)
    .join(" • ");
}

function renderizarPlaceholderChave(texto) {
  return `
    <div class="jogo-chave placeholder-chave">
      <p>${texto}</p>
    </div>
  `;
}

function renderizarCardJogoChaveCompacto(jogo, tituloInterno = "") {
  const equipeA = jogo.equipeA?.nomeEquipe || "A definir";
  const equipeB = jogo.equipeB?.nomeEquipe || "A definir";
  const vencedorId = jogo.vencedorId;
  const placarCurto = formatarPlacarCurto(jogo);

  return `
    <div class="jogo-chave">
      ${
        tituloInterno
          ? `<div class="titulo-jogo-chave">${tituloInterno}</div>`
          : ""
      }

      <div class="fase-status">
        ${jogo.status}
        ${jogo.grupo ? ` • Grupo ${jogo.grupo}` : ""}
        ${jogo.rodada ? ` • Rodada ${jogo.rodada}` : ""}
      </div>

      <div class="linha-equipe ${
        jogo.equipeAId && vencedorId === jogo.equipeAId ? "vencedor-chave" : ""
      }">
        <span>${equipeA}</span>
      </div>

      <div class="linha-equipe ${
        jogo.equipeBId && vencedorId === jogo.equipeBId ? "vencedor-chave" : ""
      }">
        <span>${equipeB}</span>
      </div>

      <div class="placar-chave">${placarCurto}</div>
    </div>
  `;
}

function criarTabelaGrupoFrontend(jogosDoGrupo) {
  const tabela = new Map();

  function garantirEquipe(equipe) {
    if (!equipe) return;

    if (!tabela.has(equipe.id)) {
      tabela.set(equipe.id, {
        participante: equipe,
        jogos: 0,
        vitorias: 0,
        derrotas: 0,
        setsPro: 0,
        setsContra: 0,
        pontosPro: 0,
        pontosContra: 0,
        saldoSets: 0,
        saldoPontos: 0
      });
    }
  }

  jogosDoGrupo.forEach((jogo) => {
    garantirEquipe(jogo.equipeA);
    garantirEquipe(jogo.equipeB);

    if (!jogoFoiFinalizado(jogo)) {
      return;
    }

    const equipeA = tabela.get(jogo.equipeAId);
    const equipeB = tabela.get(jogo.equipeBId);

    if (!equipeA || !equipeB) return;

    equipeA.jogos += 1;
    equipeB.jogos += 1;

    if (jogo.vencedorId === jogo.equipeAId) {
      equipeA.vitorias += 1;
      equipeB.derrotas += 1;
    }

    if (jogo.vencedorId === jogo.equipeBId) {
      equipeB.vitorias += 1;
      equipeA.derrotas += 1;
    }

    (jogo.sets || []).forEach((set) => {
      equipeA.pontosPro += set.pontosA;
      equipeA.pontosContra += set.pontosB;

      equipeB.pontosPro += set.pontosB;
      equipeB.pontosContra += set.pontosA;

      if (set.pontosA > set.pontosB) {
        equipeA.setsPro += 1;
        equipeB.setsContra += 1;
      }

      if (set.pontosB > set.pontosA) {
        equipeB.setsPro += 1;
        equipeA.setsContra += 1;
      }
    });
  });

  const classificados = Array.from(tabela.values()).map((item) => ({
    ...item,
    saldoSets: item.setsPro - item.setsContra,
    saldoPontos: item.pontosPro - item.pontosContra
  }));

  classificados.sort((a, b) => {
    if (b.vitorias !== a.vitorias) {
      return b.vitorias - a.vitorias;
    }

    if (b.saldoSets !== a.saldoSets) {
      return b.saldoSets - a.saldoSets;
    }

    if (b.saldoPontos !== a.saldoPontos) {
      return b.saldoPontos - a.saldoPontos;
    }

    const confrontoDireto = jogosDoGrupo.find((jogo) => {
      if (!jogoFoiFinalizado(jogo)) return false;

      const envolveA =
        jogo.equipeAId === a.participante.id || jogo.equipeBId === a.participante.id;

      const envolveB =
        jogo.equipeAId === b.participante.id || jogo.equipeBId === b.participante.id;

      return envolveA && envolveB;
    });

    if (confrontoDireto) {
      if (confrontoDireto.vencedorId === a.participante.id) {
        return -1;
      }

      if (confrontoDireto.vencedorId === b.participante.id) {
        return 1;
      }
    }

    return a.participante.nomeEquipe.localeCompare(b.participante.nomeEquipe);
  });

  return classificados;
}

function renderizarResumoGrupoChave(letraGrupo, jogosDoGrupo) {
  const tabela = criarTabelaGrupoFrontend(jogosDoGrupo);
  const jogosFinalizados = jogosDoGrupo.filter(jogoFoiFinalizado).length;
  const totalJogos = jogosDoGrupo.length;

  return `
    <div class="jogo-chave resumo-grupo">
      <div class="grupo-resumo-topo">
        <strong>Grupo ${letraGrupo}</strong>
        <span>${jogosFinalizados}/${totalJogos} jogos</span>
      </div>

      <div class="grupo-classificacao">
        ${[0, 1, 2, 3]
          .map(
            (index) => `
              <div class="linha-classificacao">
                <span class="posicao-grupo">${index + 1}º</span>
                <span class="nome-grupo">${tabela[index]?.participante?.nomeEquipe || "—"}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderizarColunaChave(titulo, conteudo, temSeta = true) {
  return `
    <div class="coluna-chave ${temSeta ? "tem-seta" : ""}">
      <h3>${titulo}</h3>
      <div class="cards-coluna-chave">
        ${conteudo}
      </div>
    </div>
  `;
}

function renderizarChaveGruposRepescagem(jogos) {
  const jogosGrupo = ordenarJogos(jogos.filter((jogo) => jogo.fase === "FASE_GRUPOS"));
  const jogosRepescagem = ordenarJogos(
    jogos.filter((jogo) => obterBaseFase(jogo.fase) === "REPESCAGEM")
  );
  const jogosQuartas = ordenarJogos(
    jogos.filter((jogo) => obterBaseFase(jogo.fase) === "QUARTAS")
  );
  const jogosSemifinais = ordenarJogos(
    jogos.filter((jogo) => obterBaseFase(jogo.fase) === "SEMIFINAL")
  );
  const jogosFinal = ordenarJogos(jogos.filter((jogo) => jogo.fase === "FINAL"));
  const jogosTerceiro = ordenarJogos(jogos.filter((jogo) => jogo.fase === "TERCEIRO_LUGAR"));

  const gruposExistentes = [
    ...new Set(jogosGrupo.map((jogo) => jogo.grupo).filter(Boolean))
  ].sort();

  const htmlGrupos = gruposExistentes
    .map((grupo) => {
      const jogosDoGrupo = jogosGrupo.filter((jogo) => jogo.grupo === grupo);
      return renderizarResumoGrupoChave(grupo, jogosDoGrupo);
    })
    .join("");

  const colunas = [
    {
      titulo: "Fase de grupos",
      html: htmlGrupos
    }
  ];

  if (gruposExistentes.length === 3 || jogosRepescagem.length > 0) {
    colunas.push({
      titulo: "Repescagem",
      html: jogosRepescagem.length
        ? jogosRepescagem.map((jogo) => renderizarCardJogoChaveCompacto(jogo)).join("")
        : renderizarPlaceholderChave("Aguardando conclusão da fase de grupos.")
    });
  }

  colunas.push(
    {
      titulo: "Quartas de final",
      html: jogosQuartas.length
        ? jogosQuartas.map((jogo) => renderizarCardJogoChaveCompacto(jogo)).join("")
        : renderizarPlaceholderChave("Quartas ainda não definidas.")
    },
    {
      titulo: "Semifinais",
      html: jogosSemifinais.length
        ? jogosSemifinais.map((jogo) => renderizarCardJogoChaveCompacto(jogo)).join("")
        : renderizarPlaceholderChave("Semifinais ainda não definidas.")
    },
    {
      titulo: "Finais",
      html:
        (jogosFinal.length
          ? jogosFinal.map((jogo) => renderizarCardJogoChaveCompacto(jogo, "Final")).join("")
          : renderizarPlaceholderChave("Final ainda não definida.")) +
        (jogosTerceiro.length
          ? jogosTerceiro
              .map((jogo) => renderizarCardJogoChaveCompacto(jogo, "3º Lugar"))
              .join("")
          : "")
    }
  );

  chaveCampeonato.innerHTML = `
    <div class="chave-horizontal-wrapper">
      <div class="chave-horizontal">
        ${colunas
          .map((coluna, index) =>
            renderizarColunaChave(
              coluna.titulo,
              coluna.html,
              index < colunas.length - 1
            )
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderizarChavePadrao(jogos) {
  const colunasOriginais = agruparJogosPorColunaMataMata(jogos);

  if (!colunasOriginais.length) {
    chaveCampeonato.innerHTML = "<p>Nenhum jogo gerado ainda.</p>";
    return;
  }

  const colunas = colunasOriginais.map(([baseFase, lista]) => ({
    titulo: obterTituloGrupoFase(baseFase),
    html: ordenarJogos(lista)
      .map((jogo) => renderizarCardJogoChaveCompacto(jogo))
      .join("")
  }));

  chaveCampeonato.innerHTML = `
    <div class="chave-horizontal-wrapper">
      <div class="chave-horizontal">
        ${colunas
          .map((coluna, index) =>
            renderizarColunaChave(
              coluna.titulo,
              coluna.html,
              index < colunas.length - 1
            )
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderizarChave(resumo) {
  if (!resumo.jogos.length) {
    chaveCampeonato.innerHTML = "<p>Nenhum jogo gerado ainda.</p>";
    return;
  }

  if (resumo.campeonato.formato === "GRUPOS_3X4_REPESCAGEM") {
    renderizarChaveGruposRepescagem(resumo.jogos);
    return;
  }

  if (resumo.campeonato.formato === "MATA_MATA") {
    renderizarChavePadrao(resumo.jogos);
    return;
  }

  chaveCampeonato.innerHTML =
    "<p>A visualização de chave para este formato será adicionada em breve.</p>";
}

function renderizarJogos(jogos) {
  if (!jogos.length) {
    listaJogos.innerHTML = "<p>Nenhum jogo gerado ainda.</p>";
    return;
  }

  const jogosOrdenados = ordenarJogos(jogos);

  listaJogos.innerHTML = `
    <div class="lista-simples">
      ${jogosOrdenados
        .map((jogo) => {
          const nomeEquipeA = jogo.equipeA?.nomeEquipe || "A definir";
          const nomeEquipeB = jogo.equipeB?.nomeEquipe || "A definir";
          const nomeVencedor = jogo.vencedor?.nomeEquipe || "Ainda não definido";

          return `
            <div class="item-lista">
              <h3>${traduzirFase(jogo.fase)}</h3>

              ${
                jogo.grupo
                  ? `<p><strong>Grupo:</strong> ${jogo.grupo}</p>`
                  : ""
              }

              ${
                jogo.rodada
                  ? `<p><strong>Rodada:</strong> ${jogo.rodada}</p>`
                  : ""
              }

              <p><strong>Status:</strong> ${jogo.status}</p>

              <div class="confronto-visual">
                <div class="equipe-box">${nomeEquipeA}</div>
                <div class="vs-box">VS</div>
                <div class="equipe-box">${nomeEquipeB}</div>
              </div>

              <p><strong>Vencedor:</strong> ${nomeVencedor}</p>
              <div>
                <strong>Sets:</strong>
                ${montarSetsExistentes(jogo)}
              </div>
              ${montarFormularioPlacar(jogo)}
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  conectarEventosPlacar();
}

function renderizarPodio(dadosPodio) {
  if (!dadosPodio) {
    podio.innerHTML = "<p>Pódio ainda não definido.</p>";
    return;
  }

  podio.innerHTML = `
    <div class="podio-grid">
      <div class="card-podio">
        <h3>🥇 1º Lugar</h3>
        <p>${dadosPodio.primeiroLugar?.nomeEquipe || "—"}</p>
      </div>
      <div class="card-podio">
        <h3>🥈 2º Lugar</h3>
        <p>${dadosPodio.segundoLugar?.nomeEquipe || "—"}</p>
      </div>
      <div class="card-podio">
        <h3>🥉 3º Lugar</h3>
        <p>${dadosPodio.terceiroLugar?.nomeEquipe || "—"}</p>
      </div>
    </div>
  `;
}

function validarSet(pontosA, pontosB, numeroSet) {
  if (pontosA === "" || pontosB === "") {
    throw new Error(`Preencha os pontos do Set ${numeroSet}.`);
  }

  const pontosANumero = Number(pontosA);
  const pontosBNumero = Number(pontosB);

  if (Number.isNaN(pontosANumero) || Number.isNaN(pontosBNumero)) {
    throw new Error(`Os pontos do Set ${numeroSet} precisam ser números válidos.`);
  }

  if (pontosANumero < 0 || pontosBNumero < 0) {
    throw new Error(`Os pontos do Set ${numeroSet} não podem ser negativos.`);
  }

  if (pontosANumero === pontosBNumero) {
    throw new Error(`O Set ${numeroSet} não pode terminar empatado.`);
  }

  return {
    numeroSet,
    pontosA: pontosANumero,
    pontosB: pontosBNumero
  };
}

function extrairSetsDoFormulario(form) {
  const fase = form.dataset.fase;

  const set1a = form.querySelector('[name="set1a"]')?.value ?? "";
  const set1b = form.querySelector('[name="set1b"]')?.value ?? "";

  const set1 = validarSet(set1a, set1b, 1);

  if (fase !== "FINAL") {
    return [set1];
  }

  const set2a = form.querySelector('[name="set2a"]')?.value ?? "";
  const set2b = form.querySelector('[name="set2b"]')?.value ?? "";

  const set2 = validarSet(set2a, set2b, 2);

  let vitoriasEquipeA = 0;
  let vitoriasEquipeB = 0;

  if (set1.pontosA > set1.pontosB) {
    vitoriasEquipeA += 1;
  } else {
    vitoriasEquipeB += 1;
  }

  if (set2.pontosA > set2.pontosB) {
    vitoriasEquipeA += 1;
  } else {
    vitoriasEquipeB += 1;
  }

  if (vitoriasEquipeA === 2 || vitoriasEquipeB === 2) {
    return [set1, set2];
  }

  const set3a = form.querySelector('[name="set3a"]')?.value ?? "";
  const set3b = form.querySelector('[name="set3b"]')?.value ?? "";

  const set3 = validarSet(set3a, set3b, 3);

  return [set1, set2, set3];
}

function conectarEventosPlacar() {
  const formularios = document.querySelectorAll(".formulario-placar");

  formularios.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const jogoId = form.dataset.jogoId;
      const mensagemJogo = document.getElementById(`mensagem-jogo-${jogoId}`);

      try {
        mensagemJogo.textContent = "Salvando placar...";
        const sets = extrairSetsDoFormulario(form);
        await registrarPlacar(jogoId, sets);
        mensagemCampeonato.textContent = "Placar registrado com sucesso.";
        await carregarResumo(false);
      } catch (error) {
        mensagemJogo.textContent = `Erro ao salvar placar: ${error.message}`;
      }
    });
  });
}

async function copiarLinkInscricao() {
  const url = `${window.location.origin}${window.location.pathname.replace("campeonato.html", "inscricao.html")}?id=${campeonatoId}`;

  try {
    await navigator.clipboard.writeText(url);
    mensagemCampeonato.textContent = "Link da inscrição copiado com sucesso.";
  } catch {
    mensagemCampeonato.textContent = `Copie manualmente este link: ${url}`;
  }
}

async function carregarResumo(limparMensagemPrincipal = true) {
  if (!campeonatoId) {
    mensagemCampeonato.textContent = "ID do campeonato não informado na URL.";
    return;
  }

  try {
    if (limparMensagemPrincipal) {
      mensagemCampeonato.textContent = "Carregando campeonato...";
    }

    const resumo = await buscarResumoCampeonato(campeonatoId);

    try {
      inscricoesIndividuaisAtual = await listarInscricoesIndividuaisCampeonato(campeonatoId);
    } catch {
      inscricoesIndividuaisAtual = [];
    }

    resumoAtual = resumo;

    renderizarResumo(resumo);
    renderizarEquipes(resumo.participantes);
    renderizarJogadoresIndividuais(inscricoesIndividuaisAtual);
    renderizarChave(resumo);
    renderizarJogos(resumo.jogos);
    renderizarPodio(resumo.podio);
    atualizarEstadoBotoes(resumo);

    if (limparMensagemPrincipal) {
      mensagemCampeonato.textContent = "";
    }
  } catch (error) {
    mensagemCampeonato.textContent = `Erro ao carregar campeonato: ${error.message}`;
  }
}

botaoCopiarLink.addEventListener("click", copiarLinkInscricao);
botaoLogout.addEventListener("click", sair);

botaoEncerrar.addEventListener("click", async () => {
  try {
    mensagemCampeonato.textContent = "Encerrando inscrições...";
    await encerrarInscricoes(campeonatoId);
    await carregarResumo(false);
    mensagemCampeonato.textContent = "Inscrições encerradas com sucesso.";
  } catch (error) {
    mensagemCampeonato.textContent = `Erro ao encerrar inscrições: ${error.message}`;
  }
});

botaoReabrir.addEventListener("click", async () => {
  try {
    mensagemCampeonato.textContent = "Reabrindo inscrições...";
    await reabrirInscricoes(campeonatoId);
    await carregarResumo(false);
    mensagemCampeonato.textContent = "Inscrições reabertas com sucesso.";
  } catch (error) {
    mensagemCampeonato.textContent = `Erro ao reabrir inscrições: ${error.message}`;
  }
});

botaoChaveamento.addEventListener("click", async () => {
  try {
    mensagemCampeonato.textContent = "Gerando chaveamento...";
    await gerarChaveamento(campeonatoId);
    await carregarResumo(false);
    mensagemCampeonato.textContent = "Chaveamento gerado com sucesso.";
  } catch (error) {
    mensagemCampeonato.textContent = `Erro ao gerar chaveamento: ${error.message}`;
  }
});

botaoExcluirCampeonato.addEventListener("click", async () => {
  const confirmar = window.confirm("Tem certeza que deseja excluir este campeonato?");

  if (!confirmar) {
    return;
  }

  try {
    mensagemCampeonato.textContent = "Excluindo campeonato...";
    await excluirCampeonato(campeonatoId);
    window.location.href = "./inicio.html";
  } catch (error) {
    mensagemCampeonato.textContent = `Erro ao excluir campeonato: ${error.message}`;
  }
});

protegerPagina();
configurarSessao();
carregarResumo();