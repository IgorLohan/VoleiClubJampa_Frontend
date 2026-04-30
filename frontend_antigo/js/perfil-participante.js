import {
  buscarPerfilParticipante,
  atualizarPerfilParticipante,
  atualizarFotoPerfilParticipante,
  criarEquipe,
  listarMinhasEquipes,
  gerarConviteEquipe,
  atualizarEquipe,
  excluirEquipe,
  removerMembroEquipe
} from "./api.js";

const perfilParticipanteBox = document.getElementById("perfil-participante-box");
const mensagemPerfilParticipante = document.getElementById("mensagem-perfil-participante");
const botaoLogoutParticipante = document.getElementById("botao-logout-participante");

let usuarioAtual = null;
let equipesAtual = [];
let modoEdicao = false;
let arquivoFotoSelecionado = null;
let equipeAbertaId = null;
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

function formatarDataInput(data) {
  if (!data) return "";
  return new Date(data).toISOString().split("T")[0];
}

function formatarAniversario(data) {
  if (!data) return "Não informada";

  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC"
  });
}

function formatarTelefone(contato) {
  if (!contato) return "Não informado";

  const numeros = contato.replace(/\D/g, "");

  if (numeros.length === 11) {
    return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }

  if (numeros.length === 10) {
    return numeros.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }

  return contato;
}

