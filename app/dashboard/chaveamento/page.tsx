"use client";

import { useEffect, useMemo, useState } from "react";
import CampeonatosPublicosPage from "@/app/campeonatos/page";
import PageLoader from "@/components/PageLoader";
import {
  buscarResumoCampeonato,
  encerrarInscricoes,
  gerarChaveamento,
  listarCampeonatosAdmin,
  registrarPlacar,
  reabrirInscricoes
} from "@/lib/api";
import { chavesSessao, getStorage } from "@/lib/sessao";
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  ListChecks,
  Loader2,
  Lock,
  RefreshCw,
  Unlock,
  UsersRound
} from "lucide-react";

type CampeonatoOpcao = {
  id: number;
  nome: string;
};

type EquipeChaveamento = {
  id: number;
  nomeEquipe?: string | null;
  responsavel?: string | null;
};

type JogadorEquipe = {
  id?: number;
  nome?: string | null;
  genero?: string | null;
};

type ParticipanteResumo = {
  id: number;
  nomeEquipe?: string | null;
  responsavel?: string | null;
  jogadores?: JogadorEquipe[] | null;
};

type JogoChaveamento = {
  id: number;
  fase?: string | null;
  grupo?: string | null;
  rodada?: number | null;
  ordem?: number | null;
  status?: string | null;
  equipeA?: EquipeChaveamento | null;
  equipeB?: EquipeChaveamento | null;
  vencedor?: EquipeChaveamento | null;
  sets?: Array<{ numeroSet?: number; pontosA?: number; pontosB?: number }> | null;
};

export default function DashboardChaveamentoRoutePage() {
  const tokenAdmin = getStorage(chavesSessao.tokenAdmin);

  if (!tokenAdmin) {
    return <CampeonatosPublicosPage />;
  }

  return <ChaveamentoAdminPage />;
}

function traduzirFormato(formato: string | null | undefined) {
  const mapa: Record<string, string> = {
    MATA_MATA: "Mata-mata",
    DUPLA_ELIMINACAO: "Upper/Lower",
    TODOS_CONTRA_TODOS: "Todos contra todos",
    GRUPOS_3X4_REPESCAGEM: "Grupos 3x4 (repescagem)"
  };
  return mapa[String(formato || "")] || formato || "—";
}

function traduzirModo(modo: string | null | undefined) {
  const mapa: Record<string, string> = {
    INDIVIDUAL: "Individual",
    POR_EQUIPE: "Por equipe"
  };
  return mapa[String(modo || "")] || modo || "—";
}

function traduzirFase(fase: string | null | undefined) {
  const mapa: Record<string, string> = {
    FINAL: "Final",
    TERCEIRO_LUGAR: "3º lugar",
    PRIMEIRA_FASE: "Primeira fase",
    SEMIFINAL_1: "Semifinal 1",
    SEMIFINAL_2: "Semifinal 2",
    FASE_GRUPOS: "Fase de grupos",
    REPESCAGEM: "Repescagem"
  };
  const valor = String(fase || "");
  return mapa[valor] || valor.replaceAll("_", " ") || "—";
}

function classeStatusJogo(status: string | null | undefined) {
  const valor = String(status || "").toUpperCase();
  if (valor === "FINALIZADO") return "minhas-inscricoes-badge--ok";
  if (valor === "PENDENTE") return "minhas-inscricoes-badge--warn";
  return "minhas-inscricoes-badge--neutral";
}

function obterNomeEquipe(equipe: EquipeChaveamento | null | undefined) {
  return equipe?.nomeEquipe || equipe?.responsavel || "A definir";
}

function listarJogadores(jogadores: JogadorEquipe[] | null | undefined) {
  const lista = Array.isArray(jogadores) ? jogadores : [];
  return lista
    .map((j) => {
      const nome = String(j?.nome || "").trim();
      if (!nome) return null;
      const genero = String(j?.genero || "").trim();
      return genero ? `${nome} (${genero})` : nome;
    })
    .filter(Boolean) as string[];
}

function obterNumeroDaFase(fase: string | null | undefined, ordem?: number | null) {
  const match = String(fase || "").match(/_(\d+)$/);
  if (match) return match[1];
  return ordem ? String(ordem) : "1";
}

function compararPorOrdem(a: JogoChaveamento, b: JogoChaveamento) {
  return Number(a.ordem || a.id || 0) - Number(b.ordem || b.id || 0);
}

function obterBaseFaseFrontend(fase: string | null | undefined) {
  const valor = String(fase || "");
  if (valor === "FASE_GRUPOS") return "FASE_GRUPOS";
  if (valor.startsWith("PRIMEIRA_FASE")) return "PRIMEIRA_FASE";
  if (valor.startsWith("OITAVAS")) return "OITAVAS";
  if (valor.startsWith("QUARTAS")) return "QUARTAS";
  if (valor === "REPESCAGEM" || valor.startsWith("REPESCAGEM")) return "REPESCAGEM";
  if (valor.startsWith("SEMIFINAL")) return "SEMIFINAL";
  if (valor === "FINAL") return "FINAL";
  if (valor === "TERCEIRO_LUGAR") return "TERCEIRO_LUGAR";
  return valor;
}

