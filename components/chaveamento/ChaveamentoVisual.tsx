"use client";

import { useMemo } from "react";

export type EquipeChaveamento = {
  id: number;
  nomeEquipe?: string | null;
  responsavel?: string | null;
};

export type JogadorEquipe = {
  id?: number;
  nome?: string | null;
  genero?: string | null;
};

export type ParticipanteResumo = {
  id: number;
  nomeEquipe?: string | null;
  responsavel?: string | null;
  jogadores?: JogadorEquipe[] | null;
};

export type JogoChaveamento = {
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
          Quartas â€¢ Semi â€¢ Final
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
                  titulo="3Âº"
                  participantesPorId={participantesPorId}
                  variante="bracketNeutro"
                />
              ))}
            </div>
          </details>
        </div>

        {/* Tablet/Desktop: bracket com ligaÃ§Ãµes */}
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
                    3Âº lugar
                  </div>
                  <JogoChaveamentoCard
                    jogo={t1}
                    titulo="3Âº"
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
              Finalize os jogos da fase de grupos para liberar a próxima fase.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default function ChaveamentoVisual({
  jogos,
  participantes
}: {
  jogos: JogoChaveamento[];
  participantes: ParticipanteResumo[];
}) {
  return <ChaveamentoModeloVisual jogos={jogos} participantes={participantes} />;
}
