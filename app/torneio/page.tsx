"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronRight,
  GitBranch,
  MapPin,
  Search,
  Trophy,
  Users
} from "lucide-react";
import PageLoader from "@/components/PageLoader";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { listarCampeonatosPublicos } from "@/lib/api";
import {
  classeStatusCampeonato,
  formatarData,
  traduzirCategoria,
  traduzirFormato,
  traduzirStatusCampeonato,
  traduzirTipoParticipante
} from "@/lib/torneio-labels";

const LOGO = "/logo/volei_club_jampa.png";

type CampeonatoPublico = {
  id: number;
  nome: string;
  data?: string | null;
  local?: string | null;
  tipoParticipante?: string;
  categoria?: string;
  formato?: string;
  statusCampeonato?: string;
  inscricoesAbertas?: boolean;
  totais?: {
    participantes?: number;
    jogos?: number;
  };
};

export default function TorneioListaPage() {
  const [campeonatos, setCampeonatos] = useState<CampeonatoPublico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [pesquisa, setPesquisa] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);
        setErro("");
        const lista = (await listarCampeonatosPublicos()) as CampeonatoPublico[];
        const ordenados = [...(lista || [])].sort((a, b) =>
          String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
        );
        setCampeonatos(ordenados);
      } catch (err) {
        const error = err as Error;
        setErro(error.message || "Não foi possível carregar os campeonatos.");
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, []);

  const filtrados = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    if (!q) return campeonatos;
    return campeonatos.filter((c) => {
      const campos = [
        c.nome,
        c.local,
        traduzirFormato(c.formato),
        traduzirCategoria(c.categoria),
        traduzirTipoParticipante(c.tipoParticipante),
        traduzirStatusCampeonato(c.statusCampeonato)
      ];
      return campos.some((campo) => String(campo || "").toLowerCase().includes(q));
    });
  }, [campeonatos, pesquisa]);

  return (
    <>
      <SiteHeader
        logoSrc={LOGO}
        logoAlt="Vôlei Club Jampa"
        brandName="Vôlei Club Jampa"
        links={[
          { label: "Início", href: "/" },
          { label: "Campeonatos", href: "/campeonatos" },
          { label: "Torneios ao vivo", href: "/torneio", variant: "cta" },
          { label: "Login", href: "/login" }
        ]}
      />

      <main className="torneio-page">
        <section className="torneio-hero">
          <div className="torneio-hero-inner">
            <span className="torneio-hero-kicker">
              <Trophy size={16} aria-hidden />
              Acompanhe ao vivo
            </span>
            <h1 className="torneio-hero-title">Torneios &amp; chaveamentos</h1>
            <p className="torneio-hero-text">
              Veja grupos, confrontos, placares e o pódio dos campeonatos do Vôlei Club Jampa — sem
              precisar fazer login.
            </p>
          </div>
        </section>

        <section className="torneio-container">
          <div className="torneio-toolbar">
            <label className="torneio-search" htmlFor="torneio-pesquisa">
              <Search size={18} aria-hidden className="torneio-search-icon" />
              <input
                id="torneio-pesquisa"
                type="search"
                placeholder="Buscar campeonato, local, formato…"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                autoComplete="off"
              />
            </label>
            {!carregando && !erro ? (
              <span className="torneio-toolbar-count">
                {filtrados.length} campeonato{filtrados.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          {carregando ? (
            <PageLoader label="Carregando campeonatos" variant="section" />
          ) : erro ? (
            <p className="torneio-msg torneio-msg--erro" role="alert">
              {erro}
            </p>
          ) : !filtrados.length ? (
            <div className="torneio-empty">
              <GitBranch size={40} aria-hidden />
              <p>Nenhum campeonato encontrado.</p>
            </div>
          ) : (
            <div className="torneio-grid">
              {filtrados.map((c) => (
                <Link key={c.id} href={`/torneio/${c.id}`} className="torneio-card">
                  <div className="torneio-card-top">
                    <span
                      className={`torneio-status ${classeStatusCampeonato(c.statusCampeonato)}`}
                    >
                      {traduzirStatusCampeonato(c.statusCampeonato)}
                    </span>
                    <ChevronRight size={20} aria-hidden className="torneio-card-arrow" />
                  </div>
                  <h2 className="torneio-card-title">{c.nome}</h2>
                  <div className="torneio-card-meta">
                    <span>
                      <Calendar size={14} aria-hidden />
                      {formatarData(c.data)}
                    </span>
                    {c.local ? (
                      <span>
                        <MapPin size={14} aria-hidden />
                        {c.local}
                      </span>
                    ) : null}
                  </div>
                  <div className="torneio-card-tags">
                    <span>{traduzirFormato(c.formato)}</span>
                    <span>{traduzirTipoParticipante(c.tipoParticipante)}</span>
                    <span>{traduzirCategoria(c.categoria)}</span>
                  </div>
                  <div className="torneio-card-stats">
                    <span>
                      <Users size={15} aria-hidden />
                      {c.totais?.participantes ?? 0} equipes
                    </span>
                    <span>
                      <GitBranch size={15} aria-hidden />
                      {c.totais?.jogos ?? 0} jogos
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter brandName="Vôlei Club Jampa" />
    </>
  );
}
