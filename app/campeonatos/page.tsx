"use client";

import Link from "next/link";
import { Eye, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import InscricaoCampeonatoContent from "@/components/InscricaoCampeonatoContent";
import { buscarResumoCampeonatoPublico, listarCampeonatosPublicos } from "@/lib/api";
import {
  chavesSessao,
  getJSONStorage,
  getStorage,
  logoutParticipante
} from "@/lib/sessao";

type ParticipanteLogado = { nome: string; email: string } | null;

type CampeonatoPublico = Record<string, any> & {
  id: number;
  nome: string;
  data: string | null;
  local: string | null;
  tipoParticipante: string;
  categoria: string;
  formato: string;
  inscricoesAbertas: boolean;
  statusCampeonato: string;
  totais: { participantes: number; jogos: number };
};

type ResumoPublico = Record<string, any> & {
  campeonato: any;
  participantes: any[];
  jogos: any[];
  podio: any | null;
  totais: { participantes: number; jogos: number; jogosFinalizados: number };
  statusCampeonato: string;
};

function formatarData(data: string | null | undefined) {
  if (!data) return "Não informada";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function traduzirStatus(status: string) {
  const mapa: Record<string, string> = {
    INSCRICOES_ABERTAS: "Inscrições abertas",
    AGUARDANDO_CHAVEAMENTO: "Aguardando chaveamento",
    EM_ANDAMENTO: "Em andamento",
    FINALIZADO: "Finalizado"
  };
  return mapa[status] || status;
}

function classeStatusCampeonato(status: string) {
  const mapa: Record<string, string> = {
    INSCRICOES_ABERTAS: "status-inscricoes",
    AGUARDANDO_CHAVEAMENTO: "status-aguardando",
    EM_ANDAMENTO: "status-andamento",
    FINALIZADO: "status-finalizado"
  };
  return mapa[status] || "status-aguardando";
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

function traduzirFase(fase: string) {
  const mapa: Record<string, string> = {
    SEMIFINAL_1: "Semifinal 1",
    SEMIFINAL_2: "Semifinal 2",
    FINAL: "Final",
    TERCEIRO_LUGAR: "3º Lugar",
    PRIMEIRA_FASE: "Primeira Fase"
  };
  return mapa[fase] || fase;
}

function agruparJogosPorColunaMataMata(jogos: any[]) {
  const grupos: Record<string, any[]> = {
    "Primeira fase": jogos.filter((jogo) => jogo.fase === "PRIMEIRA_FASE"),
    Semifinais: jogos.filter(
      (jogo) => jogo.fase === "SEMIFINAL_1" || jogo.fase === "SEMIFINAL_2"
    ),
    Final: jogos.filter((jogo) => jogo.fase === "FINAL"),
    "3º Lugar": jogos.filter((jogo) => jogo.fase === "TERCEIRO_LUGAR")
  };

  return Object.entries(grupos).filter(([, lista]) => lista.length > 0);
}

export default function CampeonatosPublicosPage() {
  const [mensagem, setMensagem] = useState("");
  const [lista, setLista] = useState<CampeonatoPublico[]>([]);
  const [campeonatoAberto, setCampeonatoAberto] = useState<CampeonatoPublico | null>(
    null
  );
  const [abaDetalhes, setAbaDetalhes] = useState<
    "RESUMO" | "PARTICIPANTES" | "CHAVE" | "JOGOS" | "PODIO"
  >("RESUMO");
  const [resumoAberto, setResumoAberto] = useState<{
    carregando: boolean;
    erro: string;
    dados: ResumoPublico | null;
  }>({ carregando: false, erro: "", dados: null });

  const [inscricaoModal, setInscricaoModal] = useState<{
    id: number;
    nome: string;
  } | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");

  const tokenParticipante = getStorage(chavesSessao.tokenParticipante);
  const participante = getJSONStorage<ParticipanteLogado>(
    chavesSessao.participanteLogado
  );

  useEffect(() => {
    async function carregar() {
      try {
        setMensagem("Carregando campeonatos...");
        const dados = (await listarCampeonatosPublicos()) as CampeonatoPublico[];
        setLista(dados);
        setMensagem("");
      } catch (err) {
        const error = err as Error;
        setMensagem(`Erro ao carregar campeonatos: ${error.message}`);
      }
    }
    carregar();
  }, []);

  useEffect(() => {
    async function carregarResumo() {
      if (!campeonatoAberto) return;
      try {
        setResumoAberto({ carregando: true, erro: "", dados: null });
        const dados = (await buscarResumoCampeonatoPublico(
          campeonatoAberto.id
        )) as ResumoPublico;
        setResumoAberto({ carregando: false, erro: "", dados });
      } catch (err) {
        const error = err as Error;
        setResumoAberto({
          carregando: false,
          erro: `Erro ao carregar campeonato: ${error.message}`,
          dados: null
        });
      }
    }
    carregarResumo();
  }, [campeonatoAberto]);

  const filtrados = useMemo(() => {
    const texto = busca.trim().toLowerCase();
    return lista.filter((campeonato) => {
      const nomeOk = campeonato.nome.toLowerCase().includes(texto);
      const statusOk =
        filtroStatus === "TODOS" || campeonato.statusCampeonato === filtroStatus;
      const categoriaOk =
        filtroCategoria === "TODAS" || campeonato.categoria === filtroCategoria;
      const tipoOk =
        filtroTipo === "TODOS" || campeonato.tipoParticipante === filtroTipo;
      return nomeOk && statusOk && categoriaOk && tipoOk;
    });
  }, [busca, filtroCategoria, filtroStatus, filtroTipo, lista]);

  function sair() {
    logoutParticipante();
    window.location.reload();
  }

  return (
    <main className="campeonatos-shell">
      <header className="campeonatos-topbar" role="banner">
        <div className="campeonatos-topbar-inner">
          <div className="campeonatos-topbar-left">
            <h1 className="campeonatos-title">Campeonatos</h1>
            <p className="campeonatos-subtitle">Acompanhe campeonatos, status e inscrições.</p>
          </div>
        </div>
      </header>

      <section className="campeonatos-body" aria-label="Lista de campeonatos">
        <div className="campeonatos-toolbar">

          <div className="campeonatos-toolbar-right">
            <input
              className="campeonatos-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar"
              aria-label="Pesquisar campeonatos"
            />

            <select
              className="campeonatos-select"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              aria-label="Filtrar status"
            >
              <option value="TODOS">Status</option>
              <option value="INSCRICOES_ABERTAS">Inscrições abertas</option>
              <option value="AGUARDANDO_CHAVEAMENTO">Aguardando chaveamento</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>

            <select
              className="campeonatos-select"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              aria-label="Filtrar categoria"
            >
              <option value="TODAS">Categoria</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
              <option value="MISTA">Mista</option>
            </select>

            <select
              className="campeonatos-select"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              aria-label="Filtrar tipo"
            >
              <option value="TODOS">Tipo</option>
              <option value="DUPLA">Dupla</option>
              <option value="TIME">Quarteto</option>
            </select>
          </div>
        </div>

        <div className="campeonatos-table-wrap">
          {mensagem ? <p className="campeonatos-msg">{mensagem}</p> : null}

          <table className="campeonatos-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Data</th>
                <th>Local</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
          {!mensagem && !filtrados.length ? (
                <tr>
                  <td colSpan={7} className="campeonatos-empty">
                    Nenhum campeonato encontrado.
                  </td>
                </tr>
          ) : (
            filtrados.map((campeonato) => {
              const textoStatus = traduzirStatus(campeonato.statusCampeonato);
                  const classeStatus = classeStatusCampeonato(campeonato.statusCampeonato);
              return (
                    <tr key={campeonato.id}>
                      <td className="campeonatos-name" data-label="Nome">
                        <span className="campeonatos-card-heading">{campeonato.nome}</span>
                      </td>
                      <td data-label="Data">{formatarData(campeonato.data)}</td>
                      <td className="campeonatos-local" data-label="Local">
                        {campeonato.local || "—"}
                      </td>
                      <td data-label="Tipo">
                    {traduzirTipoParticipante(campeonato.tipoParticipante)}
                      </td>
                      <td data-label="Categoria">{campeonato.categoria}</td>
                      <td className="campeonatos-status-cell" data-label="Status">
                        <span className={`status-badge ${classeStatus}`}>{textoStatus}</span>
                      </td>
                      <td className="campeonatos-actions" data-label="Ações">
                        <button
                          type="button"
                          className="campeonatos-action campeonatos-action--icon"
                          aria-label={`Ver detalhes de ${campeonato.nome}`}
                          onClick={() => {
                            setAbaDetalhes("RESUMO");
                            setCampeonatoAberto(campeonato);
                          }}
                        >
                          <Eye aria-hidden className="campeonatos-action-icon" />
                        </button>
                    {campeonato.inscricoesAbertas ? (
                          <button
                            type="button"
                            className="campeonatos-action campeonatos-action--primary campeonatos-action--icon"
                            aria-label={`Participar do campeonato ${campeonato.nome}`}
                            onClick={() =>
                              setInscricaoModal({
                                id: campeonato.id,
                                nome: campeonato.nome
                              })
                            }
                          >
                            <UserPlus aria-hidden className="campeonatos-action-icon" />
                          </button>
                    ) : null}
                      </td>
                    </tr>
              );
            })
          )}
            </tbody>
          </table>
        </div>
      </section>

      {campeonatoAberto ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhes do campeonato ${campeonatoAberto.nome}`}
          onClick={() => setCampeonatoAberto(null)}
        >
          <div
            className="campeonatos-modal campeonatos-modal--full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title">Detalhes do campeonato</div>
                <div className="campeonatos-modal-name">{campeonatoAberto.nome}</div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={() => setCampeonatoAberto(null)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="campeonatos-modal-scroll">
              <div className="campeonatos-modal-tabs" role="tablist" aria-label="Detalhes">
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaDetalhes === "RESUMO"}
                  className={`campeonatos-modal-tab ${abaDetalhes === "RESUMO" ? "is-active" : ""}`}
                  onClick={() => setAbaDetalhes("RESUMO")}
                >
                  Resumo
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaDetalhes === "PARTICIPANTES"}
                  className={`campeonatos-modal-tab ${abaDetalhes === "PARTICIPANTES" ? "is-active" : ""}`}
                  onClick={() => setAbaDetalhes("PARTICIPANTES")}
                >
                  Participantes
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaDetalhes === "CHAVE"}
                  className={`campeonatos-modal-tab ${abaDetalhes === "CHAVE" ? "is-active" : ""}`}
                  onClick={() => setAbaDetalhes("CHAVE")}
                >
                  Chave
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaDetalhes === "JOGOS"}
                  className={`campeonatos-modal-tab ${abaDetalhes === "JOGOS" ? "is-active" : ""}`}
                  onClick={() => setAbaDetalhes("JOGOS")}
                >
                  Jogos
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaDetalhes === "PODIO"}
                  className={`campeonatos-modal-tab ${abaDetalhes === "PODIO" ? "is-active" : ""}`}
                  onClick={() => setAbaDetalhes("PODIO")}
                >
                  Pódio
                </button>
              </div>

              {abaDetalhes === "RESUMO" ? (
                <section className="campeonatos-modal-section">
                  <h2 className="campeonatos-modal-h2">Resumo do campeonato</h2>
                  {resumoAberto.carregando ? (
                    <p className="campeonatos-msg">Carregando campeonato...</p>
                  ) : resumoAberto.erro ? (
                    <p className="campeonatos-msg">{resumoAberto.erro}</p>
                  ) : resumoAberto.dados ? (
                    <div className="campeonatos-modal-grid">
                      <div className="campeonatos-kv">
                        <strong>Nome</strong>
                        <span>
                          {resumoAberto.dados.campeonato?.nome || campeonatoAberto.nome}
                        </span>
                      </div>
                      <div className="campeonatos-kv">
                        <strong>Data</strong>
                        <span>
                          {formatarData(
                            resumoAberto.dados.campeonato?.data ?? campeonatoAberto.data
                          )}
                        </span>
                      </div>
                      <div className="campeonatos-kv">
                        <strong>Local</strong>
                        <span>
                          {resumoAberto.dados.campeonato?.local ||
                            campeonatoAberto.local ||
                            "—"}
                        </span>
                      </div>
                      <div className="campeonatos-kv">
                        <strong>Tipo</strong>
                        <span>
                          {traduzirTipoParticipante(
                            resumoAberto.dados.campeonato?.tipoParticipante ??
                              campeonatoAberto.tipoParticipante
                          )}
                        </span>
                      </div>
                      <div className="campeonatos-kv">
                        <strong>Categoria</strong>
                        <span>
                          {resumoAberto.dados.campeonato?.categoria ??
                            campeonatoAberto.categoria}
                        </span>
                      </div>
                      <div className="campeonatos-kv">
                        <strong>Formato</strong>
                        <span>
                          {traduzirFormato(
                            resumoAberto.dados.campeonato?.formato ??
                              campeonatoAberto.formato
                          )}
                        </span>
                      </div>
                      <div className="campeonatos-kv">
                        <strong>Total de participantes</strong>
                        <span>
                          {resumoAberto.dados.totais?.participantes ??
                            campeonatoAberto.totais?.participantes ??
                            0}
                        </span>
                      </div>
                      <div className="campeonatos-kv">
                        <strong>Total de jogos</strong>
                        <span>
                          {resumoAberto.dados.totais?.jogos ??
                            campeonatoAberto.totais?.jogos ??
                            0}
                        </span>
                      </div>
                      <div className="campeonatos-kv">
                        <strong>Jogos finalizados</strong>
                        <span>{resumoAberto.dados.totais?.jogosFinalizados ?? 0}</span>
                      </div>
                      <div className="campeonatos-kv">
                        <strong>Status</strong>
                        <span>
                          {traduzirStatus(
                            resumoAberto.dados.statusCampeonato ??
                              campeonatoAberto.statusCampeonato
                          )}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {abaDetalhes === "PARTICIPANTES" ? (
                <section className="campeonatos-modal-section">
                  <h2 className="campeonatos-modal-h2">Participantes</h2>
                  {!resumoAberto.dados ? (
                    <p className="campeonatos-msg">Carregando participantes...</p>
                  ) : !resumoAberto.dados.participantes?.length ? (
                    <p className="campeonatos-msg">Nenhum participante inscrito ainda.</p>
                  ) : (
                    <div className="campeonatos-modal-list">
                      {resumoAberto.dados.participantes.map((p: any, idx: number) => (
                        <div key={p.id ?? idx} className="campeonatos-modal-item">
                          <div className="campeonatos-modal-item-title">{p.nomeEquipe}</div>
                          <div className="campeonatos-modal-item-sub">
                            <strong>Capitã(o):</strong> {p.responsavel}
                          </div>
                          {p.jogadores?.length ? (
                            <ul className="campeonatos-modal-ul">
                              {p.jogadores.map((j: any, jIdx: number) => (
                                <li key={j.id ?? jIdx}>
                                  {j.nome} ({j.genero})
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {abaDetalhes === "CHAVE" ? (
                <section className="campeonatos-modal-section">
                  <h2 className="campeonatos-modal-h2">Chave do campeonato</h2>
                  {!resumoAberto.dados ? (
                    <p className="campeonatos-msg">Carregando chave...</p>
                  ) : (resumoAberto.dados.campeonato?.formato ?? campeonatoAberto.formato) !==
                    "MATA_MATA" ? (
                    <p className="campeonatos-msg">
                      A visualização de chave para este formato será adicionada em breve.
                    </p>
                  ) : (() => {
                      const colunas = agruparJogosPorColunaMataMata(
                        resumoAberto.dados.jogos || []
                      );
                      if (!colunas.length)
                        return <p className="campeonatos-msg">Nenhum jogo gerado ainda.</p>;
                      return (
                        <div className="campeonatos-chave-grid">
                          {colunas.map(([titulo, jogos]) => (
                            <div key={titulo} className="campeonatos-chave-col">
                              <h3 className="campeonatos-chave-title">{titulo}</h3>
                              {jogos.map((jogo: any) => {
                                const equipeA = jogo.equipeA?.nomeEquipe || "A definir";
                                const equipeB = jogo.equipeB?.nomeEquipe || "A definir";
                                const vencedorId = jogo.vencedorId;
                                const vencA =
                                  jogo.equipeAId &&
                                  vencedorId &&
                                  vencedorId === jogo.equipeAId;
                                const vencB =
                                  jogo.equipeBId &&
                                  vencedorId &&
                                  vencedorId === jogo.equipeBId;
                                return (
                                  <div key={jogo.id} className="campeonatos-chave-jogo">
                                    <div className="campeonatos-chave-status">{jogo.status}</div>
                                    <div
                                      className={`campeonatos-chave-equipe ${
                                        vencA ? "is-win" : ""
                                      }`}
                                    >
                                      {equipeA}
                                    </div>
                                    <div
                                      className={`campeonatos-chave-equipe ${
                                        vencB ? "is-win" : ""
                                      }`}
                                    >
                                      {equipeB}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                </section>
              ) : null}

              {abaDetalhes === "JOGOS" ? (
                <section className="campeonatos-modal-section">
                  <h2 className="campeonatos-modal-h2">Jogos</h2>
                  {!resumoAberto.dados ? (
                    <p className="campeonatos-msg">Carregando jogos...</p>
                  ) : !resumoAberto.dados.jogos?.length ? (
                    <p className="campeonatos-msg">Nenhum jogo gerado ainda.</p>
                  ) : (
                    <div className="campeonatos-modal-list">
                      {resumoAberto.dados.jogos.map((jogo: any) => {
                        const nomeEquipeA = jogo.equipeA?.nomeEquipe || "A definir";
                        const nomeEquipeB = jogo.equipeB?.nomeEquipe || "A definir";
                        const nomeVencedor = jogo.vencedor?.nomeEquipe || "Ainda não definido";
                        return (
                          <div key={jogo.id} className="campeonatos-modal-item">
                            <div className="campeonatos-modal-item-title">
                              {traduzirFase(jogo.fase)}
                            </div>
                            <div className="campeonatos-modal-item-sub">
                              <strong>Status:</strong> {jogo.status}
                            </div>
                            <div className="campeonatos-confronto">
                              <div className="campeonatos-confronto-team">{nomeEquipeA}</div>
                              <div className="campeonatos-confronto-vs">VS</div>
                              <div className="campeonatos-confronto-team">{nomeEquipeB}</div>
                            </div>
                            <div className="campeonatos-modal-item-sub">
                              <strong>Vencedor:</strong> {nomeVencedor}
                            </div>
                            <div className="campeonatos-sets">
                              <strong>Sets:</strong>
                              {jogo.sets?.length ? (
                                <ul className="campeonatos-modal-ul">
                                  {jogo.sets.map((s: any, sIdx: number) => (
                                    <li key={s.id ?? sIdx}>
                                      Set {s.numeroSet}: {s.pontosA} x {s.pontosB}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="campeonatos-msg">Nenhum set registrado.</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : null}

              {abaDetalhes === "PODIO" ? (
                <section className="campeonatos-modal-section">
                  <h2 className="campeonatos-modal-h2">Pódio</h2>
                  {!resumoAberto.dados ? (
                    <p className="campeonatos-msg">Carregando pódio...</p>
                  ) : !resumoAberto.dados.podio ? (
                    <p className="campeonatos-msg">Pódio ainda não definido.</p>
                  ) : (
                    <div className="campeonatos-podio-grid">
                      <div className="campeonatos-podio-card">
                        <h3>🥇 1º Lugar</h3>
                        <p>{resumoAberto.dados.podio.primeiroLugar?.nomeEquipe || "—"}</p>
                      </div>
                      <div className="campeonatos-podio-card">
                        <h3>🥈 2º Lugar</h3>
                        <p>{resumoAberto.dados.podio.segundoLugar?.nomeEquipe || "—"}</p>
                      </div>
                      <div className="campeonatos-podio-card">
                        <h3>🥉 3º Lugar</h3>
                        <p>{resumoAberto.dados.podio.terceiroLugar?.nomeEquipe || "—"}</p>
                      </div>
                    </div>
                  )}
                </section>
              ) : null}
            </div>

            <div className="campeonatos-modal-actions">
              <Link
                className="campeonatos-btn campeonatos-btn--ghost campeonatos-btn--icon"
                href="#"
                aria-label="Fechar"
                onClick={(e) => {
                  e.preventDefault();
                  setCampeonatoAberto(null);
                }}
              >
                <X aria-hidden className="campeonatos-btn-icon" />
        </Link>
              {campeonatoAberto.inscricoesAbertas ? (
                <button
                  type="button"
                  className="campeonatos-btn campeonatos-btn--primary campeonatos-btn--icon"
                  aria-label="Participar"
                  onClick={() => {
                    const id = campeonatoAberto.id;
                    const nome = campeonatoAberto.nome;
                    setCampeonatoAberto(null);
                    setInscricaoModal({ id, nome });
                  }}
                >
                  <UserPlus aria-hidden className="campeonatos-btn-icon" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {inscricaoModal ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Inscrição no campeonato ${inscricaoModal.nome}`}
          onClick={() => setInscricaoModal(null)}
        >
          <div
            className="campeonatos-modal campeonatos-modal--full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title">Inscrição</div>
                <div className="campeonatos-modal-name">{inscricaoModal.nome}</div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={() => setInscricaoModal(null)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="campeonatos-modal-scroll campeonatos-modal-scroll--inscricao">
              <InscricaoCampeonatoContent
                campeonatoId={String(inscricaoModal.id)}
                variant="modal"
                onFechar={() => setInscricaoModal(null)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

