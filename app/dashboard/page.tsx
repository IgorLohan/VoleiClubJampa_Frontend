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
import { Calendar, Check, Mail, Pencil, Phone, UserRound, X } from "lucide-react";

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

/** Edição de perfil: só Masculino ou Feminino. */
function sexoEditavelPerfil(sexo: string | null | undefined): string {
  const s = String(sexo || "").toUpperCase();
  return s === "MASCULINO" || s === "FEMININO" ? s : "";
}

function formatarSexoExibicao(sexo: string | null | undefined) {
  if (!String(sexo || "").trim()) return "—";
  const map: Record<string, string> = {
    MASCULINO: "Masculino",
    FEMININO: "Feminino",
    OUTRO: "Outro",
    PREFIRO_NAO_INFORMAR: "Prefiro não informar"
  };
  const u = String(sexo).toUpperCase();
  return map[u] || String(sexo);
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
  const [modalEditarPerfilAberto, setModalEditarPerfilAberto] = useState(false);
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
    sexo: sexoEditavelPerfil(sessao.usuario?.sexo),
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

  const primeiroNomePerfil = useMemo(() => {
    const nome = String(perfil?.nome || "").trim();
    if (!nome) return "";
    return nome.split(/\s+/)[0] || nome;
  }, [perfil?.nome]);

  if (!sessao.papel) return null;

  function montarUrlFoto(foto: string | null | undefined) {
    if (!foto) return null;
    if (/^https?:\/\//i.test(foto)) return foto;
    return `${API_BASE}${foto.startsWith("/") ? "" : "/"}${foto}`;
  }

  function abrirModalEditarPerfil() {
    setMsgPerfil("");
    setModalEditarPerfilAberto(true);
    setFotoArquivo(null);
    setFotoPreview(null);
    setFormPerfil({
      nome: String(perfil?.nome || ""),
      contato: String(perfil?.contato || ""),
      dataNascimento: String(perfil?.dataNascimento || ""),
      sexo: sexoEditavelPerfil(perfil?.sexo),
    });
  }

  function fecharModalEditarPerfil() {
    setModalEditarPerfilAberto(false);
    setMsgPerfil("");
    setFotoArquivo(null);
    setFotoPreview(null);
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
            sexo: sexoEditavelPerfil(usuario.sexo),
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
    if (!modalEditarPerfilAberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setModalEditarPerfilAberto(false);
      setMsgPerfil("");
      setFotoArquivo(null);
      setFotoPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalEditarPerfilAberto]);

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
      if (i?.status === "CANCELADA" || i?.statusAnalise !== "APROVADA") continue;
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
      {sessao.papel === "ADMIN" ? (
        <div className="dash-hero">
          <h1 className="dash-title">{saudacao}</h1>
        </div>
      ) : (
        <header className="mb-4">
          <h1 className="m-0 bg-gradient-to-r from-[#203667] via-[#F39200] to-[#E44631] bg-clip-text text-2xl font-black tracking-[-0.6px] text-transparent sm:text-3xl">
            {perfil?.nome?.trim()
              ? `Olá, ${perfil.nome.trim()}!`
              : primeiroNomePerfil
                ? `Olá, ${primeiroNomePerfil}!`
                : saudacao}
          </h1>
          <p className="mt-2 m-0 max-w-[62ch] text-sm leading-relaxed text-[#203667]/75">
            <span className="font-semibold text-[#F39200]">Bem-vindo</span> ao seu painel de atleta.
            Confira suas informações e acompanhe sua jornada.
          </p>
        </header>
      )}

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
            <section className="shirt-sizes" aria-label="Tamanhos de camisa (inscrições aprovadas)">
              <h2 className="shirt-sizes-title">Tamanhos de camisa</h2>
              <div className="shirt-sizes-grid">
                {(["P", "M", "G", "GG"] as const).map((t) => (
                  <article key={t} className="shirt-mini">
                    <div className="shirt-mini-size">{t}</div>
                    <div className="shirt-mini-qty">{camisetas[t]}</div>
                    <div className="shirt-mini-sub">aprovadas</div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </section>
      ) : (
        <div className="box-border flex w-full max-w-full flex-col items-center gap-4 px-[10px] pb-[10px] pt-0 sm:px-4 sm:pb-4">
          <article
            className="mx-auto w-full max-w-[1200px] overflow-hidden rounded-xl bg-[#FFFFFF] shadow-[0_10px_28px_rgba(32,54,103,0.10)]"
            aria-label="Perfil do participante"
          >
            <div className="relative box-border p-3 sm:p-4 md:p-5">
              <div className="flex min-w-0 flex-col flex-wrap items-stretch gap-5 md:gap-0 md:flex-nowrap md:flex-row">
                <div className="relative min-h-[260px] w-full shrink-0 overflow-visible bg-gradient-to-br from-[#FFEB99] via-[#F5B041] to-[#F39200] md:min-h-[300px] md:w-[min(100%,264px)] md:max-w-[264px] md:flex-[0_0_264px]">
                  {/* Brilho suave + leve calor na base (identidade laranja/vermelho) */}
                  <div
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.35)_0%,transparent_48%,rgba(228,70,49,0.12)_100%)]"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-y-6 left-0 w-1 rounded-full bg-gradient-to-b from-[#FFFFFF] via-[#F39200] to-[#E44631]"
                    aria-hidden
                  />

                  <div className="relative z-[2] flex h-full min-h-[inherit] items-center justify-center px-6 py-12 sm:px-8 sm:py-12 md:justify-end md:px-10 md:py-10 md:pr-4">
                    {/* Avatar + anéis no mesmo centro (sem translate solto) */}
                    <div className="relative size-[228px] shrink-0 sm:size-[244px] md:size-[258px]">
                      <div
                        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[222px] w-[222px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFFFFF]/35 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] ring-1 ring-[#203667]/15 sm:h-[236px] sm:w-[236px] md:h-[250px] md:w-[250px]"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[188px] w-[188px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFFFFF] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] sm:h-[200px] sm:w-[200px] md:h-[212px] md:w-[212px]"
                        aria-hidden
                      />
                      <div className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2">
                        <div className="relative">
                          <div className="h-[142px] w-[142px] overflow-hidden rounded-full border-[3px] border-[#FFFFFF] bg-[#F39200]/25 shadow-[0_16px_40px_rgba(32,54,103,0.18)] ring-1 ring-[#FFFFFF]/40 sm:h-[154px] sm:w-[154px] md:h-[172px] md:w-[172px] md:border-4">
                            {montarUrlFoto(perfil?.fotoPerfil) ? (
                              <img
                                src={montarUrlFoto(perfil?.fotoPerfil) as string}
                                alt={`Foto de ${perfil?.nome || "participante"}`}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="h-full w-full min-h-full min-w-full scale-110 object-cover object-[center_22%]"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F39200]/30 to-[#E44631]/25">
                                <span className="text-3xl font-black text-[#FFFFFF]" aria-hidden>
                                  {(perfil?.nome || "P").trim().slice(0, 1).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 z-[30] sm:-bottom-0.5 sm:-right-0.5">
                            <button
                              type="button"
                              onClick={abrirModalEditarPerfil}
                              aria-label="Editar perfil"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#F39200] to-[#E44631] text-[#FFFFFF] shadow-[0_8px_22px_rgba(228,70,49,0.35)] ring-2 ring-[#FFFFFF] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203667]"
                            >
                              <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="relative flex min-h-[300px] min-w-0 w-full flex-1 flex-col bg-transparent pl-0 pr-5 pb-8 sm:pr-8 sm:pb-9 md:min-h-0 md:basis-0 md:pr-10 md:pb-10 lg:pr-12 lg:pb-10"
                  aria-label="Resumo do atleta"
                >
                  <div
                    data-perfil-painel-externo
                    className="mt-8 box-border flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden rounded-2xl border border-[#203667]/12 bg-[#F4F7FC] shadow-[0_8px_30px_rgba(32,54,103,0.08)] sm:mt-10 md:mt-0 md:rounded-l-none md:border-l-0"
                    aria-label="Painel externo do perfil"
                  >
                    <section
                      className="grid min-w-0 shrink-0 grid-cols-1 gap-4 border-0 bg-transparent px-6 py-5 shadow-none sm:gap-4 sm:px-8 sm:py-6 md:px-10"
                      aria-label="Card do atleta"
                    >
                      <div className="grid text-xs font-black uppercase tracking-[0.22em] text-[#F39200]">
                        Atleta
                      </div>
                      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                        <h2 className="m-0 text-2xl font-black tracking-[-0.6px] text-[#203667] sm:text-3xl">
                          {perfil?.nome?.trim() || "Participante"}
                        </h2>
                        <span className="inline-flex items-center gap-1.5 justify-self-start rounded-full border border-[#E44631]/40 bg-[#F39200]/12 px-2.5 py-1 text-[0.72rem] font-black text-[#203667] sm:justify-self-end">
                          <Check className="h-3.5 w-3.5 text-[#E44631]" aria-hidden />
                          Participante verificado
                        </span>
                      </div>
                      <div
                        className="h-1 w-12 rounded-full bg-gradient-to-r from-[#F39200] to-[#E44631]"
                        aria-hidden
                      />
                      <p className="m-0 max-w-none text-sm leading-relaxed text-[#203667]/70 sm:text-[0.95rem]">
                        Participe. Compita. Supere seus limites.
                      </p>
                    </section>

                    <section
                      className="grid min-w-0 shrink-0 grid-cols-1 gap-4 border-0 bg-transparent px-6 py-5 shadow-none sm:px-8 sm:py-6 md:px-10"
                      aria-label="Card de informações"
                    >
                      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="grid min-w-0 grid-cols-[2.5rem_1fr] items-center gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-[#203667]">
                            <Mail className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="grid min-w-0 gap-0.5">
                            <div className="text-xs font-semibold text-[#203667]/65">E-mail</div>
                            <div className="text-sm font-bold leading-snug text-[#203667] [overflow-wrap:anywhere]">
                              {perfil?.email?.trim() ? perfil.email : "—"}
                            </div>
                          </div>
                        </div>

                        <div className="grid min-w-0 grid-cols-[2.5rem_1fr] items-center gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F39200]/20 text-[#203667]">
                            <Phone className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="grid min-w-0 gap-0.5">
                            <div className="text-xs font-semibold text-[#203667]/65">Contato</div>
                            <div className="break-words text-sm font-bold leading-snug text-[#203667]">
                              {perfil?.contato?.trim()
                                ? formatarTelefoneBR(perfil.contato) || perfil.contato
                                : "—"}
                            </div>
                          </div>
                        </div>

                        <div className="grid min-w-0 grid-cols-[2.5rem_1fr] items-center gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-[#203667]">
                            <Calendar className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="grid min-w-0 gap-0.5">
                            <div className="text-xs font-semibold text-[#203667]/65">Nascimento</div>
                            <div className="break-words text-sm font-bold leading-snug text-[#203667]">
                              {perfil?.dataNascimento
                                ? formatarDataBR(perfil.dataNascimento) ||
                                  String(perfil.dataNascimento).slice(0, 10)
                                : "—"}
                            </div>
                          </div>
                        </div>

                        <div className="grid min-w-0 grid-cols-[2.5rem_1fr] items-center gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#203667]/10 text-[#203667]">
                            <UserRound className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="grid min-w-0 gap-0.5">
                            <div className="text-xs font-semibold text-[#203667]/65">Sexo</div>
                            <div className="break-words text-sm font-bold leading-snug text-[#203667]">
                              {formatarSexoExibicao(perfil?.sexo)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>

            {modalSucessoAberto ? (
              <div
                role="dialog"
                aria-live="polite"
                aria-label="Confirmação"
                className="fixed inset-0 z-[9999] flex items-start justify-center bg-[#203667]/35 px-4 pt-5 backdrop-blur-sm"
                onClick={() => setModalSucessoAberto(false)}
              >
                <div
                  className="w-full max-w-[380px] rounded-2xl border border-[#FFFFFF]/80 bg-[#FFFFFF]/95 p-4 text-[#203667] shadow-[0_18px_50px_rgba(32,54,103,0.2)] backdrop-blur-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F39200]/22 text-[#E44631] font-black">
                      ✓
                    </span>
                    <div className="text-sm font-black text-[#203667]">Tudo certo</div>
                  </div>
                  <div className="mt-2 text-[0.92rem] leading-snug text-[#203667]/80">
                    {modalSucessoTexto}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="px-8 pb-10 sm:px-12 sm:pb-12 lg:px-16">
              {modalEditarPerfilAberto ? (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="titulo-modal-editar-perfil"
                  className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-[#203667]/45 px-4 pb-12 pt-14 backdrop-blur-[6px] min-[480px]:px-6 sm:items-center sm:px-8 sm:py-14"
                  onClick={fecharModalEditarPerfil}
                >
                  <div
                    className="mx-auto mb-6 w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#203667]/12 bg-white shadow-[0_28px_80px_rgba(32,54,103,0.28)] ring-1 ring-[#203667]/5 sm:mb-0 sm:max-w-xl min-[480px]:max-w-[calc(100vw-2.5rem)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative flex items-start justify-between gap-4 border-b border-[#203667]/10 bg-gradient-to-br from-[#F8FAFC] via-white to-[#FFF9F3] px-6 py-5 sm:px-10 sm:py-7 md:px-12">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#F39200] via-[#E44631] to-[#203667]/30" aria-hidden />
                      <h2
                        id="titulo-modal-editar-perfil"
                        className="m-0 pr-2 text-xl font-black tracking-[-0.4px] text-[#203667] sm:text-2xl"
                      >
                        Editar perfil
                      </h2>
                      <button
                        type="button"
                        onClick={fecharModalEditarPerfil}
                        aria-label="Fechar"
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#203667]/55 transition hover:bg-[#203667]/8 hover:text-[#203667] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F39200]"
                      >
                        <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                      </button>
                    </div>

                    <form
                      className="flex flex-col gap-6 px-8 pb-10 pt-7 sm:gap-7 sm:px-10 sm:pb-10 sm:pt-8 md:px-12"
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
                          fecharModalEditarPerfil();
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
                      {msgPerfil ? (
                        <div
                          role="alert"
                          className="rounded-xl border border-[#203667]/12 bg-[#203667]/[0.06] px-4 py-3 text-sm font-semibold leading-snug text-[#203667]"
                        >
                          {msgPerfil}
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-[#203667]/10 bg-gradient-to-b from-[#F4F7FC] to-white p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-7">
                        <label className="flex w-full flex-col gap-2">
                          <span className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#203667]/70">
                            Foto do perfil
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            disabled={salvandoPerfil}
                            className="w-full cursor-pointer rounded-xl border border-[#203667]/12 bg-white/90 px-3 py-2.5 text-sm font-semibold text-[#203667]/90 shadow-sm transition file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-[#F39200] file:to-[#E44631] file:px-4 file:py-2.5 file:text-sm file:font-black file:text-white file:shadow-md hover:file:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setFotoArquivo(file);
                              setFotoPreview(file ? URL.createObjectURL(file) : null);
                            }}
                          />
                          <p className="m-0 text-[0.8125rem] leading-relaxed text-[#203667]/65">
                            JPG, PNG ou WEBP. O envio da foto ocorre ao clicar em{" "}
                            <span className="font-bold text-[#203667]/85">Salvar</span>.
                          </p>
                          {fotoPreview || montarUrlFoto(perfil?.fotoPerfil) ? (
                            <div className="mt-4 flex justify-center sm:mt-5">
                              <img
                                src={
                                  (fotoPreview || (montarUrlFoto(perfil?.fotoPerfil) as string)) as string
                                }
                                alt="Prévia da foto do perfil"
                                className="h-[140px] w-[140px] rounded-2xl border-4 border-white object-cover shadow-[0_20px_48px_rgba(32,54,103,0.18)] ring-2 ring-[#203667]/10"
                              />
                            </div>
                          ) : null}
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
                        <label className="flex min-w-0 flex-col gap-2 sm:col-span-2">
                          <span className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#203667]/70">
                            Nome
                          </span>
                          <input
                            value={formPerfil.nome}
                            onChange={(e) => setFormPerfil((p) => ({ ...p, nome: e.target.value }))}
                            required
                            disabled={salvandoPerfil}
                            className="h-12 w-full rounded-xl border border-[#203667]/14 bg-white px-4 font-semibold text-[#203667] shadow-sm outline-none transition placeholder:text-[#203667]/35 focus-visible:border-[#F39200]/55 focus-visible:ring-4 focus-visible:ring-[#F39200]/22 disabled:opacity-60"
                          />
                        </label>

                        <label className="flex min-w-0 flex-col gap-2">
                          <span className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#203667]/70">
                            Contato
                          </span>
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
                            className="h-12 w-full rounded-xl border border-[#203667]/14 bg-white px-4 font-semibold text-[#203667] shadow-sm outline-none transition placeholder:text-[#203667]/35 focus-visible:border-[#F39200]/55 focus-visible:ring-4 focus-visible:ring-[#F39200]/22 disabled:opacity-60"
                          />
                        </label>

                        <label className="flex min-w-0 flex-col gap-2">
                          <span className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#203667]/70">
                            Data de nascimento
                          </span>
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
                            className="h-12 w-full rounded-xl border border-[#203667]/14 bg-white px-4 font-semibold text-[#203667] shadow-sm outline-none transition focus-visible:border-[#F39200]/55 focus-visible:ring-4 focus-visible:ring-[#F39200]/22 disabled:opacity-60"
                          />
                        </label>

                        <label className="flex min-w-0 flex-col gap-2 sm:col-span-2 sm:max-w-md">
                          <span className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#203667]/70">
                            Sexo
                          </span>
                          <select
                            value={formPerfil.sexo}
                            onChange={(e) => setFormPerfil((p) => ({ ...p, sexo: e.target.value }))}
                            disabled={salvandoPerfil}
                            className="h-12 w-full cursor-pointer rounded-xl border border-[#203667]/14 bg-white px-4 font-semibold text-[#203667] shadow-sm outline-none transition focus-visible:border-[#F39200]/55 focus-visible:ring-4 focus-visible:ring-[#F39200]/22 disabled:opacity-60"
                          >
                            <option value="">—</option>
                            <option value="MASCULINO">Masculino</option>
                            <option value="FEMININO">Feminino</option>
                          </select>
                        </label>
                      </div>

                      <div className="mt-2 flex flex-col-reverse gap-3 border-t border-[#203667]/10 pt-8 sm:flex-row sm:justify-end sm:gap-4 sm:pt-9">
                        <button
                          type="button"
                          onClick={fecharModalEditarPerfil}
                          disabled={salvandoPerfil}
                          className="inline-flex h-12 min-w-[7.5rem] items-center justify-center rounded-full border border-[#203667]/18 bg-white px-6 font-black text-[#203667] shadow-sm transition hover:bg-[#F4F7FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203667]/40 disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="inline-flex h-12 min-w-[7.5rem] items-center justify-center rounded-full bg-gradient-to-r from-[#F39200] to-[#E44631] px-6 font-black text-white shadow-[0_12px_28px_rgba(228,70,49,0.35)] transition hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#203667] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={salvandoPerfil}
                        >
                          {salvandoPerfil ? "Salvando..." : "Salvar"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        </div>
      )}
    </>
  );
}

