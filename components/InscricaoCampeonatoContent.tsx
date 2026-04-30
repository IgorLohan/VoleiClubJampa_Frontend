"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { buscarCampeonatoPorId, criarInscricaoIndividual } from "@/lib/api";
import {
  chavesSessao,
  getJSONStorage,
  getStorage
} from "@/lib/sessao";

type ParticipanteLogado = {
  nome: string;
  email: string;
  contato?: string | null;
} | null;

const VALOR_INSCRICAO_EXIBICAO = "R$ 30,00";

/** Valores aceitos pelo backend (enum TamanhoCamisa). */
const TAMANHOS_CAMISA = [
  { value: "", label: "Selecione o tamanho" },
  { value: "P", label: "P" },
  { value: "M", label: "M" },
  { value: "G", label: "G" },
  { value: "GG", label: "GG" }
];

const ACCEPT_COMPROVANTE = "image/png,image/jpeg,image/jpg,image/webp";
const MAX_COMPROVANTE_BYTES = 5 * 1024 * 1024;

const REGRAS_TORNEIO = `🏐🔥PRIMEIRO TORNEIRO INTERNO VOLEI CLUB JAMPA
1. Objetivo e Filosofia
Este torneio tem como finalidade principal a integração e confraternização dos membros do nosso grupo. Embora a vitória seja celebrada, o respeito, a ajuda mútua e a diversão estão acima de qualquer placar.

2. Inscrição e Sede
Local: Arena ACE (Antiga PIXBET ACE).

Taxa de Inscrição: Valor simbólico (equivalente a um valor muito próximo ao day use da arena), destinado à reserva das quadras e custos de kits.

Participantes: A inscrição no evento é exclusiva para membros ativos das nossas peladas habituais (que tenham jogado ao menos duas peladas com esse grupo nesse ano), todos os níveis e idades a partir de 14 anos, completados esse ano (por questão de integridade física) serão bem vindos

3. Formação das Equipes e Sorteio
Para garantir o equilíbrio e evitar "panelas", as equipes serão formadas via sorteio direcionado:

Composição: 12 equipes de quartetos mistos (2 homens e 2 mulheres).

O Sorteio: Os jogadores serão divididos em "potes" por nível de habilidade e tempo de prática. Cada equipe será formada por um sorteado de cada pote, garantindo que todos os times tenham um equilíbrio técnico similar.

4. Regras de Jogo (Híbrido Areia-Quadra)
Considerando o formato de quartetos (4x4) e o intuito recreativo, utilizaremos uma adaptação mais flexível baseada nas regras de vôlei de quadra:

Toque e Condução: Serão permitidos passes de toque (levantamento) com critérios mais flexíveis (estilo vôlei de quadra), evitando marcações rigorosas de "dois toques" que travariam o jogo. Conduções grosseiras ainda serão marcadas.

O Bloqueio: O toque de bloqueio não conta como o primeiro dos três toques da equipe (regra de quadra).

Posicionamento: Não há necessidade de rodízio rígido de posições (como o 5-1 ou 6-0 da quadra), mas a ordem de saque deve ser respeitada obrigatoriamente.

Ataque: É permitido "largar" de ponta de dedo (caixinha), o que geralmente é proibido no vôlei de praia profissional (duplas).

Invasão: Na areia não há linha central física, mas por segurança, será marcada invasão caso o jogador coloque em risco a integridade do adversário sob a rede.

5. Arbitragem e Conduta (Fair Play)
Este é o ponto mais importante do nosso torneio:

O Organizador: Um membro da comissão estará presente em cada jogo para marcar o placar e mediar dúvidas técnicas.

Auto-arbitragem: Espera-se que cada jogador acuse seu próprio erro (bola que tocou no bloqueio antes de sair, toque na rede ou quatro toques).

Respeito: Reclamações acintosas com o organizador ou desrespeito com colegas de equipe/adversários podem levar à desclassificação do atleta. Aqui, o erro do colega é oportunidade de apoio, não de crítica.

6. Formato da Competição
Fase 1: Grupos
Divisão: 3 grupos (A, B, C) com 4 equipes cada.

Sistema: Todos jogam contra todos dentro do grupo.

Partidas: Set único de 18 pontos (com diferença de 2 pontos ou limite de 21).

Classificação: Os 2 melhores de cada grupo avançam para o "Mata-Mata".

Fase de Repescagem: O melhor terceiro colocado entre todos os grupos passará automaticamente para a segunda etapa de jogos. )s outros dois terceiros lugares jogarão entre si para definir quem passará para a próxima fase.

Fase 2: Eliminatórias (Quartas de Final)

Jogo 1: 1º de A  vs  2º de C

Jogo 2: 1º de B  vs  2º de A

Jogo 3: 1º de C  vs  2º de B

Jogo 4: Melhor terceiro colocado vs vencedor da repescagem

Fase Final:
Semifinais: Vencedores das quartas.

Disputa de 3º Lugar: Perdedores das semis.

Grande Final: Vencedores das semis.

7. Premiações
Teremos troféus ou medalhas simbólicas para os 1º, 2º e 3º lugares, além de 8 categorias individuais para celebrar nossos talentos e personalidades:

Categorias Técnicas
Melhor Pontuador: O Jogador com mais pontos feitos.

Monster Block: Melhor desempenho em bloqueios e defesas.

Que Sacão: O sacador mais eficiente.

Maestro/Maestrina: Melhor levantamento e visão de jogo.

Categorias Lúdicas
Ninja: Para quem fez a defesa mais impossível (ou o mergulho mais engraçado).

Diplomata: O jogador que mais incentivou o time e promoveu a paz em quadra.

Já é Open!: Para o jogador iniciante que mostrou a maior evolução durante o torneio.

O "Ace" da Galera: Aquele participante que é o coração do grupo, garantindo a resenha e a animação.`;

