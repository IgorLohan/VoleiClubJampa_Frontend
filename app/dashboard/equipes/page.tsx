"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CampeonatosPublicosPage from "@/app/campeonatos/page";
import PageLoader from "@/components/PageLoader";
import {
  atualizarInscricao,
  buscarResumoCampeonato,
  criarInscricaoAdmin,
  excluirInscricao,
  listarCampeonatosAdmin,
  montarEquipeComInscricoesIndividuais
} from "@/lib/api";
import { chavesSessao, getStorage } from "@/lib/sessao";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

export default function DashboardEquipesRoutePage() {
  const tokenAdmin = getStorage(chavesSessao.tokenAdmin);

  if (!tokenAdmin) {
    return <CampeonatosPublicosPage />;
  }

  return <EquipesAdminPage />;
}

function limiteMembrosTipo(tipo: string | null | undefined) {
  return tipo === "TIME" ? 4 : 2;
}

function traduzirTipoParticipanteLabel(tipo: string | null | undefined) {
  const t = String(tipo || "");
  if (t === "DUPLA") return "Dupla";
  if (t === "TIME") return "Quarteto";
  return t || "—";
}

function traduzirCategoriaLabel(cat: string | null | undefined) {
  const c = String(cat || "");
  if (c === "MASCULINO") return "Masculino";
  if (c === "FEMININO") return "Feminino";
  if (c === "MISTA") return "Mista";
  return c || "—";
}

function traduzirStatusInscricaoEquipe(status: string | null | undefined) {
  const s = String(status || "").toUpperCase();
  if (s === "APROVADA") return "Aprovada";
  if (s === "PENDENTE") return "Pendente";
  if (s === "RECUSADA") return "Recusada";
  return status || "—";
}

function classeBadgeStatusEquipe(status: string | null | undefined) {
  const s = String(status || "").toUpperCase();
  if (s === "APROVADA") return "minhas-inscricoes-badge--ok";
  if (s === "PENDENTE") return "minhas-inscricoes-badge--warn";
  if (s === "RECUSADA") return "minhas-inscricoes-badge--err";
  return "minhas-inscricoes-badge--neutral";
}

function traduzirGeneroJogador(genero: string | null | undefined) {
  const g = String(genero || "").toUpperCase();
  if (g === "M") return "M";
  if (g === "F") return "F";
  return genero || "—";
}

function inscricaoDisponivelParaMontagem(i: any) {
  return (
    String(i?.status || "").toUpperCase() === "PENDENTE" &&
    String(i?.statusAnalise || "").toUpperCase() === "APROVADA" &&
    !i?.participanteId &&
    !i?.participante
  );
}

type JogadorForm = { nome: string; genero: "M" | "F" };

