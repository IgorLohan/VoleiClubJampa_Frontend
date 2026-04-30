 "use client";

import { useEffect, useMemo, useState } from "react";
import {
  chavesSessao,
  getJSONStorage,
  getStorage,
  setJSONStorage,
} from "@/lib/sessao";
import type { PapelUsuario } from "@/components/DashboardToolbar";
import PageLoader from "@/components/PageLoader";
import {
  API_BASE,
  atualizarMeuPerfil,
  atualizarMinhaFotoPerfil,
  buscarMeuPerfil,
  buscarResumoCampeonato,
  listarCampeonatosAdmin
} from "@/lib/api";
import { useRouter } from "next/navigation";

type SessaoUsuario = {
  id?: number;
  nome?: string;
  email?: string;
  papel?: PapelUsuario;
  contato?: string | null;
  dataNascimento?: string | null;
  sexo?: string | null;
  fotoPerfil?: string | null;
} | null;

function formatarTelefoneBR(valor: string | null | undefined) {
  const digitos = String(valor || "").replace(/\D/g, "").slice(0, 11);
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

function formatarDataBR(data: string | null | undefined) {
  const raw = String(data || "").trim();
  if (!raw) return "";
  const iso = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const dt = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function normalizarSessao(): { papel: PapelUsuario | null; usuario: SessaoUsuario } {
  const tokenAdmin = getStorage(chavesSessao.tokenAdmin);
  const tokenParticipante = getStorage(chavesSessao.tokenParticipante);

  const admin = getJSONStorage<SessaoUsuario>(chavesSessao.adminLogado);
  const participante = getJSONStorage<SessaoUsuario>(
    chavesSessao.participanteLogado
  );

  if (tokenAdmin && admin) return { papel: "ADMIN", usuario: admin };
  if (tokenParticipante && participante) {
    const papel = (participante?.papel as PapelUsuario | undefined) || "PARTICIPANTE";
    return { papel, usuario: participante };
  }
  return { papel: null, usuario: null };
}

export default function DashboardPage() {
  const router = useRouter();
  const [sessao] = useState(() => normalizarSessao());
  const tokenParticipante = getStorage(chavesSessao.tokenParticipante);
  const [perfil, setPerfil] = useState<SessaoUsuario>(() => sessao.usuario);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [msgPerfil, setMsgPerfil] = useState("");
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [modalSucessoAberto, setModalSucessoAberto] = useState(false);
  const [modalSucessoTexto, setModalSucessoTexto] = useState("Atualizado com sucesso.");
  const [formPerfil, setFormPerfil] = useState(() => ({
    nome: sessao.usuario?.nome || "",
    contato: sessao.usuario?.contato || "",
    dataNascimento: (sessao.usuario?.dataNascimento || "") as string,
    sexo: (sessao.usuario?.sexo || "") as string,
  }));
  const [campeonatos, setCampeonatos] = useState<Array<{ id: number; nome: string }>>(
    []
  );
  const [campeonatoSelecionado, setCampeonatoSelecionado] = useState<string>("");
  const [msgCampeonatos, setMsgCampeonatos] = useState("");
  const [msgResumo, setMsgResumo] = useState("");
  const [resumoSelecionado, setResumoSelecionado] = useState<any | null>(null);

  const saudacao = useMemo(() => {
    const nome = sessao.usuario?.nome?.trim();
    return nome ? `Olá, ${nome}!` : "Bem-vindo!";
  }, [sessao.usuario?.nome]);

  if (!sessao.papel) return null;

  function montarUrlFoto(foto: string | null | undefined) {
    if (!foto) return null;
    if (/^https?:\/\//i.test(foto)) return foto;
    return `${API_BASE}${foto.startsWith("/") ? "" : "/"}${foto}`;
  }

  useEffect(() => {
    if (sessao.papel !== "PARTICIPANTE") return;
    if (!tokenParticipante) return;
    let ativo = true;
    (async () => {
      try {
        const dados = (await buscarMeuPerfil(tokenParticipante)) as any;
        if (!ativo) return;
        const usuario = (dados?.usuario ?? dados) as any;
        if (usuario && typeof usuario === "object") {
          setPerfil(usuario);
          setFormPerfil({
            nome: String(usuario.nome || ""),
            contato: String(usuario.contato || ""),
            dataNascimento: String(usuario.dataNascimento || ""),
            sexo: String(usuario.sexo || ""),
          });
          setJSONStorage(chavesSessao.participanteLogado, usuario);
        }
      } catch {
        // silencioso: segue com o que existe no storage
      }
    })();
    return () => {
      ativo = false;
    };
  }, [sessao.papel, tokenParticipante]);

  useEffect(() => {
    if (!modalSucessoAberto) return;
    const t = window.setTimeout(() => setModalSucessoAberto(false), 2500);
    return () => window.clearTimeout(t);
  }, [modalSucessoAberto]);

  useEffect(() => {
    if (sessao.papel !== "ADMIN") return;
    let ativo = true;
    (async () => {
      try {
        setMsgCampeonatos("Carregando campeonatos...");
        const lista = (await listarCampeonatosAdmin()) as any[];
        if (!ativo) return;
        setCampeonatos(
          (lista || [])
            .map((c) => ({ id: Number(c.id), nome: String(c.nome || `Campeonato ${c.id}`) }))
            .sort((a, b) => b.id - a.id)
        );
        setMsgCampeonatos("");
      } catch (err) {
        if (!ativo) return;
        const error = err as Error;
        setMsgCampeonatos(`Erro ao carregar campeonatos: ${error.message}`);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [sessao.papel]);

  useEffect(() => {
    if (sessao.papel !== "ADMIN") return;
    if (!campeonatoSelecionado) {
      setResumoSelecionado(null);
      setMsgResumo("");
      return;
    }

    let ativo = true;
    (async () => {
      try {
        setMsgResumo("Carregando dados do campeonato...");
        const dados = await buscarResumoCampeonato(campeonatoSelecionado);
        if (!ativo) return;
        setResumoSelecionado(dados);
        setMsgResumo("");
      } catch (err) {
        if (!ativo) return;
        const error = err as Error;
        setResumoSelecionado(null);
        setMsgResumo(`Erro ao carregar resumo: ${error.message}`);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [campeonatoSelecionado, sessao.papel]);

  const metricas = useMemo(() => {
    const totais = resumoSelecionado?.totais || {};
    const modo = resumoSelecionado?.campeonato?.modoInscricao;
    const modoIndividual = modo === "INDIVIDUAL";

    const inscritos = modoIndividual
      ? Number(totais.inscricoesIndividuais ?? 0)
      : Number(totais.participantes ?? 0);

    return {
      modoIndividual,
      inscritos,
      aprovadas: Number(totais.inscricoesAprovadas ?? 0),
      aguardando: Number(totais.inscricoesAguardandoAnalise ?? 0),
      reprovadas: Number(totais.inscricoesReprovadas ?? 0),
    };
  }, [resumoSelecionado]);

  const camisetas = useMemo(() => {
    const lista = (resumoSelecionado?.inscricoesIndividuais || []) as any[];
    const base = { P: 0, M: 0, G: 0, GG: 0 } as Record<string, number>;
    for (const i of lista) {
      const t = i?.tamanhoCamisa;
      if (t && base[t] !== undefined) base[t] += 1;
    }
    return base;
  }, [resumoSelecionado]);

  const totalAprovadoCentavos = useMemo(() => {
    const lista = (resumoSelecionado?.inscricoesIndividuais || []) as any[];
    return lista
      .filter((i) => i?.status !== "CANCELADA" && i?.statusAnalise === "APROVADA")
      .reduce((acc, i) => acc + Number(i?.valorTotalCentavos || 0), 0);
  }, [resumoSelecionado]);

  const totalAprovadoBRL = useMemo(() => {
    return (totalAprovadoCentavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }, [totalAprovadoCentavos]);

  return (
    <>
      <div className="dash-hero">
        <h1 className="dash-title">{saudacao}</h1>
      </div>

      {sessao.papel === "ADMIN" ? (
        <section className="admin-dash" aria-label="Dashboard do administrador">
          <div className="admin-dash-top">
            <div className="admin-dash-select">
              <label className="admin-dash-label">Selecione um campeonato</label>
              <select
                value={campeonatoSelecionado}
                onChange={(e) => {
                  const id = e.target.value;
                  setCampeonatoSelecionado(id);
                }}
                className="admin-dash-select-control"
              >
                <option value="">
                  {msgCampeonatos === "Carregando campeonatos..."
                    ? "Aguarde..."
                    : campeonatos.length
                      ? "Escolha..."
                      : "Nenhum campeonato"}
                </option>
                {campeonatos.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} — {c.nome}
                  </option>
                ))}
              </select>
              {msgCampeonatos === "Carregando campeonatos..." ? (
                <PageLoader label="Carregando campeonatos" variant="inline" />
              ) : msgCampeonatos ? (
                <p className="admin-dash-help">{msgCampeonatos}</p>
              ) : null}
            </div>
          </div>

          <div className="admin-dash-metrics" aria-label="Métricas (visão geral)">
            <article className="metric-card metric-card--teal">
              <div className="metric-card-kicker">Inscritos</div>
              <div className="metric-card-value">
                {campeonatoSelecionado ? metricas.inscritos : "—"}
              </div>
              <div className="metric-card-sub">
                {campeonatoSelecionado
                  ? metricas.modoIndividual
                    ? "Inscrições individuais ativas"
                    : "Participantes no campeonato"
                  : "Selecione um campeonato"}
              </div>
            </article>
            <article className="metric-card metric-card--green">
              <div className="metric-card-kicker">Aprovadas</div>
              <div className="metric-card-value">
                {campeonatoSelecionado ? metricas.aprovadas : "—"}
              </div>
              <div className="metric-card-sub">Inscrições aprovadas</div>
            </article>
            <article className="metric-card metric-card--blue">
              <div className="metric-card-kicker">Aguardando</div>
              <div className="metric-card-value">
                {campeonatoSelecionado ? metricas.aguardando : "—"}
              </div>
              <div className="metric-card-sub">Aguardando análise</div>
            </article>
            <article className="metric-card metric-card--orange">
              <div className="metric-card-kicker">Reprovadas</div>
              <div className="metric-card-value">
                {campeonatoSelecionado ? metricas.reprovadas : "—"}
              </div>
              <div className="metric-card-sub">Inscrições reprovadas</div>
            </article>
          </div>

          {msgResumo === "Carregando dados do campeonato..." ? (
            <PageLoader label="Carregando dados do campeonato" variant="section" />
          ) : msgResumo ? (
            <p className="admin-dash-help admin-dash-help--center">{msgResumo}</p>
          ) : null}

          {campeonatoSelecionado && metricas.modoIndividual ? (
            <section className="admin-total-pago" aria-label="Total pago em inscrições">
              <div className="admin-total-pago-kicker">Total pago em inscrições</div>
              <div className="admin-total-pago-value">{totalAprovadoBRL}</div>
              <div className="admin-total-pago-sub">Somente inscrições aprovadas</div>
            </section>
          ) : null}

          {campeonatoSelecionado && metricas.modoIndividual ? (
            <section className="shirt-sizes" aria-label="Tamanhos de camisa">
              <h2 className="shirt-sizes-title">Tamanhos de camisa</h2>
              <div className="shirt-sizes-grid">
                {(["P", "M", "G", "GG"] as const).map((t) => (
                  <article key={t} className="shirt-mini">
                    <div className="shirt-mini-size">{t}</div>
                    <div className="shirt-mini-qty">{camisetas[t]}</div>
                    <div className="shirt-mini-sub">inscrições</div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </section>
      ) : (
        <div className="dash-grid">
          <article className="dash-card profile-card" aria-label="Perfil do participante">
            <div className="profile-head">
              <div className="profile-avatar">
                {montarUrlFoto(perfil?.fotoPerfil) ? (
                  <img
                    src={montarUrlFoto(perfil?.fotoPerfil) as string}
                    alt={`Foto de ${perfil?.nome || "participante"}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span aria-hidden>{(perfil?.nome || "P").trim().slice(0, 1).toUpperCase()}</span>
                )}
              </div>

              <div className="profile-title">
                <h2>Meu perfil</h2>
                <p>Veja e edite seus dados de participante.</p>
              </div>

              <div className="profile-actions">
                <button
                  type="button"
                  className="dash-pill"
                  onClick={() => {
                    setMsgPerfil("");
                    setEditandoPerfil((v) => !v);
                    setFotoArquivo(null);
                    setFotoPreview(null);
                    setFormPerfil({
                      nome: String(perfil?.nome || ""),
                      contato: String(perfil?.contato || ""),
                      dataNascimento: String(perfil?.dataNascimento || ""),
                      sexo: String(perfil?.sexo || ""),
                    });
                  }}
                >
                  {editandoPerfil ? "Cancelar" : "Editar"}
                </button>
              </div>
            </div>

            {modalSucessoAberto ? (
              <div
                role="dialog"
                aria-live="polite"
                aria-label="Confirmação"
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.28)",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingTop: 18,
                  zIndex: 9999
                }}
                onClick={() => setModalSucessoAberto(false)}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.92)",
                    border: "1px solid rgba(148,163,184,0.35)",
                    borderRadius: 14,
                    padding: "12px 14px",
                    boxShadow: "0 12px 30px rgba(2, 6, 23, 0.18)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    maxWidth: 360,
                    width: "calc(100% - 32px)",
                    color: "#0f172a"
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Tudo certo</div>
                  <div style={{ marginTop: 2, fontSize: 13, opacity: 0.9 }}>
                    {modalSucessoTexto}
                  </div>
                </div>
              </div>
            ) : null}

            {msgPerfil ? <div className="auth-banner auth-banner--info">{msgPerfil}</div> : null}

            {!editandoPerfil ? (
              <ul className="dash-kv">
                <li>
                  <strong>Nome</strong>
                  <span>{perfil?.nome || "—"}</span>
                </li>
                <li>
                  <strong>E-mail</strong>
                  <span>{perfil?.email || "—"}</span>
                </li>
                <li>
                  <strong>Contato</strong>
                  <span>
                    {perfil?.contato?.trim()
                      ? formatarTelefoneBR(perfil.contato) || perfil.contato
                      : "—"}
                  </span>
                </li>
                <li>
                  <strong>Nascimento</strong>
                  <span>
                    {perfil?.dataNascimento
                      ? formatarDataBR(perfil.dataNascimento) ||
                        String(perfil.dataNascimento).slice(0, 10)
                      : "—"}
                  </span>
                </li>
                <li>
                  <strong>Sexo</strong>
                  <span>{perfil?.sexo?.trim() || "—"}</span>
                </li>
              </ul>
            ) : (
              <form
                className="profile-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!tokenParticipante) {
                    setMsgPerfil("Você precisa estar logado para editar seu perfil.");
                    return;
                  }
                  setSalvandoPerfil(true);
                  setMsgPerfil("");
                  try {
                    const payload = {
                      nome: formPerfil.nome.trim(),
                      contato: formPerfil.contato.trim() || null,
                      dataNascimento: formPerfil.dataNascimento?.trim() || null,
                      sexo: formPerfil.sexo?.trim() || null,
                    };
                    let dados = (await atualizarMeuPerfil(tokenParticipante, payload)) as any;
                    let usuarioAtualizado = (dados?.usuario ?? dados) as any;

                    if (fotoArquivo) {
                      dados = (await atualizarMinhaFotoPerfil(tokenParticipante, fotoArquivo)) as any;
                      usuarioAtualizado = (dados?.usuario ?? dados) as any;
                    }

                    const novo = { ...(perfil || {}), ...(usuarioAtualizado || payload) };
                    setPerfil(novo);
                    setJSONStorage(chavesSessao.participanteLogado, novo);
                    setEditandoPerfil(false);
                    setModalSucessoTexto("Perfil atualizado com sucesso.");
                    setModalSucessoAberto(true);
                  } catch (err) {
                    const error = err as Error;
                    setMsgPerfil(`Não foi possível salvar: ${error.message}`);
                  } finally {
                    setSalvandoPerfil(false);
                  }
                }}
              >
                <div className="profile-grid">
                  <label className="profile-field profile-field--full">
                    <span>Foto do perfil</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      disabled={salvandoPerfil}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFotoArquivo(file);
                        setFotoPreview(file ? URL.createObjectURL(file) : null);
                      }}
                    />
                    <small className="profile-hint">
                      Selecione uma imagem (JPG, PNG ou WEBP). O upload acontece ao clicar em
                      “Salvar”.
                    </small>
                    {(fotoPreview || montarUrlFoto(perfil?.fotoPerfil)) ? (
                      <div style={{ marginTop: 10 }}>
                        <img
                          src={(fotoPreview || (montarUrlFoto(perfil?.fotoPerfil) as string)) as string}
                          alt="Prévia da foto do perfil"
                          style={{
                            width: 140,
                            height: 140,
                            borderRadius: 999,
                            objectFit: "cover"
                          }}
                        />
                      </div>
                    ) : null}
                  </label>

                  <label className="profile-field">
                    <span>Nome</span>
                    <input
                      value={formPerfil.nome}
                      onChange={(e) => setFormPerfil((p) => ({ ...p, nome: e.target.value }))}
                      required
                      disabled={salvandoPerfil}
                    />
                  </label>

                  <label className="profile-field">
                    <span>Contato</span>
                    <input
                      value={formatarTelefoneBR(formPerfil.contato)}
                      onChange={(e) =>
                        setFormPerfil((p) => ({
                          ...p,
                          contato: formatarTelefoneBR(e.target.value)
                        }))
                      }
                      placeholder="(xx) xxxxx-xxxx"
                      disabled={salvandoPerfil}
                    />
                  </label>

                  <label className="profile-field">
                    <span>Data de nascimento</span>
                    <input
                      type="date"
                      value={
                        formPerfil.dataNascimento
                          ? String(formPerfil.dataNascimento).slice(0, 10)
                          : ""
                      }
                      onChange={(e) =>
                        setFormPerfil((p) => ({ ...p, dataNascimento: e.target.value }))
                      }
                      disabled={salvandoPerfil}
                    />
                  </label>

                  <label className="profile-field">
                    <span>Sexo</span>
                    <select
                      value={formPerfil.sexo}
                      onChange={(e) => setFormPerfil((p) => ({ ...p, sexo: e.target.value }))}
                      disabled={salvandoPerfil}
                    >
                      <option value="">—</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMININO">Feminino</option>
                      <option value="OUTRO">Outro</option>
                      <option value="PREFIRO_NAO_INFORMAR">Prefiro não informar</option>
                    </select>
                  </label>
                </div>

                <div className="dash-card-actions">
                  <button type="submit" className="dash-pill" disabled={salvandoPerfil}>
                    {salvandoPerfil ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            )}
          </article>
        </div>
      )}
    </>
  );
}

