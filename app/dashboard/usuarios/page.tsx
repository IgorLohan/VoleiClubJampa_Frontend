"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CampeonatosPublicosPage from "@/app/campeonatos/page";
import PageLoader from "@/components/PageLoader";
import { atualizarUsuarioAdmin, listarUsuariosAdmin } from "@/lib/api";
import { chavesSessao, getStorage } from "@/lib/sessao";
import { Lock, Pencil, X } from "lucide-react";

/** Senha de acesso à área de gestão de usuários (apenas no cliente). */
const SENHA_AREA_USUARIOS = "505050";

type UsuarioAdmin = {
  id: number;
  nome: string;
  email: string;
  loginAdmin: string | null;
  contato: string | null;
  dataNascimento: string | null;
  sexo: string | null;
  fotoPerfil: string | null;
  papel: string;
  criadoEm: string;
  emailVerificado: boolean;
};

export default function DashboardUsuariosRoutePage() {
  const tokenAdmin = getStorage(chavesSessao.tokenAdmin);

  if (!tokenAdmin) {
    return <CampeonatosPublicosPage />;
  }

  return <UsuariosAdminPage />;
}

function formatarDataCurta(data: string | null | undefined) {
  if (!data) return "—";
  const raw = String(data).trim();
  const iso = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const dt = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function traduzirPapel(papel: string | null | undefined) {
  const u = String(papel || "").toUpperCase();
  if (u === "ADMIN") return "Administrador";
  if (u === "PARTICIPANTE") return "Participante";
  return papel || "—";
}

function UsuariosAdminPage() {
  const router = useRouter();
  const [areaDesbloqueada, setAreaDesbloqueada] = useState(false);
  const [senhaGate, setSenhaGate] = useState("");
  const [erroSenhaGate, setErroSenhaGate] = useState("");

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [edicao, setEdicao] = useState<UsuarioAdmin | null>(null);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    loginAdmin: "",
    contato: "",
    dataNascimento: "",
    sexo: "",
    papel: "PARTICIPANTE" as "ADMIN" | "PARTICIPANTE",
    emailVerificado: false,
    novaSenha: ""
  });

  const recarregar = useCallback(async () => {
    setMensagem("");
    setCarregando(true);
    try {
      const lista = (await listarUsuariosAdmin()) as UsuarioAdmin[];
      setUsuarios(Array.isArray(lista) ? lista : []);
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao carregar usuários: ${error.message}`);
      setUsuarios([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!areaDesbloqueada) return;
    recarregar();
  }, [areaDesbloqueada, recarregar]);

  useEffect(() => {
    function exigirSenhaNovamente() {
      setAreaDesbloqueada(false);
      setSenhaGate("");
      setErroSenhaGate("");
      setUsuarios([]);
      setEdicao(null);
      setMensagem("");
    }
    window.addEventListener("voleiclub:usuarios-requer-senha", exigirSenhaNovamente);
    return () => window.removeEventListener("voleiclub:usuarios-requer-senha", exigirSenhaNovamente);
  }, []);

  function onConfirmarSenhaGate(e: React.FormEvent) {
    e.preventDefault();
    setErroSenhaGate("");
    const digitada = senhaGate.trim();
    if (digitada !== SENHA_AREA_USUARIOS) {
      setErroSenhaGate("Senha incorreta.");
      return;
    }
    setSenhaGate("");
    setAreaDesbloqueada(true);
  }

  function abrirEdicao(u: UsuarioAdmin) {
    setEdicao(u);
    setForm({
      nome: u.nome || "",
      email: u.email || "",
      loginAdmin: u.loginAdmin || "",
      contato: u.contato || "",
      dataNascimento: u.dataNascimento
        ? String(u.dataNascimento).slice(0, 10)
        : "",
      sexo: u.sexo || "",
      papel: u.papel === "ADMIN" ? "ADMIN" : "PARTICIPANTE",
      emailVerificado: Boolean(u.emailVerificado),
      novaSenha: ""
    });
    setMensagem("");
  }

  function fecharEdicao() {
    setEdicao(null);
    setMensagem("");
  }

  async function onSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!edicao) return;

    setSalvando(true);
    setMensagem("");
    try {
      await atualizarUsuarioAdmin(edicao.id, {
        nome: form.nome.trim(),
        email: form.email.trim(),
        loginAdmin:
          form.papel === "ADMIN"
            ? form.loginAdmin.trim() || null
            : null,
        contato: form.contato.trim() || null,
        dataNascimento: form.dataNascimento.trim()
          ? `${form.dataNascimento.trim()}T00:00:00.000Z`
          : null,
        sexo: form.sexo.trim() || null,
        papel: form.papel,
        emailVerificado: form.emailVerificado,
        novaSenha: form.novaSenha.trim() || undefined
      });
      await recarregar();
      fecharEdicao();
    } catch (err) {
      const error = err as Error;
      setMensagem(error.message || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (!areaDesbloqueada) {
    return (
      <div
        className="campeonatos-modal-backdrop"
        style={{ zIndex: 70 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-senha-usuarios"
      >
        <div className="campeonatos-modal" style={{ width: "min(400px, calc(100vw - 32px))" }}>
          <div className="campeonatos-modal-head">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  display: "inline-flex",
                  padding: 8,
                  borderRadius: 12,
                  background: "rgba(32, 54, 103, 0.08)"
                }}
                aria-hidden
              >
                <Lock size={20} />
              </span>
              <div>
                <div className="campeonatos-modal-title" id="titulo-senha-usuarios">
                  Acesso à área de usuários
                </div>
                <div className="campeonatos-modal-name" style={{ marginTop: 4, fontSize: "0.95rem" }}>
                  Informe a senha para continuar.
                </div>
              </div>
            </div>
          </div>
          <form className="campeonatos-modal-section" onSubmit={onConfirmarSenhaGate}>
            <div className="grupo-formulario">
              <label htmlFor="senha-gate-usuarios">Senha</label>
              <input
                id="senha-gate-usuarios"
                type="password"
                autoComplete="off"
                value={senhaGate}
                onChange={(e) => {
                  setSenhaGate(e.target.value);
                  if (erroSenhaGate) setErroSenhaGate("");
                }}
                placeholder="••••••"
                required
              />
            </div>
            {erroSenhaGate ? (
              <p role="alert" style={{ margin: 0, color: "var(--cor-erro, #c62828)", fontWeight: 700 }}>
                {erroSenhaGate}
              </p>
            ) : null}
            <div className="campeonatos-modal-actions">
              <button
                type="button"
                className="campeonatos-btn campeonatos-btn--ghost"
                onClick={() => router.push("/dashboard")}
              >
                Voltar ao dashboard
              </button>
              <button type="submit" className="campeonatos-btn campeonatos-btn--primary">
                Entrar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (carregando && !usuarios.length) {
    return <PageLoader label="Carregando usuários" variant="fullscreen" />;
  }

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      <header className="cabecalho topo-inicio" style={{ marginBottom: 16 }}>
        <h1 style={{ marginBottom: 8 }}>Usuários</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Gerencie cadastros: edição de dados, papel, verificação de e-mail e redefinição de senha.
          Exclusão de conta não está disponível.
        </p>
      </header>

        {mensagem && !edicao ? (
        <p role="alert" style={{ marginBottom: 12, color: "var(--cor-erro, #c62828)" }}>
          {mensagem}
        </p>
      ) : null}

      <div className="campeonatos-table-wrap">
        <table className="campeonatos-table" aria-label="Lista de usuários">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Login admin</th>
              <th>Papel</th>
              <th>E-mail verificado</th>
              <th>Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {!usuarios.length ? (
              <tr>
                <td colSpan={7} className="campeonatos-empty">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="campeonatos-name">{u.nome}</td>
                  <td>{u.email}</td>
                  <td>{u.loginAdmin || "—"}</td>
                  <td>{traduzirPapel(u.papel)}</td>
                  <td>{u.emailVerificado ? "Sim" : "Não"}</td>
                  <td>{formatarDataCurta(u.criadoEm)}</td>
                  <td className="campeonatos-actions">
                    <button
                      type="button"
                      className="botao-pequeno"
                      onClick={() => abrirEdicao(u)}
                    >
                      <Pencil size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {edicao ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-usuario-titulo"
        >
          <div
            className="card"
            style={{
              width: "min(520px, 100%)",
              maxHeight: "90vh",
              overflow: "auto",
              position: "relative"
            }}
          >
            <button
              type="button"
              className="dash-topbar-icon"
              onClick={fecharEdicao}
              aria-label="Fechar"
              style={{ position: "absolute", top: 12, right: 12 }}
            >
              <X size={20} />
            </button>

            <h2 id="modal-usuario-titulo" style={{ marginTop: 0, paddingRight: 40 }}>
              Editar usuário
            </h2>
            <p style={{ marginTop: 0, opacity: 0.85, fontSize: "0.9rem" }}>
              ID {edicao.id} · Exclusão de usuário não é permitida nesta tela.
            </p>

            {mensagem ? (
              <p role="alert" style={{ color: "var(--cor-erro, #c62828)", marginBottom: 12 }}>
                {mensagem}
              </p>
            ) : null}

            <form onSubmit={onSalvar} className="formulario-edicao-inscricao">
              <div className="grupo-formulario">
                <label htmlFor="usu-nome">Nome</label>
                <input
                  id="usu-nome"
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="grupo-formulario">
                <label htmlFor="usu-email">E-mail</label>
                <input
                  id="usu-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="grupo-formulario">
                <label htmlFor="usu-papel">Papel</label>
                <select
                  id="usu-papel"
                  value={form.papel}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      papel: e.target.value as "ADMIN" | "PARTICIPANTE"
                    }))
                  }
                >
                  <option value="PARTICIPANTE">Participante</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              {form.papel === "ADMIN" ? (
                <div className="grupo-formulario">
                  <label htmlFor="usu-login-admin">Login administrativo</label>
                  <input
                    id="usu-login-admin"
                    value={form.loginAdmin}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, loginAdmin: e.target.value }))
                    }
                    placeholder="Usado no acesso dedicado ao painel"
                    required={form.papel === "ADMIN"}
                  />
                </div>
              ) : null}
              <div className="grupo-formulario">
                <label htmlFor="usu-contato">Contato</label>
                <input
                  id="usu-contato"
                  value={form.contato}
                  onChange={(e) => setForm((p) => ({ ...p, contato: e.target.value }))}
                />
              </div>
              <div className="grupo-formulario">
                <label htmlFor="usu-nasc">Data de nascimento</label>
                <input
                  id="usu-nasc"
                  type="date"
                  value={form.dataNascimento}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, dataNascimento: e.target.value }))
                  }
                />
              </div>
              <div className="grupo-formulario">
                <label htmlFor="usu-sexo">Sexo (perfil)</label>
                <select
                  id="usu-sexo"
                  value={form.sexo}
                  onChange={(e) => setForm((p) => ({ ...p, sexo: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                  <option value="OUTRO">Outro</option>
                  <option value="PREFIRO_NAO_INFORMAR">Prefiro não informar</option>
                </select>
              </div>
              <div className="grupo-formulario">
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={form.emailVerificado}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, emailVerificado: e.target.checked }))
                    }
                  />
                  E-mail verificado
                </label>
              </div>
              <div className="grupo-formulario">
                <label htmlFor="usu-senha">Nova senha (opcional)</label>
                <input
                  id="usu-senha"
                  type="password"
                  autoComplete="new-password"
                  value={form.novaSenha}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, novaSenha: e.target.value }))
                  }
                  placeholder="Deixe em branco para não alterar"
                />
              </div>
              <div className="acoes-card" style={{ marginTop: 12 }}>
                <button type="submit" className="botao-pequeno" disabled={salvando}>
                  {salvando ? "Salvando…" : "Salvar"}
                </button>
                <button
                  type="button"
                  className="botao-pequeno secundario"
                  onClick={fecharEdicao}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
