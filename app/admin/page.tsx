"use client";

import { Plus, RefreshCw, Save, Settings2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  buscarResumoCampeonato,
  atualizarCampeonato,
  criarCampeonato,
  excluirCampeonato,
  listarMeusCampeonatos
} from "@/lib/api";
import {
  chavesSessao,
  getJSONStorage,
  getStorage,
  logoutAdmin
} from "@/lib/sessao";

type AdminLogado = { nome: string; email: string } | null;

type CampeonatoResumo = Record<string, any> & {
  id: number;
  nome: string;
  data: string | null;
  local: string | null;
  tipoParticipante: string;
  categoria: string;
  formato: string;
  modoInscricao?: string;
  quantidadeMaxima: number | null;
  inscricoesAbertas: boolean;
  statusCampeonato: string;
};

function formatarTexto(valor: string | null | undefined) {
  return valor || "Não informado";
}

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
    TODOS_CONTRA_TODOS: "Todos contra todos",
    GRUPOS_3X4_REPESCAGEM: "Grupos 3×4 (repescagem)"
  };
  return mapa[formato] || formato;
}

function traduzirModoInscricao(modo: string | undefined) {
  if (!modo) return "—";
  const mapa: Record<string, string> = {
    INDIVIDUAL: "Individual",
    POR_EQUIPE: "Por equipe"
  };
  return mapa[modo] || modo;
}

function traduzirCategoria(cat: string) {
  const mapa: Record<string, string> = {
    MASCULINO: "Masculino",
    FEMININO: "Feminino",
    MISTA: "Mista"
  };
  return mapa[cat] || cat;
}