function EquipesAdminPage() {
  const [mensagem, setMensagem] = useState("");
  const [campeonatos, setCampeonatos] = useState<Array<{ id: number; nome: string }>>([]);
  const [campeonatoId, setCampeonatoId] = useState<string>("");
  const [resumo, setResumo] = useState<any | null>(null);
  const [carregandoResumo, setCarregandoResumo] = useState(false);

  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [msgModal, setMsgModal] = useState("");
  const [salvandoCriar, setSalvandoCriar] = useState(false);
  const [formPorEquipe, setFormPorEquipe] = useState({
    nomeEquipe: "",
    responsavel: "",
    contato: "",
    jogadores: [] as JogadorForm[]
  });
  const [formMontarIndividual, setFormMontarIndividual] = useState<{
    nomeEquipe: string;
    capitaoInscricaoId: number | "";
    contato: string;
    selecionadas: number[];
  }>({
    nomeEquipe: "",
    capitaoInscricaoId: "",
    contato: "",
    selecionadas: []
  });

  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [msgModalEditar, setMsgModalEditar] = useState("");
  const [salvandoEditar, setSalvandoEditar] = useState(false);
  const [formEdicao, setFormEdicao] = useState<{
    inscricaoId: number;
    nomeEquipe: string;
    responsavel: string;
    contato: string;
    jogadores: Array<{ id?: number; nome: string; genero: "M" | "F" }>;
  } | null>(null);

  const jaTemJogos = (resumo?.jogos?.length ?? 0) > 0;

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
        setCampeonatoId((idAtual) => {
          if (idAtual) return idAtual;
          return opcoes.length ? String(opcoes[0].id) : "";
        });
        setMensagem("");
      } catch (err) {
        const error = err as Error;
        setMensagem(`Erro ao carregar campeonatos: ${error.message}`);
      }
    }
    carregarCampeonatos();
  }, []);

  useEffect(() => {
    async function carregarResumo() {
      if (!campeonatoId) {
        setResumo(null);
        return;
      }
      try {
        setCarregandoResumo(true);
        setMensagem("Carregando equipes...");
        const dados = await buscarResumoCampeonato(campeonatoId);
        setResumo(dados);
        setMensagem("");
      } catch (err) {
        const error = err as Error;
        setResumo(null);
        setMensagem(`Erro ao carregar equipes: ${error.message}`);
      } finally {
        setCarregandoResumo(false);
      }
    }
    carregarResumo();
  }, [campeonatoId]);

  const atualizarResumoSilencioso = useCallback(async () => {
    if (!campeonatoId) return;
    const dados = await buscarResumoCampeonato(campeonatoId);
    setResumo(dados);
  }, [campeonatoId]);

  const participantes = useMemo(() => {
    const lista = resumo?.participantes;
    return Array.isArray(lista) ? lista : [];
  }, [resumo]);

  const nomeCampeonato = resumo?.campeonato?.nome || "";
  const campeonato = resumo?.campeonato;
  const modoIndividual = campeonato?.modoInscricao === "INDIVIDUAL";
  const limite = limiteMembrosTipo(campeonato?.tipoParticipante);

  const inscricoesMontagem = useMemo(() => {
    const lista = (resumo?.inscricoesIndividuais || []) as any[];
    return lista.filter(inscricaoDisponivelParaMontagem);
  }, [resumo]);

  function abrirModalCriar() {
    if (!campeonato || !campeonatoId) return;
    const n = limiteMembrosTipo(campeonato.tipoParticipante);
    setFormPorEquipe({
      nomeEquipe: "",
      responsavel: "",
      contato: "",
      jogadores: Array.from({ length: n }, () => ({ nome: "", genero: "M" as const }))
    });
    setFormMontarIndividual({
      nomeEquipe: "",
      capitaoInscricaoId: "",
      contato: "",
      selecionadas: []
    });
    setMsgModal("");
    setModalCriarAberto(true);
  }

  function fecharModalCriar() {
    if (salvandoCriar) return;
    setModalCriarAberto(false);
    setMsgModal("");
  }

  function alternarSelecaoIndividual(id: number) {
    setFormMontarIndividual((prev) => {
      const s = prev.selecionadas;
      if (s.includes(id)) {
        const next = s.filter((x) => x !== id);
        const capitaoInscricaoId =
          prev.capitaoInscricaoId === id ? "" : prev.capitaoInscricaoId;
        return { ...prev, selecionadas: next, capitaoInscricaoId };
      }
      if (s.length >= limite) {
        return prev;
      }
      return { ...prev, selecionadas: [...s, id] };
    });
  }

  useEffect(() => {
    const s = formMontarIndividual.selecionadas;
    const cap = formMontarIndividual.capitaoInscricaoId;
    if (cap !== "" && !s.includes(cap)) {
      setFormMontarIndividual((prev) => ({ ...prev, capitaoInscricaoId: "" }));
    }
  }, [formMontarIndividual.selecionadas, formMontarIndividual.capitaoInscricaoId]);

  async function onSubmitPorEquipe(e: React.FormEvent) {
    e.preventDefault();
    if (!campeonatoId || !campeonato) return;

    const jogadores = formPorEquipe.jogadores.map((j) => ({
      nome: j.nome.trim(),
      genero: j.genero
    }));

    if (jogadores.some((j) => !j.nome)) {
      setMsgModal("Preencha o nome de todos os jogadores.");
      return;
    }

    if (jogadores.length !== limite) {
      setMsgModal(`Informe exatamente ${limite} jogador(es).`);
      return;
    }

    setSalvandoCriar(true);
    setMsgModal("");
    try {
      await criarInscricaoAdmin(campeonatoId, {
        nomeEquipe: formPorEquipe.nomeEquipe.trim(),
        responsavel: formPorEquipe.responsavel.trim(),
        contato: formPorEquipe.contato.trim() || null,
        jogadores
      });
      await atualizarResumoSilencioso();
      setModalCriarAberto(false);
    } catch (err) {
      const error = err as Error;
      setMsgModal(error.message || "Erro ao criar equipe.");
    } finally {
      setSalvandoCriar(false);
    }
  }

  async function onSubmitMontarIndividual(e: React.FormEvent) {
    e.preventDefault();
    if (!campeonatoId) return;

    const nomeEq = formMontarIndividual.nomeEquipe.trim();
    const capId = formMontarIndividual.capitaoInscricaoId;

    if (!nomeEq || capId === "") {
      setMsgModal(
        "Informe o nome da equipe e escolha o(a) capitã(o) entre os jogadores selecionados."
      );
      return;
    }

    if (formMontarIndividual.selecionadas.length !== limite) {
      setMsgModal(
        `Selecione exatamente ${limite} inscrição(ões) individual(is) aprovada(s) e disponível(is).`
      );
      return;
    }

    if (!formMontarIndividual.selecionadas.includes(capId)) {
      setMsgModal("O capitã(o) deve ser um dos jogadores marcados.");
      return;
    }

    const listaInd = (resumo?.inscricoesIndividuais || []) as any[];
    const inscCapitao = listaInd.find((i) => Number(i.id) === Number(capId));
    const resp = String(inscCapitao?.usuario?.nome || "").trim();
    if (!resp) {
      setMsgModal("Não foi possível obter o nome do capitã(o) selecionado.");
      return;
    }

    setSalvandoCriar(true);
    setMsgModal("");
    try {
      await montarEquipeComInscricoesIndividuais(campeonatoId, {
        nomeEquipe: nomeEq,
        responsavel: resp,
        contato: formMontarIndividual.contato.trim() || null,
        inscricaoIds: formMontarIndividual.selecionadas
      });
      await atualizarResumoSilencioso();
      setModalCriarAberto(false);
    } catch (err) {
      const error = err as Error;
      setMsgModal(error.message || "Erro ao montar equipe.");
    } finally {
      setSalvandoCriar(false);
    }
  }

  useEffect(() => {
    if (!modalCriarAberto) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape" && !salvandoCriar) {
        setModalCriarAberto(false);
        setMsgModal("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalCriarAberto, salvandoCriar]);

  function abrirModalEditar(participante: any) {
    if (!participante?.id) return;
    setFormEdicao({
      inscricaoId: Number(participante.id),
      nomeEquipe: String(participante.nomeEquipe || ""),
      responsavel: String(participante.responsavel || ""),
      contato: String(participante.contato || ""),
      jogadores: (participante.jogadores || []).map((j: any) => ({
        id: j.id,
        nome: String(j.nome || ""),
        genero: String(j.genero || "M").toUpperCase() === "F" ? "F" : "M"
      }))
    });
    setMsgModalEditar("");
    setModalEditarAberto(true);
  }

  function fecharModalEditar() {
    if (salvandoEditar) return;
    setModalEditarAberto(false);
    setFormEdicao(null);
    setMsgModalEditar("");
  }

  async function onSubmitEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!formEdicao || !campeonato) return;

    const jogadores = formEdicao.jogadores.map((j) => ({
      nome: j.nome.trim(),
      genero: j.genero
    }));

    if (jogadores.some((j) => !j.nome)) {
      setMsgModalEditar("Preencha o nome de todos os jogadores.");
      return;
    }

    if (jogadores.length !== limite) {
      setMsgModalEditar(`A equipe deve ter exatamente ${limite} jogador(es).`);
      return;
    }

    setSalvandoEditar(true);
    setMsgModalEditar("");
    try {
      await atualizarInscricao(formEdicao.inscricaoId, {
        nomeEquipe: formEdicao.nomeEquipe.trim(),
        responsavel: formEdicao.responsavel.trim(),
        contato: formEdicao.contato.trim() || null,
        jogadores
      });
      await atualizarResumoSilencioso();
      fecharModalEditar();
    } catch (err) {
      const error = err as Error;
      setMsgModalEditar(error.message || "Erro ao atualizar equipe.");
    } finally {
      setSalvandoEditar(false);
    }
  }

  async function excluirEquipe(inscricaoId: number) {
    const ok = window.confirm(
      "Excluir esta equipe e sua inscrição neste campeonato? Esta ação não pode ser desfeita."
    );
    if (!ok) return;
    setMensagem("Excluindo equipe...");
    try {
      await excluirInscricao(inscricaoId);
      await atualizarResumoSilencioso();
      setMensagem("");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao excluir equipe: ${error.message}`);
    }
  }

  useEffect(() => {
    if (!modalEditarAberto) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape" && !salvandoEditar) {
        setModalEditarAberto(false);
        setFormEdicao(null);
        setMsgModalEditar("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalEditarAberto, salvandoEditar]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="admin-dash-select" aria-label="Seleção de campeonato">
        <label className="admin-dash-label" htmlFor="admin-equipes-campeonato">
          Campeonato
        </label>
        <select
          id="admin-equipes-campeonato"
          className="admin-dash-select-control"
          value={campeonatoId}
          onChange={(e) => setCampeonatoId(e.target.value)}
          disabled={!campeonatos.length}
        >
          <option value="">
            {!campeonatos.length ? "Nenhum campeonato" : "Selecione um campeonato…"}
          </option>
          {campeonatos.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.nome}
            </option>
          ))}
        </select>
        {mensagem === "Carregando campeonatos..." ? (
          <PageLoader label="Carregando campeonatos" variant="section" />
        ) : mensagem && !campeonatoId ? (
          <p className="admin-dash-help">{mensagem}</p>
        ) : null}
      </section>

      {!campeonatoId ? (
        <p className="admin-dash-help admin-dash-help--center">
          Escolha um campeonato acima para ver as equipes inscritas (duplas, quartetos ou equipes
          montadas).
        </p>
      ) : carregandoResumo ? (
        <PageLoader label="Carregando equipes" variant="section" />
      ) : mensagem ? (
        <p className="admin-dash-help admin-dash-help--center">{mensagem}</p>
      ) : (
        <section className="card" aria-label="Equipes do campeonato">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12
            }}
          >
            <h2 style={{ margin: 0 }}>Equipes</h2>
            <button
              type="button"
              className="campeonatos-btn campeonatos-btn--primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              onClick={abrirModalCriar}
            >
              <Plus size={18} strokeWidth={2.5} aria-hidden />
              Criar equipe
            </button>
          </div>
          <p style={{ marginTop: 8, color: "rgba(11, 18, 32, 0.68)", fontWeight: 700 }}>
            {nomeCampeonato ? (
              <>
                <strong>Campeonato:</strong> {nomeCampeonato}
              </>
            ) : null}
          </p>

          {!participantes.length ? (
            <p className="campeonatos-msg" style={{ marginTop: 14 }}>
              Nenhuma equipe cadastrada neste campeonato.
            </p>
          ) : (
            <div className="campeonatos-table-wrap" style={{ marginTop: 14 }}>
              <table className="campeonatos-table" aria-label="Lista de equipes">
                <thead>
                  <tr>
                    <th>Equipe</th>
                    <th>Capitã(o)</th>
                    <th>Contato</th>
                    <th>Status</th>
                    <th>Jogadores</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {participantes.map((p: any, idx: number) => (
                    <tr key={p.id ?? idx}>
                      <td className="campeonatos-name" data-label="Equipe">
                        {p.nomeEquipe || "—"}
                      </td>
                      <td data-label="Capitã(o)">{p.responsavel || "—"}</td>
                      <td data-label="Contato">{p.contato?.trim?.() || "—"}</td>
                      <td data-label="Status">
                        <span
                          className={`minhas-inscricoes-badge ${classeBadgeStatusEquipe(
                            p.statusInscricao
                          )}`}
                        >
                          {traduzirStatusInscricaoEquipe(p.statusInscricao)}
                        </span>
                      </td>
                      <td data-label="Jogadores">
                        {p.jogadores?.length ? (
                          <ul className="campeonatos-modal-ul" style={{ margin: 0 }}>
                            {p.jogadores.map((j: any, jIdx: number) => (
                              <li key={j.id ?? jIdx}>
                                {j.nome} ({traduzirGeneroJogador(j.genero)})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Ações">
                        {jaTemJogos ? (
                          <span className="info-auxiliar" style={{ fontSize: "0.82rem" }}>
                            Após o chaveamento, edição e exclusão ficam bloqueadas.
                          </span>
                        ) : (
                          <div className="acoes-card" style={{ marginTop: 0 }}>
                            <button
                              type="button"
                              className="botao-pequeno botao-pequeno--icon"
                              onClick={() => abrirModalEditar(p)}
                              disabled={!p.id}
                              aria-label={`Editar inscrição — ${p.nomeEquipe || "equipe"}`}
                            >
                              <Pencil size={18} strokeWidth={2.25} aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="botao-pequeno botao-pequeno--icon botao-excluir"
                              onClick={() => void excluirEquipe(Number(p.id))}
                              disabled={!p.id}
                              aria-label={`Excluir inscrição — ${p.nomeEquipe || "equipe"}`}
                            >
                              <Trash2 size={18} strokeWidth={2.25} aria-hidden />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {modalCriarAberto && campeonato ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-criar-equipe-titulo"
          style={{ zIndex: 80 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !salvandoCriar) fecharModalCriar();
          }}
        >
          <div
            className="campeonatos-modal campeonatos-modal--full"
            style={{ width: "min(640px, calc(100vw - 32px))" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title" id="modal-criar-equipe-titulo">
                  Criar equipe
                </div>
                <div className="campeonatos-modal-name">
                  {nomeCampeonato} · {traduzirTipoParticipanteLabel(campeonato.tipoParticipante)} ·{" "}
                  {traduzirCategoriaLabel(campeonato.categoria)}
                </div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={fecharModalCriar}
                aria-label="Fechar"
                disabled={salvandoCriar}
              >
                ✕
              </button>
            </div>

            <div className="campeonatos-modal-scroll">
              <p className="info-auxiliar">
                {modoIndividual
                  ? "Monte a equipe escolhendo inscrições individuais já aprovadas e ainda não alocadas. A composição (sexo/categoria) segue as regras do campeonato."
                  : "Cadastre a equipe com nome, capitã(o), contato e a lista de jogadores (nomes e gênero M/F), no mesmo modelo usado na edição de inscrições no painel do campeonato."}
              </p>

              {msgModal ? (
                <p role="alert" style={{ color: "var(--cor-erro, #c62828)", fontWeight: 700 }}>
                  {msgModal}
                </p>
              ) : null}

              {modoIndividual ? (
                <form className="campeonatos-modal-section" onSubmit={onSubmitMontarIndividual}>
                  <div className="formulario-edicao-inscricao">
                    <div className="grupo-formulario">
                      <label htmlFor="eq-ind-nome">Nome da equipe</label>
                      <input
                        id="eq-ind-nome"
                        value={formMontarIndividual.nomeEquipe}
                        onChange={(e) =>
                          setFormMontarIndividual((p) => ({ ...p, nomeEquipe: e.target.value }))
                        }
                        placeholder="Ex.: Equipe 01"
                        required
                        disabled={salvandoCriar}
                      />
                    </div>
                    <div className="grupo-formulario">
                      <label htmlFor="eq-ind-cap">Capitã(o)</label>
                      <select
                        id="eq-ind-cap"
                        value={
                          formMontarIndividual.capitaoInscricaoId === ""
                            ? ""
                            : String(formMontarIndividual.capitaoInscricaoId)
                        }
                        onChange={(e) =>
                          setFormMontarIndividual((p) => ({
                            ...p,
                            capitaoInscricaoId:
                              e.target.value === "" ? "" : Number(e.target.value)
                          }))
                        }
                        required
                        disabled={
                          salvandoCriar || formMontarIndividual.selecionadas.length === 0
                        }
                      >
                        <option value="">
                          {formMontarIndividual.selecionadas.length === 0
                            ? "Marque os jogadores abaixo primeiro"
                            : "Selecione o(a) capitã(o)"}
                        </option>
                        {formMontarIndividual.selecionadas.map((idInsc) => {
                          const i = inscricoesMontagem.find(
                            (x: any) => Number(x.id) === Number(idInsc)
                          );
                          if (!i) return null;
                          return (
                            <option key={i.id} value={String(i.id)}>
                              {i.usuario?.nome || "Jogador"}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="grupo-formulario">
                      <label htmlFor="eq-ind-contato">Contato</label>
                      <input
                        id="eq-ind-contato"
                        value={formMontarIndividual.contato}
                        onChange={(e) =>
                          setFormMontarIndividual((p) => ({ ...p, contato: e.target.value }))
                        }
                        placeholder="Opcional"
                        disabled={salvandoCriar}
                      />
                    </div>
                  </div>

                  <h3 className="campeonatos-modal-h2" style={{ fontSize: "1rem", marginTop: 8 }}>
                    Inscrições disponíveis ({formMontarIndividual.selecionadas.length}/{limite})
                  </h3>
                  {!inscricoesMontagem.length ? (
                    <p className="campeonatos-msg">
                      Nenhuma inscrição individual aprovada e livre para montagem. Aprove novas
                      inscrições ou aguarde cancelamentos.
                    </p>
                  ) : (
                    <ul className="lista-simples" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {inscricoesMontagem.map((i: any) => {
                        const checked = formMontarIndividual.selecionadas.includes(i.id);
                        const bloqueado =
                          !checked &&
                          formMontarIndividual.selecionadas.length >= limite &&
                          !salvandoCriar;
                        return (
                          <li key={i.id} className="item-lista">
                            <label
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "flex-start",
                                cursor: bloqueado ? "not-allowed" : "pointer"
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={Boolean(salvandoCriar) || bloqueado}
                                onChange={() => alternarSelecaoIndividual(i.id)}
                              />
                              <span>
                                <strong>{i.usuario?.nome || "Jogador"}</strong>
                                <br />
                                <span className="info-auxiliar">
                                  Camisa {i.tamanhoCamisa || "—"} · {i.usuario?.sexo || "—"}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="campeonatos-modal-actions">
                    <button
                      type="button"
                      className="campeonatos-btn campeonatos-btn--ghost"
                      onClick={fecharModalCriar}
                      disabled={salvandoCriar}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={`campeonatos-btn campeonatos-btn--primary${salvandoCriar ? " campeonatos-btn--with-loader" : ""}`}
                      disabled={
                        salvandoCriar ||
                        formMontarIndividual.selecionadas.length !== limite ||
                        !inscricoesMontagem.length
                      }
                    >
                      {salvandoCriar ? (
                        <>
                          <Loader2 aria-hidden className="campeonatos-modal-btn-loader" />
                          Salvando…
                        </>
                      ) : (
                        "Montar equipe"
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form className="campeonatos-modal-section" onSubmit={onSubmitPorEquipe}>
                  <div className="formulario-edicao-inscricao">
                    <div className="grupo-formulario">
                      <label htmlFor="eq-pe-nome">Nome da equipe</label>
                      <input
                        id="eq-pe-nome"
                        value={formPorEquipe.nomeEquipe}
                        onChange={(e) =>
                          setFormPorEquipe((p) => ({ ...p, nomeEquipe: e.target.value }))
                        }
                        required
                        disabled={salvandoCriar}
                      />
                    </div>
                    <div className="grupo-formulario">
                      <label htmlFor="eq-pe-cap">Capitã(o)</label>
                      <input
                        id="eq-pe-cap"
                        value={formPorEquipe.responsavel}
                        onChange={(e) =>
                          setFormPorEquipe((p) => ({ ...p, responsavel: e.target.value }))
                        }
                        required
                        disabled={salvandoCriar}
                      />
                    </div>
                    <div className="grupo-formulario">
                      <label htmlFor="eq-pe-contato">Contato</label>
                      <input
                        id="eq-pe-contato"
                        value={formPorEquipe.contato}
                        onChange={(e) =>
                          setFormPorEquipe((p) => ({ ...p, contato: e.target.value }))
                        }
                        placeholder="Telefone / WhatsApp"
                        disabled={salvandoCriar}
                      />
                    </div>
                  </div>

                  <h3 className="campeonatos-modal-h2" style={{ fontSize: "1rem", marginTop: 8 }}>
                    Jogadores ({limite})
                  </h3>
                  <div className="bloco-jogadores-edicao">
                    {formPorEquipe.jogadores.map((jog, idx) => (
                      <div key={idx} className="card-jogador">
                        <h4>Jogador {idx + 1}</h4>
                        <div className="grupo-formulario">
                          <label htmlFor={`eq-pe-jog-nome-${idx}`}>Nome</label>
                          <input
                            id={`eq-pe-jog-nome-${idx}`}
                            value={jog.nome}
                            onChange={(e) =>
                              setFormPorEquipe((p) => {
                                const jogadores = [...p.jogadores];
                                jogadores[idx] = { ...jogadores[idx], nome: e.target.value };
                                return { ...p, jogadores };
                              })
                            }
                            required
                            disabled={salvandoCriar}
                          />
                        </div>
                        <div className="grupo-formulario">
                          <label htmlFor={`eq-pe-jog-gen-${idx}`}>Gênero</label>
                          <select
                            id={`eq-pe-jog-gen-${idx}`}
                            value={jog.genero}
                            onChange={(e) =>
                              setFormPorEquipe((p) => {
                                const jogadores = [...p.jogadores];
                                jogadores[idx] = {
                                  ...jogadores[idx],
                                  genero: e.target.value as "M" | "F"
                                };
                                return { ...p, jogadores };
                              })
                            }
                            disabled={salvandoCriar}
                          >
                            <option value="M">Masculino (M)</option>
                            <option value="F">Feminino (F)</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="campeonatos-modal-actions">
                    <button
                      type="button"
                      className="campeonatos-btn campeonatos-btn--ghost"
                      onClick={fecharModalCriar}
                      disabled={salvandoCriar}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={`campeonatos-btn campeonatos-btn--primary${salvandoCriar ? " campeonatos-btn--with-loader" : ""}`}
                      disabled={salvandoCriar}
                    >
                      {salvandoCriar ? (
                        <>
                          <Loader2 aria-hidden className="campeonatos-modal-btn-loader" />
                          Salvando…
                        </>
                      ) : (
                        "Cadastrar equipe"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {modalEditarAberto && formEdicao && campeonato ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-editar-equipe-titulo"
          style={{ zIndex: 80 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !salvandoEditar) fecharModalEditar();
          }}
        >
          <div
            className="campeonatos-modal campeonatos-modal--full"
            style={{ width: "min(640px, calc(100vw - 32px))" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title" id="modal-editar-equipe-titulo">
                  Editar equipe
                </div>
                <div className="campeonatos-modal-name">
                  {nomeCampeonato} · {traduzirTipoParticipanteLabel(campeonato.tipoParticipante)} ·{" "}
                  {traduzirCategoriaLabel(campeonato.categoria)}
                </div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={fecharModalEditar}
                aria-label="Fechar"
                disabled={salvandoEditar}
              >
                ✕
              </button>
            </div>

            <div className="campeonatos-modal-scroll">
              <p className="info-auxiliar">
                Altere nome da equipe, capitã(o), contato e dados dos jogadores. As alterações seguem
                as mesmas regras do cadastro (quantidade de jogadores conforme o tipo do campeonato).
              </p>

              {msgModalEditar ? (
                <p role="alert" style={{ color: "var(--cor-erro, #c62828)", fontWeight: 700 }}>
                  {msgModalEditar}
                </p>
              ) : null}

              <form className="campeonatos-modal-section" onSubmit={onSubmitEdicao}>
                <div className="formulario-edicao-inscricao">
                  <div className="grupo-formulario">
                    <label htmlFor="eq-ed-nome">Nome da equipe</label>
                    <input
                      id="eq-ed-nome"
                      value={formEdicao.nomeEquipe}
                      onChange={(e) =>
                        setFormEdicao((prev) =>
                          prev ? { ...prev, nomeEquipe: e.target.value } : prev
                        )
                      }
                      required
                      disabled={salvandoEditar}
                    />
                  </div>
                  <div className="grupo-formulario">
                    <label htmlFor="eq-ed-cap">Capitã(o)</label>
                    <input
                      id="eq-ed-cap"
                      value={formEdicao.responsavel}
                      onChange={(e) =>
                        setFormEdicao((prev) =>
                          prev ? { ...prev, responsavel: e.target.value } : prev
                        )
                      }
                      required
                      disabled={salvandoEditar}
                    />
                  </div>
                  <div className="grupo-formulario">
                    <label htmlFor="eq-ed-contato">Contato</label>
                    <input
                      id="eq-ed-contato"
                      value={formEdicao.contato}
                      onChange={(e) =>
                        setFormEdicao((prev) =>
                          prev ? { ...prev, contato: e.target.value } : prev
                        )
                      }
                      placeholder="Telefone / WhatsApp"
                      disabled={salvandoEditar}
                    />
                  </div>
                </div>

                <h3 className="campeonatos-modal-h2" style={{ fontSize: "1rem", marginTop: 8 }}>
                  Jogadores ({limite})
                </h3>
                <div className="bloco-jogadores-edicao">
                  {formEdicao.jogadores.map((jog, idx) => (
                    <div key={jog.id ?? idx} className="card-jogador">
                      <h4>Jogador {idx + 1}</h4>
                      <div className="grupo-formulario">
                        <label htmlFor={`eq-ed-jog-nome-${idx}`}>Nome</label>
                        <input
                          id={`eq-ed-jog-nome-${idx}`}
                          value={jog.nome}
                          onChange={(e) =>
                            setFormEdicao((prev) => {
                              if (!prev) return prev;
                              const jogadores = [...prev.jogadores];
                              jogadores[idx] = { ...jogadores[idx], nome: e.target.value };
                              return { ...prev, jogadores };
                            })
                          }
                          required
                          disabled={salvandoEditar}
                        />
                      </div>
                      <div className="grupo-formulario">
                        <label htmlFor={`eq-ed-jog-gen-${idx}`}>Gênero</label>
                        <select
                          id={`eq-ed-jog-gen-${idx}`}
                          value={jog.genero}
                          onChange={(e) =>
                            setFormEdicao((prev) => {
                              if (!prev) return prev;
                              const jogadores = [...prev.jogadores];
                              jogadores[idx] = {
                                ...jogadores[idx],
                                genero: e.target.value as "M" | "F"
                              };
                              return { ...prev, jogadores };
                            })
                          }
                          disabled={salvandoEditar}
                        >
                          <option value="M">Masculino (M)</option>
                          <option value="F">Feminino (F)</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="campeonatos-modal-actions">
                  <button
                    type="button"
                    className="campeonatos-btn campeonatos-btn--ghost"
                    onClick={fecharModalEditar}
                    disabled={salvandoEditar}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`campeonatos-btn campeonatos-btn--primary${salvandoEditar ? " campeonatos-btn--with-loader" : ""}`}
                    disabled={salvandoEditar}
                  >
                    {salvandoEditar ? (
                      <>
                        <Loader2 aria-hidden className="campeonatos-modal-btn-loader" />
                        Salvando…
                      </>
                    ) : (
                      "Salvar alterações"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
