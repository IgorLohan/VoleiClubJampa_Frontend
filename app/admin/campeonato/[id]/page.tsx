"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  atualizarCampeonato,
  atualizarInscricao,
  aprovarInscricaoIndividual,
  buscarResumoCampeonato,
  encerrarInscricoes,
  excluirCampeonato,
  excluirInscricao,
  gerarChaveamento,
  montarEquipeComInscricoesIndividuais,
  registrarPlacar,
  reabrirInscricoes,
  reprovarInscricaoIndividual
} from "@/lib/api";
import {
  chavesSessao,
  getJSONStorage,
  getStorage,
  logoutAdmin
} from "@/lib/sessao";

type AdminLogado = { nome: string; email: string } | null;

type JogadorEdit = { id?: number; nome: string; genero: "M" | "F" };
type FormInscricao = {
  nomeEquipe: string;
  responsavel: string;
  contato: string;
  jogadores: JogadorEdit[];
};

type FormMontarEquipe = {
  nomeEquipe: string;
  responsavel: string;
  contato: string;
};

function formatarData(data: string | null | undefined) {
  if (!data) return "Não informada";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatarDataInput(data: string | null | undefined) {
  if (!data) return "";
  return new Date(data).toISOString().split("T")[0];
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

function traduzirStatusCampeonato(status: string) {
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

function agruparJogosPorColunaMataMata(jogos: any[]) {
  const grupos: Record<string, any[]> = {
    "Primeira fase": jogos.filter((j) => j.fase === "PRIMEIRA_FASE"),
    Semifinais: jogos.filter(
      (j) => j.fase === "SEMIFINAL_1" || j.fase === "SEMIFINAL_2"
    ),
    Final: jogos.filter((j) => j.fase === "FINAL"),
    "3º Lugar": jogos.filter((j) => j.fase === "TERCEIRO_LUGAR")
  };
  return Object.entries(grupos).filter(([, lista]) => lista.length > 0);
}

type SetPayload = { numeroSet: number; pontosA: number; pontosB: number };

function traduzirStatusAnalise(status: string) {
  const mapa: Record<string, string> = {
    AGUARDANDO_ANALISE: "Aguardando análise",
    APROVADA: "Aprovada",
    REPROVADA: "Reprovada"
  };
  return mapa[status] || status;
}

function traduzirStatusInscricaoIndividual(status: string) {
  const mapa: Record<string, string> = {
    PENDENTE: "Pendente",
    USADA_EM_EQUIPE: "Usada em equipe",
    CANCELADA: "Cancelada"
  };
  return mapa[status] || status;
}

function limiteMembrosPorTipo(tipoParticipante: string) {
  if (tipoParticipante === "DUPLA") return 2;
  if (tipoParticipante === "TIME") return 4;
  return 2;
}

export default function AdminCampeonatoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const campeonatoId = params?.id;

  const [mensagem, setMensagem] = useState("");
  const [admin, setAdmin] = useState<AdminLogado>(null);
  const [resumo, setResumo] = useState<any | null>(null);

  const [editandoCampeonato, setEditandoCampeonato] = useState(false);
  const [formCampeonato, setFormCampeonato] = useState({
    nome: "",
    data: "",
    local: "",
    tipoParticipante: "DUPLA",
    categoria: "MASCULINO",
    formato: "MATA_MATA",
    quantidadeMaxima: ""
  });

  const [inscricaoEmEdicaoId, setInscricaoEmEdicaoId] = useState<number | null>(
    null
  );
  const [formInscricao, setFormInscricao] = useState<FormInscricao | null>(null);

  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [obsReprovacao, setObsReprovacao] = useState<Record<number, string>>({});
  const [formEquipe, setFormEquipe] = useState<FormMontarEquipe>({
    nomeEquipe: "",
    responsavel: "",
    contato: ""
  });

  useEffect(() => {
    const token = getStorage(chavesSessao.tokenAdmin);
    if (!token) {
      router.replace("/login");
      return;
    }
    setAdmin(getJSONStorage(chavesSessao.adminLogado));
  }, [router]);

  async function carregarResumo(limparMensagem = true) {
    if (!campeonatoId) return;
    try {
      if (limparMensagem) setMensagem("Carregando campeonato...");
      const dados = await buscarResumoCampeonato(campeonatoId);
      setResumo(dados);

      setFormCampeonato({
        nome: dados.campeonato.nome || "",
        data: formatarDataInput(dados.campeonato.data),
        local: dados.campeonato.local || "",
        tipoParticipante: dados.campeonato.tipoParticipante,
        categoria: dados.campeonato.categoria,
        formato: dados.campeonato.formato,
        quantidadeMaxima:
          dados.campeonato.quantidadeMaxima === null ||
          dados.campeonato.quantidadeMaxima === undefined
            ? ""
            : String(dados.campeonato.quantidadeMaxima)
      });

      if (limparMensagem) setMensagem("");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao carregar campeonato: ${error.message}`);
    }
  }

  useEffect(() => {
    carregarResumo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campeonatoId]);

  const colunasChave = useMemo(() => {
    if (!resumo?.jogos?.length) return [];
    return agruparJogosPorColunaMataMata(resumo.jogos);
  }, [resumo]);

  function sair() {
    logoutAdmin();
    router.push("/login");
  }

  async function onEncerrar() {
    try {
      setMensagem("Encerrando inscrições...");
      await encerrarInscricoes(campeonatoId);
      await carregarResumo(false);
      setMensagem("Inscrições encerradas com sucesso.");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao encerrar inscrições: ${error.message}`);
    }
  }

  async function onReabrir() {
    try {
      setMensagem("Reabrindo inscrições...");
      await reabrirInscricoes(campeonatoId);
      await carregarResumo(false);
      setMensagem("Inscrições reabertas com sucesso.");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao reabrir inscrições: ${error.message}`);
    }
  }

  async function onGerarChaveamento() {
    try {
      setMensagem("Gerando chaveamento...");
      await gerarChaveamento(campeonatoId);
      await carregarResumo(false);
      setMensagem("Chaveamento gerado com sucesso.");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao gerar chaveamento: ${error.message}`);
    }
  }

  async function onExcluirCampeonato() {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este campeonato?"
    );
    if (!confirmar) return;
    try {
      setMensagem("Excluindo campeonato...");
      await excluirCampeonato(campeonatoId);
      router.push("/dashboard/admin");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao excluir campeonato: ${error.message}`);
    }
  }

  async function copiarLinkInscricao() {
    const url = `${window.location.origin}/inscricao/${campeonatoId}`;
    try {
      await navigator.clipboard.writeText(url);
      setMensagem("Link da inscrição copiado com sucesso.");
    } catch {
      setMensagem(`Copie manualmente este link: ${url}`);
    }
  }

  const podeEditarCampeonato = resumo ? resumo.jogos.length === 0 : false;
  const possuiInscritos = resumo ? resumo.totais.participantes > 0 : false;
  const minimoQuantidade = resumo ? Math.max(1, resumo.totais.participantes) : 1;

  async function onSalvarCampeonato(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resumo) return;

    const quantidadeMaximaValor = formCampeonato.quantidadeMaxima
      ? Number(formCampeonato.quantidadeMaxima)
      : null;

    if (
      quantidadeMaximaValor !== null &&
      quantidadeMaximaValor < resumo.totais.participantes
    ) {
      setMensagem(
        `Erro: a quantidade máxima não pode ser menor que o total atual de inscritos (${resumo.totais.participantes}).`
      );
      return;
    }

    try {
      setMensagem("Salvando campeonato...");
      await atualizarCampeonato(campeonatoId, {
        nome: formCampeonato.nome.trim(),
        data: formCampeonato.data || null,
        local: formCampeonato.local.trim() || null,
        tipoParticipante: possuiInscritos
          ? resumo.campeonato.tipoParticipante
          : formCampeonato.tipoParticipante,
        categoria: possuiInscritos
          ? resumo.campeonato.categoria
          : formCampeonato.categoria,
        formato: possuiInscritos
          ? resumo.campeonato.formato
          : formCampeonato.formato,
        quantidadeMaxima: quantidadeMaximaValor
      });
      setEditandoCampeonato(false);
      await carregarResumo(false);
      setMensagem("Campeonato atualizado com sucesso.");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro: ${error.message}`);
    }
  }

  function iniciarEdicaoInscricao(participante: any) {
    setInscricaoEmEdicaoId(participante.id);
    setFormInscricao({
      nomeEquipe: participante.nomeEquipe,
      responsavel: participante.responsavel,
      contato: participante.contato || "",
      jogadores: participante.jogadores.map((j: any) => ({
        id: j.id,
        nome: j.nome,
        genero: j.genero as "M" | "F"
      }))
    });
    setMensagem("");
  }

  async function onSalvarInscricao(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inscricaoEmEdicaoId || !formInscricao) return;
    try {
      setMensagem("Atualizando inscrição...");
      await atualizarInscricao(inscricaoEmEdicaoId, {
        nomeEquipe: formInscricao.nomeEquipe.trim(),
        responsavel: formInscricao.responsavel.trim(),
        contato: formInscricao.contato.trim() || null,
        jogadores: formInscricao.jogadores.map((j) => ({
          nome: j.nome.trim(),
          genero: j.genero
        }))
      });
      setInscricaoEmEdicaoId(null);
      setFormInscricao(null);
      await carregarResumo(false);
      setMensagem("Inscrição atualizada com sucesso.");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro: ${error.message}`);
    }
  }

  async function onExcluirInscricao(inscricaoId: number) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir esta inscrição?"
    );
    if (!confirmar) return;
    try {
      setMensagem("Excluindo inscrição...");
      await excluirInscricao(inscricaoId);
      await carregarResumo(false);
      setMensagem("Inscrição excluída com sucesso.");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao excluir inscrição: ${error.message}`);
    }
  }

  async function onRegistrarPlacar(jogoId: number, sets: SetPayload[]) {
    try {
      setMensagem("Salvando placar...");
      await registrarPlacar(jogoId, sets);
      await carregarResumo(false);
      setMensagem("Placar registrado com sucesso.");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao salvar placar: ${error.message}`);
    }
  }

  function extrairSets(formEl: HTMLFormElement): SetPayload[] {
    const get = (name: string) =>
      (formEl.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";
    const set1a = get("set1a");
    const set1b = get("set1b");
    const set2a = get("set2a");
    const set2b = get("set2b");
    const set3a = get("set3a");
    const set3b = get("set3b");

    const sets: SetPayload[] = [
      { numeroSet: 1, pontosA: Number(set1a), pontosB: Number(set1b) },
      { numeroSet: 2, pontosA: Number(set2a), pontosB: Number(set2b) }
    ];

    const terceiroPreenchido = set3a !== "" && set3b !== "";
    if (terceiroPreenchido) {
      sets.push({
        numeroSet: 3,
        pontosA: Number(set3a),
        pontosB: Number(set3b)
      });
    }

    return sets;
  }

  const finalizado = resumo?.statusCampeonato === "FINALIZADO";
  const inscricoesFechadas = resumo ? !resumo.campeonato.inscricoesAbertas : false;
  const jaTemJogos = resumo ? resumo.jogos.length > 0 : false;
  const podeGerar = resumo
    ? resumo.totais.participantes === 2 || resumo.totais.participantes === 4
    : false;

  const modoInscricao = resumo?.campeonato?.modoInscricao;
  const modoIndividual = modoInscricao === "INDIVIDUAL";
  const tamanhoEquipe = resumo ? limiteMembrosPorTipo(resumo.campeonato.tipoParticipante) : 2;

  function alternarSelecao(id: number) {
    setSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onAprovarIndividual(inscricaoId: number) {
    try {
      setMensagem("Aprovando inscrição individual...");
      await aprovarInscricaoIndividual(inscricaoId);
      await carregarResumo(false);
      setMensagem("Inscrição aprovada.");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao aprovar: ${error.message}`);
    }
  }

  async function onReprovarIndividual(inscricaoId: number) {
    try {
      setMensagem("Reprovando inscrição individual...");
      await reprovarInscricaoIndividual(inscricaoId, obsReprovacao[inscricaoId] || "");
      await carregarResumo(false);
      setMensagem("Inscrição reprovada.");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao reprovar: ${error.message}`);
    }
  }

  async function onMontarEquipe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resumo) return;
    if (selecionadas.length !== tamanhoEquipe) {
      setMensagem(`Selecione exatamente ${tamanhoEquipe} inscrição(ões) para montar a equipe.`);
      return;
    }
    try {
      setMensagem("Montando equipe...");
      await montarEquipeComInscricoesIndividuais(campeonatoId, {
        nomeEquipe: formEquipe.nomeEquipe.trim(),
        responsavel: formEquipe.responsavel.trim(),
        contato: formEquipe.contato.trim() || null,
        inscricaoIds: selecionadas
      });
      setSelecionadas([]);
      setFormEquipe({ nomeEquipe: "", responsavel: "", contato: "" });
      await carregarResumo(false);
      setMensagem("Equipe montada com sucesso.");
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao montar equipe: ${error.message}`);
    }
  }

  return (
    <main className="container">
      <header className="cabecalho topo-inicio">
        <div>
          <h1>Administração do campeonato</h1>
          <p>Gerencie inscrições, chaveamento e placares.</p>
          <div className="acoes-card">
            <Link href="/dashboard/admin" className="link-voltar">
              ← Voltar para painel
            </Link>
            <Link
              href={`/campeonatos/${campeonatoId}`}
              className="link-admin-discreto"
            >
              Ver página pública
            </Link>
          </div>
        </div>

        <div className="acoes-usuario">
          <div className="usuario-logado-box" style={{ marginBottom: 0 }}>
            {admin ? (
              <>
                <p>
                  <strong>Administrador logado:</strong> {admin.nome}
                </p>
                <p>
                  <strong>E-mail:</strong> {admin.email}
                </p>
              </>
            ) : (
              <p>Nenhum administrador autenticado.</p>
            )}
          </div>
          <button type="button" className="botao secundario" onClick={sair}>
            Sair
          </button>
        </div>
      </header>

      <section className="card">
        <div className="acoes-topo">
          <button
            className="botao-pequeno botao-copiar"
            type="button"
            onClick={copiarLinkInscricao}
          >
            Copiar link da inscrição
          </button>
          <button
            className="botao-pequeno secundario"
            type="button"
            onClick={onEncerrar}
            disabled={inscricoesFechadas || finalizado}
          >
            Encerrar inscrições
          </button>
          <button
            className="botao-pequeno secundario"
            type="button"
            onClick={onReabrir}
            disabled={!inscricoesFechadas || jaTemJogos || finalizado}
          >
            Reabrir inscrições
          </button>
          <button
            className="botao-pequeno"
            type="button"
            onClick={onGerarChaveamento}
            disabled={
              jaTemJogos ||
              finalizado ||
              (resumo ? resumo.campeonato.inscricoesAbertas : true) ||
              !podeGerar
            }
          >
            Gerar chaveamento
          </button>
          <button
            className="botao-pequeno botao-excluir botao-excluir-campeonato"
            type="button"
            onClick={onExcluirCampeonato}
          >
            Excluir campeonato
          </button>
        </div>

        <p className="mensagem">{mensagem}</p>
      </section>

      {resumo ? (
        <>
          <section className="card">
            <h2>Dados do campeonato</h2>
            <div className="bloco-informacoes">
              <p>
                <strong>Nome:</strong> {resumo.campeonato.nome}
              </p>
              <p>
                <strong>Data:</strong> {formatarData(resumo.campeonato.data)}
              </p>
              <p>
                <strong>Local:</strong> {resumo.campeonato.local || "Não informado"}
              </p>
              <p>
                <strong>Tipo:</strong>{" "}
                {traduzirTipoParticipante(resumo.campeonato.tipoParticipante)}
              </p>
              <p>
                <strong>Categoria:</strong> {resumo.campeonato.categoria}
              </p>
              <p>
                <strong>Formato:</strong>{" "}
                {traduzirFormato(resumo.campeonato.formato)}
              </p>
              <p>
                <strong>Quantidade máxima:</strong>{" "}
                {resumo.campeonato.quantidadeMaxima ?? "Não definida"}
              </p>
              <p>
                <strong>Inscrições abertas:</strong>{" "}
                {resumo.campeonato.inscricoesAbertas ? "Sim" : "Não"}
              </p>
              <p>
                <strong>Total de participantes:</strong> {resumo.totais.participantes}
              </p>
              <p>
                <strong>Total de jogos:</strong> {resumo.totais.jogos}
              </p>
              <p>
                <strong>Jogos finalizados:</strong> {resumo.totais.jogosFinalizados}
              </p>
              <span
                className={`status-badge ${classeStatusCampeonato(
                  resumo.statusCampeonato
                )}`}
              >
                {traduzirStatusCampeonato(resumo.statusCampeonato)}
              </span>

              {podeEditarCampeonato ? (
                <div className="acoes-card" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="botao-pequeno"
                    onClick={() => setEditandoCampeonato(true)}
                  >
                    Editar campeonato
                  </button>
                  {editandoCampeonato ? (
                    <button
                      type="button"
                      className="botao-pequeno secundario"
                      onClick={() => setEditandoCampeonato(false)}
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="info-auxiliar">
                  A edição do campeonato fica indisponível após gerar o chaveamento.
                </p>
              )}

              {editandoCampeonato && podeEditarCampeonato ? (
                <div className="area-edicao-campeonato">
                  <h4>Editar campeonato</h4>
                  {possuiInscritos ? (
                    <p className="info-auxiliar">
                      Como já existem participantes inscritos, os campos Tipo, Categoria
                      e Formato não podem mais ser alterados.
                    </p>
                  ) : null}

                  <form
                    className="formulario-edicao-campeonato"
                    onSubmit={onSalvarCampeonato}
                  >
                    <div className="grupo-formulario">
                      <label>Nome</label>
                      <input
                        value={formCampeonato.nome}
                        onChange={(e) =>
                          setFormCampeonato((p) => ({ ...p, nome: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="grupo-formulario">
                      <label>Data</label>
                      <input
                        type="date"
                        value={formCampeonato.data}
                        onChange={(e) =>
                          setFormCampeonato((p) => ({ ...p, data: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grupo-formulario">
                      <label>Local</label>
                      <input
                        value={formCampeonato.local}
                        onChange={(e) =>
                          setFormCampeonato((p) => ({ ...p, local: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grupo-formulario">
                      <label>Tipo</label>
                      <select
                        value={formCampeonato.tipoParticipante}
                        onChange={(e) =>
                          setFormCampeonato((p) => ({
                            ...p,
                            tipoParticipante: e.target.value
                          }))
                        }
                        disabled={possuiInscritos}
                        required
                      >
                        <option value="DUPLA">Dupla</option>
                        <option value="TIME">Quarteto</option>
                      </select>
                    </div>
                    <div className="grupo-formulario">
                      <label>Categoria</label>
                      <select
                        value={formCampeonato.categoria}
                        onChange={(e) =>
                          setFormCampeonato((p) => ({
                            ...p,
                            categoria: e.target.value
                          }))
                        }
                        disabled={possuiInscritos}
                        required
                      >
                        <option value="MASCULINO">Masculino</option>
                        <option value="FEMININO">Feminino</option>
                        <option value="MISTA">Mista</option>
                      </select>
                    </div>
                    <div className="grupo-formulario">
                      <label>Formato</label>
                      <select
                        value={formCampeonato.formato}
                        onChange={(e) =>
                          setFormCampeonato((p) => ({ ...p, formato: e.target.value }))
                        }
                        disabled={possuiInscritos}
                        required
                      >
                        <option value="MATA_MATA">Mata-mata</option>
                        <option value="DUPLA_ELIMINACAO">Upper/Lower</option>
                        <option value="TODOS_CONTRA_TODOS">Todos contra todos</option>
                      </select>
                    </div>
                    <div className="grupo-formulario">
                      <label>Quantidade máxima</label>
                      <input
                        type="number"
                        min={minimoQuantidade}
                        value={formCampeonato.quantidadeMaxima}
                        onChange={(e) =>
                          setFormCampeonato((p) => ({
                            ...p,
                            quantidadeMaxima: e.target.value
                          }))
                        }
                      />
                    </div>
                    <div className="acoes-card">
                      <button type="submit" className="botao-pequeno">
                        Salvar campeonato
                      </button>
                      <button
                        type="button"
                        className="botao-pequeno secundario"
                        onClick={() => setEditandoCampeonato(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
          </section>

          <section className="card">
            <h2>{modoIndividual ? "Inscrições individuais" : "Participantes"}</h2>

            {modoIndividual ? (
              <>
                {!resumo.inscricoesIndividuais?.length ? (
                  <p>Nenhuma inscrição individual recebida.</p>
                ) : (
                  <>
                    <p className="info-auxiliar">
                      Selecione inscrições <strong>aprovadas</strong> para montar uma{" "}
                      {resumo.campeonato.tipoParticipante === "DUPLA" ? "dupla" : "equipe"} (
                      {tamanhoEquipe} pessoas).
                    </p>

                    <form className="formulario-edicao-inscricao" onSubmit={onMontarEquipe}>
                      <div className="grupo-formulario">
                        <label>Nome da equipe</label>
                        <input
                          value={formEquipe.nomeEquipe}
                          onChange={(e) =>
                            setFormEquipe((p) => ({ ...p, nomeEquipe: e.target.value }))
                          }
                          placeholder="Ex.: Equipe 01"
                          required
                        />
                      </div>
                      <div className="grupo-formulario">
                        <label>Capitã(o)</label>
                        <input
                          value={formEquipe.responsavel}
                          onChange={(e) =>
                            setFormEquipe((p) => ({ ...p, responsavel: e.target.value }))
                          }
                          placeholder="Nome do responsável"
                          required
                        />
                      </div>
                      <div className="grupo-formulario">
                        <label>Contato</label>
                        <input
                          value={formEquipe.contato}
                          onChange={(e) =>
                            setFormEquipe((p) => ({ ...p, contato: e.target.value }))
                          }
                          placeholder="Opcional"
                        />
                      </div>
                      <div className="acoes-card">
                        <button
                          type="submit"
                          className="botao-pequeno"
                          disabled={selecionadas.length !== tamanhoEquipe}
                        >
                          Montar equipe com selecionadas ({selecionadas.length}/{tamanhoEquipe})
                        </button>
                        {selecionadas.length ? (
                          <button
                            type="button"
                            className="botao-pequeno secundario"
                            onClick={() => setSelecionadas([])}
                          >
                            Limpar seleção
                          </button>
                        ) : null}
                      </div>
                    </form>

                    <div className="lista-simples">
                      {resumo.inscricoesIndividuais.map((i: any) => {
                        const podeSelecionar =
                          i.statusAnalise === "APROVADA" && i.status === "PENDENTE";
                        const checked = selecionadas.includes(i.id);
                        const comprovante = i.comprovantePagamento;

                        return (
                          <div key={i.id} className="item-lista">
                            <h3>{i.usuario?.nome || "Usuário"}</h3>
                            <p>
                              <strong>Status análise:</strong>{" "}
                              {traduzirStatusAnalise(i.statusAnalise)}
                            </p>
                            <p>
                              <strong>Status:</strong>{" "}
                              {traduzirStatusInscricaoIndividual(i.status)}
                            </p>
                            <p>
                              <strong>Tamanho camisa:</strong> {i.tamanhoCamisa || "—"}
                            </p>
                            <p>
                              <strong>Contato:</strong> {i.usuario?.contato || "Não informado"}
                            </p>
                            <p>
                              <strong>Sexo (perfil):</strong> {i.usuario?.sexo || "—"}
                            </p>
                            {i.observacaoAdmin ? (
                              <p>
                                <strong>Obs. admin:</strong> {i.observacaoAdmin}
                              </p>
                            ) : null}

                            {comprovante ? (
                              <p>
                                <strong>Comprovante:</strong>{" "}
                                <a
                                  href={comprovante}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="link-admin-discreto"
                                >
                                  Abrir imagem
                                </a>
                              </p>
                            ) : null}

                            <div className="acoes-card">
                              {podeSelecionar ? (
                                <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => alternarSelecao(i.id)}
                                  />
                                  Selecionar para montar equipe
                                </label>
                              ) : (
                                <span className="info-auxiliar">
                                  {i.statusAnalise !== "APROVADA"
                                    ? "Aprove/reprove para prosseguir."
                                    : "Já usada/cancelada."}
                                </span>
                              )}

                              {i.statusAnalise === "AGUARDANDO_ANALISE" ? (
                                <button
                                  type="button"
                                  className="botao-pequeno"
                                  onClick={() => onAprovarIndividual(i.id)}
                                >
                                  Aprovar
                                </button>
                              ) : null}

                              {i.statusAnalise !== "REPROVADA" ? (
                                <button
                                  type="button"
                                  className="botao-pequeno botao-excluir"
                                  onClick={() => onReprovarIndividual(i.id)}
                                >
                                  Reprovar
                                </button>
                              ) : null}
                            </div>

                            <div className="grupo-formulario" style={{ marginTop: 10 }}>
                              <label>Observação para reprovação (opcional)</label>
                              <input
                                value={obsReprovacao[i.id] || ""}
                                onChange={(e) =>
                                  setObsReprovacao((p) => ({ ...p, [i.id]: e.target.value }))
                                }
                                placeholder="Ex.: comprovante ilegível"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <div style={{ marginTop: 18 }}>
                  <h3>Equipes formadas</h3>
                  {!resumo.participantes.length ? (
                    <p>Nenhuma equipe formada ainda.</p>
                  ) : (
                    <div className="lista-simples">
                      {resumo.participantes.map((p: any) => (
                        <div key={p.id} className="item-lista">
                          <h3>{p.nomeEquipe}</h3>
                          <p>
                            <strong>Capitã(o):</strong> {p.responsavel}
                          </p>
                          <p>
                            <strong>Contato:</strong> {p.contato || "Não informado"}
                          </p>
                          <ul>
                            {p.jogadores.map((j: any) => (
                              <li key={j.id}>
                                {j.nome} ({j.genero})
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {!resumo.participantes.length ? (
                  <p>Nenhum participante inscrito.</p>
                ) : (
                  <div className="lista-simples">
                    {resumo.participantes.map((p: any) => {
                      const podeEditarOuExcluir = resumo.jogos.length === 0;
                      const editando = inscricaoEmEdicaoId === p.id && formInscricao;

                      return (
                        <div key={p.id} className="item-lista">
                          <h3>{p.nomeEquipe}</h3>
                          <p>
                            <strong>Capitã(o):</strong> {p.responsavel}
                          </p>
                          <p>
                            <strong>Telefone:</strong> {p.contato || "Não informado"}
                          </p>
                          <p>
                            <strong>Status:</strong> {p.statusInscricao}
                          </p>
                          <ul>
                            {p.jogadores.map((j: any) => (
                              <li key={j.id}>
                                {j.nome} ({j.genero})
                              </li>
                            ))}
                          </ul>

                          {podeEditarOuExcluir ? (
                            <div className="acoes-card">
                              <button
                                type="button"
                                className="botao-pequeno"
                                onClick={() => iniciarEdicaoInscricao(p)}
                              >
                                Editar inscrição
                              </button>
                              <button
                                type="button"
                                className="botao-pequeno botao-excluir"
                                onClick={() => onExcluirInscricao(p.id)}
                              >
                                Excluir inscrição
                              </button>
                            </div>
                          ) : (
                            <p className="info-auxiliar">
                              A edição e exclusão de inscrição ficam indisponíveis após gerar o
                              chaveamento.
                            </p>
                          )}

                          {editando ? (
                            <div className="area-edicao-inscricao">
                              <h4>Editar inscrição</h4>
                              <form
                                className="formulario-edicao-inscricao"
                                onSubmit={onSalvarInscricao}
                              >
                                <div className="grupo-formulario">
                                  <label>Nome da equipe</label>
                                  <input
                                    value={formInscricao.nomeEquipe}
                                    onChange={(e) =>
                                      setFormInscricao((prev) =>
                                        prev
                                          ? { ...prev, nomeEquipe: e.target.value }
                                          : prev
                                      )
                                    }
                                    required
                                  />
                                </div>
                                <div className="grupo-formulario">
                                  <label>Capitã(o)</label>
                                  <input
                                    value={formInscricao.responsavel}
                                    onChange={(e) =>
                                      setFormInscricao((prev) =>
                                        prev
                                          ? { ...prev, responsavel: e.target.value }
                                          : prev
                                      )
                                    }
                                    required
                                  />
                                </div>
                                <div className="grupo-formulario">
                                  <label>Telefone para contato</label>
                                  <input
                                    value={formInscricao.contato}
                                    onChange={(e) =>
                                      setFormInscricao((prev) =>
                                        prev ? { ...prev, contato: e.target.value } : prev
                                      )
                                    }
                                    placeholder="(83) 99999-9999"
                                  />
                                </div>

                                <div className="bloco-jogadores-edicao">
                                  {formInscricao.jogadores.map((j, idx) => (
                                    <div key={j.id ?? idx} className="card-jogador">
                                      <h4>Jogador {idx + 1}</h4>
                                      <div className="grupo-formulario">
                                        <label>Nome</label>
                                        <input
                                          value={j.nome}
                                          onChange={(e) =>
                                            setFormInscricao((prev) => {
                                              if (!prev) return prev;
                                              return {
                                                ...prev,
                                                jogadores: prev.jogadores.map((item, i) =>
                                                  i === idx
                                                    ? { ...item, nome: e.target.value }
                                                    : item
                                                )
                                              };
                                            })
                                          }
                                          required
                                        />
                                      </div>
                                      <div className="grupo-formulario">
                                        <label>Gênero</label>
                                        <select
                                          value={j.genero}
                                          onChange={(e) =>
                                            setFormInscricao((prev) => {
                                              if (!prev) return prev;
                                              return {
                                                ...prev,
                                                jogadores: prev.jogadores.map((item, i) =>
                                                  i === idx
                                                    ? {
                                                        ...item,
                                                        genero: e.target.value as "M" | "F"
                                                      }
                                                    : item
                                                )
                                              };
                                            })
                                          }
                                          required
                                        >
                                          <option value="M">Masculino</option>
                                          <option value="F">Feminino</option>
                                        </select>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="acoes-card">
                                  <button type="submit" className="botao-pequeno">
                                    Salvar alterações
                                  </button>
                                  <button
                                    type="button"
                                    className="botao-pequeno secundario"
                                    onClick={() => {
                                      setInscricaoEmEdicaoId(null);
                                      setFormInscricao(null);
                                      setMensagem("Edição cancelada.");
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </form>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="card">
            <h2>Chaveamento</h2>
            {resumo.campeonato.formato !== "MATA_MATA" ? (
              <p>A visualização de chave para este formato será adicionada em breve.</p>
            ) : !colunasChave.length ? (
              <p>Nenhum jogo gerado ainda.</p>
            ) : (
              <div className="chave-grid">
                {colunasChave.map(([titulo, jogos]) => (
                  <div key={titulo} className="coluna-chave">
                    <h3>{titulo}</h3>
                    {(jogos as any[]).map((jogo) => {
                      const equipeA = jogo.equipeA?.nomeEquipe || "A definir";
                      const equipeB = jogo.equipeB?.nomeEquipe || "A definir";
                      const vencedorId = jogo.vencedorId;

                      return (
                        <div key={jogo.id} className="jogo-chave">
                          <div className="fase-status">{jogo.status}</div>
                          <div
                            className={`linha-equipe ${
                              jogo.equipeAId && vencedorId === jogo.equipeAId
                                ? "vencedor-chave"
                                : ""
                            }`}
                          >
                            {equipeA}
                          </div>
                          <div
                            className={`linha-equipe ${
                              jogo.equipeBId && vencedorId === jogo.equipeBId
                                ? "vencedor-chave"
                                : ""
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
            )}
          </section>

          <section className="card">
            <h2>Jogos</h2>
            {!resumo.jogos.length ? (
              <p>Nenhum jogo gerado ainda.</p>
            ) : (
              <div className="lista-simples">
                {resumo.jogos.map((jogo: any) => {
                  const nomeEquipeA = jogo.equipeA?.nomeEquipe || "A definir";
                  const nomeEquipeB = jogo.equipeB?.nomeEquipe || "A definir";
                  const nomeVencedor =
                    jogo.vencedor?.nomeEquipe || "Ainda não definido";

                  return (
                    <div key={jogo.id} className="item-lista">
                      <h3>{traduzirFase(jogo.fase)}</h3>
                      <p>
                        <strong>Status:</strong> {jogo.status}
                      </p>

                      <div className="confronto-visual">
                        <div className="equipe-box">{nomeEquipeA}</div>
                        <div className="vs-box">VS</div>
                        <div className="equipe-box">{nomeEquipeB}</div>
                      </div>

                      <p>
                        <strong>Vencedor:</strong> {nomeVencedor}
                      </p>

                      <div>
                        <strong>Sets:</strong>
                        {jogo.sets.length ? (
                          <ul>
                            {jogo.sets.map((set: any) => (
                              <li key={set.id}>
                                Set {set.numeroSet}: {set.pontosA} x {set.pontosB}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>Nenhum set registrado.</p>
                        )}
                      </div>

                      {jogo.status === "FINALIZADO" ? null : (
                        <form
                          className="formulario-placar"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const sets = extrairSets(e.currentTarget);
                            onRegistrarPlacar(jogo.id, sets);
                          }}
                        >
                          <div className="grade-sets">
                            <div className="linha-set">
                              <strong>Set 1</strong>
                              <div>
                                <label>Pontos equipe A</label>
                                <input type="number" name="set1a" min="0" required />
                              </div>
                              <div>
                                <label>Pontos equipe B</label>
                                <input type="number" name="set1b" min="0" required />
                              </div>
                            </div>
                            <div className="linha-set">
                              <strong>Set 2</strong>
                              <div>
                                <label>Pontos equipe A</label>
                                <input type="number" name="set2a" min="0" required />
                              </div>
                              <div>
                                <label>Pontos equipe B</label>
                                <input type="number" name="set2b" min="0" required />
                              </div>
                            </div>
                            <div className="linha-set">
                              <strong>Set 3</strong>
                              <div>
                                <label>Pontos equipe A</label>
                                <input type="number" name="set3a" min="0" />
                              </div>
                              <div>
                                <label>Pontos equipe B</label>
                                <input type="number" name="set3b" min="0" />
                              </div>
                            </div>
                          </div>
                          <button type="submit" className="botao-pequeno">
                            Salvar placar
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card">
            <h2>Pódio</h2>
            {!resumo.podio ? (
              <p>Pódio ainda não definido.</p>
            ) : (
              <div className="podio-grid">
                <div className="card-podio">
                  <h3>🥇 1º Lugar</h3>
                  <p>{resumo.podio.primeiroLugar?.nomeEquipe || "—"}</p>
                </div>
                <div className="card-podio">
                  <h3>🥈 2º Lugar</h3>
                  <p>{resumo.podio.segundoLugar?.nomeEquipe || "—"}</p>
                </div>
                <div className="card-podio">
                  <h3>🥉 3º Lugar</h3>
                  <p>{resumo.podio.terceiroLugar?.nomeEquipe || "—"}</p>
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