function formatarData(data: string | null | undefined) {
  if (!data) return "Não informada";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function traduzirTipoParticipante(tipo: string) {
  const mapa: Record<string, string> = { DUPLA: "Dupla", TIME: "Quarteto" };
  return mapa[tipo] || tipo;
}

function arquivoParaDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(arquivo);
  });
}

export type InscricaoCampeonatoContentProps = {
  campeonatoId: string | undefined;
  variant: "page" | "modal";
  onFechar?: () => void;
};

export default function InscricaoCampeonatoContent({
  campeonatoId,
  variant,
  onFechar
}: InscricaoCampeonatoContentProps) {
  const router = useRouter();
  const uid = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tokenParticipante = getStorage(chavesSessao.tokenParticipante);
  const participante = getJSONStorage<ParticipanteLogado>(
    chavesSessao.participanteLogado
  );

  const [mensagem, setMensagem] = useState("");
  const [campeonato, setCampeonato] = useState<any | null>(null);

  const [tamanhoCamisa, setTamanhoCamisa] = useState("");
  const [arquivoComprovante, setArquivoComprovante] = useState<File | null>(null);
  const [aceitouRegras, setAceitouRegras] = useState(false);
  const [modalRegrasAberto, setModalRegrasAberto] = useState(false);
  const [tentouEnviar, setTentouEnviar] = useState(false);

  useEffect(() => {
    if (variant !== "page") return;
    if (!tokenParticipante) {
      router.replace("/login");
    }
  }, [router, tokenParticipante, variant]);

  useEffect(() => {
    async function carregar() {
      if (!campeonatoId) return;
      try {
        setMensagem("Carregando campeonato...");
        const dados = await buscarCampeonatoPorId(campeonatoId);
        setCampeonato(dados);
        setMensagem("");
      } catch (err) {
        const error = err as Error;
        setMensagem(`Erro ao carregar campeonato: ${error.message}`);
      }
    }
    carregar();
  }, [campeonatoId]);

  function onComprovanteChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setMensagem("");
    if (!file) {
      setArquivoComprovante(null);
      return;
    }
    const okType = /\.(png|jpe?g|webp)$/i.test(file.name) || file.type.startsWith("image/");
    if (!okType) {
      setMensagem("Use PNG, JPG, JPEG ou WEBP.");
      e.target.value = "";
      setArquivoComprovante(null);
      return;
    }
    if (file.size > MAX_COMPROVANTE_BYTES) {
      setMensagem("O arquivo deve ter no máximo 5 MB.");
      e.target.value = "";
      setArquivoComprovante(null);
      return;
    }
    setArquivoComprovante(file);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTentouEnviar(true);
    if (!campeonato || !campeonatoId) return;
    if (!tokenParticipante) return;

    if (campeonato.modoInscricao !== "INDIVIDUAL") {
      setMensagem("Este campeonato não está em modo de inscrição individual.");
      return;
    }

    if (!tamanhoCamisa) {
      setMensagem("Selecione o tamanho da camisa.");
      return;
    }
    if (!arquivoComprovante) {
      setMensagem("Envie o comprovante de pagamento.");
      return;
    }
    if (variant === "modal" && !aceitouRegras) {
      setMensagem("Você precisa concordar com as regras do campeonato.");
      return;
    }

    setMensagem("Enviando inscrição...");

    try {
      const comprovantePagamento = await arquivoParaDataUrl(arquivoComprovante);

      await criarInscricaoIndividual(
        campeonatoId,
        {
          tamanhoCamisa,
          comprovantePagamento
        },
        tokenParticipante
      );

      setMensagem("Inscrição enviada com sucesso. Aguarde a análise da organização.");
      setTamanhoCamisa("");
      setArquivoComprovante(null);
      setAceitouRegras(false);
      setTentouEnviar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (variant === "modal" && onFechar) {
        window.setTimeout(() => onFechar(), 1800);
      }
    } catch (err) {
      const error = err as Error;
      setMensagem(`Erro ao enviar inscrição: ${error.message}`);
    }
  }

  const inscricoesAbertas = campeonato?.inscricoesAbertas;
  const modoIndividual = campeonato?.modoInscricao === "INDIVIDUAL";

  const idPayTitle = `${uid}-pay-title`;
  const idTamanhoCamisa = `${uid}-tamanhoCamisa`;
  const idComprovante = `${uid}-comprovante`;
  const idAceiteRegras = `${uid}-aceite-regras`;

  const layoutClass =
    variant === "modal" ? "inscricao-layout inscricao-layout--modal" : "inscricao-layout";

  const carregandoCampeonato = mensagem === "Carregando campeonato...";
  const mostrarFeedbackRodape =
    Boolean(campeonato) &&
    inscricoesAbertas &&
    modoIndividual &&
    Boolean(tokenParticipante) &&
    Boolean(mensagem) &&
    !carregandoCampeonato;

  const podeEnviarNoModal =
    variant !== "modal" || (Boolean(arquivoComprovante) && Boolean(aceitouRegras));

  const camisaInvalida = modoIndividual && inscricoesAbertas && !tamanhoCamisa;
  const comprovanteInvalido = modoIndividual && inscricoesAbertas && !arquivoComprovante;
  const regrasInvalidas = variant === "modal" && modoIndividual && inscricoesAbertas && !aceitouRegras;

  const formShell = (
    <section className="card inscricao-form-shell">
      <h2 className="inscricao-form-title">Formulário de inscrição</h2>

      {!tokenParticipante ? (
        <p className="inscricao-lead">
          Você precisa estar logado como participante.{" "}
          <Link href="/login">Ir para login</Link>
          {variant === "modal" && onFechar ? (
            <>
              {" "}
              ou{" "}
              <button type="button" className="link-como-botao" onClick={onFechar}>
                fechar
              </button>
            </>
          ) : null}
        </p>
      ) : !campeonato ? (
        <p className="inscricao-lead">{mensagem || "Carregando..."}</p>
      ) : !inscricoesAbertas ? (
        <p className="mensagem">As inscrições deste campeonato estão encerradas.</p>
      ) : !modoIndividual ? (
        <p className="mensagem">
          Este campeonato não está configurado para inscrição individual. Entre em contato com a
          organização ou use o fluxo de inscrição por equipe, se disponível.
        </p>
      ) : (
        <>
          <div className="inscricao-intro-block">
            <h3 className="inscricao-intro-heading">Inscrição individual</h3>
            <p className="inscricao-intro-text">
              Neste campeonato, você se inscreve sozinho(a). Depois do envio, a organização vai
              analisar o comprovante de pagamento e formar as equipes manualmente.
            </p>
            {participante?.nome ? (
              <p className="inscricao-intro-meta">
                <strong>Inscrito:</strong> {participante.nome}
              </p>
            ) : null}
            <p className="inscricao-intro-meta inscricao-hint" style={{ marginTop: 8 }}>
              A categoria do campeonato é conferida com o <strong>sexo</strong> cadastrado no seu
              perfil. Ajuste em sua conta se necessário.
            </p>
            <p className="inscricao-intro-meta">
              <strong>Tipo do campeonato:</strong>{" "}
              {traduzirTipoParticipante(campeonato.tipoParticipante)}
            </p>
            <p className="inscricao-intro-meta">
              <strong>Categoria:</strong> {campeonato.categoria}
            </p>
            <p className="inscricao-intro-meta inscricao-intro-meta--subtle">
              <strong>Data:</strong> {formatarData(campeonato.data)}
              {campeonato.local ? (
                <>
                  {" "}
                  · <strong>Local:</strong> {campeonato.local}
                </>
              ) : null}
            </p>
          </div>

          <form onSubmit={onSubmit} className="formulario inscricao-form-fields">
            <div className="grupo-formulario">
              <label htmlFor={idTamanhoCamisa}>Tamanho da camisa</label>
              <select
                id={idTamanhoCamisa}
                value={tamanhoCamisa}
                onChange={(e) => setTamanhoCamisa(e.target.value)}
                className={`inscricao-select ${
                  tentouEnviar && camisaInvalida ? "inscricao-field--error" : ""
                }`}
              >
                {TAMANHOS_CAMISA.map((t) => (
                  <option key={t.value || "empty"} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {tentouEnviar && camisaInvalida ? (
                <p className="inscricao-error-text">Selecione um tamanho de camisa.</p>
              ) : null}
            </div>

            <div className="inscricao-payrow">
              <div
                className="inscricao-paybox inscricao-paybox--in-form"
                aria-labelledby={idPayTitle}
              >
                <h3 id={idPayTitle} className="inscricao-paybox-title">
                  Pagamento da inscrição
                </h3>
                <p className="inscricao-paybox-valor">
                  <strong>Valor total:</strong> {VALOR_INSCRICAO_EXIBICAO}
                </p>
                <p className="inscricao-muted">
                  O valor inclui a inscrição e a camisa do campeonato.
                </p>
                <p className="inscricao-qr-label">
                  <strong>QR Code para pagamento:</strong>
                </p>
                <div className="inscricao-qr-frame">
                  <Image
                    src="/qrcode.png"
                    alt="QR Code para pagamento via PIX"
                    width={200}
                    height={200}
                    className="inscricao-qr-image"
                    priority
                  />
                </div>
                <p className="inscricao-muted inscricao-muted--tight">
                  Após pagar, envie ao lado a imagem do comprovante.
                </p>
              </div>

              <div className="grupo-formulario inscricao-upload-wrap inscricao-upload-wrap--side">
                <label htmlFor={idComprovante}>Comprovante de pagamento</label>
                <div
                  className={`inscricao-upload-inner ${
                    tentouEnviar && comprovanteInvalido ? "inscricao-field--error" : ""
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    id={idComprovante}
                    type="file"
                    accept={ACCEPT_COMPROVANTE}
                    onChange={onComprovanteChange}
                    className="inscricao-file-input"
                  />
                </div>
                {tentouEnviar && comprovanteInvalido ? (
                  <p className="inscricao-error-text">Anexe o comprovante de pagamento.</p>
                ) : null}
                <p className="inscricao-hint">
                  Envie uma imagem em PNG, JPG, JPEG ou WEBP, com no máximo 5 MB.
                </p>
                {arquivoComprovante ? (
                  <p className="inscricao-file-name">{arquivoComprovante.name}</p>
                ) : null}
              </div>
            </div>

            {variant === "modal" ? (
              <div className="grupo-formulario" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor={idAceiteRegras} style={{ fontWeight: 800 }}>
                  Termos e regras
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <label
                    className={tentouEnviar && regrasInvalidas ? "inscricao-termos--error" : ""}
                    style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
                  >
                    <input
                      id={idAceiteRegras}
                      type="checkbox"
                      checked={aceitouRegras}
                      onChange={(e) => setAceitouRegras(e.target.checked)}
                    />
                    <span>Concordo com os termos e regras do campeonato</span>
                  </label>

                  <button
                    type="button"
                    className="campeonatos-link"
                    onClick={() => setModalRegrasAberto(true)}
                  >
                    Ler regras
                  </button>
                </div>
                {tentouEnviar && regrasInvalidas ? (
                  <p className="inscricao-error-text">
                    Confirme que você concorda com as regras do campeonato.
                  </p>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              className={`inscricao-submit-analise ${
                variant === "modal" && !podeEnviarNoModal ? "is-disabled" : ""
              }`}
              aria-disabled={variant === "modal" ? (!podeEnviarNoModal ? "true" : "false") : undefined}
              onClick={() => {
                if (variant === "modal" && !podeEnviarNoModal) {
                  setTentouEnviar(true);
                  setMensagem("Complete os campos obrigatórios destacados em vermelho.");
                }
              }}
              title={
                variant === "modal" && !podeEnviarNoModal
                  ? "Anexe o comprovante e concorde com as regras para continuar."
                  : undefined
              }
            >
              Enviar inscrição para análise
            </button>
          </form>

          {variant === "modal" && modalRegrasAberto ? (
            <div
              className="campeonatos-modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label="Regras do campeonato"
              style={{ zIndex: 60 }}
              onClick={() => setModalRegrasAberto(false)}
            >
              <div
                className="campeonatos-modal campeonatos-modal--full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="campeonatos-modal-head">
                  <div>
                    <div className="campeonatos-modal-title">Regras e termos</div>
                    <div className="campeonatos-modal-name">Leia com atenção</div>
                  </div>
                  <button
                    type="button"
                    className="campeonatos-modal-close"
                    onClick={() => setModalRegrasAberto(false)}
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                <div className="campeonatos-modal-scroll campeonatos-modal-scroll--inscricao">
                  <div className="campeonatos-modal-section">
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {REGRAS_TORNEIO}
                    </div>
                  </div>
                </div>

                <div className="campeonatos-modal-actions">
                  <button
                    type="button"
                    className="campeonatos-btn campeonatos-btn--primary"
                    onClick={() => setModalRegrasAberto(false)}
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {mostrarFeedbackRodape ? (
        <p className="mensagem inscricao-feedback">{mensagem}</p>
      ) : null}
    </section>
  );

  if (variant === "modal") {
    return <div className={layoutClass}>{formShell}</div>;
  }

  return (
    <main className="container inscricao-page">
      <header className="cabecalho topo-inicio">
        <div>
          <h1>Inscrição</h1>
          <p>Preencha o formulário e envie para análise da organização.</p>
        </div>
      </header>
      <div className={layoutClass}>{formShell}</div>
    </main>
  );
}
