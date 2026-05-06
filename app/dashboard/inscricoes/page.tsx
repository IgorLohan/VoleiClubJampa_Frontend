"use client";

import { useEffect, useMemo, useState } from "react";
import CampeonatosPublicosPage from "@/app/campeonatos/page";
import PageLoader from "@/components/PageLoader";
import TablePagination from "@/components/TablePagination";
import {
  API_BASE,
  aprovarInscricaoIndividual,
  atualizarInscricaoIndividual,
  buscarResumoCampeonato,
  excluirInscricaoIndividual,
  listarCampeonatosAdmin,
  reprovarInscricaoIndividual
} from "@/lib/api";
import { chavesSessao, getStorage } from "@/lib/sessao";
import {
  Ban,
  Check,
  FileImage,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Trash2,
  UserRound
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

function traduzirStatusInscricaoIndividual(status: string | null | undefined) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDENTE") return "Pendente de montagem";
  if (s === "USADA_EM_EQUIPE") return "Alocado em equipe";
  if (s === "CANCELADA") return "Cancelada";
  return status ? String(status) : "—";
}

function textoInscritoEm(inscricao: any) {
  return formatarDataCurta(inscricao?.criadoEm);
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

function montarUrlFoto(fotoPerfil: string | null | undefined) {
  if (!fotoPerfil) return null;
  if (/^https?:\/\//i.test(fotoPerfil)) return fotoPerfil;
  return `${API_BASE}${fotoPerfil.startsWith("/") ? "" : "/"}${fotoPerfil}`;
}

function CelulaFotoPerfilInscricao({
  urlFoto,
  nomeJogador,
  onAbrir
}: {
  urlFoto: string | null;
  nomeJogador: string;
  onAbrir: (url: string, nome: string) => void;
}) {
  const [falhouCarregar, setFalhouCarregar] = useState(false);

  useEffect(() => {
    setFalhouCarregar(false);
  }, [urlFoto]);

  if (!urlFoto || falhouCarregar) {
    return (
      <span className="admin-inscricao-foto-placeholder" aria-label="Sem foto de perfil">
        <UserRound size={20} aria-hidden />
      </span>
    );
  }

  return (
    <button
      type="button"
      className="admin-inscricao-foto-thumb-btn"
      onClick={() => onAbrir(urlFoto, nomeJogador)}
      title={`Ver foto de ${nomeJogador}`}
      aria-label={`Ampliar foto de perfil de ${nomeJogador}`}
    >
      <img
        src={urlFoto}
        alt=""
        className="admin-inscricao-foto-thumb"
        width={44}
        height={44}
        onError={() => setFalhouCarregar(true)}
      />
    </button>
  );
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
  const [comprovanteModal, setComprovanteModal] = useState<{
    src: string;
    jogador: string;
  } | null>(null);
  const [fotoModal, setFotoModal] = useState<{
    src: string;
    nome: string;
  } | null>(null);
  const [reprovarAlvo, setReprovarAlvo] = useState<any | null>(null);
  const [reprovarObservacao, setReprovarObservacao] = useState("");
  const [pagina, setPagina] = useState(0);
  const [linhasPorPagina, setLinhasPorPagina] = useState(10);

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
        setPagina(0);
      } catch (err) {
        const error = err as Error;
        setResumo(null);
        setMensagem(`Erro ao carregar inscrições: ${error.message}`);
      }
    }
    carregarResumo();
  }, [campeonatoId]);

  useEffect(() => {
    if (!comprovanteModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setComprovanteModal(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [comprovanteModal]);

  useEffect(() => {
    if (!fotoModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFotoModal(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fotoModal]);

  useEffect(() => {
    if (!reprovarAlvo) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setReprovarAlvo(null);
        setReprovarObservacao("");
        setMensagem("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reprovarAlvo]);

  const inscricoesIndividuais = useMemo(() => resumo?.inscricoesIndividuais || [], [resumo]);
  const inscricoesPaginadas = useMemo(() => {
    const ini = pagina * linhasPorPagina;
    const fim = ini + linhasPorPagina;
    return (inscricoesIndividuais || []).slice(ini, fim);
  }, [inscricoesIndividuais, pagina, linhasPorPagina]);
  const inscritosAprovados = useMemo(
    () =>
      (inscricoesIndividuais || []).filter(
        (i: any) =>
          String(i?.status || "").toUpperCase() !== "CANCELADA" &&
          String(i?.statusAnalise || "").toUpperCase() === "APROVADA"
      ),
    [inscricoesIndividuais]
  );

  const totaisCards = useMemo(() => {
    let homens = 0;
    let mulheres = 0;
    for (const i of inscritosAprovados) {
      const sexo = String(i?.usuario?.sexo || "").toUpperCase();
      if (sexo === "MASCULINO") homens += 1;
      if (sexo === "FEMININO") mulheres += 1;
    }
    return {
      total: inscritosAprovados.length,
      homens,
      mulheres
    };
  }, [inscritosAprovados]);

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

  function abrirReprovar(inscricao: any) {
    setReprovarAlvo(inscricao);
    setReprovarObservacao("");
    setMensagem("");
  }

  function fecharReprovar() {
    setReprovarAlvo(null);
    setReprovarObservacao("");
    setMensagem("");
  }

  async function onConfirmarReprovar(e: React.FormEvent) {
    e.preventDefault();
    if (!reprovarAlvo?.id) return;
    const obs = reprovarObservacao.trim();
    if (!obs) {
      setMensagem("Informe o motivo da reprovação.");
      return;
    }

    setAcaoEmAndamento(`reprovar-${reprovarAlvo.id}`);
    setMensagem("");
    try {
      await reprovarInscricaoIndividual(reprovarAlvo.id, obs);
      await recarregarResumoAtual();
      fecharReprovar();
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao reprovar: ${error.message}`);
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  async function onExcluir(inscricao: any) {
    if (!inscricao?.id) return;
    const ok = window.confirm(
      "Remover permanentemente esta inscrição do sistema? Esta ação não pode ser desfeita."
    );
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

  const reprovandoNoModal =
    reprovarAlvo != null && acaoEmAndamento === `reprovar-${reprovarAlvo.id}`;

  const salvandoEdicao =
    modalEdicaoAberto &&
    inscricaoEmEdicao &&
    acaoEmAndamento === `editar-${inscricaoEmEdicao.id}`;

  async function exportarInscricoesExcel() {
    if (!inscricoesIndividuais.length) return;
    const XLSX = await import("xlsx");
    const linhas = inscricoesIndividuais.map((i: any) => ({
      Jogador: String(i.usuario?.nome || "—"),
      "E-mail": String(i.usuario?.email || "—"),
      Contato: String(i.usuario?.contato?.trim?.() || "—"),
      Status: traduzirStatusAnalise(i.statusAnalise),
      "Inscrito em": textoInscritoEm(i),
      Camisa: String(i.tamanhoCamisa || "—"),
      Valor: formatarDinheiroCentavos(i.valorTotalCentavos)
    }));
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, "Inscrições");
    const nomeCampeonato = resumo?.campeonato?.nome
      ? String(resumo.campeonato.nome).replace(/[\\/:*?"<>|]/g, "-")
      : "campeonato";
    const dataArquivo = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(livro, `inscricoes-${nomeCampeonato}-${dataArquivo}.xlsx`);
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
        {mensagem === "Carregando campeonatos..." || mensagem === "Carregando inscrições..." ? (
          <PageLoader
            label={
              mensagem === "Carregando campeonatos..."
                ? "Carregando campeonatos"
                : "Carregando inscrições"
            }
            variant="section"
          />
        ) : mensagem ? (
          <p className="admin-dash-help">{mensagem}</p>
        ) : null}
      </section>

      {resumo ? (
        <section className="card" aria-label="Tabela de inscrições">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12
            }}
          >
            <h2 style={{ margin: 0 }}>Inscrições</h2>
            <button
              type="button"
              className="campeonatos-btn campeonatos-btn--icon campeonatos-btn--success"
              onClick={() => void exportarInscricoesExcel()}
              disabled={!inscricoesIndividuais.length}
              title={
                inscricoesIndividuais.length
                  ? "Exportar Excel"
                  : "Não há inscrições para exportar"
              }
              aria-label={
                inscricoesIndividuais.length
                  ? "Exportar inscrições para Excel"
                  : "Exportar Excel (desabilitado: sem inscrições)"
              }
            >
              <FileSpreadsheet aria-hidden className="campeonatos-btn-icon" />
            </button>
          </div>
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
              marginTop: 12
            }}
            aria-label="Totais de inscrições"
          >
            <div
              className="card"
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(32, 54, 103, 0.10)",
                background: "rgba(255, 255, 255, 0.9)"
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  color: "rgba(11, 18, 32, 0.70)",
                  fontSize: "clamp(0.85rem, 2.6vw, 0.98rem)",
                  lineHeight: 1.15,
                  whiteSpace: "normal",
                  wordBreak: "break-word"
                }}
              >
                Total de inscritos aprovados
              </div>
              <div style={{ fontSize: "1.65rem", fontWeight: 950, marginTop: 6 }}>
                {totaisCards.total}
              </div>
            </div>
            <div
              className="card"
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(32, 54, 103, 0.10)",
                background: "rgba(255, 255, 255, 0.9)"
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  color: "rgba(11, 18, 32, 0.70)",
                  fontSize: "clamp(0.85rem, 2.6vw, 0.98rem)",
                  lineHeight: 1.15,
                  whiteSpace: "normal",
                  wordBreak: "break-word"
                }}
              >
                Total de mulheres aprovadas
              </div>
              <div style={{ fontSize: "1.65rem", fontWeight: 950, marginTop: 6 }}>
                {totaisCards.mulheres}
              </div>
            </div>
            <div
              className="card"
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(32, 54, 103, 0.10)",
                background: "rgba(255, 255, 255, 0.9)"
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  color: "rgba(11, 18, 32, 0.70)",
                  fontSize: "clamp(0.85rem, 2.6vw, 0.98rem)",
                  lineHeight: 1.15,
                  whiteSpace: "normal",
                  wordBreak: "break-word"
                }}
              >
                Total de homens aprovados
              </div>
              <div style={{ fontSize: "1.65rem", fontWeight: 950, marginTop: 6 }}>
                {totaisCards.homens}
              </div>
            </div>
          </div>

          <div className="campeonatos-table-wrap" style={{ marginTop: 14 }}>
            <table className="campeonatos-table" aria-label="Inscrições individuais">
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>Foto</th>
                  <th>E-mail</th>
                  <th>Contato</th>
                  <th>Status</th>
                  <th>Inscrito em</th>
                  <th>Camisa</th>
                  <th>Valor</th>
                  <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Aprovação</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {inscricoesIndividuais.length ? (
                  inscricoesPaginadas.map((i: any) => {
                    const aprovada = String(i?.statusAnalise || "").toUpperCase() === "APROVADA";
                    const reprovada = String(i?.statusAnalise || "").toUpperCase() === "REPROVADA";
                    const cancelada = String(i?.status || "").toUpperCase() === "CANCELADA";
                    const usada = String(i?.status || "").toUpperCase() === "USADA_EM_EQUIPE";
                    const comprovante = String(i?.comprovantePagamento || "").trim();
                    const urlFoto = montarUrlFoto(i.usuario?.fotoPerfil);
                    const nomeJogador = String(i.usuario?.nome || "Jogador");
                    const aprovandoEste = acaoEmAndamento === `aprovar-${i.id}`;

                    return (
                      <tr key={`individual-${i.id}`}>
                        <td data-label="Jogador">{i.usuario?.nome || "—"}</td>
                        <td data-label="Foto">
                          <CelulaFotoPerfilInscricao
                            urlFoto={urlFoto}
                            nomeJogador={nomeJogador}
                            onAbrir={(url, nome) => setFotoModal({ src: url, nome })}
                          />
                        </td>
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
                        <td data-label="Inscrito em">{textoInscritoEm(i)}</td>
                        <td data-label="Camisa">{i.tamanhoCamisa || "—"}</td>
                        <td data-label="Valor">{formatarDinheiroCentavos(i.valorTotalCentavos)}</td>
                        <td
                          data-label="Aprovação"
                          className="campeonatos-inscricao-decisao"
                          style={{ textAlign: "center" }}
                        >
                          <div className="campeonatos-inscricao-decisao-btns">
                            {aprovada || reprovada ? (
                              <span
                                className="campeonatos-inscricao-decisao-feito"
                                aria-label="Decisão já registrada"
                              >
                                —
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="campeonatos-action campeonatos-action--icon campeonatos-action--primary"
                                  onClick={() => onAprovar(i)}
                                  disabled={acaoEmAndamento !== null || cancelada || usada}
                                  title={aprovandoEste ? "Aprovando…" : "Aprovar"}
                                  aria-label={aprovandoEste ? "Aprovando…" : "Aprovar"}
                                  aria-busy={aprovandoEste}
                                >
                                  {aprovandoEste ? (
                                    <Loader2
                                      aria-hidden
                                      className="campeonatos-action-icon campeonatos-acao-loader"
                                    />
                                  ) : (
                                    <Check aria-hidden className="campeonatos-action-icon" />
                                  )}
                                </button>
                                {!usada && !cancelada ? (
                                  <button
                                    type="button"
                                    className="campeonatos-action campeonatos-action--icon"
                                    onClick={() => abrirReprovar(i)}
                                    disabled={acaoEmAndamento !== null}
                                    title="Reprovar inscrição"
                                    aria-label="Reprovar inscrição"
                                  >
                                    <Ban aria-hidden className="campeonatos-action-icon" />
                                  </button>
                                ) : null}
                              </>
                            )}
                          </div>
                        </td>
                        <td data-label="Ações" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            {comprovante ? (
                              <button
                                type="button"
                                className="campeonatos-action campeonatos-action--icon"
                                title="Ver comprovante"
                                aria-label={`Ver comprovante de ${i.usuario?.nome || "jogador"}`}
                                onClick={() =>
                                  setComprovanteModal({
                                    src: comprovante,
                                    jogador: String(i.usuario?.nome || "Jogador")
                                  })
                                }
                              >
                                <FileImage aria-hidden className="campeonatos-action-icon" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="campeonatos-action campeonatos-action--icon"
                                disabled
                                title="Nenhum comprovante enviado"
                                aria-label="Comprovante não disponível"
                              >
                                <FileImage aria-hidden className="campeonatos-action-icon" />
                              </button>
                            )}
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
                              title="Excluir permanentemente"
                              aria-label="Excluir permanentemente"
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
                    <td colSpan={10} className="campeonatos-empty">
                      Nenhuma inscrição individual encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <TablePagination
              total={inscricoesIndividuais.length}
              page={pagina}
              rowsPerPage={linhasPorPagina}
              onPageChange={setPagina}
              onRowsPerPageChange={(n) => {
                setLinhasPorPagina(n);
                setPagina(0);
              }}
            />
          </div>
        </section>
      ) : null}

      {reprovarAlvo ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Reprovar inscrição"
          style={{ zIndex: 55 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !reprovandoNoModal) fecharReprovar();
          }}
        >
          <div className="campeonatos-modal">
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title">Reprovar inscrição</div>
                <div className="campeonatos-modal-name">
                  {reprovarAlvo?.usuario?.nome || "Jogador"}
                </div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={fecharReprovar}
                aria-label="Fechar"
                disabled={reprovandoNoModal}
              >
                ✕
              </button>
            </div>

            <form onSubmit={onConfirmarReprovar} className="campeonatos-modal-section">
              <div className="grupo-formulario">
                <label htmlFor="reprovar-motivo">Motivo da reprovação</label>
                <textarea
                  id="reprovar-motivo"
                  rows={4}
                  value={reprovarObservacao}
                  onChange={(e) => setReprovarObservacao(e.target.value)}
                  placeholder="Descreva o motivo (obrigatório)."
                  required
                  disabled={reprovandoNoModal}
                />
              </div>

              <div className="campeonatos-modal-actions">
                <button
                  type="button"
                  className="campeonatos-btn campeonatos-btn--ghost"
                  onClick={fecharReprovar}
                  disabled={reprovandoNoModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`campeonatos-btn campeonatos-btn--primary${reprovandoNoModal ? " campeonatos-btn--with-loader" : ""}`}
                  disabled={acaoEmAndamento !== null}
                  aria-busy={reprovandoNoModal}
                >
                  {reprovandoNoModal ? (
                    <>
                      <Loader2 aria-hidden className="campeonatos-modal-btn-loader" />
                      Reprovando…
                    </>
                  ) : (
                    "Reprovar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalEdicaoAberto && inscricaoEmEdicao ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Editar inscrição individual"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !salvandoEdicao) fecharEdicao();
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
                disabled={salvandoEdicao}
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
                    disabled={salvandoEdicao}
                  >
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="GG">GG</option>
                    <option value="XG">XG</option>
                    <option value="XGG">XGG</option>
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
                    disabled={salvandoEdicao}
                  />
                </div>

                <div className="grupo-formulario" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="edit-obs">Observação (opcional)</label>
                  <input
                    id="edit-obs"
                    value={editObservacao}
                    onChange={(e) => setEditObservacao(e.target.value)}
                    placeholder="Ex.: comprovante ilegível, ajustar valor, etc."
                    disabled={salvandoEdicao}
                  />
                </div>
              </div>

              <div className="campeonatos-modal-actions">
                <button
                  type="button"
                  className="campeonatos-btn campeonatos-btn--ghost"
                  onClick={fecharEdicao}
                  disabled={salvandoEdicao}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`campeonatos-btn campeonatos-btn--primary${salvandoEdicao ? " campeonatos-btn--with-loader" : ""}`}
                  disabled={salvandoEdicao}
                  aria-busy={salvandoEdicao}
                >
                  {salvandoEdicao ? (
                    <>
                      <Loader2 aria-hidden className="campeonatos-modal-btn-loader" />
                      Salvando…
                    </>
                  ) : (
                    "Salvar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {fotoModal ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Foto de perfil"
          style={{ zIndex: 60 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFotoModal(null);
          }}
        >
          <div className="campeonatos-modal campeonatos-modal--full">
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title">Foto de perfil</div>
                <div className="campeonatos-modal-name">{fotoModal.nome}</div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={() => setFotoModal(null)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="campeonatos-modal-scroll" style={{ display: "flex", justifyContent: "center" }}>
              <img
                src={fotoModal.src}
                alt={`Foto de perfil de ${fotoModal.nome}`}
                className="admin-comprovante-modal-img"
              />
            </div>
            <div className="campeonatos-modal-actions">
              <button
                type="button"
                className="campeonatos-btn campeonatos-btn--primary"
                onClick={() => setFotoModal(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {comprovanteModal ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Comprovante de pagamento"
          style={{ zIndex: 60 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setComprovanteModal(null);
          }}
        >
          <div className="campeonatos-modal campeonatos-modal--full">
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title">Comprovante de pagamento</div>
                <div className="campeonatos-modal-name">{comprovanteModal.jogador}</div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={() => setComprovanteModal(null)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="campeonatos-modal-scroll" style={{ display: "flex", justifyContent: "center" }}>
              <img
                src={comprovanteModal.src}
                alt={`Comprovante enviado por ${comprovanteModal.jogador}`}
                className="admin-comprovante-modal-img"
              />
            </div>
            <div className="campeonatos-modal-actions">
              <button
                type="button"
                className="campeonatos-btn campeonatos-btn--primary"
                onClick={() => setComprovanteModal(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

