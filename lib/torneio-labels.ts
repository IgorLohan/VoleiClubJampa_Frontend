export function traduzirStatusCampeonato(status: string | null | undefined) {
  const mapa: Record<string, string> = {
    INSCRICOES_ABERTAS: "Inscrições abertas",
    AGUARDANDO_CHAVEAMENTO: "Aguardando chaveamento",
    EM_ANDAMENTO: "Em andamento",
    FINALIZADO: "Finalizado"
  };
  return mapa[String(status || "")] || status || "—";
}

export function classeStatusCampeonato(status: string | null | undefined) {
  const mapa: Record<string, string> = {
    INSCRICOES_ABERTAS: "torneio-status--abertas",
    AGUARDANDO_CHAVEAMENTO: "torneio-status--aguardando",
    EM_ANDAMENTO: "torneio-status--andamento",
    FINALIZADO: "torneio-status--finalizado"
  };
  return mapa[String(status || "")] || "torneio-status--aguardando";
}

export function traduzirFormato(formato: string | null | undefined) {
  const mapa: Record<string, string> = {
    MATA_MATA: "Mata-mata",
    DUPLA_ELIMINACAO: "Dupla eliminação",
    TODOS_CONTRA_TODOS: "Todos contra todos",
    GRUPOS_3X4_REPESCAGEM: "Grupos 3×4 + repescagem"
  };
  return mapa[String(formato || "")] || formato || "—";
}

export function traduzirTipoParticipante(tipo: string | null | undefined) {
  const mapa: Record<string, string> = {
    DUPLA: "Dupla",
    TIME: "Quarteto"
  };
  return mapa[String(tipo || "")] || tipo || "—";
}

export function traduzirCategoria(categoria: string | null | undefined) {
  const mapa: Record<string, string> = {
    MASCULINO: "Masculino",
    FEMININO: "Feminino",
    MISTA: "Mista"
  };
  return mapa[String(categoria || "")] || categoria || "—";
}

export function traduzirFase(fase: string | null | undefined) {
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

export function traduzirStatusJogo(status: string | null | undefined) {
  const valor = String(status || "").toUpperCase();
  if (valor === "FINALIZADO") return "Finalizado";
  if (valor === "PENDENTE") return "Pendente";
  return status || "—";
}

export function classeStatusJogo(status: string | null | undefined) {
  const valor = String(status || "").toUpperCase();
  if (valor === "FINALIZADO") return "torneio-jogo-status--ok";
  if (valor === "PENDENTE") return "torneio-jogo-status--pendente";
  return "torneio-jogo-status--neutral";
}

export function formatarData(data: string | null | undefined) {
  if (!data) return "Data a definir";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function obterNomeEquipe(equipe: {
  nomeEquipe?: string | null;
  responsavel?: string | null;
} | null | undefined) {
  return equipe?.nomeEquipe || equipe?.responsavel || "A definir";
}