export default function AdminHomePage() {
  const router = useRouter();

  const [mensagem, setMensagem] = useState("");
  const [admin, setAdmin] = useState<AdminLogado>(null);
  const [campeonatos, setCampeonatos] = useState<CampeonatoResumo[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [modalNovoCampeonato, setModalNovoCampeonato] = useState(false);
  const [campeonatoEmEdicao, setCampeonatoEmEdicao] =
    useState<CampeonatoResumo | null>(null);

  const [form, setForm] = useState({
    nome: "",
    data: "",
    local: "",
    tipoParticipante: "DUPLA",
    categoria: "MASCULINO",
    formato: "MATA_MATA",
    modoInscricao: "INDIVIDUAL",
    quantidadeMaxima: ""
  });

  const [formEdicao, setFormEdicao] = useState({
    nome: "",
    data: "",
    local: "",
    tipoParticipante: "DUPLA",
    categoria: "MASCULINO",
    formato: "MATA_MATA",
    modoInscricao: "INDIVIDUAL",
    quantidadeMaxima: ""
  });

  useEffect(() => {
    const token = getStorage(chavesSessao.tokenAdmin);
    if (!token) {
      router.replace("/login");
      return;
    }

    setAdmin(getJSONStorage(chavesSessao.adminLogado));
  }, [router]);

  async function carregarCampeonatos() {
    try {
      setMensagem("");
      setCampeonatos([]);
      const lista = (await listarMeusCampeonatos()) as any[];
      const resumos = await Promise.all(
        lista.map(async (campeonato) => {
          try {
            const resumo = (await buscarResumoCampeonato(campeonato.id)) as any;
            return { ...campeonato, statusCampeonato: resumo.statusCampeonato };
          } catch {
            return {
              ...campeonato,
              statusCampeonato: campeonato.inscricoesAbertas
                ? "INSCRICOES_ABERTAS"
                : "AGUARDANDO_CHAVEAMENTO"
            };
          }
        })
      );
      setCampeonatos(resumos as CampeonatoResumo[]);
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao carregar campeonatos: ${error.message}`);
    }
  }

  useEffect(() => {
    carregarCampeonatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const campeonatosFiltrados = useMemo(() => {
    const texto = busca.trim().toLowerCase();
    return campeonatos.filter((item) => {
      const nomeOk = item.nome.toLowerCase().includes(texto);
      const statusOk =
        filtroStatus === "TODOS" || item.statusCampeonato === filtroStatus;
      return nomeOk && statusOk;
    });
  }, [busca, campeonatos, filtroStatus]);

  async function onCriarCampeonato(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("Criando campeonato...");

    const dadosCampeonato = {
      nome: form.nome,
      data: form.data || null,
      local: form.local || null,
      tipoParticipante: form.tipoParticipante,
      categoria: form.categoria,
      formato: form.formato,
      modoInscricao: form.modoInscricao,
      quantidadeMaxima: form.quantidadeMaxima
        ? Number(form.quantidadeMaxima)
        : null
    };

    try {
      await criarCampeonato(dadosCampeonato);
      setMensagem("Campeonato criado com sucesso.");
      setForm((prev) => ({
        ...prev,
        nome: "",
        data: "",
        local: "",
        modoInscricao: "INDIVIDUAL",
        quantidadeMaxima: ""
      }));
      setModalNovoCampeonato(false);
      await carregarCampeonatos();
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao criar campeonato: ${error.message}`);
    }
  }

  async function onExcluirCampeonato(campeonatoId: number) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este campeonato?"
    );
    if (!confirmar) return;

    try {
      setMensagem("Excluindo campeonato...");
      await excluirCampeonato(campeonatoId);
      setMensagem("Campeonato excluído com sucesso.");
      await carregarCampeonatos();
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao excluir campeonato: ${error.message}`);
    }
  }

  function abrirEdicao(campeonato: CampeonatoResumo) {
    setMensagem("");
    setFormEdicao({
      nome: campeonato.nome || "",
      data: campeonato.data || "",
      local: campeonato.local || "",
      tipoParticipante: campeonato.tipoParticipante || "DUPLA",
      categoria: campeonato.categoria || "MASCULINO",
      formato: campeonato.formato || "MATA_MATA",
      modoInscricao: campeonato.modoInscricao || "INDIVIDUAL",
      quantidadeMaxima:
        campeonato.quantidadeMaxima === null || campeonato.quantidadeMaxima === undefined
          ? ""
          : String(campeonato.quantidadeMaxima)
    });
    setCampeonatoEmEdicao(campeonato);
  }

  async function onEditarCampeonato(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!campeonatoEmEdicao) return;

    setMensagem("Salvando alterações...");
    const dadosCampeonato = {
      nome: formEdicao.nome,
      data: formEdicao.data || null,
      local: formEdicao.local || null,
      tipoParticipante: formEdicao.tipoParticipante,
      categoria: formEdicao.categoria,
      formato: formEdicao.formato,
      modoInscricao: formEdicao.modoInscricao,
      quantidadeMaxima: formEdicao.quantidadeMaxima
        ? Number(formEdicao.quantidadeMaxima)
        : null
    };

    try {
      await atualizarCampeonato(campeonatoEmEdicao.id, dadosCampeonato);
      setMensagem("Campeonato atualizado com sucesso.");
      setCampeonatoEmEdicao(null);
      await carregarCampeonatos();
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao atualizar campeonato: ${error.message}`);
    }
  }

  function sair() {
    logoutAdmin();
    router.push("/login");
  }

  return (
    <main className="container container--wide">
      <header className="cabecalho topo-inicio">
        <div>
          <h1>Sistema de Campeonato de Vôlei</h1>
          <p>Crie campeonatos e gerencie inscrições, jogos e pódio.</p>
        </div>
      </header>

      <section className="card admin-campeonatos-card">
        <div className="titulo-secao">
          <h2>Campeonatos cadastrados</h2>
          <div className="acoes-card">
            <button
              type="button"
              className="botao botao--icon"
              onClick={() => {
                setMensagem("");
                setModalNovoCampeonato(true);
              }}
              aria-label="Novo campeonato"
              title="Novo campeonato"
            >
              <Plus aria-hidden />
            </button>
            <button
              onClick={carregarCampeonatos}
              className="botao secundario botao--icon"
              type="button"
              aria-label="Atualizar lista"
              title="Atualizar lista"
            >
              <RefreshCw aria-hidden />
            </button>
          </div>
        </div>

        <div className="barra-filtros">
          <div className="grupo-formulario">
            <label htmlFor="busca-campeonato">Buscar por nome</label>
            <input
              id="busca-campeonato"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite parte do nome do campeonato"
            />
          </div>

          <div className="grupo-formulario">
            <label htmlFor="filtro-status">Filtrar por status</label>
            <select
              id="filtro-status"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="TODOS">Todos</option>
              <option value="INSCRICOES_ABERTAS">Inscrições abertas</option>
              <option value="AGUARDANDO_CHAVEAMENTO">
                Aguardando chaveamento
              </option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </div>
        </div>

        <div
          className="campeonatos-table-wrap admin-campeonatos-table-wrap"
          aria-label="Tabela de campeonatos"
        >
          <table className="campeonatos-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Data</th>
                <th>Local</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Formato</th>
                <th>Inscrição</th>
                <th>Vagas máx.</th>
                <th>Inscr. abertas</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {!campeonatos.length ? (
                <tr>
                  <td colSpan={12} className="campeonatos-empty">
                    Nenhum campeonato carregado.
                  </td>
                </tr>
              ) : !campeonatosFiltrados.length ? (
                <tr>
                  <td colSpan={12} className="campeonatos-empty">
                    Nenhum campeonato encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                campeonatosFiltrados.map((campeonato) => {
                  const textoStatus = traduzirStatus(campeonato.statusCampeonato);
                  const classeStatus = classeStatusCampeonato(
                    campeonato.statusCampeonato
                  );

                  return (
                    <tr key={campeonato.id}>
                      <td data-label="ID">{campeonato.id}</td>
                      <td className="campeonatos-name" data-label="Nome">
                        <span className="campeonatos-card-heading">
                          {campeonato.nome}
                        </span>
                      </td>
                      <td data-label="Data">{formatarData(campeonato.data)}</td>
                      <td className="campeonatos-local" data-label="Local">
                        {formatarTexto(campeonato.local)}
                      </td>
                      <td data-label="Tipo">
                        {traduzirTipoParticipante(campeonato.tipoParticipante)}
                      </td>
                      <td data-label="Categoria">
                        {traduzirCategoria(campeonato.categoria)}
                      </td>
                      <td data-label="Formato">
                        {traduzirFormato(campeonato.formato)}
                      </td>
                      <td data-label="Inscrição">
                        {traduzirModoInscricao(campeonato.modoInscricao)}
                      </td>
                      <td data-label="Vagas máx.">
                        {campeonato.quantidadeMaxima ?? "—"}
                      </td>
                      <td data-label="Inscr. abertas">
                        {campeonato.inscricoesAbertas ? "Sim" : "Não"}
                      </td>
                      <td className="campeonatos-status-cell" data-label="Status">
                        <span className={`status-badge ${classeStatus}`}>
                          {textoStatus}
                        </span>
                      </td>
                      <td className="campeonatos-actions" data-label="Ações">
                        <button
                          type="button"
                          className="campeonatos-action campeonatos-action--icon"
                          aria-label={`Gerenciar ${campeonato.nome}`}
                          title="Gerenciar"
                          onClick={() => abrirEdicao(campeonato)}
                        >
                          <Settings2
                            aria-hidden
                            className="campeonatos-action-icon"
                          />
                        </button>
                        <button
                          type="button"
                          className="campeonatos-action campeonatos-action--icon"
                          aria-label={`Excluir ${campeonato.nome}`}
                          title="Excluir"
                          onClick={() => onExcluirCampeonato(campeonato.id)}
                        >
                          <Trash2
                            aria-hidden
                            className="campeonatos-action-icon"
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalNovoCampeonato ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Criar novo campeonato"
          onClick={() => setModalNovoCampeonato(false)}
        >
          <div
            className="campeonatos-modal campeonatos-modal--full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title">Novo campeonato</div>
                <div className="campeonatos-modal-name">Preencha os dados para criar</div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={() => setModalNovoCampeonato(false)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="campeonatos-modal-scroll">
              <div className="campeonatos-modal-section">
                <form onSubmit={onCriarCampeonato} className="formulario">
                  <div className="grupo-formulario">
                    <label htmlFor="novo-nome">Nome do campeonato</label>
                    <input
                      id="novo-nome"
                      value={form.nome}
                      onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="novo-data">Data</label>
                    <input
                      id="novo-data"
                      type="date"
                      value={form.data}
                      onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
                    />
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="novo-local">Local</label>
                    <input
                      id="novo-local"
                      value={form.local}
                      onChange={(e) => setForm((p) => ({ ...p, local: e.target.value }))}
                    />
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="novo-tipoParticipante">Tipo de participante</label>
                    <select
                      id="novo-tipoParticipante"
                      value={form.tipoParticipante}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, tipoParticipante: e.target.value }))
                      }
                      required
                    >
                      <option value="DUPLA">Dupla</option>
                      <option value="TIME">Quarteto</option>
                    </select>
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="novo-categoria">Categoria</label>
                    <select
                      id="novo-categoria"
                      value={form.categoria}
                      onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
                      required
                    >
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMININO">Feminino</option>
                      <option value="MISTA">Mista</option>
                    </select>
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="novo-formato">Formato</label>
                    <select
                      id="novo-formato"
                      value={form.formato}
                      onChange={(e) => setForm((p) => ({ ...p, formato: e.target.value }))}
                      required
                    >
                      <option value="MATA_MATA">Mata-mata</option>
                      <option value="DUPLA_ELIMINACAO">Upper/Lower</option>
                      <option value="TODOS_CONTRA_TODOS">Todos contra todos</option>
                      <option value="GRUPOS_3X4_REPESCAGEM">Grupos 3x4 (repescagem)</option>
                    </select>
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="novo-modoInscricao">Modo de inscrição</label>
                    <select
                      id="novo-modoInscricao"
                      value={form.modoInscricao}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, modoInscricao: e.target.value }))
                      }
                      required
                    >
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="POR_EQUIPE">Por equipe</option>
                    </select>
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="novo-quantidadeMaxima">Quantidade máxima</label>
                    <input
                      id="novo-quantidadeMaxima"
                      type="number"
                      min="1"
                      value={form.quantidadeMaxima}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, quantidadeMaxima: e.target.value }))
                      }
                    />
                  </div>

                  <div className="campeonatos-modal-actions">
                    <button
                      type="button"
                      className="campeonatos-btn campeonatos-btn--ghost campeonatos-btn--icon"
                      onClick={() => setModalNovoCampeonato(false)}
                      aria-label="Cancelar"
                      title="Cancelar"
                    >
                      <X aria-hidden className="campeonatos-btn-icon" />
                    </button>
                    <button
                      type="submit"
                      className="campeonatos-btn campeonatos-btn--primary campeonatos-btn--icon"
                      aria-label="Criar campeonato"
                      title="Criar campeonato"
                    >
                      <Save aria-hidden className="campeonatos-btn-icon" />
                    </button>
                  </div>

                  {mensagem ? <p className="mensagem">{mensagem}</p> : null}
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {campeonatoEmEdicao ? (
        <div
          className="campeonatos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Editar campeonato ${campeonatoEmEdicao.nome}`}
          onClick={() => setCampeonatoEmEdicao(null)}
        >
          <div
            className="campeonatos-modal campeonatos-modal--full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="campeonatos-modal-head">
              <div>
                <div className="campeonatos-modal-title">Editar campeonato</div>
                <div className="campeonatos-modal-name">{campeonatoEmEdicao.nome}</div>
              </div>
              <button
                type="button"
                className="campeonatos-modal-close"
                onClick={() => setCampeonatoEmEdicao(null)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="campeonatos-modal-scroll">
              <div className="campeonatos-modal-section">
                <form onSubmit={onEditarCampeonato} className="formulario">
                  <div className="grupo-formulario">
                    <label htmlFor="editar-nome">Nome do campeonato</label>
                    <input
                      id="editar-nome"
                      value={formEdicao.nome}
                      onChange={(e) =>
                        setFormEdicao((p) => ({ ...p, nome: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="editar-data">Data</label>
                    <input
                      id="editar-data"
                      type="date"
                      value={formEdicao.data}
                      onChange={(e) =>
                        setFormEdicao((p) => ({ ...p, data: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="editar-local">Local</label>
                    <input
                      id="editar-local"
                      value={formEdicao.local}
                      onChange={(e) =>
                        setFormEdicao((p) => ({ ...p, local: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="editar-tipoParticipante">Tipo de participante</label>
                    <select
                      id="editar-tipoParticipante"
                      value={formEdicao.tipoParticipante}
                      onChange={(e) =>
                        setFormEdicao((p) => ({
                          ...p,
                          tipoParticipante: e.target.value
                        }))
                      }
                      required
                    >
                      <option value="DUPLA">Dupla</option>
                      <option value="TIME">Quarteto</option>
                    </select>
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="editar-categoria">Categoria</label>
                    <select
                      id="editar-categoria"
                      value={formEdicao.categoria}
                      onChange={(e) =>
                        setFormEdicao((p) => ({ ...p, categoria: e.target.value }))
                      }
                      required
                    >
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMININO">Feminino</option>
                      <option value="MISTA">Mista</option>
                    </select>
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="editar-formato">Formato</label>
                    <select
                      id="editar-formato"
                      value={formEdicao.formato}
                      onChange={(e) =>
                        setFormEdicao((p) => ({ ...p, formato: e.target.value }))
                      }
                      required
                    >
                      <option value="MATA_MATA">Mata-mata</option>
                      <option value="DUPLA_ELIMINACAO">Upper/Lower</option>
                      <option value="TODOS_CONTRA_TODOS">Todos contra todos</option>
                      <option value="GRUPOS_3X4_REPESCAGEM">Grupos 3x4 (repescagem)</option>
                    </select>
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="editar-modoInscricao">Modo de inscrição</label>
                    <select
                      id="editar-modoInscricao"
                      value={formEdicao.modoInscricao}
                      onChange={(e) =>
                        setFormEdicao((p) => ({
                          ...p,
                          modoInscricao: e.target.value
                        }))
                      }
                      required
                    >
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="POR_EQUIPE">Por equipe</option>
                    </select>
                  </div>

                  <div className="grupo-formulario">
                    <label htmlFor="editar-quantidadeMaxima">Quantidade máxima</label>
                    <input
                      id="editar-quantidadeMaxima"
                      type="number"
                      min="1"
                      value={formEdicao.quantidadeMaxima}
                      onChange={(e) =>
                        setFormEdicao((p) => ({
                          ...p,
                          quantidadeMaxima: e.target.value
                        }))
                      }
                    />
                  </div>

                  <div className="campeonatos-modal-actions">
                    <button
                      type="button"
                      className="campeonatos-btn campeonatos-btn--ghost campeonatos-btn--icon"
                      onClick={() => setCampeonatoEmEdicao(null)}
                      aria-label="Cancelar"
                      title="Cancelar"
                    >
                      <X aria-hidden className="campeonatos-btn-icon" />
                    </button>
                    <button
                      type="submit"
                      className="campeonatos-btn campeonatos-btn--primary campeonatos-btn--icon"
                      aria-label="Salvar alterações"
                      title="Salvar alterações"
                    >
                      <Save aria-hidden className="campeonatos-btn-icon" />
                    </button>
                  </div>

                  {mensagem ? <p className="mensagem">{mensagem}</p> : null}
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

