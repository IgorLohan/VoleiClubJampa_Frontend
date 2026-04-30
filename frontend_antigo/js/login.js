import { loginAdmin } from "./api.js";

const abaLogin = document.getElementById("aba-login");
const abaCadastro = document.getElementById("aba-cadastro");
const formLogin = document.getElementById("form-login");
const formCadastro = document.getElementById("form-cadastro");
const mensagemAuth = document.getElementById("mensagem-auth");

function mostrarLogin() {
  formLogin.classList.remove("oculto");

  if (formCadastro) {
    formCadastro.classList.add("oculto");
  }

  abaLogin.classList.remove("secundario");
  abaLogin.classList.add("aba-ativa");

  if (abaCadastro) {
    abaCadastro.classList.add("secundario");
    abaCadastro.classList.remove("aba-ativa");
    abaCadastro.style.display = "none";
  }

  mensagemAuth.textContent = "";
}

function salvarSessao(resultadoLogin) {
  localStorage.setItem("tokenAdmin", resultadoLogin.token);
  localStorage.setItem(
    "adminLogado",
    JSON.stringify(resultadoLogin.admin)
  );
}

if (abaLogin) {
  abaLogin.addEventListener("click", mostrarLogin);
}

if (abaCadastro) {
  abaCadastro.style.display = "none";
}

if (formCadastro) {
  formCadastro.style.display = "none";
}

formLogin.addEventListener("submit", async (event) => {
  event.preventDefault();

  mensagemAuth.textContent = "Entrando...";

  const formData = new FormData(formLogin);

  const dados = {
    login: formData.get("login")?.toString().trim(),
    senha: formData.get("senha")?.toString()
  };

  try {
    const resultado = await loginAdmin(dados);
    salvarSessao(resultado);
    mensagemAuth.textContent = "Login realizado com sucesso.";
    window.location.href = "./inicio.html";
  } catch (error) {
    mensagemAuth.textContent = `Erro no login: ${error.message}`;
  }
});

mostrarLogin();