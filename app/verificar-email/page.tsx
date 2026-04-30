"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { reenviarVerificacao, verificarEmail } from "@/lib/api";
import { Mail } from "lucide-react";

type TipoMensagem = "info" | "sucesso" | "erro";

export default function VerificarEmailPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);

  const [tipo, setTipo] = useState<TipoMensagem>("info");
  const [mensagem, setMensagem] = useState("Verificando seu e-mail...");
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [mostrarReenvio, setMostrarReenvio] = useState(false);
  const [emailReenvio, setEmailReenvio] = useState("");
  const [mensagemReenvio, setMensagemReenvio] = useState<{
    tipo: TipoMensagem;
    texto: string;
  } | null>(null);
  const [reenviando, setReenviando] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function run() {
      if (!token) {
        if (!ativo) return;
        setTipo("erro");
        setMensagem("Token de verificação não encontrado no link.");
        setDetalhe(
          "O link pode estar incompleto. Tente copiar o link completo recebido no e-mail."
        );
        setMostrarReenvio(true);
        return;
      }

      try {
        if (!ativo) return;
        setTipo("info");
        setMensagem("Verificando seu e-mail...");
        setDetalhe(null);
        setMostrarReenvio(false);

        const dados = (await verificarEmail(token)) as any;

        if (!ativo) return;
        setTipo("sucesso");
        setMensagem(dados?.mensagem || "E-mail verificado com sucesso.");
        setDetalhe("Sua conta foi ativada. Agora você já pode entrar no sistema usando seu e-mail e senha.");
      } catch (err) {
        const error = err as Error;
        if (!ativo) return;
        setTipo("erro");
        setMensagem(`Não foi possível verificar o e-mail: ${error.message}`);
        setDetalhe(
          "O link pode ter expirado ou já ter sido usado. Você pode solicitar um novo e-mail de verificação abaixo."
        );
        setMostrarReenvio(true);
      }
    }

    run();
    return () => {
      ativo = false;
    };
  }, [token]);

  async function onReenviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagemReenvio(null);

    const email = emailReenvio.trim();
    if (!email) {
      setMensagemReenvio({ tipo: "erro", texto: "Digite seu e-mail." });
      return;
    }

    setReenviando(true);
    try {
      const dados = (await reenviarVerificacao(email)) as any;
      setMensagemReenvio({
        tipo: "sucesso",
        texto: dados?.mensagem || "E-mail de verificação reenviado com sucesso."
      });
    } catch (err) {
      const error = err as Error;
      setMensagemReenvio({ tipo: "erro", texto: `Erro ao reenviar verificação: ${error.message}` });
    } finally {
      setReenviando(false);
    }
  }

  const classeBanner =
    tipo === "erro"
      ? "auth-banner auth-banner--error"
      : tipo === "sucesso"
        ? "auth-banner auth-banner--success"
        : "auth-banner auth-banner--info";

  const classeBannerReenvio = mensagemReenvio
    ? mensagemReenvio.tipo === "erro"
      ? "auth-banner auth-banner--error"
      : mensagemReenvio.tipo === "sucesso"
        ? "auth-banner auth-banner--success"
        : "auth-banner auth-banner--info"
    : "";

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <Link href="/login" className="auth-back">
          ← Voltar
        </Link>

        <section className="auth-card" aria-label="Verificação de e-mail">
          <div className="auth-brand">
            <img
              src="/logo/volei_club_jampa.png"
              alt="Vôlei Club Jampa"
              className="auth-brand-logo"
            />
          </div>

          <div className="auth-title">
            <h2>Verificação de e-mail</h2>
            <p>Confirme seu e-mail para ativar sua conta no sistema.</p>
          </div>

          <div className={classeBanner} role={tipo === "erro" ? "alert" : "status"}>
            {mensagem}
          </div>

          {detalhe ? <p className="auth-message">{detalhe}</p> : null}

          <div className="auth-actions">
            <Link href="/login" className="auth-submit">
              Ir para login
            </Link>
          </div>

          {mostrarReenvio ? (
            <form onSubmit={onReenviar} className="auth-form auth-form--compact">
              <div className="auth-divider" role="separator" aria-hidden />

              <div className="auth-reenvio-title">Reenviar e-mail de verificação</div>

              <div className="auth-field">
                <span className="auth-field-icon" aria-hidden>
                  <Mail size={18} />
                </span>
                <input
                  id="email-reenvio"
                  type="email"
                  value={emailReenvio}
                  onChange={(e) => setEmailReenvio(e.target.value)}
                  required
                  placeholder="Digite seu e-mail"
                  autoComplete="email"
                  disabled={reenviando}
                />
              </div>

              <button type="submit" className="auth-submit" disabled={reenviando}>
                {reenviando ? (
                  <>
                    <span className="auth-spinner" aria-hidden />
                    Reenviando...
                  </>
                ) : (
                  "Reenviar verificação"
                )}
              </button>

              {mensagemReenvio ? (
                <div
                  className={classeBannerReenvio}
                  role={mensagemReenvio.tipo === "erro" ? "alert" : "status"}
                >
                  {mensagemReenvio.texto}
                </div>
              ) : null}
            </form>
          ) : null}
        </section>
      </div>
    </main>
  );
}

