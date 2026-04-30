"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cadastrarParticipante, loginParticipante, reenviarVerificacao } from "@/lib/api";
import { chavesSessao, setJSONStorage, setStorage } from "@/lib/sessao";
import { Calendar, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";

function mascararContato(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);

  if (!ddd) return "";
  if (resto.length <= 4) return `(${ddd}) ${resto}`.trim();
  if (resto.length <= 8) {
    const p1 = resto.slice(0, 4);
    const p2 = resto.slice(4);
    return `(${ddd}) ${p1}${p2 ? `-${p2}` : ""}`;
  }
  const p1 = resto.slice(0, 5);
  const p2 = resto.slice(5);
  return `(${ddd}) ${p1}${p2 ? `-${p2}` : ""}`;
}

type PapelUsuario = "ADMIN" | "PARTICIPANTE";

type LoginResultado = {
  token: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    papel: PapelUsuario;
    contato?: string | null;
    dataNascimento?: string | Date | null;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [aba, setAba] = useState<"LOGIN" | "CADASTRO">("LOGIN");
  const [mensagem, setMensagem] = useState("");
  const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState(false);
  const [mostrarSenhaCadastro, setMostrarSenhaCadastro] = useState(false);
  const [carregando, setCarregando] = useState<null | "LOGIN" | "CADASTRO">(null);
  const [tentouCadastrar, setTentouCadastrar] = useState(false);
  const [modalCadastroSucessoAberto, setModalCadastroSucessoAberto] = useState(false);
  const [emailCadastroSucesso, setEmailCadastroSucesso] = useState("");
  const [reenviandoVerificacao, setReenviandoVerificacao] = useState(false);
  const [mensagemReenvio, setMensagemReenvio] = useState("");
  const [loginEmailNaoVerificado, setLoginEmailNaoVerificado] = useState(false);
  const [reenviandoVerificacaoLogin, setReenviandoVerificacaoLogin] = useState(false);

  const [cadastro, setCadastro] = useState({
    nome: "",
    email: "",
    contato: "",
    sexo: "",
    dataNascimento: "",
    senha: "",
    confirmarSenha: ""
  });
  const [login, setLogin] = useState({ email: "", senha: "" });

  async function onCadastro(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTentouCadastrar(true);
    setMensagem("");
    setCarregando("CADASTRO");
    try {
      const obrigatoriosPreenchidos =
        cadastro.nome.trim() &&
        cadastro.email.trim() &&
        cadastro.contato.trim() &&
        cadastro.sexo.trim() &&
        cadastro.dataNascimento.trim() &&
        cadastro.senha.trim() &&
        cadastro.confirmarSenha.trim();

      if (!obrigatoriosPreenchidos) {
        setMensagem("Preencha todos os campos para continuar.");
        return;
      }

      if (cadastro.senha !== cadastro.confirmarSenha) {
        setMensagem("As senhas não conferem.");
        return;
      }

      const { confirmarSenha: _confirmarSenha, ...payloadCadastro } = cadastro;
      await cadastrarParticipante({
        ...payloadCadastro,
        contato: payloadCadastro.contato.replace(/\D/g, "")
      });
      setEmailCadastroSucesso(payloadCadastro.email);
      setCadastro({
        nome: "",
        email: "",
        contato: "",
        sexo: "",
        dataNascimento: "",
        senha: "",
        confirmarSenha: ""
      });
      setTentouCadastrar(false);
      setModalCadastroSucessoAberto(true);
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro no cadastro: ${error.message}`);
    } finally {
      setCarregando(null);
    }
  }

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("");
    setLoginEmailNaoVerificado(false);
    setCarregando("LOGIN");
    try {
      const resultado = (await loginParticipante(login)) as LoginResultado;

      if (resultado?.usuario?.papel === "ADMIN") {
        setStorage(chavesSessao.tokenAdmin, resultado.token);
        setJSONStorage(chavesSessao.adminLogado, {
          nome: resultado.usuario.nome,
          email: resultado.usuario.email
        });
        router.push("/dashboard");
        return;
      }

      setStorage(chavesSessao.tokenParticipante, resultado.token);
      setJSONStorage(chavesSessao.participanteLogado, resultado.usuario);
      router.push("/dashboard");
    } catch (err) {
      const error = err as Error;
      const msg = String(error?.message || "");
      const msgLower = msg.toLowerCase();
      const erroEmailNaoVerificado =
        msgLower.includes("verifique seu e-mail") ||
        msgLower.includes("verifique seu email") ||
        msgLower.includes("e-mail") && msgLower.includes("não verificado") ||
        msgLower.includes("email") && msgLower.includes("não verificado");

      if (erroEmailNaoVerificado) {
        setLoginEmailNaoVerificado(true);
        setMensagem(
          "E-mail ainda não verificado. Antes de entrar no sistema, confirme seu e-mail clicando no link enviado."
        );
        return;
      }

      setMensagem(`Erro no login: ${msg}`);
    } finally {
      setCarregando(null);
    }
  }

  const cadastroPodeEnviar =
    carregando !== "CADASTRO" &&
    cadastro.nome.trim().length > 0 &&
    cadastro.email.trim().length > 0 &&
    cadastro.contato.trim().length > 0 &&
    cadastro.sexo.trim().length > 0 &&
    cadastro.dataNascimento.trim().length > 0 &&
    cadastro.senha.trim().length > 0 &&
    cadastro.confirmarSenha.trim().length > 0 &&
    cadastro.senha === cadastro.confirmarSenha;

  const senhasDiferentes =
    cadastro.senha.length > 0 &&
    cadastro.confirmarSenha.length > 0 &&
    cadastro.senha !== cadastro.confirmarSenha;

  function fecharModalCadastroSucesso() {
    setModalCadastroSucessoAberto(false);
    setAba("LOGIN");
    setMensagem("");
    setMensagemReenvio("");
    setReenviandoVerificacao(false);
  }

  async function onReenviarVerificacaoLogin() {
    const email = login.email.trim();
    if (!email) return;

    setReenviandoVerificacaoLogin(true);
    try {
      const dados = (await reenviarVerificacao(email)) as any;
      setMensagem(
        dados?.mensagem ||
          "E-mail de verificação reenviado com sucesso. Verifique sua caixa de entrada (e spam)."
      );
      setLoginEmailNaoVerificado(false);
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao reenviar verificação: ${error.message}`);
    } finally {
      setReenviandoVerificacaoLogin(false);
    }
  }

  async function onReenviarVerificacao() {
    const email = emailCadastroSucesso.trim();
    if (!email) return;

    setMensagemReenvio("");
    setReenviandoVerificacao(true);
    try {
      const dados = (await reenviarVerificacao(email)) as any;
      setMensagemReenvio(dados?.mensagem || "E-mail de verificação reenviado com sucesso.");
    } catch (err) {
      const error = err as Error;
      setMensagemReenvio(`Erro ao reenviar verificação: ${error.message}`);
    } finally {
      setReenviandoVerificacao(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <Link href="/" className="auth-back">
          ← Voltar
        </Link>

        <section className="auth-card" aria-label="Acesso">
          <div className="auth-brand">
            <img
              src="/logo/volei_club_jampa.png"
              alt="Vôlei Club Jampa"
              className="auth-brand-logo"
            />
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Acesso">
            <button
              type="button"
              role="tab"
              aria-selected={aba === "LOGIN"}
              className={`auth-tab ${aba === "LOGIN" ? "is-active" : ""}`}
              disabled={carregando !== null}
              onClick={() => {
                setAba("LOGIN");
                setMensagem("");
              }}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={aba === "CADASTRO"}
              className={`auth-tab ${aba === "CADASTRO" ? "is-active" : ""}`}
              disabled={carregando !== null}
              onClick={() => {
                setAba("CADASTRO");
                setMensagem("");
              }}
            >
              Cadastro
            </button>
          </div>

          {aba === "LOGIN" ? (
            <form onSubmit={onLogin} className="auth-form">
              <div className="auth-field">
                <span className="auth-field-icon" aria-hidden>
                  <Mail size={18} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  value={login.email}
                  onChange={(e) => setLogin((p) => ({ ...p, email: e.target.value }))}
                  required
                  placeholder="E-mail"
                  autoComplete="email"
                  disabled={carregando === "LOGIN"}
                />
              </div>
              <div className="auth-field">
                <span className="auth-field-icon" aria-hidden>
                  <Lock size={18} />
                </span>
                <input
                  id="login-senha"
                  type={mostrarSenhaLogin ? "text" : "password"}
                  value={login.senha}
                  onChange={(e) => setLogin((p) => ({ ...p, senha: e.target.value }))}
                  required
                  placeholder="Senha"
                  autoComplete="current-password"
                  disabled={carregando === "LOGIN"}
                />
                <button
                  type="button"
                  className="auth-field-action"
                  onClick={() => setMostrarSenhaLogin((v) => !v)}
                  aria-label={mostrarSenhaLogin ? "Ocultar senha" : "Mostrar senha"}
                  disabled={carregando === "LOGIN"}
                >
                  {mostrarSenhaLogin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button type="submit" className="auth-submit" disabled={carregando === "LOGIN"}>
                {carregando === "LOGIN" ? (
                  <>
                    <span className="auth-spinner" aria-hidden />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </button>

              {loginEmailNaoVerificado ? (
                <button
                  type="button"
                  className="campeonatos-action campeonatos-action--primary"
                  onClick={onReenviarVerificacaoLogin}
                  disabled={reenviandoVerificacaoLogin || !login.email.trim()}
                >
                  {reenviandoVerificacaoLogin ? "Reenviando..." : "Reenviar e-mail de verificação"}
                </button>
              ) : null}
            </form>
          ) : (
            <form onSubmit={onCadastro} className="auth-form">
              <div className="auth-field">
                <span className="auth-field-icon" aria-hidden>
                  <User size={18} />
                </span>
                <input
                  id="cadastro-nome"
                  value={cadastro.nome}
                  onChange={(e) => setCadastro((p) => ({ ...p, nome: e.target.value }))}
                  required
                  placeholder="Nome"
                  autoComplete="name"
                  disabled={carregando === "CADASTRO"}
                  aria-invalid={tentouCadastrar && cadastro.nome.trim().length === 0}
                />
              </div>
              <div className="auth-field">
                <span className="auth-field-icon" aria-hidden>
                  <Mail size={18} />
                </span>
                <input
                  id="cadastro-email"
                  type="email"
                  value={cadastro.email}
                  onChange={(e) => setCadastro((p) => ({ ...p, email: e.target.value }))}
                  required
                  placeholder="E-mail"
                  autoComplete="email"
                  disabled={carregando === "CADASTRO"}
                  aria-invalid={tentouCadastrar && cadastro.email.trim().length === 0}
                />
              </div>
              <div className="auth-field">
                <span className="auth-field-icon" aria-hidden>
                  <Phone size={18} />
                </span>
                <input
                  id="cadastro-contato"
                  value={cadastro.contato}
                  onChange={(e) =>
                    setCadastro((p) => ({
                      ...p,
                      contato: mascararContato(e.target.value)
                    }))
                  }
                  required
                  placeholder="Contato (WhatsApp)"
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={carregando === "CADASTRO"}
                  aria-invalid={tentouCadastrar && cadastro.contato.trim().length === 0}
                />
              </div>
              <div className="auth-field">
                <span className="auth-field-icon" aria-hidden>
                  <User size={18} />
                </span>
                <select
                  id="cadastro-sexo"
                  value={cadastro.sexo}
                  onChange={(e) => setCadastro((p) => ({ ...p, sexo: e.target.value }))}
                  required
                  aria-label="Sexo"
                  disabled={carregando === "CADASTRO"}
                  aria-invalid={tentouCadastrar && cadastro.sexo.trim().length === 0}
                >
                  <option value="" disabled hidden>
                    Sexo
                  </option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                  {/* <option value="OUTRO">Outro</option> */}
                </select>
              </div>
              <div className="auth-field">
                <span className="auth-field-icon" aria-hidden>
                  <Calendar size={18} />
                </span>
                <input
                  id="cadastro-nascimento"
                  type="date"
                  value={cadastro.dataNascimento}
                  onChange={(e) =>
                    setCadastro((p) => ({ ...p, dataNascimento: e.target.value }))
                  }
                  required
                  aria-label="Data de nascimento"
                  disabled={carregando === "CADASTRO"}
                  aria-invalid={tentouCadastrar && cadastro.dataNascimento.trim().length === 0}
                />
              </div>
              <div className="auth-field">
                <span className="auth-field-icon" aria-hidden>
                  <Lock size={18} />
                </span>
                <input
                  id="cadastro-senha"
                  type={mostrarSenhaCadastro ? "text" : "password"}
                  value={cadastro.senha}
                  onChange={(e) => setCadastro((p) => ({ ...p, senha: e.target.value }))}
                  required
                  placeholder="Senha"
                  autoComplete="new-password"
                  disabled={carregando === "CADASTRO"}
                  aria-invalid={
                    (tentouCadastrar && cadastro.senha.trim().length === 0) || senhasDiferentes
                  }
                />
                <button
                  type="button"
                  className="auth-field-action"
                  onClick={() => setMostrarSenhaCadastro((v) => !v)}
                  aria-label={mostrarSenhaCadastro ? "Ocultar senha" : "Mostrar senha"}
                  disabled={carregando === "CADASTRO"}
                >
                  {mostrarSenhaCadastro ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="auth-field">
                <span className="auth-field-icon" aria-hidden>
                  <Lock size={18} />
                </span>
                <input
                  id="cadastro-confirmar-senha"
                  type={mostrarSenhaCadastro ? "text" : "password"}
                  value={cadastro.confirmarSenha}
                  onChange={(e) =>
                    setCadastro((p) => ({ ...p, confirmarSenha: e.target.value }))
                  }
                  required
                  placeholder="Confirmar senha"
                  autoComplete="new-password"
                  disabled={carregando === "CADASTRO"}
                  aria-invalid={
                    (tentouCadastrar && cadastro.confirmarSenha.trim().length === 0) ||
                    senhasDiferentes
                  }
                />
                <button
                  type="button"
                  className="auth-field-action"
                  onClick={() => setMostrarSenhaCadastro((v) => !v)}
                  aria-label={mostrarSenhaCadastro ? "Ocultar senha" : "Mostrar senha"}
                  disabled={carregando === "CADASTRO"}
                >
                  {mostrarSenhaCadastro ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {senhasDiferentes ? (
                <p className="auth-message auth-message--error">As senhas não conferem.</p>
              ) : null}
              <button type="submit" className="auth-submit" disabled={!cadastroPodeEnviar}>
                {carregando === "CADASTRO" ? (
                  <>
                    <span className="auth-spinner" aria-hidden />
                    Cadastrando...
                  </>
                ) : (
                  "Cadastrar"
                )}
              </button>
            </form>
          )}

          {mensagem ? <p className="auth-message">{mensagem}</p> : null}

          <p className="auth-footnote">© {new Date().getFullYear()} Vôlei Club Jampa</p>
        </section>
      </div>

      {modalCadastroSucessoAberto ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmação de cadastro"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fecharModalCadastroSucesso();
          }}
        >
          <div className="campeonatos-modal">
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title">Cadastro realizado</div>
                <div className="campeonatos-modal-name">
                  Enviamos um e-mail de confirmação de cadastro. Verifique sua caixa de entrada (e
                  spam).
                </div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={fecharModalCadastroSucesso}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="campeonatos-modal-actions">
              {emailCadastroSucesso ? (
                <button
                  type="button"
                  className="campeonatos-action campeonatos-action--primary"
                  onClick={onReenviarVerificacao}
                  disabled={reenviandoVerificacao}
                >
                  {reenviandoVerificacao ? "Reenviando..." : "Reenviar e-mail"}
                </button>
              ) : null}
              <button type="button" className="auth-submit" onClick={fecharModalCadastroSucesso}>
                Fechar
              </button>
            </div>

            {mensagemReenvio ? (
              <p
                className={`auth-message ${mensagemReenvio.startsWith("Erro") ? "auth-message--error" : ""}`}
                style={{ marginTop: 10 }}
              >
                {mensagemReenvio}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

