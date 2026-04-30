import {
  buscarCampeonatoPorId,
  criarInscricao,
  criarInscricaoIndividual,
  listarMinhasEquipes,
  criarEquipe,
  gerarConviteEquipe,
  atualizarEquipe
} from "./api.js";

const params = new URLSearchParams(window.location.search);
const campeonatoId = params.get("id");

const dadosCampeonatoPublico = document.getElementById("dados-campeonato-publico");
const formInscricao = document.getElementById("form-inscricao");
const jogadoresContainer = document.getElementById("jogadores-container");
const mensagemInscricao = document.getElementById("mensagem-inscricao");

const CAMINHO_QR_CODE_PAGAMENTO = "../assets/imagens/qr-pagamento-inscricao.png";
const VALOR_TOTAL_INSCRICAO_FORMATADO = "R$ 20,00";
const TAMANHOS_CAMISA_VALIDOS = ["P", "M", "G", "GG"];
const TAMANHO_MAXIMO_COMPROVANTE_MB = 5;

let campeonatoAtual = null;
let equipesDoParticipante = [];
let equipeEmEdicaoId = null;
let conviteGeradoPorEquipe = {};

function obterTokenParticipante() {
  return localStorage.getItem("tokenParticipante");
}

function protegerPaginaParticipante() {
  if (!obterTokenParticipante()) {
    window.location.href = "./participante.html";
  }
}

function mostrarMensagemInscricao(texto, tipo = "info", rolar = true) {
  mensagemInscricao.textContent = texto;

  const estilos = {
    sucesso: {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #86efac"
    },
    erro: {
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca"
    },
    info: {
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe"
    }
  };

  const estilo = estilos[tipo] || estilos.info;

  mensagemInscricao.style.display = "block";
  mensagemInscricao.style.padding = "12px 14px";
  mensagemInscricao.style.borderRadius = "10px";
  mensagemInscricao.style.margin = "0 0 18px 0";
  mensagemInscricao.style.fontWeight = "700";
  mensagemInscricao.style.background = estilo.background;
  mensagemInscricao.style.color = estilo.color;
  mensagemInscricao.style.border = estilo.border;

  if (rolar) {
    mensagemInscricao.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
}

function limparMensagemInscricao() {
  mensagemInscricao.textContent = "";
  mensagemInscricao.removeAttribute("style");
}

function formatarData(data) {
  if (!data) return "Não informada";

  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: "UTC"
  });
}

function formatarTamanhoArquivo(bytes) {
  if (!bytes && bytes !== 0) {
    return "";
  }

  const tamanhoMb = bytes / (1024 * 1024);
  return `${tamanhoMb.toFixed(2)} MB`;
}

function traduzirTipoParticipante(tipo) {
  const mapa = {
    DUPLA: "Dupla",
    TIME: "Quarteto"
  };

  return mapa[tipo] || tipo;
}

function traduzirCategoria(categoria) {
  const mapa = {
    MASCULINO: "Masculino",
    FEMININO: "Feminino",
    MISTA: "Mista"
  };

  return mapa[categoria] || categoria;
}

function traduzirSexo(sexo) {
  const mapa = {
    MASCULINO: "Masculino",
    FEMININO: "Feminino"
  };

  return mapa[sexo] || "Não informado";
}

function traduzirModoInscricao(modoInscricao) {
  const mapa = {
    POR_EQUIPE: "Por equipe",
    INDIVIDUAL: "Individual"
  };

  return mapa[modoInscricao] || "Por equipe";
}

function validarArquivoComprovante(arquivo) {
  if (!arquivo) {
    throw new Error("Envie o comprovante de pagamento.");
  }

  const tiposPermitidos = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp"
  ];

  if (!tiposPermitidos.includes(arquivo.type)) {
    throw new Error("O comprovante precisa ser uma imagem PNG, JPG, JPEG ou WEBP.");
  }

  const tamanhoMaximoBytes = TAMANHO_MAXIMO_COMPROVANTE_MB * 1024 * 1024;

  if (arquivo.size > tamanhoMaximoBytes) {
    throw new Error(
      `O comprovante precisa ter no máximo ${TAMANHO_MAXIMO_COMPROVANTE_MB} MB.`
    );
  }
}

function converterArquivoParaBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = () => {
      resolve(leitor.result);
    };

    leitor.onerror = () => {
      reject(new Error("Não foi possível ler o arquivo do comprovante."));
    };

    leitor.readAsDataURL(arquivo);
  });
}

