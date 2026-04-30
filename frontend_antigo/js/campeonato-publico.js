import {
  buscarResumoCampeonatoPublico,
  buscarMinhaInscricaoIndividual
} from "./api.js";

const params = new URLSearchParams(window.location.search);
const campeonatoId = params.get("id");

const dadosCampeonatoPublico = document.getElementById("dados-campeonato-publico");
const listaParticipantesPublico = document.getElementById("lista-participantes-publico");
const listaJogadoresIndividuaisPublico = document.getElementById("lista-jogadores-individuais-publico");
const chaveCampeonatoPublico = document.getElementById("chave-campeonato-publico");
const listaJogosPublico = document.getElementById("lista-jogos-publico");
const podioPublico = document.getElementById("podio-publico");
const mensagemCampeonatoPublico = document.getElementById("mensagem-campeonato-publico");
const participanteLogadoBox = document.getElementById("participante-logado-box");
const botaoLogoutParticipante = document.getElementById("botao-logout-participante");
const linkParticipante = document.getElementById("link-participante");
const linkMeuPerfil = document.getElementById("link-meu-perfil");

let minhaInscricaoIndividualAtual = null;

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
    participanteLogadoBox?.classList.add("oculto");
    botaoLogoutParticipante?.classList.add("oculto");
    linkParticipante?.classList.remove("oculto");
    linkMeuPerfil?.classList.add("oculto");
    return;
  }

  if (participanteLogadoBox) {
    participanteLogadoBox.innerHTML = `
      <p><strong>Participante logado:</strong> ${participante.nome}</p>
      <p><strong>E-mail:</strong> ${participante.email}</p>
    `;
  }

  participanteLogadoBox?.classList.remove("oculto");
  botaoLogoutParticipante?.classList.remove("oculto");
  linkParticipante?.classList.add("oculto");
  linkMeuPerfil?.classList.remove("oculto");
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

function traduzirModoInscricao(modoInscricao) {
  const mapa = {
    POR_EQUIPE: "Por equipe",
    INDIVIDUAL: "Individual"
  };

  return mapa[modoInscricao] || "Por equipe";
}

function traduzirStatusInscricaoIndividual(status) {
  const mapa = {
    PENDENTE: "Aguardando formação de equipe",
    USADA_EM_EQUIPE: "Já vinculado a uma equipe",
    CANCELADA: "Cancelada"
  };

  return mapa[status] || status || "Inscrito";
}