function montarGruposDoChaveamento(jogos: JogoChaveamento[]) {
  const grupos = new Map<string, EquipeChaveamento[]>();

  jogos
    .filter((jogo) => jogo.fase === "FASE_GRUPOS" && jogo.grupo)
    .forEach((jogo) => {
      const grupo = String(jogo.grupo);
      const equipes = grupos.get(grupo) || [];
      [jogo.equipeA, jogo.equipeB].forEach((equipe) => {
        if (equipe && !equipes.some((item) => item.id === equipe.id)) {
          equipes.push(equipe);
        }
      });
      grupos.set(grupo, equipes);
    });

  return Array.from(grupos.entries())
    .sort(([grupoA], [grupoB]) => grupoA.localeCompare(grupoB, "pt-BR"))
    .map(([grupo, equipes]) => ({
      grupo,
      equipes
    }));
}

function obterJogosDaBase(jogos: JogoChaveamento[], baseFase: string) {
  return jogos
    .filter((jogo) => obterBaseFaseFrontend(jogo.fase) === baseFase)
    .sort(compararPorOrdem);
}

function GrupoChaveamentoCard({
  grupo,
  equipes,
  participantesPorId
}: {
  grupo: string;
  equipes: EquipeChaveamento[];
  participantesPorId: Map<number, ParticipanteResumo>;
}) {
  return (
    <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:min-w-[220px]">
      <div className="-mx-2 -mt-2 mb-2 rounded-t-2xl bg-slate-50 px-3 py-1 text-center text-sm font-black uppercase tracking-wide text-slate-800">
        Grupo {grupo}
      </div>
      <div className="grid gap-1.5">
        {equipes.map((equipe, index) => (
          (() => {
            const participante = participantesPorId.get(equipe.id);
            const jogadoresLista = listarJogadores(participante?.jogadores);
            const jogadoresTitulo = jogadoresLista.join("\n");
            return (
          <div key={equipe.id} className="grid grid-cols-[36px_1fr] overflow-hidden rounded-xl border border-slate-200 bg-white">
            <span className="bg-slate-100 px-2 py-1 text-center text-xs font-black text-slate-700">
              {grupo}
              {index + 1}
            </span>
            <span className="min-w-0 px-3 py-1">
              <div className="truncate text-xs font-extrabold uppercase text-slate-900">
                {obterNomeEquipe(equipe)}
              </div>
              {jogadoresLista.length ? (
                <>
                  <details className="mt-1 sm:hidden">
                    <summary className="cursor-pointer select-none text-[10px] font-bold leading-tight text-slate-600">
                      Jogadores ({jogadoresLista.length})
                    </summary>
                    <div className="mt-1 grid gap-0.5 text-[10px] font-bold leading-tight text-slate-600">
                      {jogadoresLista.map((nome, i) => (
                        <div
                          key={`${equipe.id}-j-m-${i}`}
                          className="break-words"
                          title={jogadoresTitulo}
                        >
                          {nome}
                        </div>
                      ))}
                    </div>
                  </details>
                  <div className="mt-1 hidden gap-0.5 text-[10px] font-bold leading-tight text-slate-600 sm:grid">
                    {jogadoresLista.map((nome, i) => (
                      <div key={`${equipe.id}-j-${i}`} className="truncate" title={jogadoresTitulo}>
                        {nome}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </span>
          </div>
            );
          })()
        ))}
      </div>
    </div>
  );
}

function JogoChaveamentoCard({
  jogo,
  titulo,
  participantesPorId,
  variante = "padrao"
}: {
  jogo: JogoChaveamento;
  titulo: string;
  participantesPorId: Map<number, ParticipanteResumo>;
  variante?: "padrao" | "bracketNeutro";
}) {
  const vencedorId = jogo.vencedor?.id;
  const isBracket = variante === "bracketNeutro";

  return (
    <div
      className={`relative w-full min-w-0 rounded-2xl border p-2 shadow-sm sm:min-w-[190px] ${
        isBracket ? "border-slate-200 bg-white" : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`-mx-2 -mt-2 mb-2 rounded-t-2xl px-3 py-1 text-center text-xs font-black uppercase ${
          "bg-slate-50 text-slate-800"
        }`}
      >
        {titulo}
      </div>
      <div
        className={`mb-2 text-center text-[10px] font-black uppercase tracking-wider ${
          "text-slate-500"
        }`}
      >
        Jogo {obterNumeroDaFase(jogo.fase, jogo.ordem)}
      </div>
      <div className="grid gap-1.5">
        {[jogo.equipeA, jogo.equipeB].map((equipe, index) => {
          const venceu = Boolean(vencedorId && equipe?.id === vencedorId);
          const participante = equipe?.id ? participantesPorId.get(equipe.id) : undefined;
          const jogadoresLista = listarJogadores(participante?.jogadores);
          const jogadoresTitulo = jogadoresLista.join("\n");
          return (
            <div
              key={`${jogo.id}-${index}`}
              className={`grid grid-cols-[22px_1fr] items-center gap-2 rounded-xl border px-2 py-1.5 text-xs font-extrabold uppercase ${
                "border-slate-200 bg-white"
              } ${venceu ? "text-emerald-700" : "text-slate-900"}`}
            >
              <span
                className={`h-4 w-4 rounded border ${
                  venceu
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-slate-300"
                }`}
              />
              <span className="min-w-0">
                <div className="truncate">{obterNomeEquipe(equipe)}</div>
                {jogadoresLista.length ? (
                  <>
                    <details className="mt-1 sm:hidden">
                      <summary
                        className={`cursor-pointer select-none text-[10px] font-bold leading-tight normal-case ${
                          venceu
                            ? "text-emerald-700/90"
                            : "text-slate-600"
                        }`}
                      >
                        Jogadores ({jogadoresLista.length})
                      </summary>
                      <div
                        className={`mt-1 grid gap-0.5 text-[10px] font-bold leading-tight normal-case ${
                          venceu
                            ? "text-emerald-700/90"
                            : "text-slate-600"
                        }`}
                      >
                        {jogadoresLista.map((nome, i) => (
                          <div
                            key={`${jogo.id}-${index}-j-m-${i}`}
                            className="break-words"
                            title={jogadoresTitulo}
                          >
                            {nome}
                          </div>
                        ))}
                      </div>
                    </details>
                    <div
                      className={`mt-1 hidden gap-0.5 text-[10px] font-bold leading-tight normal-case sm:grid ${
                        venceu
                          ? "text-emerald-700/90"
                          : "text-slate-600"
                      }`}
                    >
                      {jogadoresLista.map((nome, i) => (
                        <div
                          key={`${jogo.id}-${index}-j-${i}`}
                          className="truncate"
                          title={jogadoresTitulo}
                        >
                          {nome}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <div
        className={`mt-2 text-center text-[10px] font-black uppercase ${
          "text-slate-500"
        }`}
      >
        vs
      </div>
    </div>
  );
}

function BracketConector({
  className = ""
}: {
  className?: string;
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="absolute left-0 top-1/4 h-[1px] w-full bg-slate-300/70" />
      <div className="absolute left-0 top-3/4 h-[1px] w-full bg-slate-300/70" />
      <div className="absolute left-1/2 top-1/4 h-1/2 w-[1px] -translate-x-1/2 bg-slate-300/70" />
      <div className="absolute left-1/2 top-1/2 h-[1px] w-full -translate-y-1/2 bg-slate-300/70" />
    </div>
  );
}

function BracketPair({
  tituloEsquerda,
  jogoA,
  jogoB,
  tituloDireita,
  jogoDireita,
  participantesPorId
}: {
  tituloEsquerda: string;
  jogoA: JogoChaveamento | null;
  jogoB: JogoChaveamento | null;
  tituloDireita: string;
  jogoDireita: JogoChaveamento | null;
  participantesPorId: Map<number, ParticipanteResumo>;
}) {
  if (!jogoA && !jogoB && !jogoDireita) return null;

  return (
    <div className="grid min-w-[420px] grid-cols-[1fr_44px_1fr] items-stretch gap-2 lg:min-w-[640px]">
      <div className="grid content-center gap-4">
        {jogoA ? (
          <JogoChaveamentoCard
            jogo={jogoA}
            titulo={tituloEsquerda}
            participantesPorId={participantesPorId}
            variante="bracketNeutro"
          />
        ) : (
          <div />
        )}
        {jogoB ? (
          <JogoChaveamentoCard
            jogo={jogoB}
            titulo={tituloEsquerda}
            participantesPorId={participantesPorId}
            variante="bracketNeutro"
          />
        ) : (
          <div />
        )}
      </div>

      <div className="relative">
        <BracketConector />
      </div>

      <div className="grid content-center">
        {jogoDireita ? (
          <JogoChaveamentoCard
            jogo={jogoDireita}
            titulo={tituloDireita}
            participantesPorId={participantesPorId}
            variante="bracketNeutro"
          />
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

function MataMataBracketNeutro({
  quartas,
  semifinais,
  final,
  terceiroLugar,
  participantesPorId
}: {
  quartas: JogoChaveamento[];
  semifinais: JogoChaveamento[];
  final: JogoChaveamento[];
  terceiroLugar: JogoChaveamento[];
  participantesPorId: Map<number, ParticipanteResumo>;
}) {
  if (!quartas.length && !semifinais.length && !final.length && !terceiroLugar.length) return null;

  const q1 = quartas[0] || null;
  const q2 = quartas[1] || null;
  const q3 = quartas[2] || null;
  const q4 = quartas[3] || null;
  const s1 = semifinais[0] || null;
  const s2 = semifinais[1] || null;
  const f1 = final[0] || null;
  const t1 = terceiroLugar[0] || null;

  return (
    <div className="mt-5 max-w-full overflow-x-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-1 text-center">
        <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
          Fase final
        </div>
        <div className="text-2xl font-black uppercase italic tracking-wide text-slate-900 sm:text-3xl">
          Quartas • Semi • Final
        </div>
      </div>

      <div className="grid gap-6">
        {/* Mobile: lista/accordion por fase (sem linhas) */}
        <div className="grid gap-3 sm:hidden">
          <details className="rounded-2xl border border-slate-200 bg-white p-3" open>
            <summary className="cursor-pointer text-sm font-black text-slate-900">
              Quartas de final ({quartas.length})
            </summary>
            <div className="mt-3 grid gap-3">
              {quartas.map((j) => (
                <JogoChaveamentoCard
                  key={j.id}
                  jogo={j}
                  titulo="Quartas"
                  participantesPorId={participantesPorId}
                  variante="bracketNeutro"
                />
              ))}
            </div>
          </details>

          <details className="rounded-2xl border border-slate-200 bg-white p-3" open>
            <summary className="cursor-pointer text-sm font-black text-slate-900">
              Semifinais ({semifinais.length})
            </summary>
            <div className="mt-3 grid gap-3">
              {semifinais.map((j) => (
                <JogoChaveamentoCard
                  key={j.id}
                  jogo={j}
                  titulo="Semi"
                  participantesPorId={participantesPorId}
                  variante="bracketNeutro"
                />
              ))}
            </div>
          </details>

          <details className="rounded-2xl border border-slate-200 bg-white p-3" open>
            <summary className="cursor-pointer text-sm font-black text-slate-900">
              Final ({final.length})
            </summary>
            <div className="mt-3 grid gap-3">
              {final.map((j) => (
                <JogoChaveamentoCard
                  key={j.id}
                  jogo={j}
                  titulo="Final"
                  participantesPorId={participantesPorId}
                  variante="bracketNeutro"
                />
              ))}
              {terceiroLugar.map((j) => (
                <JogoChaveamentoCard
                  key={j.id}
                  jogo={j}
                  titulo="3º"
                  participantesPorId={participantesPorId}
                  variante="bracketNeutro"
                />
              ))}
            </div>
          </details>
        </div>

        {/* Tablet/Desktop: bracket com ligações */}
        <div className="hidden overflow-x-auto pb-2 sm:block">
          <div className="flex min-w-max flex-col items-center gap-6">
            <div className="flex min-w-max items-center justify-center gap-10">
              <BracketPair
                tituloEsquerda="Quartas"
                jogoA={q1}
                jogoB={q2}
                tituloDireita="Semi"
                jogoDireita={s1}
                participantesPorId={participantesPorId}
              />
              <BracketPair
                tituloEsquerda="Quartas"
                jogoA={q3}
                jogoB={q4}
                tituloDireita="Semi"
                jogoDireita={s2}
                participantesPorId={participantesPorId}
              />
            </div>

            <div className="flex min-w-max items-center justify-center gap-10">
              <BracketPair
                tituloEsquerda="Semi"
                jogoA={s1}
                jogoB={s2}
                tituloDireita="Final"
                jogoDireita={f1}
                participantesPorId={participantesPorId}
              />
              {t1 ? (
                <div className="ml-6 min-w-[220px]">
                  <div className="mb-2 text-center text-xs font-black uppercase tracking-widest text-slate-600">
                    3º lugar
                  </div>
                  <JogoChaveamentoCard
                    jogo={t1}
                    titulo="3º"
                    participantesPorId={participantesPorId}
                    variante="bracketNeutro"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColunaFaseChaveamento({
  titulo,
  jogos,
  participantesPorId
}: {
  titulo: string;
  jogos: JogoChaveamento[];
  participantesPorId: Map<number, ParticipanteResumo>;
}) {
  if (!jogos.length) return null;

  return (
    <div className="flex min-w-[170px] flex-col items-center gap-4 sm:min-w-[220px]">
      <div className="text-center text-xs font-black uppercase tracking-widest text-slate-600">
        {titulo}
      </div>
      <div className="grid gap-4">
        {jogos.map((jogo) => (
          <JogoChaveamentoCard
            key={jogo.id}
            jogo={jogo}
            titulo={titulo}
            participantesPorId={participantesPorId}
          />
        ))}
      </div>
    </div>
  );
}

function ChaveamentoModeloVisual({
  jogos,
  participantes
}: {
  jogos: JogoChaveamento[];
  participantes: ParticipanteResumo[];
}) {
  const participantesPorId = useMemo(() => {
    const map = new Map<number, ParticipanteResumo>();
    (participantes || []).forEach((p) => {
      const id = Number(p?.id);
      if (Number.isFinite(id)) map.set(id, p);
    });
    return map;
  }, [participantes]);

  const grupos = montarGruposDoChaveamento(jogos);
  const primeiraFase = obterJogosDaBase(jogos, "PRIMEIRA_FASE");
  const repescagem = obterJogosDaBase(jogos, "REPESCAGEM");
  const oitavas = obterJogosDaBase(jogos, "OITAVAS");
  const quartas = obterJogosDaBase(jogos, "QUARTAS");
  const semifinais = obterJogosDaBase(jogos, "SEMIFINAL");
  const final = obterJogosDaBase(jogos, "FINAL");
  const terceiroLugar = obterJogosDaBase(jogos, "TERCEIRO_LUGAR");
  const temMataMata =
    primeiraFase.length ||
    repescagem.length ||
    oitavas.length ||
    quartas.length ||
    semifinais.length ||
    final.length ||
    terceiroLugar.length;

  return (
    <div className="chaveamento-visual-wrap mt-4 max-w-full overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="p-3 sm:p-6">
        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            Classificam-se os melhores colocados
          </div>
          <h3 className="mt-1 text-2xl font-black uppercase italic text-slate-900 sm:text-3xl">
            Chaveamento
          </h3>
        </div>

        {grupos.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {grupos.map((grupo) => (
              <GrupoChaveamentoCard
                key={grupo.grupo}
                grupo={grupo.grupo}
                equipes={grupo.equipes}
                participantesPorId={participantesPorId}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-7">
          {temMataMata ? (
            <div className="w-full max-w-full overflow-x-auto pb-3">
              <div className="w-full max-w-full px-1 sm:w-max sm:min-w-max">
                {(quartas.length || semifinais.length || final.length || terceiroLugar.length) ? (
                  <MataMataBracketNeutro
                    quartas={quartas}
                    semifinais={semifinais}
                    final={final}
                    terceiroLugar={terceiroLugar}
                    participantesPorId={participantesPorId}
                  />
                ) : null}

                {(primeiraFase.length || repescagem.length || oitavas.length) ? (
                  <>
                    <div className="mt-5 grid gap-3 sm:hidden">
                      {primeiraFase.length ? (
                        <details className="rounded-2xl border border-slate-200 bg-white p-3" open>
                          <summary className="cursor-pointer text-sm font-black text-slate-900">
                            Primeira fase ({primeiraFase.length})
                          </summary>
                          <div className="mt-3 grid gap-3">
                            {primeiraFase.map((j) => (
                              <JogoChaveamentoCard
                                key={j.id}
                                jogo={j}
                                titulo="Primeira fase"
                                participantesPorId={participantesPorId}
                              />
                            ))}
                          </div>
                        </details>
                      ) : null}
                      {repescagem.length ? (
                        <details className="rounded-2xl border border-slate-200 bg-white p-3" open>
                          <summary className="cursor-pointer text-sm font-black text-slate-900">
                            Repescagem ({repescagem.length})
                          </summary>
                          <div className="mt-3 grid gap-3">
                            {repescagem.map((j) => (
                              <JogoChaveamentoCard
                                key={j.id}
                                jogo={j}
                                titulo="Repescagem"
                                participantesPorId={participantesPorId}
                              />
                            ))}
                          </div>
                        </details>
                      ) : null}
                      {oitavas.length ? (
                        <details className="rounded-2xl border border-slate-200 bg-white p-3" open>
                          <summary className="cursor-pointer text-sm font-black text-slate-900">
                            Oitavas ({oitavas.length})
                          </summary>
                          <div className="mt-3 grid gap-3">
                            {oitavas.map((j) => (
                              <JogoChaveamentoCard
                                key={j.id}
                                jogo={j}
                                titulo="Oitavas"
                                participantesPorId={participantesPorId}
                              />
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </div>
                    <div className="mt-5 hidden min-w-max items-start justify-center gap-4 sm:flex sm:gap-5">
                      <ColunaFaseChaveamento
                        titulo="Primeira fase"
                        jogos={primeiraFase}
                        participantesPorId={participantesPorId}
                      />
                      <ColunaFaseChaveamento
                        titulo="Repescagem"
                        jogos={repescagem}
                        participantesPorId={participantesPorId}
                      />
                      <ColunaFaseChaveamento
                        titulo="Oitavas"
                        jogos={oitavas}
                        participantesPorId={participantesPorId}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#ff4d12]/50 bg-black/40 p-6 text-center text-sm font-bold text-white/80">
              Finalize os jogos da fase de grupos para o backend liberar a próxima fase.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChaveamentoAdminPage() {
  const [mensagem, setMensagem] = useState("");
  const [campeonatos, setCampeonatos] = useState<CampeonatoOpcao[]>([]);
  const [campeonatoId, setCampeonatoId] = useState("");
  const [resumo, setResumo] = useState<any | null>(null);
  const [acao, setAcao] = useState<"encerrar" | "reabrir" | "gerar" | null>(null);
  const [salvandoPlacarJogoId, setSalvandoPlacarJogoId] = useState<number | null>(null);
  const [placaresDraft, setPlacaresDraft] = useState<
    Record<
      number,
      { set1a: string; set1b: string; set2a: string; set2b: string; set3a: string; set3b: string }
    >
  >({});

  async function carregarResumo(id = campeonatoId, limparMensagem = true) {
    if (!id) return;
    try {
      if (limparMensagem) setMensagem("Carregando chaveamento...");
      const dados = await buscarResumoCampeonato(id);
      setResumo(dados);
      if (limparMensagem) setMensagem("");
    } catch (err) {
      const error = err as Error;
      setResumo(null);
      setMensagem(`Erro ao carregar chaveamento: ${error.message}`);
    }
  }

  useEffect(() => {
    async function carregarCampeonatos() {
      try {
        setMensagem("Carregando campeonatos...");
        const lista = (await listarCampeonatosAdmin()) as any[];
        const opcoes = (lista || [])
          .map((c) => ({ id: Number(c.id), nome: String(c.nome || "") }))
          .filter((c) => Number.isFinite(c.id) && c.nome.trim().length > 0)
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        setCampeonatos(opcoes);
        const primeiro = opcoes[0]?.id ? String(opcoes[0].id) : "";
        setCampeonatoId(primeiro);
        setMensagem("");
      } catch (err) {
        const error = err as Error;
        setMensagem(`Erro ao carregar campeonatos: ${error.message}`);
      }
    }
    carregarCampeonatos();
  }, []);

  useEffect(() => {
    carregarResumo(campeonatoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campeonatoId]);

  const campeonato = resumo?.campeonato;
  const jogos = resumo?.jogos || [];
  const participantes = resumo?.participantes || [];
  const inscricoesAbertas = Boolean(campeonato?.inscricoesAbertas);
  const chaveamentoGerado = jogos.length > 0;
  const podeEncerrar = Boolean(campeonato) && inscricoesAbertas;
  const podeReabrir = Boolean(campeonato) && !inscricoesAbertas && !chaveamentoGerado;
  const podeGerar = Boolean(campeonato) && !inscricoesAbertas && !chaveamentoGerado;

  const avisoGeracao = useMemo(() => {
    if (!campeonato) return "";
    if (chaveamentoGerado) return "O chaveamento deste campeonato já foi gerado.";
    if (inscricoesAbertas) return "Feche as inscrições antes de gerar o chaveamento.";
    if (participantes.length < 2) {
      return "O backend exige pelo menos 2 participantes/equipes aprovados para gerar o chaveamento.";
    }
    if (String(campeonato.formato) === "DUPLA_ELIMINACAO" || String(campeonato.formato) === "TODOS_CONTRA_TODOS") {
      return "Este formato ainda está marcado como em breve no backend.";
    }
    return "";
  }, [campeonato, chaveamentoGerado, inscricoesAbertas, participantes.length]);

  useEffect(() => {
    const lista = Array.isArray(jogos) ? (jogos as JogoChaveamento[]) : [];
    if (!lista.length) return;
    setPlacaresDraft((prev) => {
      const next = { ...prev };
      lista.forEach((jogo) => {
        if (!jogo?.id || next[jogo.id]) return;
        const sets = Array.isArray(jogo.sets) ? jogo.sets : [];
        const set = (n: number) => sets.find((s) => Number(s?.numeroSet) === n);
        const s1 = set(1);
        const s2 = set(2);
        const s3 = set(3);
        next[jogo.id] = {
          set1a: s1?.pontosA != null ? String(s1.pontosA) : "",
          set1b: s1?.pontosB != null ? String(s1.pontosB) : "",
          set2a: s2?.pontosA != null ? String(s2.pontosA) : "",
          set2b: s2?.pontosB != null ? String(s2.pontosB) : "",
          set3a: s3?.pontosA != null ? String(s3.pontosA) : "",
          set3b: s3?.pontosB != null ? String(s3.pontosB) : ""
        };
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jogos?.length]);

  function extrairSetsDoDraft(draft: {
    set1a: string;
    set1b: string;
    set2a: string;
    set2b: string;
    set3a: string;
    set3b: string;
  }, fase: string | null | undefined) {
    const validarSet = (a: string, b: string, numeroSet: number) => {
      if (a === "" || b === "") {
        throw new Error(`Preencha os pontos do Set ${numeroSet}.`);
      }
      const pontosA = Number(a);
      const pontosB = Number(b);
      if (Number.isNaN(pontosA) || Number.isNaN(pontosB)) {
        throw new Error(`Os pontos do Set ${numeroSet} precisam ser números válidos.`);
      }
      if (pontosA < 0 || pontosB < 0) {
        throw new Error(`Os pontos do Set ${numeroSet} não podem ser negativos.`);
      }
      if (pontosA === pontosB) {
        throw new Error(`O Set ${numeroSet} não pode terminar empatado.`);
      }
      return { numeroSet, pontosA, pontosB };
    };

    const set1 = validarSet(draft.set1a, draft.set1b, 1);

    // Alinhado com o comportamento já usado com o backend no frontend antigo:
    // fora da FINAL, registra somente um set.
    if (String(fase || "") !== "FINAL") {
      return [set1];
    }

    const set2 = validarSet(draft.set2a, draft.set2b, 2);

    let vitoriasA = 0;
    let vitoriasB = 0;

    if (set1.pontosA > set1.pontosB) vitoriasA += 1;
    else vitoriasB += 1;

    if (set2.pontosA > set2.pontosB) vitoriasA += 1;
    else vitoriasB += 1;

    if (vitoriasA === 2 || vitoriasB === 2) {
      return [set1, set2];
    }

    const set3 = validarSet(draft.set3a, draft.set3b, 3);
    return [set1, set2, set3];
  }

  async function salvarPlacarJogo(jogoId: number, fase: string | null | undefined) {
    if (!jogoId) return;
    const draft = placaresDraft[jogoId];
    if (!draft) return;
    try {
      setSalvandoPlacarJogoId(jogoId);
      setMensagem("");
      const sets = extrairSetsDoDraft(draft, fase);
      await registrarPlacar(jogoId, sets);
      await carregarResumo(campeonatoId, false);
      setMensagem("Placar salvo com sucesso.");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao salvar placar: ${error.message}`);
    } finally {
      setSalvandoPlacarJogoId(null);
    }
  }

  async function executarAcao(tipo: "encerrar" | "reabrir" | "gerar") {
    if (!campeonatoId) return;
    setAcao(tipo);
    setMensagem("");
    try {
      if (tipo === "encerrar") {
        await encerrarInscricoes(campeonatoId);
        setMensagem("Inscrições encerradas com sucesso.");
      }
      if (tipo === "reabrir") {
        await reabrirInscricoes(campeonatoId);
        setMensagem("Inscrições reabertas com sucesso.");
      }
      if (tipo === "gerar") {
        await gerarChaveamento(campeonatoId);
        setMensagem("Chaveamento gerado com sucesso.");
      }
      await carregarResumo(campeonatoId, false);
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro: ${error.message}`);
    } finally {
      setAcao(null);
    }
  }

  return (
    <div className="chaveamento-admin-page grid w-full min-w-0 max-w-full gap-3 sm:gap-4">
      <section className="overflow-hidden rounded-[28px] border border-[#203667]/10 bg-gradient-to-br from-[#203667] via-[#28457d] to-[#f39200] p-[1px] shadow-[0_24px_70px_rgba(32,54,103,0.18)]">
        <div className="rounded-[27px] bg-white/95 p-3 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#203667]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#203667]">
                <GitBranch size={14} aria-hidden />
                Chaveamento
              </div>
              <h1 className="mt-3 text-2xl font-black leading-tight text-[#203667] sm:text-3xl">
                Organize a fase de jogos
              </h1>
              <p className="mt-2 max-w-2xl break-words text-sm font-bold text-slate-600 sm:text-base">
                Selecione um campeonato, encerre inscrições quando estiver pronto e gere os
                confrontos seguindo as validações do backend.
              </p>
            </div>

            <div className="w-full lg:max-w-md">
              <label
                className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600"
                htmlFor="admin-chaveamento-campeonato"
              >
                Campeonato
              </label>
              <select
                id="admin-chaveamento-campeonato"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-900 shadow-sm outline-none transition focus:border-[#203667]/30 focus:ring-4 focus:ring-[#203667]/10"
                value={campeonatoId}
                onChange={(e) => setCampeonatoId(e.target.value)}
                disabled={!campeonatos.length || acao !== null}
              >
                {!campeonatos.length ? <option value="">Nenhum campeonato</option> : null}
                {campeonatos.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="card min-w-0">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="m-0 break-words text-xl font-black text-[#203667]">Painel do chaveamento</h2>
            <p className="info-auxiliar break-words" style={{ marginTop: 6 }}>
              Status do campeonato, regras de geração e ações disponíveis.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
            onClick={() => carregarResumo(campeonatoId)}
            disabled={!campeonatoId || acao !== null}
            aria-label="Atualizar chaveamento"
            title="Atualizar"
          >
            <RefreshCw
              aria-hidden
              className={`h-4 w-4 ${mensagem.includes("Carregando") ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
        </div>

        {mensagem === "Carregando chaveamento..." || mensagem === "Carregando campeonatos..." ? (
          <PageLoader
            label={mensagem === "Carregando campeonatos..." ? "Carregando campeonatos" : "Carregando chaveamento"}
            variant="section"
          />
        ) : mensagem ? (
          <p className="mt-4 rounded-2xl border border-[#f39200]/20 bg-[#f39200]/10 p-4 text-sm font-extrabold text-[#203667]">
            {mensagem}
          </p>
        ) : null}

        {resumo ? (
          <>
            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 shadow-sm sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-slate-600 sm:text-sm">Formato</div>
                  <ListChecks className="h-5 w-5 text-[#f39200]" aria-hidden />
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {traduzirFormato(campeonato?.formato)}
                </div>
              </div>
              <div className="min-w-0 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 shadow-sm sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-slate-600 sm:text-sm">Inscrição</div>
                  {inscricoesAbertas ? (
                    <Unlock className="h-5 w-5 text-emerald-600" aria-hidden />
                  ) : (
                    <Lock className="h-5 w-5 text-slate-500" aria-hidden />
                  )}
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {traduzirModo(campeonato?.modoInscricao)}
                </div>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                    inscricoesAbertas
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {inscricoesAbertas ? "Abertas" : "Encerradas"}
                </span>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-extrabold text-slate-600">Participantes/equipes</div>
                  <UsersRound className="h-5 w-5 text-[#203667]" aria-hidden />
                </div>
                <div className="mt-1 text-3xl font-black text-slate-900">{participantes.length}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-extrabold text-slate-600">Jogos gerados</div>
                  {chaveamentoGerado ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
                  ) : (
                    <GitBranch className="h-5 w-5 text-[#203667]" aria-hidden />
                  )}
                </div>
                <div className="mt-1 text-3xl font-black text-slate-900">{jogos.length}</div>
              </div>
            </div>

            <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-3">
              <button
                type="button"
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:px-4 sm:text-sm"
                onClick={() => executarAcao("encerrar")}
                disabled={!podeEncerrar || acao !== null}
                title={podeEncerrar ? "Encerrar inscrições" : "As inscrições já estão encerradas."}
              >
                {acao === "encerrar" ? (
                  <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
                ) : (
                  <Lock aria-hidden className="h-5 w-5" />
                )}
                Encerrar inscrições
              </button>
              <button
                type="button"
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:px-4 sm:text-sm"
                onClick={() => executarAcao("reabrir")}
                disabled={!podeReabrir || acao !== null}
                title={podeReabrir ? "Reabrir inscrições" : "Só é possível reabrir antes de gerar jogos."}
              >
                {acao === "reabrir" ? (
                  <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
                ) : (
                  <Unlock aria-hidden className="h-5 w-5" />
                )}
                Reabrir inscrições
              </button>
              <button
                type="button"
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f39200] to-[#e44631] px-3 text-xs font-black text-white shadow-[0_16px_38px_rgba(243,146,0,0.28)] transition hover:brightness-105 disabled:opacity-50 sm:px-4 sm:text-sm"
                onClick={() => executarAcao("gerar")}
                disabled={!podeGerar || acao !== null}
                title={podeGerar ? "Gerar chaveamento" : avisoGeracao || "Não é possível gerar agora."}
              >
                {acao === "gerar" ? (
                  <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
                ) : (
                  <GitBranch aria-hidden className="h-5 w-5" />
                )}
                Gerar chaveamento
              </button>
            </div>

            {avisoGeracao ? (
              <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{avisoGeracao}</span>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {resumo ? (
        <section className="card min-w-0">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="m-0 break-words text-xl font-black text-[#203667]">Chaveamento visual</h2>
              <p className="info-auxiliar break-words" style={{ marginTop: 6 }}>
                Exibição no modelo de grupos e mata-mata.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#203667]/10 px-3 py-1 text-xs font-black text-[#203667]">
              {jogos.length} jogo(s)
            </span>
          </div>
          {!jogos.length ? (
            <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <GitBranch className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
              <p className="mt-3 text-sm font-extrabold text-slate-600">
                Nenhum jogo gerado ainda.
              </p>
            </div>
          ) : (
            <>
              <ChaveamentoModeloVisual
                jogos={jogos as JogoChaveamento[]}
                participantes={(participantes || []) as ParticipanteResumo[]}
              />

              <details className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
                <summary className="cursor-pointer text-sm font-black text-[#203667]">
                  Ver lista administrativa dos jogos
                </summary>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
                  <table className="min-w-full text-sm" aria-label="Jogos do chaveamento">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs font-extrabold uppercase tracking-wide text-slate-700">
                        <th className="px-4 py-3">Fase</th>
                        <th className="px-4 py-3">Grupo</th>
                        <th className="px-4 py-3">Equipe A</th>
                        <th className="px-4 py-3">Equipe B</th>
                        <th className="px-4 py-3">Placar</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Vencedor</th>
                        <th className="px-4 py-3">Salvar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(jogos as JogoChaveamento[]).map((jogo) => (
                        <tr key={jogo.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {traduzirFase(jogo.fase)}
                          </td>
                          <td className="px-4 py-3 text-slate-800">{jogo.grupo || "—"}</td>
                          <td className="px-4 py-3 text-slate-800">
                            {obterNomeEquipe(jogo.equipeA)}
                          </td>
                          <td className="px-4 py-3 text-slate-800">
                            {obterNomeEquipe(jogo.equipeB)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="grid gap-2">
                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                <input
                                  inputMode="numeric"
                                  className="h-9 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-slate-900 outline-none focus:ring-4 focus:ring-slate-100"
                                  value={placaresDraft[jogo.id]?.set1a ?? ""}
                                  onChange={(e) =>
                                    setPlacaresDraft((prev) => ({
                                      ...prev,
                                      [jogo.id]: {
                                        ...(prev[jogo.id] || {
                                          set1a: "",
                                          set1b: "",
                                          set2a: "",
                                          set2b: "",
                                          set3a: "",
                                          set3b: ""
                                        }),
                                        set1a: e.target.value.replace(/[^\d]/g, "").slice(0, 2)
                                      }
                                    }))
                                  }
                                  aria-label="Set 1 pontos equipe A"
                                />
                                <span className="text-xs font-black text-slate-500">x</span>
                                <input
                                  inputMode="numeric"
                                  className="h-9 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-slate-900 outline-none focus:ring-4 focus:ring-slate-100"
                                  value={placaresDraft[jogo.id]?.set1b ?? ""}
                                  onChange={(e) =>
                                    setPlacaresDraft((prev) => ({
                                      ...prev,
                                      [jogo.id]: {
                                        ...(prev[jogo.id] || {
                                          set1a: "",
                                          set1b: "",
                                          set2a: "",
                                          set2b: "",
                                          set3a: "",
                                          set3b: ""
                                        }),
                                        set1b: e.target.value.replace(/[^\d]/g, "").slice(0, 2)
                                      }
                                    }))
                                  }
                                  aria-label="Set 1 pontos equipe B"
                                />
                              </div>
                              {String(jogo.fase || "") === "FINAL" ? (
                                <>
                                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                    <input
                                      inputMode="numeric"
                                      className="h-9 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-slate-900 outline-none focus:ring-4 focus:ring-slate-100"
                                      value={placaresDraft[jogo.id]?.set2a ?? ""}
                                      onChange={(e) =>
                                        setPlacaresDraft((prev) => ({
                                          ...prev,
                                          [jogo.id]: {
                                            ...(prev[jogo.id] || {
                                              set1a: "",
                                              set1b: "",
                                              set2a: "",
                                              set2b: "",
                                              set3a: "",
                                              set3b: ""
                                            }),
                                            set2a: e.target.value.replace(/[^\d]/g, "").slice(0, 2)
                                          }
                                        }))
                                      }
                                      aria-label="Set 2 pontos equipe A"
                                    />
                                    <span className="text-xs font-black text-slate-500">x</span>
                                    <input
                                      inputMode="numeric"
                                      className="h-9 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-slate-900 outline-none focus:ring-4 focus:ring-slate-100"
                                      value={placaresDraft[jogo.id]?.set2b ?? ""}
                                      onChange={(e) =>
                                        setPlacaresDraft((prev) => ({
                                          ...prev,
                                          [jogo.id]: {
                                            ...(prev[jogo.id] || {
                                              set1a: "",
                                              set1b: "",
                                              set2a: "",
                                              set2b: "",
                                              set3a: "",
                                              set3b: ""
                                            }),
                                            set2b: e.target.value.replace(/[^\d]/g, "").slice(0, 2)
                                          }
                                        }))
                                      }
                                      aria-label="Set 2 pontos equipe B"
                                    />
                                  </div>
                                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                    <input
                                      inputMode="numeric"
                                      className="h-9 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-slate-900 outline-none focus:ring-4 focus:ring-slate-100"
                                      value={placaresDraft[jogo.id]?.set3a ?? ""}
                                      onChange={(e) =>
                                        setPlacaresDraft((prev) => ({
                                          ...prev,
                                          [jogo.id]: {
                                            ...(prev[jogo.id] || {
                                              set1a: "",
                                              set1b: "",
                                              set2a: "",
                                              set2b: "",
                                              set3a: "",
                                              set3b: ""
                                            }),
                                            set3a: e.target.value.replace(/[^\d]/g, "").slice(0, 2)
                                          }
                                        }))
                                      }
                                      aria-label="Set 3 pontos equipe A (se necessário)"
                                    />
                                    <span className="text-xs font-black text-slate-500">x</span>
                                    <input
                                      inputMode="numeric"
                                      className="h-9 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-slate-900 outline-none focus:ring-4 focus:ring-slate-100"
                                      value={placaresDraft[jogo.id]?.set3b ?? ""}
                                      onChange={(e) =>
                                        setPlacaresDraft((prev) => ({
                                          ...prev,
                                          [jogo.id]: {
                                            ...(prev[jogo.id] || {
                                              set1a: "",
                                              set1b: "",
                                              set2a: "",
                                              set2b: "",
                                              set3a: "",
                                              set3b: ""
                                            }),
                                            set3b: e.target.value.replace(/[^\d]/g, "").slice(0, 2)
                                          }
                                        }))
                                      }
                                      aria-label="Set 3 pontos equipe B (se necessário)"
                                    />
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`minhas-inscricoes-badge ${classeStatusJogo(jogo.status)}`}
                            >
                              {jogo.status || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-800">
                            {obterNomeEquipe(jogo.vencedor)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                              onClick={() => void salvarPlacarJogo(jogo.id, jogo.fase)}
                              disabled={salvandoPlacarJogoId !== null}
                            >
                              {salvandoPlacarJogoId === jogo.id ? (
                                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                              ) : null}
                              Salvar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}

