"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  GitBranch,
  MapPin,
  Medal,
  Swords,
  Trophy,
  Users
} from "lucide-react";
import ChaveamentoVisual, {
  type JogoChaveamento,
  type ParticipanteResumo
} from "@/components/chaveamento/ChaveamentoVisual";
import PageLoader from "@/components/PageLoader";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { buscarResumoCampeonatoPublico } from "@/lib/api";
import {
  classeStatusCampeonato,
  classeStatusJogo,
  formatarData,
  obterNomeEquipe,
  traduzirCategoria,
  traduzirFase,
  traduzirFormato,
  traduzirStatusCampeonato,
  traduzirStatusJogo,
  traduzirTipoParticipante
} from "@/lib/torneio-labels";

const LOGO = "/logo/volei_club_jampa.png";

type AbaTorneio = "CHAVE" | "JOGOS" | "PODIO";

export default function TorneioDetalhePage() {
  const params = useParams();
  const id = String(params?.id || "");

  const [resumo, setResumo] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<AbaTorneio>("CHAVE");

  useEffect(() => {
    if (!id) return;
    async function carregar() {
      try {
        setCarregando(true);
        setErro("");
        const dados = await buscarResumoCampeonatoPublico(id);
        setResumo(dados);
        const temJogos = Array.isArray(dados?.jogos) && dados.jogos.length > 0;
        setAba(temJogos ? "CHAVE" : "JOGOS");
      } catch (err) {
        const error = err as Error;
        setResumo(null);
        setErro(error.message || "Não foi possível carregar o campeonato.");
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, [id]);

  const campeonato = resumo?.campeonato;
  const jogos = (resumo?.jogos || []) as JogoChaveamento[];
  const participantes = (resumo?.participantes || []) as ParticipanteResumo[];
  const podio = resumo?.podio;
  const status = resumo?.statusCampeonato || campeonato?.statusCampeonato;

  const jogosOrdenados = useMemo(
    () =>
      [...jogos].sort((a, b) => {
        const fa = String(a.fase || "");
        const fb = String(b.fase || "");
        if (fa !== fb) return fa.localeCompare(fb, "pt-BR");
        return Number(a.ordem || a.id) - Number(b.ordem || b.id);
      }),
    [jogos]
  );

  const jogosFinalizados = jogos.filter(
    (j) => String(j?.status || "").toUpperCase() === "FINALIZADO"
  ).length;

  return (
    <>
      <SiteHeader
        logoSrc={LOGO}
        logoAlt="Vôlei Club Jampa"
        brandName="Vôlei Club Jampa"
        links={[
          { label: "Início", href: "/" },
          { label: "Torneios", href: "/torneio" },
          { label: "Campeonatos", href: "/campeonatos" },
          { label: "Login", href: "/login", variant: "cta" }
        ]}
      />

      <main className="torneio-page torneio-page--detalhe">
        <section className="torneio-hero torneio-hero--compact">
          <div className="torneio-container">
            <Link href="/torneio" className="torneio-back">
              <ArrowLeft size={18} aria-hidden />
              Voltar aos torneios
            </Link>

            {carregando ? (
              <PageLoader label="Carregando campeonato" variant="inline" />
            ) : erro ? (
              <p className="torneio-msg torneio-msg--erro" role="alert">
                {erro}
              </p>
            ) : campeonato ? (
              <>
                <div className="torneio-detalhe-head">
                  <div className="torneio-detalhe-head-text">
                    <span
                      className={`torneio-status ${classeStatusCampeonato(status)}`}
                    >
                      {traduzirStatusCampeonato(status)}
                    </span>
                    <h1 className="torneio-detalhe-title">{campeonato.nome}</h1>
                    <div className="torneio-detalhe-meta">
                      <span>
                        <Calendar size={16} aria-hidden />
                        {formatarData(campeonato.data)}
                      </span>
                      {campeonato.local ? (
                        <span>
                          <MapPin size={16} aria-hidden />
                          {campeonato.local}
                        </span>
                      ) : null}
                    </div>
                    <div className="torneio-detalhe-tags">
                      <span>{traduzirFormato(campeonato.formato)}</span>
                      <span>{traduzirTipoParticipante(campeonato.tipoParticipante)}</span>
                      <span>{traduzirCategoria(campeonato.categoria)}</span>
                    </div>
                  </div>
                </div>

                <div className="torneio-stats-row">
                  <div className="torneio-stat">
                    <Users size={20} aria-hidden />
                    <div>
                      <strong>{participantes.length}</strong>
                      <span>Equipes</span>
                    </div>
                  </div>
                  <div className="torneio-stat">
                    <GitBranch size={20} aria-hidden />
                    <div>
                      <strong>{jogos.length}</strong>
                      <span>Jogos</span>
                    </div>
                  </div>
                  <div className="torneio-stat">
                    <Swords size={20} aria-hidden />
                    <div>
                      <strong>{jogosFinalizados}</strong>
                      <span>Finalizados</span>
                    </div>
                  </div>
                  <div className="torneio-stat">
                    <Trophy size={20} aria-hidden />
                    <div>
                      <strong>{podio ? "Definido" : "—"}</strong>
                      <span>Pódio</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>

        {!carregando && !erro && campeonato ? (
          <section className="torneio-container torneio-detalhe-body">
            <div className="torneio-tabs" role="tablist" aria-label="Seções do campeonato">
              <button
                type="button"
                role="tab"
                aria-selected={aba === "CHAVE"}
                className={`torneio-tab${aba === "CHAVE" ? " is-active" : ""}`}
                onClick={() => setAba("CHAVE")}
              >
                <GitBranch size={16} aria-hidden />
                Grupos &amp; chave
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aba === "JOGOS"}
                className={`torneio-tab${aba === "JOGOS" ? " is-active" : ""}`}
                onClick={() => setAba("JOGOS")}
              >
                <Swords size={16} aria-hidden />
                Jogos ({jogos.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aba === "PODIO"}
                className={`torneio-tab${aba === "PODIO" ? " is-active" : ""}`}
                onClick={() => setAba("PODIO")}
              >
                <Medal size={16} aria-hidden />
                Pódio
              </button>
            </div>

            {aba === "CHAVE" ? (
              <div className="torneio-panel" role="tabpanel">
                {!jogos.length ? (
                  <div className="torneio-empty">
                    <GitBranch size={40} aria-hidden />
                    <p>O chaveamento ainda não foi publicado para este campeonato.</p>
                  </div>
                ) : (
                  <ChaveamentoVisual jogos={jogos} participantes={participantes} />
                )}
              </div>
            ) : null}

            {aba === "JOGOS" ? (
              <div className="torneio-panel" role="tabpanel">
                {!jogosOrdenados.length ? (
                  <div className="torneio-empty">
                    <Swords size={40} aria-hidden />
                    <p>Nenhum jogo registrado ainda.</p>
                  </div>
                ) : (
                  <div className="torneio-jogos-lista">
                    {jogosOrdenados.map((jogo) => {
                      const vencedorId = jogo.vencedor?.id;
                      const venceuA = Boolean(vencedorId && jogo.equipeA?.id === vencedorId);
                      const venceuB = Boolean(vencedorId && jogo.equipeB?.id === vencedorId);
                      return (
                        <article key={jogo.id} className="torneio-jogo-card">
                          <div className="torneio-jogo-card-head">
                            <span className="torneio-jogo-fase">{traduzirFase(jogo.fase)}</span>
                            {jogo.grupo ? (
                              <span className="torneio-jogo-grupo">Grupo {jogo.grupo}</span>
                            ) : null}
                            <span
                              className={`torneio-jogo-status ${classeStatusJogo(jogo.status)}`}
                            >
                              {traduzirStatusJogo(jogo.status)}
                            </span>
                          </div>
                          <div className="torneio-jogo-confronto">
                            <div
                              className={`torneio-jogo-equipe${venceuA ? " is-winner" : ""}`}
                            >
                              {obterNomeEquipe(jogo.equipeA)}
                            </div>
                            <span className="torneio-jogo-vs">VS</span>
                            <div
                              className={`torneio-jogo-equipe${venceuB ? " is-winner" : ""}`}
                            >
                              {obterNomeEquipe(jogo.equipeB)}
                            </div>
                          </div>
                          {jogo.sets?.length ? (
                            <div className="torneio-jogo-sets">
                              {jogo.sets.map((set, idx) => (
                                <span key={set.numeroSet ?? idx} className="torneio-set-pill">
                                  Set {set.numeroSet}: {set.pontosA}×{set.pontosB}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="torneio-jogo-sem-placar">Placar ainda não registrado</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {aba === "PODIO" ? (
              <div className="torneio-panel" role="tabpanel">
                {!podio ? (
                  <div className="torneio-empty">
                    <Medal size={40} aria-hidden />
                    <p>O pódio será exibido quando a final for concluída.</p>
                  </div>
                ) : (
                  <div className="torneio-podio">
                    <div className="torneio-podio-card torneio-podio-card--2">
                      <span className="torneio-podio-medal">🥈</span>
                      <span className="torneio-podio-pos">2º lugar</span>
                      <strong>{podio.segundoLugar?.nomeEquipe || "—"}</strong>
                    </div>
                    <div className="torneio-podio-card torneio-podio-card--1">
                      <span className="torneio-podio-medal">🥇</span>
                      <span className="torneio-podio-pos">1º lugar</span>
                      <strong>{podio.primeiroLugar?.nomeEquipe || "—"}</strong>
                    </div>
                    <div className="torneio-podio-card torneio-podio-card--3">
                      <span className="torneio-podio-medal">🥉</span>
                      <span className="torneio-podio-pos">3º lugar</span>
                      <strong>{podio.terceiroLugar?.nomeEquipe || "—"}</strong>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        ) : null}
      </main>

      <SiteFooter brandName="Vôlei Club Jampa" />
    </>
  );
}