function traduzirStatusAnalise(statusAnalise) {
  const mapa = {
    AGUARDANDO_ANALISE: "Aguardando análise da organização",
    APROVADA: "Inscrição aprovada",
    REPROVADA: "Inscrição reprovada"
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
    PRIMEIRA_FASE: "Primeira fase",
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

  return mapa[fase] || fase?.replaceAll("_", " ") || "Fase";
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

function obterInscricoesIndividuaisDoResumo(resumo) {
  return (
    resumo.inscricoesIndividuais ||
    resumo.jogadoresIndividuais ||
    resumo.campeonato?.inscricoesIndividuais ||
    []
  );
}

function usuarioLogadoTemInscricaoIndividualAtiva() {
  const inscricao = minhaInscricaoIndividualAtual;

  if (!inscricao) {
    return false;
  }

  return inscricao.status !== "CANCELADA" && inscricao.statusAnalise !== "REPROVADA";
}

function renderizarAvisoMinhaInscricaoIndividual() {
  const inscricao = minhaInscricaoIndividualAtual;

  if (!inscricao) {
    return "";
  }

  if (inscricao.status === "CANCELADA" || inscricao.statusAnalise === "REPROVADA") {
    return `
      <div
        class="area-edicao-inscricao"
        style="margin-top: 16px; border-color: #fecaca; background: #fef2f2;"
      >
        <h4>Sua inscrição não foi aprovada</h4>

        <p>
          Sua inscrição individual foi reprovada ou cancelada pela organização.
        </p>

        ${
          inscricao.observacaoAdmin
            ? `<p><strong>Observação:</strong> ${inscricao.observacaoAdmin}</p>`
            : ""
        }

        <p class="info-auxiliar">
          Se as inscrições ainda estiverem abertas, você poderá enviar uma nova solicitação.
        </p>
      </div>
    `;
  }

  if (inscricao.statusAnalise === "AGUARDANDO_ANALISE") {
    return `
      <div
        class="area-edicao-inscricao"
        style="margin-top: 16px; border-color: #fde68a; background: #fffbeb;"
      >
        <h4>Sua inscrição está aguardando análise</h4>

        <p>
          Sua solicitação de inscrição individual foi enviada e está aguardando conferência da organização.
        </p>

        <p><strong>Status:</strong> ${traduzirStatusAnalise(inscricao.statusAnalise)}</p>
        <p><strong>Tamanho da camisa:</strong> ${inscricao.tamanhoCamisa || "Não informado"}</p>
        <p><strong>Enviada em:</strong> ${formatarData(inscricao.criadoEm)}</p>

        <p class="info-auxiliar">
          Depois que o administrador aprovar o pagamento, seu nome será liberado para a formação das equipes.
        </p>
      </div>
    `;
  }

  if (inscricao.statusAnalise === "APROVADA") {
    return `
      <div
        class="area-edicao-inscricao"
        style="margin-top: 16px; border-color: #86efac; background: #dcfce7;"
      >
        <h4>Sua inscrição foi aprovada</h4>

        <p>
          Sua inscrição individual já foi aprovada pela organização.
        </p>

        <p><strong>Status:</strong> ${traduzirStatusInscricaoIndividual(inscricao.status)}</p>
        <p><strong>Tamanho da camisa:</strong> ${inscricao.tamanhoCamisa || "Não informado"}</p>

        ${
          inscricao.participante
            ? `
              <p>
                <strong>Equipe formada:</strong> ${inscricao.participante.nomeEquipe}
              </p>
            `
            : `
              <p class="info-auxiliar">
                Agora aguarde a organização formar as equipes do campeonato.
              </p>
            `
        }
      </div>
    `;
  }

  return "";
}

function renderizarResumo(resumo) {
  const campeonato = resumo.campeonato;
  const inscricoesIndividuais = obterInscricoesIndividuaisDoResumo(resumo);
  const textoStatus = traduzirStatusCampeonato(resumo.statusCampeonato);
  const classeStatus = classeStatusCampeonato(resumo.statusCampeonato);

  const usuarioJaEstaInscrito = usuarioLogadoTemInscricaoIndividualAtiva();

  dadosCampeonatoPublico.innerHTML = `
    <div class="bloco-informacoes">
      <p><strong>Nome:</strong> ${campeonato.nome}</p>
      <p><strong>Data:</strong> ${formatarData(campeonato.data)}</p>
      <p><strong>Local:</strong> ${campeonato.local || "Não informado"}</p>
      <p><strong>Tipo:</strong> ${traduzirTipoParticipante(campeonato.tipoParticipante)}</p>
      <p><strong>Categoria:</strong> ${campeonato.categoria}</p>
      <p><strong>Formato:</strong> ${traduzirFormato(campeonato.formato)}</p>
      <p><strong>Forma de inscrição:</strong> ${traduzirModoInscricao(campeonato.modoInscricao)}</p>
      <p><strong>Total de equipes:</strong> ${resumo.totais.participantes}</p>
      <p><strong>Jogadores individuais:</strong> ${inscricoesIndividuais.length}</p>
      <p><strong>Total de jogos:</strong> ${resumo.totais.jogos}</p>
      <p><strong>Jogos finalizados:</strong> ${resumo.totais.jogosFinalizados}</p>

      <span class="status-badge ${classeStatus}">${textoStatus}</span>

      ${renderizarAvisoMinhaInscricaoIndividual()}

      ${
        campeonato.inscricoesAbertas && !usuarioJaEstaInscrito
          ? `
            <div class="acoes-card">
              <a class="botao" href="./inscricao.html?id=${campeonato.id}">
                Participar deste campeonato
              </a>
            </div>
          `
          : ""
      }

      ${
        !campeonato.inscricoesAbertas
          ? `
            <p class="info-auxiliar">As inscrições deste campeonato estão encerradas.</p>
          `
          : ""
      }
    </div>
  `;
}

function renderizarEquipes(participantes) {
  if (!participantes.length) {
    listaParticipantesPublico.innerHTML = "<p>Nenhuma equipe inscrita ainda.</p>";
    return;
  }

  listaParticipantesPublico.innerHTML = `
    <div class="lista-simples">
      ${participantes
        .map(
          (participante) => `
            <div class="item-lista">
              <h3>${participante.nomeEquipe}</h3>
              <p><strong>Capitã(o):</strong> ${participante.responsavel}</p>
              <p><strong>Status:</strong> ${participante.statusInscricao}</p>

              <p><strong>Jogadores da equipe:</strong></p>
              <ul>
                ${participante.jogadores
                  .map((jogador) => `<li>${jogador.nome} (${jogador.genero})</li>`)
                  .join("")}
              </ul>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderizarJogadoresIndividuais(inscricoesIndividuais) {
  if (!listaJogadoresIndividuaisPublico) {
    return;
  }

  if (!inscricoesIndividuais.length) {
    listaJogadoresIndividuaisPublico.innerHTML =
      "<p>Nenhum jogador inscrito individualmente ainda.</p>";
    return;
  }

  const participanteLogado = obterParticipanteLogado();

  listaJogadoresIndividuaisPublico.innerHTML = `
    <div class="lista-simples">
      ${inscricoesIndividuais
        .map((inscricao) => {
          const usuario = inscricao.usuario;
          const usuarioId = inscricao.usuarioId || usuario?.id;
          const ehUsuarioLogado = participanteLogado && usuarioId === participanteLogado.id;

          return `
            <div
              class="item-lista"
              style="${ehUsuarioLogado ? "border-color: #86efac; background: #f0fdf4;" : ""}"
            >
              <h3>
                ${usuario?.nome || "Jogador"}
                ${ehUsuarioLogado ? " — Você" : ""}
              </h3>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function obterBaseFase(fase) {
  if (fase === "FINAL") return "FINAL";
  if (fase === "TERCEIRO_LUGAR") return "TERCEIRO_LUGAR";
  if (fase === "REPESCAGEM" || fase?.startsWith("REPESCAGEM")) return "REPESCAGEM";
  if (fase === "FASE_GRUPOS") return "FASE_GRUPOS";
  if (fase?.startsWith("PRIMEIRA_FASE")) return "PRIMEIRA_FASE";
  if (fase?.startsWith("OITAVAS")) return "OITAVAS";
  if (fase?.startsWith("QUARTAS")) return "QUARTAS";
  if (fase?.startsWith("SEMIFINAL")) return "SEMIFINAL";

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

function ordenarJogos(jogos) {
  return [...jogos].sort((a, b) => {
    const faseA = obterIndiceFase(a.fase);
    const faseB = obterIndiceFase(b.fase);

    if (faseA !== faseB) {
      return faseA - faseB;
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

function obterTituloFase(baseFase) {
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

  return mapa[baseFase] || baseFase?.replaceAll("_", " ") || "Fase";
}

function formatarPlacarCurto(jogo) {
  if (!Array.isArray(jogo.sets) || !jogo.sets.length) {
    return "Sem placar";
  }

  return jogo.sets
    .slice()
    .sort((a, b) => a.numeroSet - b.numeroSet)
    .map((set) => `${set.pontosA}x${set.pontosB}`)
    .join(" • ");
}

function renderizarCardJogoChave(jogo) {
  const equipeA = jogo.equipeA?.nomeEquipe || "A definir";
  const equipeB = jogo.equipeB?.nomeEquipe || "A definir";
  const vencedorId = jogo.vencedorId;

  return `
    <div class="jogo-chave">
      <div class="fase-status">
        ${jogo.status}
        ${jogo.grupo ? ` • Grupo ${jogo.grupo}` : ""}
        ${jogo.rodada ? ` • Rodada ${jogo.rodada}` : ""}
      </div>

      <div class="linha-equipe ${
        jogo.equipeAId && vencedorId === jogo.equipeAId ? "vencedor-chave" : ""
      }">
        ${equipeA}
      </div>

      <div class="linha-equipe ${
        jogo.equipeBId && vencedorId === jogo.equipeBId ? "vencedor-chave" : ""
      }">
        ${equipeB}
      </div>

      <div class="placar-chave">${formatarPlacarCurto(jogo)}</div>
    </div>
  `;
}

function agruparJogosPorFase(jogos) {
  const grupos = new Map();

  ordenarJogos(jogos).forEach((jogo) => {
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

function renderizarChave(resumo) {
  if (!resumo.jogos.length) {
    chaveCampeonatoPublico.innerHTML = "<p>Nenhum jogo gerado ainda.</p>";
    return;
  }

  const colunas = agruparJogosPorFase(resumo.jogos);

  chaveCampeonatoPublico.innerHTML = `
    <div class="chave-horizontal-wrapper">
      <div class="chave-horizontal">
        ${colunas
          .map(
            ([baseFase, jogosDaFase], index) => `
              <div class="coluna-chave ${index < colunas.length - 1 ? "tem-seta" : ""}">
                <h3>${obterTituloFase(baseFase)}</h3>

                <div class="cards-coluna-chave">
                  ${jogosDaFase.map((jogo) => renderizarCardJogoChave(jogo)).join("")}
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderizarJogos(jogos) {
  if (!jogos.length) {
    listaJogosPublico.innerHTML = "<p>Nenhum jogo gerado ainda.</p>";
    return;
  }

  listaJogosPublico.innerHTML = `
    <div class="lista-simples">
      ${ordenarJogos(jogos)
        .map((jogo) => {
          const nomeEquipeA = jogo.equipeA?.nomeEquipe || "A definir";
          const nomeEquipeB = jogo.equipeB?.nomeEquipe || "A definir";
          const nomeVencedor = jogo.vencedor?.nomeEquipe || "Ainda não definido";

          return `
            <div class="item-lista">
              <h3>${traduzirFase(jogo.fase)}</h3>

              ${jogo.grupo ? `<p><strong>Grupo:</strong> ${jogo.grupo}</p>` : ""}
              ${jogo.rodada ? `<p><strong>Rodada:</strong> ${jogo.rodada}</p>` : ""}

              <p><strong>Status:</strong> ${jogo.status}</p>

              <div class="confronto-visual">
                <div class="equipe-box">${nomeEquipeA}</div>
                <div class="vs-box">VS</div>
                <div class="equipe-box">${nomeEquipeB}</div>
              </div>

              <p><strong>Vencedor:</strong> ${nomeVencedor}</p>

              <div>
                <strong>Sets:</strong>
                ${
                  jogo.sets.length
                    ? `
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
                    `
                    : "<p>Nenhum set registrado.</p>"
                }
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderizarPodio(dadosPodio) {
  if (!dadosPodio) {
    podioPublico.innerHTML = "<p>Pódio ainda não definido.</p>";
    return;
  }

  podioPublico.innerHTML = `
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

async function carregarMinhaInscricaoIndividual() {
  minhaInscricaoIndividualAtual = null;

  if (!obterTokenParticipante() || !campeonatoId) {
    return;
  }

  try {
    const resposta = await buscarMinhaInscricaoIndividual(campeonatoId);
    minhaInscricaoIndividualAtual = resposta.inscricao || null;
  } catch {
    minhaInscricaoIndividualAtual = null;
  }
}

async function carregarResumoPublico() {
  if (!campeonatoId) {
    mensagemCampeonatoPublico.textContent = "ID do campeonato não informado.";
    return;
  }

  try {
    mensagemCampeonatoPublico.textContent = "Carregando campeonato...";

    await carregarMinhaInscricaoIndividual();

    const resumo = await buscarResumoCampeonatoPublico(campeonatoId);
    const inscricoesIndividuais = obterInscricoesIndividuaisDoResumo(resumo);

    renderizarResumo(resumo);
    renderizarEquipes(resumo.participantes);
    renderizarJogadoresIndividuais(inscricoesIndividuais);
    renderizarChave(resumo);
    renderizarJogos(resumo.jogos);
    renderizarPodio(resumo.podio);

    mensagemCampeonatoPublico.textContent = "";
  } catch (error) {
    mensagemCampeonatoPublico.textContent = `Erro ao carregar campeonato: ${error.message}`;
  }
}

botaoLogoutParticipante?.addEventListener("click", sairParticipante);

configurarSessaoParticipante();
carregarResumoPublico();