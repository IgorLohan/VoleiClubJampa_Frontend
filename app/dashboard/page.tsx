 "use client";

import { useEffect, useMemo, useState } from "react";
import {
  chavesSessao,
  getJSONStorage,
  getStorage,
} from "@/lib/sessao";
import type { PapelUsuario } from "@/components/DashboardToolbar";
import { buscarResumoCampeonato, listarCampeonatosAdmin } from "@/lib/api";
import { useRouter } from "next/navigation";

type SessaoUsuario = {
  nome?: string;
  email?: string;
  papel?: PapelUsuario;
} | null;

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
        <p className="dash-subtitle">
          {sessao.papel === "ADMIN"
            ? "Você está logado como administrador. Use o menu lateral para gerenciar campeonatos."
            : "Você está logado como participante. Use o menu lateral para acessar campeonatos e inscrições."}
        </p>
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
                  {msgCampeonatos
                    ? "Carregando..."
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
              {msgCampeonatos ? (
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

          {msgResumo ? (
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
          <article className="dash-card">
            <h2>Sua conta</h2>
            <ul className="dash-kv">
              <li>
                <strong>Papel</strong>
                <span>{sessao.papel}</span>
              </li>
              <li>
                <strong>Nome</strong>
                <span>{sessao.usuario?.nome || "—"}</span>
              </li>
              <li>
                <strong>E-mail</strong>
                <span>{sessao.usuario?.email || "—"}</span>
              </li>
            </ul>
          </article>
        </div>
      )}
    </>
  );
}

