"use client";

import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  Copy,
  ExternalLink,
  LayoutGrid,
  MapPin,
  Phone,
  Tag,
  Trophy,
  User,
  Users
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { listarMinhasInscricoes } from "@/lib/api";
import {
  chavesSessao,
  getJSONStorage,
  getStorage,
  logoutParticipante
} from "@/lib/sessao";

type ParticipanteLogado = { nome: string; email: string } | null;

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://localhost:3333";

function formatarData(data: string | null | undefined) {
  if (!data) return "Não informada";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatarDataCurta(data: string | null | undefined) {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function traduzirSexo(sexo: string | null | undefined) {
  if (!sexo) return "—";
  const mapa: Record<string, string> = {
    MASCULINO: "Masculino",
    FEMININO: "Feminino",
    OUTRO: "Outro",
    PREFIRO_NAO_INFORMAR: "Prefiro não informar"
  };
  return mapa[sexo] || sexo;
}

function montarUrlFoto(fotoPerfil: string | null | undefined) {
  if (!fotoPerfil) return null;
  if (/^https?:\/\//i.test(fotoPerfil)) return fotoPerfil;
  return `${API_BASE}${fotoPerfil.startsWith("/") ? "" : "/"}${fotoPerfil}`;
}

async function copiarTexto(texto: string) {
  const valor = texto?.trim();
  if (!valor) return;

  try {
    await navigator.clipboard.writeText(valor);
  } catch {
    const el = document.createElement("textarea");
    el.value = valor;
    el.setAttribute("readonly", "true");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

function traduzirTipoParticipante(tipo: string) {
  const mapa: Record<string, string> = { DUPLA: "Dupla", TIME: "Quarteto" };
  return mapa[tipo] || tipo;
}

function traduzirFormato(formato: string) {
  const mapa: Record<string, string> = {
    MATA_MATA: "Mata-mata",
    DUPLA_ELIMINACAO: "Upper/Lower",
    TODOS_CONTRA_TODOS: "Todos contra todos"
  };
  return mapa[formato] || formato;
}

function traduzirStatusInscricao(status: string | undefined) {
  if (!status) return "—";
  const mapa: Record<string, string> = {
    APROVADA: "Aprovada",
    PENDENTE: "Pendente",
    REJEITADA: "Rejeitada",
    CANCELADA: "Cancelada",
    EM_ANALISE: "Em análise"
  };
  return mapa[status.toUpperCase()] || status;
}

function classeBadgeInscricao(status: string | undefined) {
  if (!status) return "minhas-inscricoes-badge--neutral";
  const u = status.toUpperCase();
  if (u === "APROVADA") return "minhas-inscricoes-badge--ok";
  if (u === "PENDENTE" || u === "EM_ANALISE") return "minhas-inscricoes-badge--warn";
  if (u === "REJEITADA") return "minhas-inscricoes-badge--err";
  if (u === "CANCELADA") return "minhas-inscricoes-badge--muted";
  return "minhas-inscricoes-badge--neutral";
}

function statusParaExibicao(inscricao: any) {
  if (inscricao?.tipo === "INDIVIDUAL") {
    const u = String(inscricao.statusAnalise || "").toUpperCase();
    if (u === "AGUARDANDO_ANALISE") return "EM_ANALISE";
    if (u === "APROVADA") return "APROVADA";
    if (u === "REPROVADA") return "REJEITADA";
    return inscricao.statusAnalise;
  }
  return inscricao?.statusInscricao;
}

export default function MinhasInscricoesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [mensagem, setMensagem] = useState("");
  const [inscricoes, setInscricoes] = useState<any[]>([]);
  const [campeonatoSelecionado, setCampeonatoSelecionado] = useState<string>("");

  const tokenParticipante = getStorage(chavesSessao.tokenParticipante);
  const participante = getJSONStorage<ParticipanteLogado>(
    chavesSessao.participanteLogado
  );

  const hrefListaCampeonatos = pathname.startsWith("/dashboard")
    ? "/dashboard/campeonatos"
    : "/campeonatos";

  useEffect(() => {
    if (!tokenParticipante) {
      router.replace("/login");
      return;
    }
  }, [router, tokenParticipante]);

  useEffect(() => {
    async function carregar() {
      if (!tokenParticipante) return;
      try {
        setMensagem("Carregando inscrições...");
        const dados = (await listarMinhasInscricoes(tokenParticipante)) as any[];
        setInscricoes(dados);
        setMensagem("");
      } catch (err) {
        const error = err as Error;
        setMensagem(`Erro ao carregar inscrições: ${error.message}`);
      }
    }
    carregar();
  }, [tokenParticipante]);

  const campeonatosDisponiveis = useMemo(() => {
    const lista = inscricoes.map((i) => i?.campeonato).filter(Boolean);

    const map = new Map<number, any>();
    for (const c of lista) {
      if (!map.has(c.id)) map.set(c.id, c);
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
    );
  }, [inscricoes]);

  useEffect(() => {
    if (!campeonatosDisponiveis.length) {
      setCampeonatoSelecionado("");
      return;
    }

    const existe = campeonatosDisponiveis.some(
      (c) => String(c.id) === String(campeonatoSelecionado)
    );
    if (!campeonatoSelecionado || !existe) {
      const primeiroAtivo = campeonatosDisponiveis.find(
        (c) => c.inscricoesAbertas === true
      );
      setCampeonatoSelecionado(
        String((primeiroAtivo || campeonatosDisponiveis[0]).id)
      );
    }
  }, [campeonatoSelecionado, campeonatosDisponiveis]);

  const inscricoesFiltradas = useMemo(() => {
    if (!campeonatoSelecionado) return inscricoes;
    return inscricoes.filter(
      (i) => String(i?.campeonato?.id) === String(campeonatoSelecionado)
    );
  }, [campeonatoSelecionado, inscricoes]);

  function sair() {
    logoutParticipante();
    router.push("/campeonatos");
  }

  return (
    <main className="minhas-inscricoes-page">
      <header className="cabecalho topo-inicio minhas-inscricoes-header">
        <div>
          <h1>Minhas inscrições</h1>
          <p>Acompanhe as inscrições feitas com sua conta.</p>
        </div>
      </header>

      <section className="minhas-inscricoes-body" aria-label="Lista de inscrições">
        <div className="minhas-inscricoes-filtros">
          <div className="grupo-formulario">
            <label htmlFor="minhas-inscricoes-campeonato">Campeonato</label>
            <select
              id="minhas-inscricoes-campeonato"
              value={campeonatoSelecionado}
              onChange={(e) => setCampeonatoSelecionado(e.target.value)}
              disabled={!campeonatosDisponiveis.length}
            >
              {!campeonatosDisponiveis.length ? (
                <option value="">Nenhum campeonato</option>
              ) : null}
              {campeonatosDisponiveis.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nome}
                  {c.inscricoesAbertas ? " (ativo)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mensagem ? <p className="mensagem minhas-inscricoes-msg">{mensagem}</p> : null}

        {!mensagem && !inscricoesFiltradas.length ? (
          <div className="minhas-inscricoes-empty">
            <div className="minhas-inscricoes-empty-inner">
              <ClipboardList
                className="minhas-inscricoes-empty-icon"
                aria-hidden
                strokeWidth={1.5}
              />
              <h2 className="minhas-inscricoes-empty-title">Nenhuma inscrição ainda</h2>
              <p className="minhas-inscricoes-empty-text">
                Quando você se inscrever em um campeonato, ela aparecerá aqui.
              </p>
            </div>
          </div>
        ) : null}

        {!mensagem && inscricoesFiltradas.length > 0 ? (
          <div className="minhas-inscricoes-list">
            {inscricoesFiltradas.map((inscricao) => {
              const campeonato = inscricao.campeonato;
              const statusExibicao = statusParaExibicao(inscricao);
              return (
                <article key={inscricao.id} className="minhas-inscricoes-card">
                  <div className="minhas-inscricoes-card-head">
                    <h2 className="minhas-inscricoes-card-title">{campeonato.nome}</h2>
                    <span
                      className={`minhas-inscricoes-badge ${classeBadgeInscricao(
                        statusExibicao
                      )}`}
                    >
                      {traduzirStatusInscricao(statusExibicao)}
                    </span>
                  </div>

                  <ul className="minhas-inscricoes-chips" aria-label="Resumo do campeonato">
                    <li>
                      <Calendar aria-hidden className="minhas-inscricoes-chip-ic" />
                      <span>{formatarData(campeonato.data)}</span>
                    </li>
                    <li>
                      <MapPin aria-hidden className="minhas-inscricoes-chip-ic" />
                      <span>{campeonato.local?.trim() || "Local a definir"}</span>
                    </li>
                    <li>
                      <Users aria-hidden className="minhas-inscricoes-chip-ic" />
                      <span>{traduzirTipoParticipante(campeonato.tipoParticipante)}</span>
                    </li>
                    <li>
                      <LayoutGrid aria-hidden className="minhas-inscricoes-chip-ic" />
                      <span>{traduzirFormato(campeonato.formato)}</span>
                    </li>
                    <li>
                      <Tag aria-hidden className="minhas-inscricoes-chip-ic" />
                      <span>{campeonato.categoria}</span>
                    </li>
                  </ul>

                  <div className="minhas-inscricoes-section">
                    <h3 className="minhas-inscricoes-section-title">Sua inscrição</h3>
                    <dl className="minhas-inscricoes-dl">
                      {inscricao.tipo === "INDIVIDUAL" ? (
                        <>
                          <div className="minhas-inscricoes-dl-row">
                            <dt>
                              <User aria-hidden className="minhas-inscricoes-dl-ic" />
                              Foto
                            </dt>
                            <dd>
                              {montarUrlFoto(inscricao.usuario?.fotoPerfil) ? (
                                <img
                                  className="minhas-inscricoes-avatar"
                                  src={montarUrlFoto(inscricao.usuario?.fotoPerfil) as string}
                                  alt={`Foto de ${inscricao.usuario?.nome || "jogador"}`}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                "—"
                              )}
                            </dd>
                          </div>
                          <div className="minhas-inscricoes-dl-row">
                            <dt>
                              <User aria-hidden className="minhas-inscricoes-dl-ic" />
                              Jogador
                            </dt>
                            <dd>{inscricao.usuario?.nome || "—"}</dd>
                          </div>
                          <div className="minhas-inscricoes-dl-row">
                            <dt>
                              <Tag aria-hidden className="minhas-inscricoes-dl-ic" />
                              E-mail
                            </dt>
                            <dd className="minhas-inscricoes-dd-copy">
                              <span>{inscricao.usuario?.email || "—"}</span>
                              {inscricao.usuario?.email ? (
                                <button
                                  type="button"
                                  className="minhas-inscricoes-copy"
                                  onClick={() => copiarTexto(inscricao.usuario.email)}
                                  aria-label="Copiar e-mail"
                                  title="Copiar e-mail"
                                >
                                  <Copy aria-hidden className="minhas-inscricoes-copy-ic" />
                                </button>
                              ) : null}
                            </dd>
                          </div>
                          <div className="minhas-inscricoes-dl-row">
                            <dt>
                              <Phone aria-hidden className="minhas-inscricoes-dl-ic" />
                              Contato
                            </dt>
                            <dd className="minhas-inscricoes-dd-copy">
                              <span>
                                {inscricao.usuario?.contato?.trim() || "Não informado"}
                              </span>
                              {inscricao.usuario?.contato?.trim() ? (
                                <button
                                  type="button"
                                  className="minhas-inscricoes-copy"
                                  onClick={() => copiarTexto(inscricao.usuario.contato)}
                                  aria-label="Copiar contato"
                                  title="Copiar contato"
                                >
                                  <Copy aria-hidden className="minhas-inscricoes-copy-ic" />
                                </button>
                              ) : null}
                            </dd>
                          </div>
                          <div className="minhas-inscricoes-dl-row">
                            <dt>
                              <Tag aria-hidden className="minhas-inscricoes-dl-ic" />
                              Camisa
                            </dt>
                            <dd>{inscricao.tamanhoCamisa || "—"}</dd>
                          </div>
                          <div className="minhas-inscricoes-dl-row">
                            <dt>
                              <Tag aria-hidden className="minhas-inscricoes-dl-ic" />
                              Sexo
                            </dt>
                            <dd>{traduzirSexo(inscricao.usuario?.sexo)}</dd>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="minhas-inscricoes-dl-row">
                            <dt>
                              <Users aria-hidden className="minhas-inscricoes-dl-ic" />
                              Equipe
                            </dt>
                            <dd>{inscricao.nomeEquipe}</dd>
                          </div>
                          <div className="minhas-inscricoes-dl-row">
                            <dt>
                              <User aria-hidden className="minhas-inscricoes-dl-ic" />
                              Capitã(o)
                            </dt>
                            <dd>{inscricao.responsavel}</dd>
                          </div>
                          <div className="minhas-inscricoes-dl-row">
                            <dt>
                              <Phone aria-hidden className="minhas-inscricoes-dl-ic" />
                              Contato
                            </dt>
                            <dd>{inscricao.contato?.trim() || "Não informado"}</dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </div>

                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}
