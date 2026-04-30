"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Shield,
  Trophy,
  UserRound
} from "lucide-react";

export type PapelUsuario = "ADMIN" | "PARTICIPANTE";

export type DashboardToolbarProps = {
  papel: PapelUsuario;
  onSair: () => void;
  aberto?: boolean;
  onAbertoChange?: (aberto: boolean) => void;
  mostrarBotaoToggle?: boolean;
  modoOverlayMobile?: boolean;
};

export default function DashboardToolbar({
  papel,
  onSair,
  aberto: abertoControlado,
  onAbertoChange,
  mostrarBotaoToggle = true,
  modoOverlayMobile = false
}: DashboardToolbarProps) {
  const panelId = useId();
  const pathname = usePathname();
  const [abertoInterno, setAbertoInterno] = useState(true);
  const aberto = abertoControlado ?? abertoInterno;

  const rotas = useMemo(() => {
    return {
      dashboard: "/dashboard",
      campeonatos: "/dashboard/campeonatos",
      minhasInscricoes: "/dashboard/minhas-inscricoes",
      admin: "/dashboard/admin",
      inscricoesAdmin: "/dashboard/inscricoes"
    };
  }, []);

  useEffect(() => {
    // Começa recolhido em telas menores para não “roubar” espaço.
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia?.("(max-width: 760px)")?.matches;
    if (!isMobile) return;
    if (onAbertoChange) onAbertoChange(false);
    else setAbertoInterno(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setAberto(v: boolean) {
    if (onAbertoChange) onAbertoChange(v);
    else setAbertoInterno(v);
  }

  function toggle() {
    setAberto(!aberto);
  }

  function onNavegar() {
    if (modoOverlayMobile) setAberto(false);
  }

  return (
    <>
      {modoOverlayMobile && aberto ? (
        <button
          type="button"
          className="dash-sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setAberto(false)}
        />
      ) : null}

      <aside
        className={[
          "dash-sidebar",
          aberto ? "is-open" : "is-collapsed",
          modoOverlayMobile ? "is-overlay" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Menu lateral"
      >
        <div className="dash-sidebar-inner" id={panelId}>
          <Link href="/" className="dash-brand" aria-label="Voltar ao início" onClick={onNavegar}>
            <img src="/logo/volei_club_jampa.png" alt="Vôlei Club Jampa" />
          </Link>

          <nav className="dash-actions" aria-label="Menu do dashboard">
            <Link
              href={rotas.dashboard}
              className={`dash-link ${pathname === rotas.dashboard ? "is-active" : ""}`}
              onClick={onNavegar}
            >
              <span className="dash-link-icon" aria-hidden>
                <LayoutDashboard size={18} />
              </span>
              <span className="dash-link-text">Dashboard</span>
            </Link>

            {papel === "ADMIN" ? (
              <>
                <Link
                  href={rotas.admin}
                  className={`dash-link ${pathname.startsWith(rotas.admin) ? "is-active" : ""}`}
                  onClick={onNavegar}
                >
                  <span className="dash-link-icon" aria-hidden>
                    <Shield size={18} />
                  </span>
                  <span className="dash-link-text">Campeonatos</span>
                </Link>
                <Link
                  href={rotas.inscricoesAdmin}
                  className={`dash-link ${
                    pathname.startsWith(rotas.inscricoesAdmin) ? "is-active" : ""
                  }`}
                  onClick={onNavegar}
                >
                  <span className="dash-link-icon" aria-hidden>
                    <ClipboardList size={18} />
                  </span>
                  <span className="dash-link-text">Inscrições</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={rotas.campeonatos}
                  className={`dash-link ${
                    pathname.startsWith(rotas.campeonatos) ? "is-active" : ""
                  }`}
                  onClick={onNavegar}
                >
                  <span className="dash-link-icon" aria-hidden>
                    <Trophy size={18} />
                  </span>
                  <span className="dash-link-text">Campeonatos</span>
                </Link>
                <Link
                  href={rotas.minhasInscricoes}
                  className={`dash-link ${
                    pathname.startsWith(rotas.minhasInscricoes) ? "is-active" : ""
                  }`}
                  onClick={onNavegar}
                >
                  <span className="dash-link-icon" aria-hidden>
                    <UserRound size={18} />
                  </span>
                  <span className="dash-link-text">Minhas inscrições</span>
                </Link>
              </>
            )}

            <button type="button" className="dash-link dash-link--danger" onClick={onSair}>
              <span className="dash-link-icon" aria-hidden>
                <LogOut size={18} />
              </span>
              <span className="dash-link-text">Sair</span>
            </button>
          </nav>

          <div className="dash-sidebar-footer" aria-label="Atalhos rápidos">
            {/* espaço reservado */}
          </div>
        </div>

        {mostrarBotaoToggle ? (
          <button
            type="button"
            className="dash-sidebar-toggle"
            onClick={toggle}
            aria-expanded={aberto}
            aria-controls={panelId}
            aria-label={aberto ? "Recolher menu" : "Expandir menu"}
          >
            {aberto ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        ) : null}
      </aside>
    </>
  );
}

