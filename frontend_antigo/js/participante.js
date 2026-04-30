import { cadastrarParticipante, loginParticipante } from "./api.js";

const URL_BASE = "http://localhost:3333";

const abaLoginParticipante = document.getElementById("aba-login-participante");
const abaCadastroParticipante = document.getElementById("aba-cadastro-participante");
const formLoginParticipante = document.getElementById("form-login-participante");
const formCadastroParticipante = document.getElementById("form-cadastro-participante");
const mensagemParticipante = document.getElementById("mensagem-participante");
const campoCadastroContato = document.getElementById("cadastro-participante-contato");

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

function escaparHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function limparMensagemParticipante() {
  mensagemParticipante.innerHTML = "";
  mensagemParticipante.removeAttribute("style");
}

function mostrarMensagemParticipante({
  titulo,
  texto,
  tipo = "info",
  extraHtml = ""
}) {
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
    alerta: {
      background: "#fffbeb",
      color: "#92400e",
      border: "1px solid #fbbf24"
    },
    info: {
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe"
    }
  };

  const estilo = estilos[tipo] || estilos.info;

  mensagemParticipante.innerHTML = `
    <div
      style="
        background: ${estilo.background};
        color: ${estilo.color};
        border: ${estilo.border};
        border-radius: 14px;
        padding: 16px 18px;
        margin-top: 16px;
        font-weight: 600;
        line-height: 1.5;
      "
    >
      <h3 style="margin: 0 0 8px 0; color: ${estilo.color};">
        ${escaparHtml(titulo)}
      </h3>

      <p style="margin: 0;">
        ${escaparHtml(texto)}
      </p>

      ${extraHtml}
    </div>
  `;
}

function montarFormularioReenvio(email = "") {
  return `
    <form
      id="form-reenviar-verificacao-inline"
      style="
        margin-top: 14px;
        display: grid;
        gap: 10px;
      "
    >
      <label
        for="email-reenvio-verificacao"
        style="font-weight: 700;"
      >
        Não recebeu o e-mail?
      </label>

      <input
        type="email"
        id="email-reenvio-verificacao"
        name="email"
        value="${escaparHtml(email)}"
        placeholder="Digite seu e-mail para reenviar"
        required
        style="
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          font-size: 1rem;
        "
      />

      <button
        type="submit"
        class="botao"
        style="width: fit-content;"
      >
        Reenviar e-mail de verificação
      </button>

      <p
        id="mensagem-reenvio-verificacao-inline"
        style="margin: 0; font-weight: 700;"
      ></p>
    </form>
  `;
}

function mostrarLoginParticipante(limparMensagem = true) {
  formLoginParticipante.classList.remove("oculto");
  formCadastroParticipante.classList.add("oculto");

  abaLoginParticipante.classList.remove("secundario");
  abaLoginParticipante.classList.add("aba-ativa");

  abaCadastroParticipante.classList.add("secundario");
  abaCadastroParticipante.classList.remove("aba-ativa");

  if (limparMensagem) {
    limparMensagemParticipante();
  }
}

function mostrarCadastroParticipante(limparMensagem = true) {
  formCadastroParticipante.classList.remove("oculto");
  formLoginParticipante.classList.add("oculto");

  abaCadastroParticipante.classList.remove("secundario");
  abaCadastroParticipante.classList.add("aba-ativa");

  abaLoginParticipante.classList.add("secundario");
  abaLoginParticipante.classList.remove("aba-ativa");

  if (limparMensagem) {
    limparMensagemParticipante();
  }
}

function salvarSessaoParticipante(resultadoLogin) {
  localStorage.setItem("tokenParticipante", resultadoLogin.token);
  localStorage.setItem(
    "participanteLogado",
    JSON.stringify(resultadoLogin.usuario)
  );
}

async function reenviarEmailVerificacao(email) {
  const resposta = await fetch(`${URL_BASE}/usuarios/reenviar-verificacao`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email })
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || dados.detalhe || "Erro ao reenviar e-mail.");
  }

  return dados;
}

if (campoCadastroContato) {
  campoCadastroContato.addEventListener("input", (event) => {
    event.target.value = aplicarMascaraTelefone(event.target.value);
  });
}

abaLoginParticipante.addEventListener("click", () => {
  mostrarLoginParticipante();
});

abaCadastroParticipante.addEventListener("click", () => {
  mostrarCadastroParticipante();
});

