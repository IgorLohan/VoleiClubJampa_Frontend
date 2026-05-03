"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CampeonatosPublicosPage from "@/app/campeonatos/page";
import PageLoader from "@/components/PageLoader";
import {
  API_BASE,
  atualizarUsuarioAdmin,
  excluirUsuarioAdmin,
  listarUsuariosAdmin
} from "@/lib/api";
import { chavesSessao, getJSONStorage, getStorage } from "@/lib/sessao";
import { Loader2, Lock, Pencil, Trash2, UserRound } from "lucide-react";

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

function classeBadgePapel(papel: string | null | undefined) {
  const u = String(papel || "").toUpperCase();
  if (u === "ADMIN") return "minhas-inscricoes-badge--warn";
  return "minhas-inscricoes-badge--neutral";
}

function classeBadgeEmailVerificado(ok: boolean) {
  return ok ? "minhas-inscricoes-badge--ok" : "minhas-inscricoes-badge--muted";
}

function montarUrlFoto(fotoPerfil: string | null | undefined) {
  if (!fotoPerfil) return null;
  if (/^https?:\/\//i.test(fotoPerfil)) return fotoPerfil;
  return `${API_BASE}${fotoPerfil.startsWith("/") ? "" : "/"}${fotoPerfil}`;
}

function CelulaFotoUsuario({
  urlFoto,
  nome,
  onAbrir
}: {
  urlFoto: string | null;
  nome: string;
  onAbrir: (url: string, nome: string) => void;
}) {
  const [falhouCarregar, setFalhouCarregar] = useState(false);

  useEffect(() => {
    setFalhouCarregar(false);
  }, [urlFoto]);

  if (!urlFoto || falhouCarregar) {
    return (
      <span className="admin-inscricao-foto-placeholder" aria-label="Sem foto de perfil">
        <UserRound size={20} aria-hidden />
      </span>
    );
  }

  return (
    <button
      type="button"
      className="admin-inscricao-foto-thumb-btn"
      onClick={() => onAbrir(urlFoto, nome)}
      title={`Ver foto de ${nome}`}
      aria-label={`Ampliar foto de perfil de ${nome}`}
    >
      <img
        src={urlFoto}
        alt=""
        className="admin-inscricao-foto-thumb"
        width={44}
        height={44}
        onError={() => setFalhouCarregar(true)}
      />
    </button>
  );
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
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [fotoModal, setFotoModal] = useState<{ src: string; nome: string } | null>(null);
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

  const emailAdminLogado = useMemo(() => {
    const s = getJSONStorage<{ email?: string }>(chavesSessao.adminLogado);
    return (s?.email || "").trim().toLowerCase();
  }, []);

  const motivoBloqueioExclusao = useCallback(
    (u: UsuarioAdmin): string | null => {
      if (emailAdminLogado && u.email.trim().toLowerCase() === emailAdminLogado) {
        return "Você não pode excluir o próprio usuário.";
      }
      if (u.papel === "ADMIN") {
        const qtdAdmins = usuarios.filter((x) => x.papel === "ADMIN").length;
        if (qtdAdmins <= 1) {
          return "Não é possível excluir o único administrador do sistema.";
        }
      }
      return null;
    },
    [emailAdminLogado, usuarios]
  );

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

  useEffect(() => {
    if (!fotoModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFotoModal(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fotoModal]);

  const totalAdmins = useMemo(
    () => usuarios.filter((u) => String(u.papel).toUpperCase() === "ADMIN").length,
    [usuarios]
  );

  const acoesBloqueadas = excluindoId !== null;

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

  async function onExcluir(u: UsuarioAdmin) {
    const bloqueio = motivoBloqueioExclusao(u);
    if (bloqueio) {
      setMensagem(bloqueio);
      return;
    }

    const ok = window.confirm(
      `Excluir permanentemente o usuário “${u.nome}” (${u.email})? Esta ação não pode ser desfeita.`
    );
    if (!ok) return;

    setExcluindoId(u.id);
    setMensagem("");
    try {
      await excluirUsuarioAdmin(u.id);
      if (edicao?.id === u.id) {
        fecharEdicao();
      }
      await recarregar();
    } catch (err) {
      const error = err as Error;
      setMensagem(error.message || "Erro ao excluir usuário.");
    } finally {
      setExcluindoId(null);
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
    <div style={{ display: "grid", gap: 14 }}>
      <section className="card" aria-label="Lista de usuários">
        <h2 style={{ margin: 0 }}>Usuários</h2>
        <p style={{ marginTop: 8, color: "rgba(11, 18, 32, 0.68)", fontWeight: 700 }}>
          Cadastros do sistema: edição, papel, e-mail verificado, senha e exclusão irreversível. Não é
          possível excluir a si mesmo nem o único administrador.
        </p>
        <p className="info-auxiliar" style={{ marginTop: 10, marginBottom: 0 }}>
          <strong>Total:</strong> {usuarios.length} cadastro(s) · <strong>Administradores:</strong>{" "}
          {totalAdmins}
        </p>

        {carregando && usuarios.length > 0 ? (
          <PageLoader label="Atualizando lista" variant="section" />
        ) : null}

        {mensagem && !edicao ? (
          <p
            role="alert"
            className="admin-dash-help"
            style={{ marginTop: 12, color: "var(--cor-erro, #c62828)", fontWeight: 800 }}
          >
            {mensagem}
          </p>
        ) : null}

        <div className="campeonatos-table-wrap" style={{ marginTop: 14 }}>
          <table className="campeonatos-table" aria-label="Usuários cadastrados">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Foto</th>
                <th>E-mail</th>
                <th>Login admin</th>
                <th>Papel</th>
                <th>E-mail verif.</th>
                <th>Cadastro</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {!usuarios.length ? (
                <tr>
                  <td colSpan={8} className="campeonatos-empty">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => {
                  const excluindoEste = excluindoId === u.id;
                  const bloqueioExcluir = motivoBloqueioExclusao(u);
                  const urlFoto = montarUrlFoto(u.fotoPerfil);
                  const nomeExibicao = u.nome || "Usuário";

                  return (
                    <tr key={u.id}>
                      <td className="campeonatos-name" data-label="Nome">
                        {nomeExibicao}
                      </td>
                      <td data-label="Foto">
                        <CelulaFotoUsuario
                          urlFoto={urlFoto}
                          nome={nomeExibicao}
                          onAbrir={(url, nome) => setFotoModal({ src: url, nome })}
                        />
                      </td>
                      <td data-label="E-mail">{u.email}</td>
                      <td data-label="Login admin">{u.loginAdmin || "—"}</td>
                      <td data-label="Papel">
                        <span
                          className={`minhas-inscricoes-badge ${classeBadgePapel(u.papel)}`}
                        >
                          {traduzirPapel(u.papel)}
                        </span>
                      </td>
                      <td data-label="E-mail verif.">
                        <span
                          className={`minhas-inscricoes-badge ${classeBadgeEmailVerificado(
                            Boolean(u.emailVerificado)
                          )}`}
                        >
                          {u.emailVerificado ? "Verificado" : "Pendente"}
                        </span>
                      </td>
                      <td data-label="Cadastro">{formatarDataCurta(u.criadoEm)}</td>
                      <td
                        data-label="Ações"
                        style={{ textAlign: "right", whiteSpace: "nowrap" }}
                      >
                        <div style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="campeonatos-action campeonatos-action--icon"
                            onClick={() => abrirEdicao(u)}
                            disabled={acoesBloqueadas}
                            title="Editar"
                            aria-label={`Editar ${nomeExibicao}`}
                          >
                            <Pencil aria-hidden className="campeonatos-action-icon" />
                          </button>
                          <button
                            type="button"
                            className="campeonatos-action campeonatos-action--icon"
                            onClick={() => onExcluir(u)}
                            disabled={
                              Boolean(bloqueioExcluir) || acoesBloqueadas || excluindoEste
                            }
                            title={bloqueioExcluir || "Excluir permanentemente"}
                            aria-label={`Excluir ${nomeExibicao}`}
                            aria-busy={excluindoEste}
                          >
                            {excluindoEste ? (
                              <Loader2
                                aria-hidden
                                className="campeonatos-action-icon campeonatos-acao-loader"
                              />
                            ) : (
                              <Trash2 aria-hidden className="campeonatos-action-icon" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {edicao ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-usuario-titulo"
          style={{ zIndex: 80 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !salvando) fecharEdicao();
          }}
        >
          <div className="campeonatos-modal" style={{ width: "min(520px, calc(100vw - 32px))" }}>
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title" id="modal-usuario-titulo">
                  Editar usuário
                </div>
                <div className="campeonatos-modal-name">
                  ID {edicao.id} · {edicao.nome}
                </div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={fecharEdicao}
                aria-label="Fechar"
                disabled={salvando}
              >
                ✕
              </button>
            </div>

            <p className="info-auxiliar" style={{ margin: 0 }}>
              Para excluir, feche este painel e use o ícone da lixeira na tabela.
            </p>

            {mensagem ? (
              <p role="alert" style={{ color: "var(--cor-erro, #c62828)", margin: 0, fontWeight: 700 }}>
                {mensagem}
              </p>
            ) : null}

            <form onSubmit={onSalvar} className="campeonatos-modal-section">
              <div className="formulario-edicao-inscricao">
                <div className="grupo-formulario">
                  <label htmlFor="usu-nome">Nome</label>
                  <input
                    id="usu-nome"
                    value={form.nome}
                    onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                    required
                    disabled={salvando}
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
                    disabled={salvando}
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
                    disabled={salvando}
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
                      disabled={salvando}
                    />
                  </div>
                ) : null}
                <div className="grupo-formulario">
                  <label htmlFor="usu-contato">Contato</label>
                  <input
                    id="usu-contato"
                    value={form.contato}
                    onChange={(e) => setForm((p) => ({ ...p, contato: e.target.value }))}
                    disabled={salvando}
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
                    disabled={salvando}
                  />
                </div>
                <div className="grupo-formulario">
                  <label htmlFor="usu-sexo">Sexo (perfil)</label>
                  <select
                    id="usu-sexo"
                    value={form.sexo}
                    onChange={(e) => setForm((p) => ({ ...p, sexo: e.target.value }))}
                    disabled={salvando}
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
                      disabled={salvando}
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
                    disabled={salvando}
                  />
                </div>
              </div>

              <div className="campeonatos-modal-actions">
                <button
                  type="button"
                  className="campeonatos-btn campeonatos-btn--ghost"
                  onClick={fecharEdicao}
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`campeonatos-btn campeonatos-btn--primary${salvando ? " campeonatos-btn--with-loader" : ""}`}
                  disabled={salvando}
                  aria-busy={salvando}
                >
                  {salvando ? (
                    <>
                      <Loader2 aria-hidden className="campeonatos-modal-btn-loader" />
                      Salvando…
                    </>
                  ) : (
                    "Salvar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {fotoModal ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Foto de perfil"
          style={{ zIndex: 85 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFotoModal(null);
          }}
        >
          <div className="campeonatos-modal campeonatos-modal--full">
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title">Foto de perfil</div>
                <div className="campeonatos-modal-name">{fotoModal.nome}</div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={() => setFotoModal(null)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div
              className="campeonatos-modal-scroll"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <img
                src={fotoModal.src}
                alt={`Foto de perfil de ${fotoModal.nome}`}
                className="admin-comprovante-modal-img"
              />
            </div>
            <div className="campeonatos-modal-actions">
              <button
                type="button"
                className="campeonatos-btn campeonatos-btn--primary"
                onClick={() => setFotoModal(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
