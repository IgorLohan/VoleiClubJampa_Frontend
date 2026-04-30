import {
  buscarConviteEquipe,
  aceitarConviteEquipe,
  obterTokenParticipante
} from "./api.js";

const params = new URLSearchParams(window.location.search);
const token = params.get("token");

const conviteEquipeBox = document.getElementById("convite-equipe-box");
const mensagemConviteEquipe = document.getElementById("mensagem-convite-equipe");
const linkMeuPerfil = document.getElementById("link-meu-perfil");
const linkLoginCadastro = document.getElementById("link-login-cadastro");

let conviteAtual = null;

function usuarioEstaLogado() {
  return Boolean(obterTokenParticipante());
}

function configurarBotoesTopo() {
  if (usuarioEstaLogado()) {
    if (linkMeuPerfil) {
      linkMeuPerfil.style.display = "inline-flex";
    }

    if (linkLoginCadastro) {
      linkLoginCadastro.style.display = "none";
    }

    return;
  }

  if (linkMeuPerfil) {
    linkMeuPerfil.style.display = "none";
  }

  if (linkLoginCadastro) {
    linkLoginCadastro.style.display = "inline-flex";
  }
}

function traduzirTipoEquipe(tipo) {
  const mapa = {
    DUPLA: "Dupla",
    TIME: "Quarteto"
  };

  return mapa[tipo] || tipo;
}

function traduzirSexo(sexo) {
  const mapa = {
    MASCULINO: "Masculino",
    FEMININO: "Feminino"
  };

  return mapa[sexo] || "Não informado";
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

function renderizarConvite(convite) {
  const equipe = convite.equipe;
  const membros = equipe.membros || [];
  const limite = obterLimiteMembros(equipe.tipoParticipante);

  const membrosHtml = membros.length
    ? membros
        .map(
          (membro) => `
            <li>
              ${membro.usuario?.nome || "Usuário"}
              — ${traduzirPapelEquipe(membro.papel)}
              — ${traduzirSexo(membro.usuario?.sexo)}
            </li>
          `
        )
        .join("")
    : "<li>Nenhum membro encontrado.</li>";

  conviteEquipeBox.innerHTML = `
    <div class="bloco-informacoes">
      <p><strong>Equipe:</strong> ${equipe.nome}</p>
      <p><strong>Tipo:</strong> ${traduzirTipoEquipe(equipe.tipoParticipante)}</p>
      <p><strong>Capitão:</strong> ${equipe.dono?.nome || "Não informado"}</p>
      <p><strong>Membros:</strong> ${membros.length}/${limite}</p>
      <p><strong>Status do convite:</strong> ${convite.status}</p>

      <div style="margin-top: 14px;">
        <strong>Membros atuais:</strong>
        <ul style="margin-left: 18px; margin-top: 8px;">
          ${membrosHtml}
        </ul>
      </div>

      ${
        usuarioEstaLogado()
          ? `
            <div class="acoes-card">
              <button id="botao-aceitar-convite" class="botao-pequeno" type="button">
                Aceitar convite
              </button>
            </div>
          `
          : `
            <div class="area-edicao-inscricao" style="margin-top: 16px;">
              <h4>Faça login para aceitar</h4>
              <p class="info-auxiliar">
                Entre ou crie sua conta de participante. Depois, abra este link novamente para aceitar o convite.
              </p>
              <a href="./participante.html" class="botao-pequeno">
                Ir para login/cadastro
              </a>
            </div>
          `
      }
    </div>
  `;

  const botaoAceitar = document.getElementById("botao-aceitar-convite");

  if (botaoAceitar) {
    botaoAceitar.addEventListener("click", aceitarConvite);
  }
}

async function aceitarConvite() {
  try {
    mensagemConviteEquipe.textContent = "Aceitando convite...";

    await aceitarConviteEquipe(token);

    mensagemConviteEquipe.textContent = "Convite aceito com sucesso. Você agora faz parte da equipe.";

    await carregarConvite();
  } catch (error) {
    mensagemConviteEquipe.textContent = `Erro ao aceitar convite: ${error.message}`;
  }
}

async function carregarConvite() {
  if (!token) {
    conviteEquipeBox.innerHTML = "<p>Token do convite não informado.</p>";
    return;
  }

  try {
    mensagemConviteEquipe.textContent = "";
    conviteEquipeBox.innerHTML = "<p>Carregando convite...</p>";

    conviteAtual = await buscarConviteEquipe(token);

    renderizarConvite(conviteAtual);
  } catch (error) {
    conviteEquipeBox.innerHTML = `<p>Erro ao carregar convite: ${error.message}</p>`;
  }
}

configurarBotoesTopo();
carregarConvite();