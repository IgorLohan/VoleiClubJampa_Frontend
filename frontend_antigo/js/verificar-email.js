const URL_BASE = "http://localhost:3333";

const params = new URLSearchParams(window.location.search);
const token = params.get("token");

const mensagemVerificacao = document.getElementById("mensagem-verificacao");
const detalhesVerificacao = document.getElementById("detalhes-verificacao");
const secaoReenvio = document.getElementById("secao-reenvio");
const formReenviarVerificacao = document.getElementById("form-reenviar-verificacao");
const mensagemReenvio = document.getElementById("mensagem-reenvio");

function mostrarMensagem(elemento, texto, tipo = "info") {
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

  elemento.textContent = texto;
  elemento.style.display = "block";
  elemento.style.padding = "12px 14px";
  elemento.style.borderRadius = "10px";
  elemento.style.fontWeight = "700";
  elemento.style.background = estilo.background;
  elemento.style.color = estilo.color;
  elemento.style.border = estilo.border;
}

async function verificarEmail() {
  if (!token) {
    mostrarMensagem(
      mensagemVerificacao,
      "Token de verificação não encontrado no link.",
      "erro"
    );

    detalhesVerificacao.innerHTML = `
      <p class="info-auxiliar">
        O link pode estar incompleto. Tente copiar o link completo recebido no e-mail.
      </p>
    `;

    secaoReenvio.style.display = "block";
    return;
  }

  try {
    mostrarMensagem(mensagemVerificacao, "Verificando seu e-mail...", "info");

    const resposta = await fetch(
      `${URL_BASE}/usuarios/verificar-email?token=${encodeURIComponent(token)}`
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || "Erro ao verificar e-mail.");
    }

    mostrarMensagem(
      mensagemVerificacao,
      dados.mensagem || "E-mail verificado com sucesso.",
      "sucesso"
    );

    detalhesVerificacao.innerHTML = `
      <p>
        Sua conta foi ativada. Agora você já pode entrar no sistema usando seu e-mail e senha.
      </p>
    `;

    secaoReenvio.style.display = "none";
  } catch (error) {
    mostrarMensagem(
      mensagemVerificacao,
      `Não foi possível verificar o e-mail: ${error.message}`,
      "erro"
    );

    detalhesVerificacao.innerHTML = `
      <p class="info-auxiliar">
        O link pode ter expirado ou já ter sido usado. Você pode solicitar um novo e-mail de verificação abaixo.
      </p>
    `;

    secaoReenvio.style.display = "block";
  }
}

formReenviarVerificacao.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email-reenvio").value.trim();

  if (!email) {
    mostrarMensagem(mensagemReenvio, "Digite seu e-mail.", "erro");
    return;
  }

  try {
    mostrarMensagem(mensagemReenvio, "Reenviando e-mail de verificação...", "info");

    const resposta = await fetch(`${URL_BASE}/usuarios/reenviar-verificacao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || "Erro ao reenviar e-mail.");
    }

    mostrarMensagem(
      mensagemReenvio,
      dados.mensagem || "E-mail de verificação reenviado com sucesso.",
      "sucesso"
    );
  } catch (error) {
    mostrarMensagem(
      mensagemReenvio,
      `Erro ao reenviar verificação: ${error.message}`,
      "erro"
    );
  }
});

verificarEmail();