function renderizarCabecalhoCampeonato(campeonato) {
  dadosCampeonatoPublico.innerHTML = `
    <div class="bloco-informacoes">
      <p><strong>Nome:</strong> ${campeonato.nome}</p>
      <p><strong>Data:</strong> ${formatarData(campeonato.data)}</p>
      <p><strong>Local:</strong> ${campeonato.local || "Não informado"}</p>
      <p><strong>Tipo:</strong> ${traduzirTipoParticipante(campeonato.tipoParticipante)}</p>
      <p><strong>Categoria:</strong> ${traduzirCategoria(campeonato.categoria)}</p>
      <p><strong>Forma de inscrição:</strong> ${traduzirModoInscricao(campeonato.modoInscricao)}</p>
      <p><strong>Inscrições abertas:</strong> ${campeonato.inscricoesAbertas ? "Sim" : "Não"}</p>
    </div>
  `;
}

function obterLimiteMembros(tipoParticipante) {
  if (tipoParticipante === "DUPLA") return 2;
  if (tipoParticipante === "TIME") return 4;
  return 0;
}

function contarSexosEquipe(equipe) {
  const membros = equipe.membros || [];

  const masculinos = membros.filter(
    (membro) => membro.usuario?.sexo === "MASCULINO"
  ).length;

  const femininos = membros.filter(
    (membro) => membro.usuario?.sexo === "FEMININO"
  ).length;

  return {
    masculinos,
    femininos,
    total: membros.length
  };
}

function obterStatusCompatibilidadeEquipe(equipe, campeonato) {
  if (!campeonato) {
    return {
      compativel: false,
      motivo: "Campeonato não carregado."
    };
  }

  if (equipe.tipoParticipante !== campeonato.tipoParticipante) {
    return {
      compativel: false,
      motivo: `Tipo incompatível. Esta equipe é ${traduzirTipoParticipante(equipe.tipoParticipante)}.`
    };
  }

  const limite = obterLimiteMembros(equipe.tipoParticipante);
  const { masculinos, femininos, total } = contarSexosEquipe(equipe);

  if (total !== limite) {
    return {
      compativel: false,
      motivo: `Equipe incompleta: ${total}/${limite} membros.`
    };
  }

  if (campeonato.categoria === "MASCULINO" && masculinos !== limite) {
    return {
      compativel: false,
      motivo: "Para categoria masculina, todos os membros precisam ser masculinos."
    };
  }

  if (campeonato.categoria === "FEMININO" && femininos !== limite) {
    return {
      compativel: false,
      motivo: "Para categoria feminina, todos os membros precisam ser femininos."
    };
  }

  if (campeonato.categoria === "MISTA") {
    if (equipe.tipoParticipante === "DUPLA" && !(masculinos === 1 && femininos === 1)) {
      return {
        compativel: false,
        motivo: "Para dupla mista, precisa ter 1 homem e 1 mulher."
      };
    }

    if (equipe.tipoParticipante === "TIME" && !(masculinos === 2 && femininos === 2)) {
      return {
        compativel: false,
        motivo: "Para quarteto misto, precisa ter 2 homens e 2 mulheres."
      };
    }
  }

  return {
    compativel: true,
    motivo: "Compatível com este campeonato."
  };
}

function obterEquipesCompativeis() {
  return equipesDoParticipante.filter((equipe) => {
    const status = obterStatusCompatibilidadeEquipe(equipe, campeonatoAtual);
    return status.compativel;
  });
}

function montarLinkConvite(token) {
  const caminhoAtual = window.location.pathname;
  const pastaAtual = caminhoAtual.substring(0, caminhoAtual.lastIndexOf("/") + 1);

  return `${window.location.origin}${pastaAtual}convite-equipe.html?token=${token}`;
}