mensagemParticipante.addEventListener("submit", async (event) => {
  if (event.target.id !== "form-reenviar-verificacao-inline") {
    return;
  }

  event.preventDefault();

  const form = event.target;
  const mensagemReenvio = document.getElementById("mensagem-reenvio-verificacao-inline");
  const email = form.querySelector('[name="email"]').value.trim();

  if (!email) {
    mensagemReenvio.textContent = "Informe seu e-mail.";
    return;
  }

  try {
    mensagemReenvio.textContent = "Reenviando e-mail...";

    const resultado = await reenviarEmailVerificacao(email);

    mensagemReenvio.textContent =
      resultado.mensagem || "E-mail de verificação reenviado com sucesso.";
  } catch (error) {
    mensagemReenvio.textContent = `Erro: ${error.message}`;
  }
});

formCadastroParticipante.addEventListener("submit", async (event) => {
  event.preventDefault();

  mostrarMensagemParticipante({
    titulo: "Cadastrando participante...",
    texto: "Aguarde enquanto criamos sua conta.",
    tipo: "info"
  });

  const formData = new FormData(formCadastroParticipante);

  const dados = {
    nome: formData.get("nome")?.toString().trim(),
    email: formData.get("email")?.toString().trim(),
    contato: somenteNumeros(formData.get("contato")?.toString().trim() || ""),
    dataNascimento: formData.get("dataNascimento")?.toString(),
    sexo: formData.get("sexo")?.toString() || null,
    senha: formData.get("senha")?.toString()
  };

  try {
    const resultado = await cadastrarParticipante(dados);

    formCadastroParticipante.reset();
    mostrarLoginParticipante(false);

    const campoEmailLogin = formLoginParticipante.querySelector('[name="email"]');

    if (campoEmailLogin) {
      campoEmailLogin.value = dados.email;
    }

    mostrarMensagemParticipante({
      titulo: "Cadastro quase pronto",
      texto:
        resultado.mensagem ||
        "Cadastro realizado com sucesso. Verifique seu e-mail para ativar sua conta antes de fazer login.",
      tipo: "sucesso",
      extraHtml: `
        <div style="margin-top: 12px;">
          <p style="margin: 0 0 8px 0;">
            Enviamos um link de confirmação para:
            <strong>${escaparHtml(dados.email)}</strong>
          </p>

          <p style="margin: 0;">
            Abra sua caixa de entrada, clique no link de verificação e depois volte para fazer login.
            Se não encontrar, confira também o spam/lixo eletrônico.
          </p>

          ${montarFormularioReenvio(dados.email)}
        </div>
      `
    });
  } catch (error) {
    mostrarMensagemParticipante({
      titulo: "Erro no cadastro",
      texto: error.message,
      tipo: "erro"
    });
  }
});

formLoginParticipante.addEventListener("submit", async (event) => {
  event.preventDefault();

  mostrarMensagemParticipante({
    titulo: "Entrando...",
    texto: "Verificando seus dados de acesso.",
    tipo: "info"
  });

  const formData = new FormData(formLoginParticipante);

  const dados = {
    email: formData.get("email")?.toString().trim(),
    senha: formData.get("senha")?.toString()
  };

  try {
    const resultado = await loginParticipante(dados);

    salvarSessaoParticipante(resultado);

    mostrarMensagemParticipante({
      titulo: "Login realizado com sucesso",
      texto: "Redirecionando para os campeonatos...",
      tipo: "sucesso"
    });

    window.location.href = "./campeonatos-publicos.html";
  } catch (error) {
    const erroEmailNaoVerificado = error.message
      .toLowerCase()
      .includes("verifique seu e-mail");

    if (erroEmailNaoVerificado) {
      mostrarMensagemParticipante({
        titulo: "E-mail ainda não verificado",
        texto:
          "Antes de entrar no sistema, você precisa abrir o e-mail de confirmação e clicar no link de verificação.",
        tipo: "alerta",
        extraHtml: `
          <div style="margin-top: 12px;">
            <p style="margin: 0;">
              Verifique a caixa de entrada e o spam/lixo eletrônico do e-mail:
              <strong>${escaparHtml(dados.email)}</strong>
            </p>

            ${montarFormularioReenvio(dados.email)}
          </div>
        `
      });

      return;
    }

    mostrarMensagemParticipante({
      titulo: "Erro no login",
      texto: error.message,
      tipo: "erro"
    });
  }
});

mostrarLoginParticipante();