function aplicarMascaraTelefone(valor) {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);

  if (numeros.length <= 10) {
    return numeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return numeros
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function somenteNumeros(valor) {
  return valor.replace(/\D/g, "");
}

function obterUrlFoto(fotoPerfil) {
  if (!fotoPerfil) return "";

  if (fotoPerfil.startsWith("http://") || fotoPerfil.startsWith("https://")) {
    return fotoPerfil;
  }

  return `http://localhost:3333${fotoPerfil}`;
}

function traduzirSexo(sexo) {
  const mapa = {
    MASCULINO: "Masculino",
    FEMININO: "Feminino"
  };

  return mapa[sexo] || "Não informado";
}

function traduzirTipoEquipe(tipo) {
  const mapa = {
    DUPLA: "Dupla",
    TIME: "Quarteto"
  };

  return mapa[tipo] || tipo;
}

function traduzirPapelEquipe(papel) {
  const mapa = {
    DONO: "Capitão",
    MEMBRO: "Membro"
  };

  return mapa[papel] || papel;
}

function obterLimiteMembros(tipoParticipante) {
  if (tipoParticipante === "DUPLA") return 2;
  if (tipoParticipante === "TIME") return 4;
  return 0;
}

function obterResumoCategoriaEquipe(equipe) {
  const membros = equipe.membros || [];
  const masculinos = membros.filter((membro) => membro.usuario?.sexo === "MASCULINO").length;
  const femininos = membros.filter((membro) => membro.usuario?.sexo === "FEMININO").length;

  if (equipe.tipoParticipante === "DUPLA") {
    if (masculinos === 2) return "Compatível com masculino";
    if (femininos === 2) return "Compatível com feminino";
    if (masculinos === 1 && femininos === 1) return "Compatível com misto";
  }

  if (equipe.tipoParticipante === "TIME") {
    if (masculinos === 4) return "Compatível com masculino";
    if (femininos === 4) return "Compatível com feminino";
    if (masculinos === 2 && femininos === 2) return "Compatível com misto";
  }

  return "Categoria ainda indefinida";
}

function equipeEstaCompleta(equipe) {
  return (equipe.membros?.length || 0) >= obterLimiteMembros(equipe.tipoParticipante);
}

function montarLinkConvite(token) {
  const caminhoAtual = window.location.pathname;
  const pastaAtual = caminhoAtual.substring(0, caminhoAtual.lastIndexOf("/") + 1);

  return `${window.location.origin}${pastaAtual}convite-equipe.html?token=${token}`;
}

function renderizarBlocoEquipes() {
  return `
    <section class="area-edicao-campeonato">
      <div class="titulo-secao">
        <div>
          <h2>Minhas equipes</h2>
          <p class="info-auxiliar">
            Crie duplas ou quartetos e gere convites para outros participantes entrarem.
          </p>
        </div>
      </div>

      <form id="form-criar-equipe" class="formulario-edicao-campeonato">
        <div class="grupo-formulario">
          <label for="nome-equipe">Nome da equipe</label>
          <input
            type="text"
            id="nome-equipe"
            name="nomeEquipe"
            placeholder="Ex: Vôlei Jampa A"
            required
          />
        </div>

        <div class="grupo-formulario">
          <label for="tipo-equipe">Tipo</label>
          <select id="tipo-equipe" name="tipoParticipante" required>
            <option value="DUPLA">Dupla</option>
            <option value="TIME">Quarteto</option>
          </select>
        </div>

        <div class="acoes-card">
          <button type="submit" class="botao-pequeno">Criar equipe</button>
        </div>
      </form>

      <div class="lista-simples" style="margin-top: 16px;">
        ${
          equipesAtual.length
            ? equipesAtual.map((equipe) => renderizarCardEquipe(equipe)).join("")
            : "<p>Nenhuma equipe criada ou vinculada ainda.</p>"
        }
      </div>
    </section>
  `;
}

function renderizarFormularioEdicaoEquipe(equipe) {
  return `
    <div class="area-edicao-inscricao">
      <h4>Editar equipe</h4>

      <form class="formulario-edicao-inscricao" data-form-editar-equipe-id="${equipe.id}">
        <div class="grupo-formulario">
          <label>Nome da equipe</label>
          <input
            type="text"
            name="nomeEquipe"
            value="${equipe.nome}"
            required
          />
        </div>

        <div class="grupo-formulario">
          <label>Tipo</label>
          <select name="tipoParticipante" required>
            <option value="DUPLA" ${equipe.tipoParticipante === "DUPLA" ? "selected" : ""}>Dupla</option>
            <option value="TIME" ${equipe.tipoParticipante === "TIME" ? "selected" : ""}>Quarteto</option>
          </select>
          <small class="texto-ajuda">
            Só será possível mudar o tipo se a quantidade atual de membros permitir.
          </small>
        </div>

        <div class="acoes-card">
          <button type="submit" class="botao-pequeno">Salvar equipe</button>
          <button
            type="button"
            class="botao-pequeno secundario"
            data-cancelar-edicao-equipe-id="${equipe.id}"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderizarListaMembrosEquipe(equipe, usuarioEhCapitao) {
  return `
    <ul>
      ${(equipe.membros || [])
        .map((membro) => {
          const ehCapitao = membro.usuarioId === equipe.donoId;
          const podeExpulsar =
            usuarioEhCapitao &&
            !ehCapitao &&
            membro.usuarioId !== usuarioAtual?.id;

          return `
            <li style="margin-bottom: 10px;">
              <span>
                ${membro.usuario?.nome || "Usuário"}
                — ${traduzirPapelEquipe(membro.papel)}
                — ${traduzirSexo(membro.usuario?.sexo)}
              </span>

              ${
                podeExpulsar
                  ? `
                    <button
                      type="button"
                      class="botao-pequeno botao-excluir"
                      style="margin-left: 8px; padding: 6px 10px;"
                      data-remover-membro-equipe-id="${equipe.id}"
                      data-remover-membro-id="${membro.id}"
                      data-remover-membro-nome="${membro.usuario?.nome || "Usuário"}"
                    >
                      Expulsar
                    </button>
                  `
                  : ""
              }
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

function renderizarCardEquipe(equipe) {
  const aberta = equipeAbertaId === equipe.id;
  const editando = equipeEmEdicaoId === equipe.id;
  const limite = obterLimiteMembros(equipe.tipoParticipante);
  const totalMembros = equipe.membros?.length || 0;
  const completa = equipeEstaCompleta(equipe);
  const convite = conviteGeradoPorEquipe[equipe.id];
  const usuarioEhCapitao = equipe.donoId === usuarioAtual?.id;

  return `
    <div class="item-lista">
      <h3>${equipe.nome}</h3>
      <p><strong>Tipo:</strong> ${traduzirTipoEquipe(equipe.tipoParticipante)}</p>
      <p><strong>Membros:</strong> ${totalMembros}/${limite}</p>
      <p><strong>Status:</strong> ${completa ? "Equipe completa" : "Equipe incompleta"}</p>
      <p><strong>Categoria:</strong> ${obterResumoCategoriaEquipe(equipe)}</p>
      <p><strong>Capitão:</strong> ${equipe.dono?.nome || "Não informado"}</p>

      <div class="acoes-card">
        <button
          class="botao-pequeno"
          type="button"
          data-alternar-equipe-id="${equipe.id}"
        >
          ${aberta ? "Ocultar detalhes" : "Ver detalhes"}
        </button>

        ${
          usuarioEhCapitao
            ? `
              <button
                class="botao-pequeno secundario"
                type="button"
                data-editar-equipe-id="${equipe.id}"
              >
                Editar equipe
              </button>

              <button
                class="botao-pequeno botao-excluir"
                type="button"
                data-excluir-equipe-id="${equipe.id}"
              >
                Excluir equipe
              </button>
            `
            : ""
        }

        ${
          usuarioEhCapitao && !completa
            ? `
              <button
                class="botao-pequeno secundario"
                type="button"
                data-gerar-convite-equipe-id="${equipe.id}"
              >
                Gerar convite
              </button>
            `
            : ""
        }
      </div>

      ${editando ? renderizarFormularioEdicaoEquipe(equipe) : ""}

      ${
        convite
          ? `
            <div class="area-edicao-inscricao">
              <h4>Link de convite</h4>
              <p class="info-auxiliar">
                Envie este link para a pessoa que você quer convidar:
              </p>

              <input
                id="input-link-convite-${equipe.id}"
                type="text"
                value="${montarLinkConvite(convite.token)}"
                readonly
                style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 10px; margin-top: 8px;"
              />

              <div class="acoes-card">
                <button
                  type="button"
                  class="botao-pequeno"
                  data-copiar-convite-equipe-id="${equipe.id}"
                >
                  Copiar link
                </button>
              </div>
            </div>
          `
          : ""
      }

      ${
        aberta
          ? `
            <div class="area-edicao-inscricao">
              <h4>Detalhes da equipe</h4>

              <p><strong>Capitão:</strong> ${equipe.dono?.nome || "Não informado"}</p>

              ${renderizarListaMembrosEquipe(equipe, usuarioEhCapitao)}
            </div>
          `
          : ""
      }
    </div>
  `;
}

function conectarEventosEquipes() {
  const formCriarEquipe = document.getElementById("form-criar-equipe");

  if (formCriarEquipe) {
    formCriarEquipe.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        mensagemPerfilParticipante.textContent = "Criando equipe...";

        const formData = new FormData(formCriarEquipe);

        await criarEquipe({
          nome: formData.get("nomeEquipe")?.toString().trim(),
          tipoParticipante: formData.get("tipoParticipante")?.toString()
        });

        formCriarEquipe.reset();
        await carregarEquipes();
        renderizarPerfil();
        mensagemPerfilParticipante.textContent = "Equipe criada com sucesso.";
      } catch (error) {
        mensagemPerfilParticipante.textContent = `Erro ao criar equipe: ${error.message}`;
      }
    });
  }

  const botoesAlternar = document.querySelectorAll("[data-alternar-equipe-id]");

  botoesAlternar.forEach((botao) => {
    botao.addEventListener("click", () => {
      const id = Number(botao.dataset.alternarEquipeId);
      equipeAbertaId = equipeAbertaId === id ? null : id;
      renderizarPerfil();
      mensagemPerfilParticipante.textContent = "";
    });
  });

  const botoesEditar = document.querySelectorAll("[data-editar-equipe-id]");

  botoesEditar.forEach((botao) => {
    botao.addEventListener("click", () => {
      equipeEmEdicaoId = Number(botao.dataset.editarEquipeId);
      equipeAbertaId = equipeEmEdicaoId;
      renderizarPerfil();
      mensagemPerfilParticipante.textContent = "";
    });
  });

  const botoesCancelarEdicao = document.querySelectorAll("[data-cancelar-edicao-equipe-id]");

  botoesCancelarEdicao.forEach((botao) => {
    botao.addEventListener("click", () => {
      equipeEmEdicaoId = null;
      renderizarPerfil();
      mensagemPerfilParticipante.textContent = "Edição da equipe cancelada.";
    });
  });

  const formsEdicaoEquipe = document.querySelectorAll("[data-form-editar-equipe-id]");

  formsEdicaoEquipe.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const equipeId = Number(form.dataset.formEditarEquipeId);

      try {
        mensagemPerfilParticipante.textContent = "Salvando equipe...";

        const formData = new FormData(form);

        await atualizarEquipe(equipeId, {
          nome: formData.get("nomeEquipe")?.toString().trim(),
          tipoParticipante: formData.get("tipoParticipante")?.toString()
        });

        equipeEmEdicaoId = null;
        await carregarEquipes();
        renderizarPerfil();
        mensagemPerfilParticipante.textContent = "Equipe atualizada com sucesso.";
      } catch (error) {
        mensagemPerfilParticipante.textContent = `Erro ao atualizar equipe: ${error.message}`;
      }
    });
  });

  const botoesExcluir = document.querySelectorAll("[data-excluir-equipe-id]");

  botoesExcluir.forEach((botao) => {
    botao.addEventListener("click", async () => {
      const equipeId = Number(botao.dataset.excluirEquipeId);

      const confirmar = window.confirm(
        "Tem certeza que deseja excluir esta equipe? Os membros e convites vinculados a ela também serão removidos."
      );

      if (!confirmar) {
        return;
      }

      try {
        mensagemPerfilParticipante.textContent = "Excluindo equipe...";

        await excluirEquipe(equipeId);

        if (equipeAbertaId === equipeId) {
          equipeAbertaId = null;
        }

        if (equipeEmEdicaoId === equipeId) {
          equipeEmEdicaoId = null;
        }

        delete conviteGeradoPorEquipe[equipeId];

        await carregarEquipes();
        renderizarPerfil();
        mensagemPerfilParticipante.textContent = "Equipe excluída com sucesso.";
      } catch (error) {
        mensagemPerfilParticipante.textContent = `Erro ao excluir equipe: ${error.message}`;
      }
    });
  });

  const botoesRemoverMembro = document.querySelectorAll("[data-remover-membro-id]");

  botoesRemoverMembro.forEach((botao) => {
    botao.addEventListener("click", async () => {
      const equipeId = Number(botao.dataset.removerMembroEquipeId);
      const membroId = Number(botao.dataset.removerMembroId);
      const nomeMembro = botao.dataset.removerMembroNome || "este membro";

      const confirmar = window.confirm(
        `Tem certeza que deseja expulsar ${nomeMembro} desta equipe?`
      );

      if (!confirmar) {
        return;
      }

      try {
        mensagemPerfilParticipante.textContent = "Removendo membro...";

        await removerMembroEquipe(equipeId, membroId);

        delete conviteGeradoPorEquipe[equipeId];

        await carregarEquipes();
        renderizarPerfil();
        mensagemPerfilParticipante.textContent = "Membro removido da equipe com sucesso.";
      } catch (error) {
        mensagemPerfilParticipante.textContent = `Erro ao remover membro: ${error.message}`;
      }
    });
  });

  const botoesConvite = document.querySelectorAll("[data-gerar-convite-equipe-id]");

  botoesConvite.forEach((botao) => {
    botao.addEventListener("click", async () => {
      const equipeId = Number(botao.dataset.gerarConviteEquipeId);

      try {
        mensagemPerfilParticipante.textContent = "Gerando convite...";

        const convite = await gerarConviteEquipe(equipeId);
        conviteGeradoPorEquipe[equipeId] = convite;

        renderizarPerfil();
        mensagemPerfilParticipante.textContent = "Convite gerado com sucesso.";
      } catch (error) {
        mensagemPerfilParticipante.textContent = `Erro ao gerar convite: ${error.message}`;
      }
    });
  });

  const botoesCopiarConvite = document.querySelectorAll("[data-copiar-convite-equipe-id]");

  botoesCopiarConvite.forEach((botao) => {
    botao.addEventListener("click", async () => {
      const equipeId = Number(botao.dataset.copiarConviteEquipeId);
      const inputLink = document.getElementById(`input-link-convite-${equipeId}`);

      if (!inputLink) {
        mensagemPerfilParticipante.textContent = "Link de convite não encontrado.";
        return;
      }

      try {
        await navigator.clipboard.writeText(inputLink.value);
        mensagemPerfilParticipante.textContent = "Link de convite copiado.";
      } catch {
        inputLink.select();
        mensagemPerfilParticipante.textContent = "Copie o link manualmente.";
      }
    });
  });
}

function renderizarPerfilVisualizacao(usuario) {
  const foto = usuario.fotoPerfil
    ? `<img src="${obterUrlFoto(usuario.fotoPerfil)}" alt="Foto de perfil" class="foto-perfil-participante" />`
    : `<div class="foto-perfil-placeholder">Sem foto</div>`;

  perfilParticipanteBox.innerHTML = `
    <div class="perfil-participante-card">
      <div class="perfil-participante-topo">
        ${foto}
      </div>

      <div class="bloco-informacoes">
        <p><strong>Nome:</strong> ${usuario.nome}</p>
        <p><strong>E-mail:</strong> ${usuario.email}</p>
        <p><strong>Contato:</strong> ${formatarTelefone(usuario.contato)}</p>
        <p><strong>Sexo:</strong> ${traduzirSexo(usuario.sexo)}</p>
        <p><strong>Data de aniversário:</strong> ${formatarAniversario(usuario.dataNascimento)}</p>
        <p><strong>Conta criada em:</strong> ${formatarData(usuario.criadoEm)}</p>
      </div>

      <div class="acoes-card">
        <button id="botao-editar-perfil" class="botao-pequeno" type="button">
          Editar perfil
        </button>
      </div>
    </div>

    ${renderizarBlocoEquipes()}
  `;

  const botaoEditarPerfil = document.getElementById("botao-editar-perfil");

  if (botaoEditarPerfil) {
    botaoEditarPerfil.addEventListener("click", () => {
      modoEdicao = true;
      arquivoFotoSelecionado = null;
      renderizarPerfil();
      mensagemPerfilParticipante.textContent = "";
    });
  }

  conectarEventosEquipes();
}

function renderizarPerfilEdicao(usuario) {
  const foto = usuario.fotoPerfil
    ? `<img src="${obterUrlFoto(usuario.fotoPerfil)}" alt="Foto de perfil" class="foto-perfil-participante" />`
    : `<div class="foto-perfil-placeholder">Clique para adicionar foto</div>`;

  perfilParticipanteBox.innerHTML = `
    <div class="perfil-participante-card">
      <div class="perfil-participante-topo">
        <label for="input-foto-perfil-edicao" class="foto-perfil-clicavel" title="Clique para trocar a foto">
          ${foto}
          <span class="texto-acao-foto-inline">Clique na foto para trocar</span>
        </label>
        <input
          type="file"
          id="input-foto-perfil-edicao"
          accept=".jpg,.jpeg,.png,.webp"
          class="oculto"
        />
      </div>

      <form id="form-edicao-perfil" class="formulario-edicao-campeonato">
        <div class="grupo-formulario">
          <label for="perfil-nome">Nome</label>
          <input type="text" id="perfil-nome" name="nome" value="${usuario.nome}" required />
        </div>

        <div class="grupo-formulario">
          <label for="perfil-contato">Contato</label>
          <input
            type="tel"
            id="perfil-contato"
            name="contato"
            value="${formatarTelefone(usuario.contato || "")}"
            maxlength="15"
            inputmode="numeric"
            required
          />
        </div>

        <div class="grupo-formulario">
          <label for="perfil-sexo">Sexo</label>
          <select id="perfil-sexo" name="sexo" required>
            <option value="">Selecione</option>
            <option value="MASCULINO" ${usuario.sexo === "MASCULINO" ? "selected" : ""}>Masculino</option>
            <option value="FEMININO" ${usuario.sexo === "FEMININO" ? "selected" : ""}>Feminino</option>
          </select>
        </div>

        <div class="grupo-formulario">
          <label for="perfil-dataNascimento">Data de aniversário</label>
          <input
            type="date"
            id="perfil-dataNascimento"
            name="dataNascimento"
            value="${formatarDataInput(usuario.dataNascimento)}"
            required
          />
        </div>

        <div class="acoes-card">
          <button type="submit" class="botao-pequeno">Salvar alterações</button>
          <button type="button" id="botao-cancelar-edicao-perfil" class="botao-pequeno secundario">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  `;

  const campoContato = document.getElementById("perfil-contato");
  const formEdicao = document.getElementById("form-edicao-perfil");
  const botaoCancelar = document.getElementById("botao-cancelar-edicao-perfil");
  const inputFoto = document.getElementById("input-foto-perfil-edicao");

  if (campoContato) {
    campoContato.addEventListener("input", (event) => {
      event.target.value = aplicarMascaraTelefone(event.target.value);
    });
  }

  if (inputFoto) {
    inputFoto.addEventListener("change", () => {
      const arquivo = inputFoto.files[0];
      if (!arquivo) return;

      arquivoFotoSelecionado = arquivo;

      const urlTemporaria = URL.createObjectURL(arquivo);
      const fotoEl = document.querySelector(".foto-perfil-clicavel img");
      const placeholderEl = document.querySelector(".foto-perfil-clicavel .foto-perfil-placeholder");

      if (fotoEl) {
        fotoEl.src = urlTemporaria;
      } else if (placeholderEl) {
        placeholderEl.outerHTML = `<img src="${urlTemporaria}" alt="Foto de perfil" class="foto-perfil-participante" />`;
      }

      mensagemPerfilParticipante.textContent = "Nova foto selecionada. Agora clique em Salvar alterações.";
    });
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener("click", () => {
      modoEdicao = false;
      arquivoFotoSelecionado = null;
      renderizarPerfil();
      mensagemPerfilParticipante.textContent = "Edição cancelada.";
    });
  }

  if (formEdicao) {
    formEdicao.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        mensagemPerfilParticipante.textContent = "Salvando alterações...";

        const nome = document.getElementById("perfil-nome").value.trim();
        const contato = somenteNumeros(document.getElementById("perfil-contato").value.trim());
        const sexo = document.getElementById("perfil-sexo").value;
        const dataNascimento = document.getElementById("perfil-dataNascimento").value;

        let usuarioAtualizado = await atualizarPerfilParticipante({
          nome,
          contato,
          sexo,
          dataNascimento
        });

        if (arquivoFotoSelecionado) {
          usuarioAtualizado = await atualizarFotoPerfilParticipante(arquivoFotoSelecionado);
        }

        usuarioAtual = {
          ...usuarioAtual,
          ...usuarioAtualizado,
          nome,
          contato,
          sexo,
          dataNascimento
        };

        localStorage.setItem("participanteLogado", JSON.stringify(usuarioAtual));

        modoEdicao = false;
        arquivoFotoSelecionado = null;
        renderizarPerfil();
        mensagemPerfilParticipante.textContent = "Perfil atualizado com sucesso.";
      } catch (error) {
        mensagemPerfilParticipante.textContent = `Erro ao atualizar perfil: ${error.message}`;
      }
    });
  }
}

function renderizarPerfil() {
  if (!usuarioAtual) return;

  if (modoEdicao) {
    renderizarPerfilEdicao(usuarioAtual);
    return;
  }

  renderizarPerfilVisualizacao(usuarioAtual);
}

async function carregarEquipes() {
  equipesAtual = await listarMinhasEquipes();
}

async function carregarPerfil() {
  try {
    mensagemPerfilParticipante.textContent = "Carregando perfil...";
    usuarioAtual = await buscarPerfilParticipante();
    await carregarEquipes();
    renderizarPerfil();
    mensagemPerfilParticipante.textContent = "";
  } catch (error) {
    mensagemPerfilParticipante.textContent = `Erro ao carregar perfil: ${error.message}`;
  }
}

botaoLogoutParticipante.addEventListener("click", sairParticipante);

protegerPaginaParticipante();
carregarPerfil();