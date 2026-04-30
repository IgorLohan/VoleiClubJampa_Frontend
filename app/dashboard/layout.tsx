"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import DashboardToolbar, { type PapelUsuario } from "@/components/DashboardToolbar";
import {
  chavesSessao,
  getJSONStorage,
  getStorage,
  logoutAdmin,
  logoutParticipante
} from "@/lib/sessao";

type SessaoUsuario = {
  nome?: string;
  email?: string;
  papel?: PapelUsuario;
} | null;

function normalizarSessao(): { papel: PapelUsuario | null; usuario: SessaoUsuario } {
  const tokenAdmin = getStorage(chavesSessao.tokenAdmin);
  const tokenParticipante = getStorage(chavesSessao.tokenParticipante);

  const admin = getJSONStorage<SessaoUsuario>(chavesSessao.adminLogado);
  const participante = getJSONStorage<SessaoUsuario>(chavesSessao.participanteLogado);

  if (tokenAdmin && admin) return { papel: "ADMIN", usuario: admin };
  if (tokenParticipante && participante) {
    const papel = (participante?.papel as PapelUsuario | undefined) || "PARTICIPANTE";
    return { papel, usuario: participante };
  }
  return { papel: null, usuario: null };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessao] = useState(() => normalizarSessao());
  const [sidebarAberta, setSidebarAberta] = useState(false);

  useEffect(() => {
    if (!sessao.papel) {
      router.replace("/login");
    }
  }, [router, sessao.papel]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty("--dash-topbar-h", "56px");
    return () => {
      document.documentElement.style.removeProperty("--dash-topbar-h");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia?.("(max-width: 760px)")?.matches;
    if (isMobile) setSidebarAberta(false);
  }, [pathname, sessao.papel]);

  const titulo = useMemo(() => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/dashboard/campeonatos")) return "Campeonatos";
    if (pathname.startsWith("/dashboard/inscricoes")) return "Inscrições";
    if (pathname.startsWith("/dashboard/minhas-inscricoes")) return "Minhas inscrições";
    if (pathname.startsWith("/dashboard/admin")) return "Campeonatos";
    return "Dashboard";
  }, [pathname, sessao.papel]);

  function sair() {
    if (sessao.papel === "ADMIN") logoutAdmin();
    else logoutParticipante();
    router.push("/login");
  }

  if (!sessao.papel) return null;

  return (
    <main className="dash-page">
      <DashboardToolbar
        papel={sessao.papel}
        onSair={sair}
        aberto={sidebarAberta}
        onAbertoChange={setSidebarAberta}
        mostrarBotaoToggle={false}
        modoOverlayMobile
      />

      <div className="dash-main">
        <header className="dash-topbar" role="banner">
          <button
            type="button"
            className="dash-topbar-icon"
            aria-label={sidebarAberta ? "Fechar menu" : "Abrir menu"}
            aria-expanded={sidebarAberta}
            onClick={() => setSidebarAberta((v) => !v)}
          >
            <Menu size={22} />
          </button>
          <div className="dash-topbar-title">{titulo}</div>
          <div className="dash-topbar-spacer" aria-hidden />
        </header>

        <section className="dash-content">
          <div className="dash-surface">{children}</div>
        </section>
      </div>
    </main>
  );
}

