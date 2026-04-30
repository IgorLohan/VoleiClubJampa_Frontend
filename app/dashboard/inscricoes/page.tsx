"use client";

import { useEffect, useMemo, useState } from "react";
import CampeonatosPublicosPage from "@/app/campeonatos/page";
import {
  aprovarInscricaoIndividual,
  atualizarInscricaoIndividual,
  buscarResumoCampeonato,
  excluirInscricaoIndividual,
  listarCampeonatosAdmin
} from "@/lib/api";
import { chavesSessao, getStorage } from "@/lib/sessao";
import {
  Check,
  Pencil,
  Trash2
} from "lucide-react";

export default function DashboardCampeonatosPage() {
  const tokenAdmin = getStorage(chavesSessao.tokenAdmin);

  if (!tokenAdmin) {
    return <CampeonatosPublicosPage />;
  }

  return <InscricoesAdminPage />;
}

function formatarDataCurta(data: string | null | undefined) {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function traduzirStatusAnalise(status: string | null | undefined) {
  const u = String(status || "").toUpperCase();
  if (u === "AGUARDANDO_ANALISE") return "Em análise";
  if (u === "APROVADA") return "Aprovada";
  if (u === "REPROVADA") return "Reprovada";
  return status || "—";
}

function classeBadgeStatusAnalise(status: string | null | undefined) {
  const u = String(status || "").toUpperCase();
  if (u === "APROVADA") return "minhas-inscricoes-badge--ok";
  if (u === "AGUARDANDO_ANALISE") return "minhas-inscricoes-badge--warn";
  if (u === "REPROVADA") return "minhas-inscricoes-badge--err";
  return "minhas-inscricoes-badge--neutral";
}

function formatarDinheiroCentavos(valor: number | null | undefined) {
  const v = typeof valor === "number" ? valor : 0;
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function InscricoesAdminPage() {
  const [mensagem, setMensagem] = useState("");
  const [campeonatos, setCampeonatos] = useState<Array<{ id: number; nome: string }>>([]);
  const [campeonatoId, setCampeonatoId] = useState<string>("");
  const [resumo, setResumo] = useState<any | null>(null);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [inscricaoEmEdicao, setInscricaoEmEdicao] = useState<any | null>(null);
  const [editTamanhoCamisa, setEditTamanhoCamisa] = useState("");
  const [editValorCentavos, setEditValorCentavos] = useState<number>(0);
  const [editObservacao, setEditObservacao] = useState("");

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
        setMensagem("");
        if (!campeonatoId && opcoes.length) setCampeonatoId(String(opcoes[0].id));
      } catch (err) {
        const error = err as Error;
        setMensagem(`Erro ao carregar campeonatos: ${error.message}`);
      }
    }
    carregarCampeonatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function carregarResumo() {
      if (!campeonatoId) return;
      try {
        setMensagem("Carregando inscrições...");
        const dados = await buscarResumoCampeonato(campeonatoId);
        setResumo(dados);
        setMensagem("");
      } catch (err) {
        const error = err as Error;
        setResumo(null);
        setMensagem(`Erro ao carregar inscrições: ${error.message}`);
      }
    }
    carregarResumo();
  }, [campeonatoId]);

  const inscricoesIndividuais = useMemo(() => resumo?.inscricoesIndividuais || [], [resumo]);

  async function recarregarResumoAtual() {
    if (!campeonatoId) return;
    const dados = await buscarResumoCampeonato(campeonatoId);
    setResumo(dados);
  }

  function abrirEdicao(inscricao: any) {
    setInscricaoEmEdicao(inscricao);
    setEditTamanhoCamisa(String(inscricao?.tamanhoCamisa || ""));
    setEditValorCentavos(Number(inscricao?.valorTotalCentavos || 0));
    setEditObservacao(String(inscricao?.observacaoAdmin || ""));
    setModalEdicaoAberto(true);
    setMensagem("");
  }

  function fecharEdicao() {
    setModalEdicaoAberto(false);
    setInscricaoEmEdicao(null);
    setMensagem("");
  }

  async function onAprovar(inscricao: any) {
    if (!inscricao?.id) return;
    setAcaoEmAndamento(`aprovar-${inscricao.id}`);
    setMensagem("");
    try {
      await aprovarInscricaoIndividual(inscricao.id);
      await recarregarResumoAtual();
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao aprovar: ${error.message}`);
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  async function onExcluir(inscricao: any) {
    if (!inscricao?.id) return;
    const ok = window.confirm("Deseja excluir (cancelar) esta inscrição individual?");
    if (!ok) return;

    setAcaoEmAndamento(`excluir-${inscricao.id}`);
    setMensagem("");
    try {
      await excluirInscricaoIndividual(inscricao.id);
      await recarregarResumoAtual();
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao excluir: ${error.message}`);
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  async function onSalvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!inscricaoEmEdicao?.id) return;

    setAcaoEmAndamento(`editar-${inscricaoEmEdicao.id}`);
    setMensagem("");
    try {
      await atualizarInscricaoIndividual(inscricaoEmEdicao.id, {
        tamanhoCamisa: editTamanhoCamisa,
        valorTotalCentavos: editValorCentavos,
        observacaoAdmin: editObservacao
      });
      await recarregarResumoAtual();
      fecharEdicao();
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao salvar edição: ${error.message}`);
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="admin-dash-select" aria-label="Filtros de inscrições">
        <label className="admin-dash-label" htmlFor="admin-inscricoes-campeonato">
          Campeonato
        </label>
        <select
          id="admin-inscricoes-campeonato"
          className="admin-dash-select-control"
          value={campeonatoId}
          onChange={(e) => setCampeonatoId(e.target.value)}
          disabled={!campeonatos.length}
        >
          {!campeonatos.length ? <option value="">Nenhum campeonato</option> : null}
          {campeonatos.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.nome}
            </option>
          ))}
        </select>
        {mensagem ? <p className="admin-dash-help">{mensagem}</p> : null}
      </section>

      {resumo ? (
        <section className="card" aria-label="Tabela de inscrições">
          <h2 style={{ margin: 0 }}>Inscrições</h2>
          <p style={{ marginTop: 8, color: "rgba(11, 18, 32, 0.68)", fontWeight: 700 }}>
            {resumo?.campeonato?.nome ? (
              <>
                <strong>Campeonato:</strong> {resumo.campeonato.nome} ·{" "}
                <strong>Data:</strong> {formatarDataCurta(resumo.campeonato.data)}
              </>
            ) : (
              "Selecione um campeonato."
            )}
          </p>

          <div className="campeonatos-table-wrap" style={{ marginTop: 14 }}>
            <table className="campeonatos-table" aria-label="Inscrições individuais">
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>E-mail</th>
                  <th>Contato</th>
                  <th>Status</th>
                  <th>Camisa</th>
                  <th>Valor</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {inscricoesIndividuais.length ? (
                  inscricoesIndividuais.map((i: any) => {
                    const aprovada = String(i?.statusAnalise || "").toUpperCase() === "APROVADA";
                    const cancelada = String(i?.status || "").toUpperCase() === "CANCELADA";
                    const usada = String(i?.status || "").toUpperCase() === "USADA_EM_EQUIPE";

                    return (
                      <tr key={`individual-${i.id}`}>
                        <td data-label="Jogador">{i.usuario?.nome || "—"}</td>
                        <td data-label="E-mail">{i.usuario?.email || "—"}</td>
                        <td data-label="Contato">{i.usuario?.contato?.trim?.() || "—"}</td>
                        <td data-label="Status">
                          <span
                            className={`minhas-inscricoes-badge ${classeBadgeStatusAnalise(
                              i.statusAnalise
                            )}`}
                          >
                            {traduzirStatusAnalise(i.statusAnalise)}
                          </span>
                        </td>
                        <td data-label="Camisa">{i.tamanhoCamisa || "—"}</td>
                        <td data-label="Valor">{formatarDinheiroCentavos(i.valorTotalCentavos)}</td>
                        <td data-label="Ações" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            {!aprovada ? (
                              <button
                                type="button"
                                className="campeonatos-action campeonatos-action--icon campeonatos-action--primary"
                                onClick={() => onAprovar(i)}
                                disabled={acaoEmAndamento !== null || cancelada || usada}
                                title="Aprovar"
                                aria-label="Aprovar"
                              >
                                <Check aria-hidden className="campeonatos-action-icon" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="campeonatos-action campeonatos-action--icon"
                              onClick={() => abrirEdicao(i)}
                              disabled={acaoEmAndamento !== null}
                              title="Editar"
                              aria-label="Editar"
                            >
                              <Pencil aria-hidden className="campeonatos-action-icon" />
                            </button>
                            <button
                              type="button"
                              className="campeonatos-action campeonatos-action--icon"
                              onClick={() => onExcluir(i)}
                              disabled={acaoEmAndamento !== null || usada}
                              title="Excluir"
                              aria-label="Excluir"
                            >
                              <Trash2 aria-hidden className="campeonatos-action-icon" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="campeonatos-empty">
                      Nenhuma inscrição individual encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {modalEdicaoAberto && inscricaoEmEdicao ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Editar inscrição individual"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fecharEdicao();
          }}
        >
          <div className="campeonatos-modal">
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title">Editar inscrição</div>
                <div className="campeonatos-modal-name">
                  {inscricaoEmEdicao?.usuario?.nome || "Jogador"}
                </div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={fecharEdicao}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSalvarEdicao} className="campeonatos-modal-section">
              <div className="formulario" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="grupo-formulario">
                  <label htmlFor="edit-camisa">Tamanho da camisa</label>
                  <select
                    id="edit-camisa"
                    value={editTamanhoCamisa}
                    onChange={(e) => setEditTamanhoCamisa(e.target.value)}
                  >
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="GG">GG</option>
                  </select>
                </div>

                <div className="grupo-formulario">
                  <label htmlFor="edit-valor">Valor (R$)</label>
                  <input
                    id="edit-valor"
                    type="number"
                    min={0}
                    step={0.01}
                    value={(editValorCentavos / 100).toFixed(2)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isFinite(v)) return;
                      setEditValorCentavos(Math.round(v * 100));
                    }}
                  />
                </div>

                <div className="grupo-formulario" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="edit-obs">Observação (opcional)</label>
                  <input
                    id="edit-obs"
                    value={editObservacao}
                    onChange={(e) => setEditObservacao(e.target.value)}
                    placeholder="Ex.: comprovante ilegível, ajustar valor, etc."
                  />
                </div>
              </div>

              <div className="campeonatos-modal-actions">
                <button
                  type="button"
                  className="campeonatos-btn campeonatos-btn--ghost"
                  onClick={fecharEdicao}
                  disabled={acaoEmAndamento !== null}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="campeonatos-btn campeonatos-btn--primary"
                  disabled={acaoEmAndamento !== null}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