function rolarParaEquipe(equipeId) {
  setTimeout(() => {
    const card = document.getElementById(`card-equipe-${equipeId}`);

    if (card) {
      card.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }, 100);
}

function renderizarLinkConviteDaEquipe(equipe) {
  const convite = conviteGeradoPorEquipe[equipe.id];

  if (!convite) {
    return "";
  }

  return `
    <div class="area-edicao-inscricao" style="margin-top: 14px; border-color: #bfdbfe; background: #eff6ff;">
      <h4>Link de convite</h4>

      <p class="info-auxiliar">
        Envie este link para o participante entrar na equipe:
      </p>

      <input
        id="input-link-convite-${equipe.id}"
        type="text"
        value="${montarLinkConvite(convite.token)}"
        readonly
        style="width: 100%; padding: 12px; border: 1px solid #bfdbfe; border-radius: 10px; margin-top: 10px;"
      />

      <div class="acoes-card">
        <button
          type="button"
          class="botao-pequeno"
          data-copiar-convite-equipe-id="${equipe.id}"
        >
          Copiar link
        </button>

        <a href="./perfil-participante.html" class="botao-pequeno secundario">
          Ver equipe no perfil
        </a>
      </div>
    </div>
  `;
}

function renderizarResumoEquipeSelecionada() {
  const resumoExistente = document.getElementById("resumo-equipe-selecionada");

  if (resumoExistente) {
    resumoExistente.remove();
  }

  const selectEquipe = document.getElementById("equipe-existente-id");

  if (!selectEquipe || !selectEquipe.value) {
    return;
  }

  const equipe = equipesDoParticipante.find(
    (item) => item.id === Number(selectEquipe.value)
  );

  if (!equipe) {
    return;
  }

  const membrosHtml = (equipe.membros || [])
    .map(
      (membro) => `
        <li>${membro.usuario?.nome || "Usuário"} — ${traduzirSexo(membro.usuario?.sexo)}</li>
      `
    )
    .join("");

  formInscricao.insertAdjacentHTML(
    "beforeend",
    `
      <div id="resumo-equipe-selecionada" class="area-edicao-inscricao" style="grid-column: 1 / -1;">
        <h4>Equipe selecionada</h4>
        <p><strong>Nome:</strong> ${equipe.nome}</p>
        <p><strong>Capitão:</strong> ${equipe.dono?.nome || "Não informado"}</p>
        <ul>${membrosHtml}</ul>
      </div>
    `
  );
}

function renderizarFormularioEdicaoEquipe(equipe) {
  if (equipeEmEdicaoId !== equipe.id) {
    return "";
  }

  return `
    <div class="area-edicao-inscricao" style="margin-top: 12px;">
      <h4>Editar equipe</h4>

      <div class="formulario-edicao-inscricao">
        <div class="grupo-formulario">
          <label for="editar-nome-equipe-${equipe.id}">Nome da equipe</label>
          <input
            type="text"
            id="editar-nome-equipe-${equipe.id}"
            value="${equipe.nome}"
            required
          />
        </div>

        <div class="grupo-formulario">
          <label>Tipo da equipe</label>
          <input
            type="text"
            value="${traduzirTipoParticipante(equipe.tipoParticipante)}"
            disabled
          />
          <small class="texto-ajuda">
            O tipo da equipe não será alterado por esta tela.
          </small>
        </div>

        <div class="acoes-card">
          <button
            type="button"
            class="botao-pequeno"
            data-salvar-edicao-equipe-id="${equipe.id}"
          >
            Salvar equipe
          </button>

          <button
            type="button"
            class="botao-pequeno secundario"
            data-cancelar-edicao-equipe-id="${equipe.id}"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderizarEquipesAtuais() {
  if (!equipesDoParticipante.length) {
    return `
      <div class="area-edicao-inscricao" style="grid-column: 1 / -1;">
        <h4>Você ainda não tem equipes</h4>
        <p class="info-auxiliar">
          Crie uma equipe abaixo e envie o link de convite para completar a formação.
        </p>
      </div>
    `;
  }

  return `
    <div class="area-edicao-inscricao" style="grid-column: 1 / -1;">
      <h4>Suas equipes atuais</h4>

      <div class="lista-simples" style="margin-top: 12px;">
        ${equipesDoParticipante
          .map((equipe) => {
            const status = obterStatusCompatibilidadeEquipe(equipe, campeonatoAtual);
            const total = equipe.membros?.length || 0;
            const limite = obterLimiteMembros(equipe.tipoParticipante);

            return `
              <div class="item-lista" id="card-equipe-${equipe.id}">
                <h3>${equipe.nome}</h3>
                <p><strong>Tipo:</strong> ${traduzirTipoParticipante(equipe.tipoParticipante)}</p>
                <p><strong>Membros:</strong> ${total}/${limite}</p>
                <p><strong>Situação:</strong> ${status.motivo}</p>

                <div class="acoes-card">
                  <button
                    type="button"
                    class="botao-pequeno"
                    data-editar-equipe-id="${equipe.id}"
                  >
                    Editar equipe
                  </button>

                  <button
                    type="button"
                    class="botao-pequeno secundario"
                    data-gerar-convite-equipe-id="${equipe.id}"
                    ${total >= limite ? "disabled" : ""}
                  >
                    Gerar link de convite
                  </button>
                </div>

                ${renderizarFormularioEdicaoEquipe(equipe)}
                ${renderizarLinkConviteDaEquipe(equipe)}
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderizarCriacaoEquipe() {
  return `
    <div class="area-edicao-inscricao" style="grid-column: 1 / -1;">
      <h4>Criar equipe para este campeonato</h4>

      <p class="info-auxiliar">
        A equipe será criada como <strong>${traduzirTipoParticipante(campeonatoAtual.tipoParticipante)}</strong>.
        Depois, envie o link de convite para completar a equipe.
      </p>

      <div class="formulario-edicao-inscricao">
        <div class="grupo-formulario">
          <label for="nome-equipe-nova">Nome da equipe</label>
          <input
            type="text"
            id="nome-equipe-nova"
            name="nomeEquipe"
            placeholder="Ex: Vôlei Jampa A"
          />
        </div>

        <div class="grupo-formulario">
          <label>Tipo da equipe</label>
          <input
            type="text"
            value="${traduzirTipoParticipante(campeonatoAtual.tipoParticipante)}"
            disabled
          />
        </div>

        <div class="acoes-card">
          <button type="button" id="botao-criar-equipe-inscricao" class="botao-pequeno">
            Criar equipe e gerar convite
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderizarFormularioInscricaoIndividual() {
  jogadoresContainer.innerHTML = "";

  formInscricao.innerHTML = `
    <div class="area-edicao-inscricao" style="grid-column: 1 / -1;">
      <h4>Inscrição individual</h4>

      <p class="info-auxiliar">
        Neste campeonato, você se inscreve sozinho(a). Depois do envio, a organização vai analisar o comprovante de pagamento e formar as equipes manualmente.
      </p>

      <p>
        <strong>Tipo do campeonato:</strong> ${traduzirTipoParticipante(campeonatoAtual.tipoParticipante)}
      </p>

      <p>
        <strong>Categoria:</strong> ${traduzirCategoria(campeonatoAtual.categoria)}
      </p>

      <div class="area-edicao-inscricao" style="margin-top: 16px; border-color: #bfdbfe; background: #eff6ff;">
        <h4>Pagamento da inscrição</h4>

        <p>
          <strong>Valor total:</strong> ${VALOR_TOTAL_INSCRICAO_FORMATADO}
        </p>

        <p class="info-auxiliar">
          O valor inclui a inscrição e a camisa do campeonato.
        </p>

        <div style="margin: 14px 0;">
          <p><strong>QR Code para pagamento:</strong></p>

          <img
            src="${CAMINHO_QR_CODE_PAGAMENTO}"
            alt="QR Code para pagamento da inscrição"
            style="width: 220px; max-width: 100%; border: 1px solid #bfdbfe; border-radius: 12px; background: #ffffff; padding: 10px; margin-top: 8px;"
          />

          <p class="info-auxiliar" style="margin-top: 8px;">
            Após pagar, envie abaixo a imagem do comprovante.
          </p>
        </div>

        <div class="grupo-formulario">
          <label for="tamanho-camisa">Tamanho da camisa</label>
          <select id="tamanho-camisa" name="tamanhoCamisa" required>
            <option value="">Selecione o tamanho</option>
            <option value="P">P</option>
            <option value="M">M</option>
            <option value="G">G</option>
            <option value="GG">GG</option>
          </select>
        </div>

        <div class="grupo-formulario">
          <label for="comprovante-pagamento">Comprovante de pagamento</label>
          <input
            type="file"
            id="comprovante-pagamento"
            name="comprovantePagamento"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            required
          />

          <small class="texto-ajuda">
            Envie uma imagem em PNG, JPG, JPEG ou WEBP, com no máximo ${TAMANHO_MAXIMO_COMPROVANTE_MB} MB.
          </small>

          <p id="arquivo-comprovante-info" class="info-auxiliar" style="margin-top: 8px;"></p>
        </div>
      </div>

      <button type="submit" class="botao" style="margin-top: 14px;">
        Enviar inscrição para análise
      </button>
    </div>
  `;

  conectarEventosInscricaoIndividual();
}

function renderizarInscricaoIndividualConfirmada() {
  formInscricao.innerHTML = `
    <div class="area-edicao-inscricao" style="grid-column: 1 / -1; border-color: #86efac; background: #dcfce7;">
      <h4>Inscrição enviada para análise</h4>

      <p>
        Sua solicitação de inscrição individual foi enviada com sucesso.
      </p>

      <p class="info-auxiliar">
        Agora aguarde a organização conferir o comprovante de pagamento. Depois da aprovação, seu nome será liberado para a formação das equipes.
      </p>

      <div class="acoes-card">
        <a href="./campeonatos-publicos.html" class="botao-pequeno">
          Voltar aos campeonatos
        </a>

        <a href="./perfil-participante.html" class="botao-pequeno secundario">
          Ir para meu perfil
        </a>
      </div>
    </div>
  `;
}

function renderizarFormularioSomenteEquipe() {
  const equipesCompativeis = obterEquipesCompativeis();

  jogadoresContainer.innerHTML = "";

  if (equipesCompativeis.length) {
    formInscricao.innerHTML = `
      <div class="area-edicao-inscricao" style="grid-column: 1 / -1;">
        <h4>Escolha sua equipe</h4>
        <p class="info-auxiliar">
          Selecione uma equipe completa e compatível com este campeonato.
        </p>

        <div class="grupo-formulario">
          <label for="equipe-existente-id">Equipe</label>
          <select id="equipe-existente-id" name="equipeId" required>
            <option value="">Selecione uma equipe</option>

            ${equipesCompativeis
              .map((equipe) => {
                const limite = obterLimiteMembros(equipe.tipoParticipante);
                const totalMembros = equipe.membros?.length || 0;

                return `
                  <option value="${equipe.id}">
                    ${equipe.nome} — ${totalMembros}/${limite} membros
                  </option>
                `;
              })
              .join("")}
          </select>
        </div>

        <button type="submit" class="botao" style="margin-top: 14px;">
          Enviar inscrição
        </button>
      </div>

      ${renderizarEquipesAtuais()}
      ${renderizarCriacaoEquipe()}
    `;

    const selectEquipe = document.getElementById("equipe-existente-id");

    if (selectEquipe) {
      selectEquipe.addEventListener("change", renderizarResumoEquipeSelecionada);
    }

    conectarEventosTela();
    return;
  }

  formInscricao.innerHTML = `
    <div class="area-edicao-inscricao" style="grid-column: 1 / -1;">
      <h4>Nenhuma equipe compatível encontrada</h4>

      <p class="info-auxiliar">
        Para se inscrever neste campeonato, você precisa de uma equipe completa e compatível.
      </p>

      <p class="info-auxiliar">
        Este campeonato é <strong>${traduzirTipoParticipante(campeonatoAtual.tipoParticipante)}</strong>
        na categoria <strong>${traduzirCategoria(campeonatoAtual.categoria)}</strong>.
      </p>
    </div>

    ${renderizarEquipesAtuais()}
    ${renderizarCriacaoEquipe()}
  `;

  conectarEventosTela();
}

function renderizarFormularioInscricao() {
  const modoInscricao = campeonatoAtual?.modoInscricao || "POR_EQUIPE";

  if (modoInscricao === "INDIVIDUAL") {
    renderizarFormularioInscricaoIndividual();
    return;
  }

  renderizarFormularioSomenteEquipe();
}

function conectarEventosInscricaoIndividual() {
  const inputComprovante = document.getElementById("comprovante-pagamento");
  const arquivoInfo = document.getElementById("arquivo-comprovante-info");

  if (!inputComprovante || !arquivoInfo) {
    return;
  }

  inputComprovante.addEventListener("change", () => {
    const arquivo = inputComprovante.files?.[0];

    if (!arquivo) {
      arquivoInfo.textContent = "";
      return;
    }

    try {
      validarArquivoComprovante(arquivo);

      arquivoInfo.textContent = `Arquivo selecionado: ${arquivo.name} (${formatarTamanhoArquivo(arquivo.size)})`;
      arquivoInfo.style.color = "#166534";
      arquivoInfo.style.fontWeight = "700";
    } catch (error) {
      inputComprovante.value = "";
      arquivoInfo.textContent = "";
      mostrarMensagemInscricao(error.message, "erro");
    }
  });
}

function conectarEventosTela() {
  conectarEventosCriacaoEquipe();
  conectarEventosEquipesAtuais();
}

function conectarEventosCriacaoEquipe() {
  const botaoCriarEquipe = document.getElementById("botao-criar-equipe-inscricao");

  if (!botaoCriarEquipe) {
    return;
  }

  botaoCriarEquipe.addEventListener("click", async () => {
    const inputNome = document.getElementById("nome-equipe-nova");
    const nomeEquipe = inputNome?.value.trim();

    if (!nomeEquipe) {
      mostrarMensagemInscricao("Informe o nome da equipe.", "erro");
      return;
    }

    try {
      mostrarMensagemInscricao("Criando equipe e gerando convite...", "info", false);

      const equipeCriada = await criarEquipe({
        nome: nomeEquipe,
        tipoParticipante: campeonatoAtual.tipoParticipante
      });

      const convite = await gerarConviteEquipe(equipeCriada.id);
      conviteGeradoPorEquipe[equipeCriada.id] = convite;

      await carregarEquipesDoParticipante();
      renderizarFormularioSomenteEquipe();

      mostrarMensagemInscricao(
        "Equipe criada. O link de convite apareceu dentro do card da equipe.",
        "sucesso",
        false
      );

      rolarParaEquipe(equipeCriada.id);
    } catch (error) {
      mostrarMensagemInscricao(`Erro ao criar equipe: ${error.message}`, "erro");
    }
  });
}

function conectarEventosEquipesAtuais() {
  const botoesEditar = document.querySelectorAll("[data-editar-equipe-id]");

  botoesEditar.forEach((botao) => {
    botao.addEventListener("click", () => {
      equipeEmEdicaoId = Number(botao.dataset.editarEquipeId);
      renderizarFormularioSomenteEquipe();
      limparMensagemInscricao();
    });
  });

  const botoesCancelar = document.querySelectorAll("[data-cancelar-edicao-equipe-id]");

  botoesCancelar.forEach((botao) => {
    botao.addEventListener("click", () => {
      equipeEmEdicaoId = null;
      renderizarFormularioSomenteEquipe();
      mostrarMensagemInscricao("Edição cancelada.", "info", false);
    });
  });

  const botoesSalvar = document.querySelectorAll("[data-salvar-edicao-equipe-id]");

  botoesSalvar.forEach((botao) => {
    botao.addEventListener("click", async () => {
      const equipeId = Number(botao.dataset.salvarEdicaoEquipeId);
      const inputNome = document.getElementById(`editar-nome-equipe-${equipeId}`);
      const equipe = equipesDoParticipante.find((item) => item.id === equipeId);

      if (!inputNome || !equipe) {
        mostrarMensagemInscricao("Equipe não encontrada para edição.", "erro");
        return;
      }

      const novoNome = inputNome.value.trim();

      if (!novoNome) {
        mostrarMensagemInscricao("Informe o nome da equipe.", "erro");
        return;
      }

      try {
        mostrarMensagemInscricao("Salvando equipe...", "info", false);

        await atualizarEquipe(equipeId, {
          nome: novoNome,
          tipoParticipante: equipe.tipoParticipante
        });

        equipeEmEdicaoId = null;
        await carregarEquipesDoParticipante();
        renderizarFormularioSomenteEquipe();

        mostrarMensagemInscricao("Equipe atualizada com sucesso.", "sucesso", false);
        rolarParaEquipe(equipeId);
      } catch (error) {
        mostrarMensagemInscricao(`Erro ao atualizar equipe: ${error.message}`, "erro");
      }
    });
  });

  const botoesGerarConvite = document.querySelectorAll("[data-gerar-convite-equipe-id]");

  botoesGerarConvite.forEach((botao) => {
    botao.addEventListener("click", async () => {
      const equipeId = Number(botao.dataset.gerarConviteEquipeId);

      try {
        mostrarMensagemInscricao("Gerando link de convite...", "info", false);

        const convite = await gerarConviteEquipe(equipeId);
        conviteGeradoPorEquipe[equipeId] = convite;

        renderizarFormularioSomenteEquipe();

        mostrarMensagemInscricao(
          "Link de convite gerado dentro do card da equipe.",
          "sucesso",
          false
        );

        rolarParaEquipe(equipeId);
      } catch (error) {
        mostrarMensagemInscricao(`Erro ao gerar convite: ${error.message}`, "erro");
      }
    });
  });

  const botoesCopiarConvite = document.querySelectorAll("[data-copiar-convite-equipe-id]");

  botoesCopiarConvite.forEach((botao) => {
    botao.addEventListener("click", async () => {
      const equipeId = Number(botao.dataset.copiarConviteEquipeId);
      const inputLink = document.getElementById(`input-link-convite-${equipeId}`);

      if (!inputLink) {
        mostrarMensagemInscricao("Link de convite não encontrado.", "erro");
        return;
      }

      try {
        await navigator.clipboard.writeText(inputLink.value);
        mostrarMensagemInscricao("Link de convite copiado.", "sucesso", false);
      } catch {
        inputLink.select();
        mostrarMensagemInscricao("Copie o link manualmente.", "info", false);
      }
    });
  });
}

async function carregarEquipesDoParticipante() {
  try {
    equipesDoParticipante = await listarMinhasEquipes();
  } catch {
    equipesDoParticipante = [];
  }
}

async function carregarCampeonato() {
  if (!campeonatoId) {
    dadosCampeonatoPublico.innerHTML = "<p>ID do campeonato não informado.</p>";
    formInscricao.style.display = "none";
    return;
  }

  try {
    campeonatoAtual = await buscarCampeonatoPorId(campeonatoId);

    if ((campeonatoAtual.modoInscricao || "POR_EQUIPE") === "POR_EQUIPE") {
      await carregarEquipesDoParticipante();
    }

    renderizarCabecalhoCampeonato(campeonatoAtual);
    renderizarFormularioInscricao();

    if (!campeonatoAtual.inscricoesAbertas) {
      mostrarMensagemInscricao("As inscrições deste campeonato estão encerradas.", "erro");
      formInscricao.style.display = "none";
    }
  } catch (error) {
    dadosCampeonatoPublico.innerHTML = `<p>Erro ao carregar campeonato: ${error.message}</p>`;
    formInscricao.style.display = "none";
  }
}

formInscricao.addEventListener("submit", async (event) => {
  event.preventDefault();

  const modoInscricao = campeonatoAtual?.modoInscricao || "POR_EQUIPE";

  if (modoInscricao === "INDIVIDUAL") {
    const selectTamanhoCamisa = document.getElementById("tamanho-camisa");
    const inputComprovante = document.getElementById("comprovante-pagamento");

    const tamanhoCamisa = selectTamanhoCamisa?.value;
    const arquivoComprovante = inputComprovante?.files?.[0];

    if (!TAMANHOS_CAMISA_VALIDOS.includes(tamanhoCamisa)) {
      mostrarMensagemInscricao("Selecione o tamanho da camisa.", "erro");
      return;
    }

    try {
      validarArquivoComprovante(arquivoComprovante);
    } catch (error) {
      mostrarMensagemInscricao(error.message, "erro");
      return;
    }

    mostrarMensagemInscricao("Enviando inscrição individual para análise...", "info");

    try {
      const comprovantePagamento = await converterArquivoParaBase64(arquivoComprovante);

      await criarInscricaoIndividual(campeonatoId, {
        tamanhoCamisa,
        comprovantePagamento
      });

      renderizarInscricaoIndividualConfirmada();

      mostrarMensagemInscricao(
        "Inscrição enviada para análise com sucesso!",
        "sucesso"
      );
    } catch (error) {
      mostrarMensagemInscricao(`Erro ao enviar inscrição individual: ${error.message}`, "erro");
    }

    return;
  }

  mostrarMensagemInscricao("Enviando inscrição...", "info");

  try {
    const selectEquipe = document.getElementById("equipe-existente-id");
    const equipeId = selectEquipe ? Number(selectEquipe.value) : null;

    if (!equipeId) {
      mostrarMensagemInscricao("Selecione uma equipe compatível para se inscrever.", "erro");
      return;
    }

    await criarInscricao(campeonatoId, {
      equipeId
    });

    await carregarEquipesDoParticipante();
    renderizarFormularioSomenteEquipe();

    mostrarMensagemInscricao(
      "Inscrição enviada com sucesso! Sua equipe foi inscrita no campeonato.",
      "sucesso"
    );
  } catch (error) {
    mostrarMensagemInscricao(`Erro ao enviar inscrição: ${error.message}`, "erro");
  }
});

protegerPaginaParticipante();
carregarCampeonato();