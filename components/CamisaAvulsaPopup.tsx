"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const BANNER_CAMISA = "/branding/banner-camisa.jpeg";

const WHATSAPP_NUMERO = "558391169827";

const TAMANHOS_POR_MODELO = {
  padrao: ["P", "M", "G"],
  brasil: ["P", "M", "G", "GG"]
} as const;

type ModeloCamisa = keyof typeof TAMANHOS_POR_MODELO;

const PRECOS_POR_MODELO = {
  padrao: "35,00",
  brasil: "40,00"
} as const;

function linkWhatsApp(modelo: ModeloCamisa, tamanho: string) {
  const nomeModelo = modelo === "brasil" ? "Brasil" : "padrão";
  const preco = PRECOS_POR_MODELO[modelo];
  const mensagem = `Olá! Gostaria de garantir minha camisa — modelo ${nomeModelo}, tamanho ${tamanho}, R$ ${preco} — do Vôlei Club Jampa.`;
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}

export default function CamisaAvulsaPopup() {
  const [aberto, setAberto] = useState(false);
  const [modeloSelecionado, setModeloSelecionado] = useState<ModeloCamisa | null>(null);

  const tamanhosDisponiveis = useMemo(
    () => (modeloSelecionado ? TAMANHOS_POR_MODELO[modeloSelecionado] : []),
    [modeloSelecionado]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setAberto(true), 500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!aberto) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") fechar();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [aberto]);

  function fechar() {
    setAberto(false);
    setModeloSelecionado(null);
  }

  function abrirWhatsApp(modelo: ModeloCamisa, tamanho: string) {
    window.open(linkWhatsApp(modelo, tamanho), "_blank", "noopener,noreferrer");
    fechar();
  }

  if (!aberto) return null;

  return (
    <div
      className="campeonatos-modal-backdrop camisa-avulsa-popup-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camisa-avulsa-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget) fechar();
      }}
    >
      <div className="campeonatos-modal camisa-avulsa-popup">
        <div className="camisa-avulsa-popup-banner-wrap">
          <img
            src={BANNER_CAMISA}
            alt="Nossa nova camisa — Vôlei Club Jampa"
            className="camisa-avulsa-popup-banner"
          />
          <button
            type="button"
            className="campeonatos-modal-close camisa-avulsa-popup-close"
            onClick={fechar}
            aria-label="Fechar aviso"
          >
            <X aria-hidden size={18} />
          </button>
        </div>

        <div className="camisa-avulsa-popup-body">
          <div className="camisa-avulsa-popup-texto">
            <p id="camisa-avulsa-titulo">
              Garanta já a sua camisa do clube — perfeita para treinos, peladas e torneios.
              Estoque limitado!
            </p>
          </div>

          <div className="campeonatos-modal-actions camisa-avulsa-popup-acoes">
          <button
            type="button"
            className={`campeonatos-btn campeonatos-btn--ghost camisa-avulsa-popup-modelo${
              modeloSelecionado === "padrao" ? " is-active" : ""
            }`}
            onClick={() => setModeloSelecionado("padrao")}
            aria-pressed={modeloSelecionado === "padrao"}
          >
            Modelo Marrom - R$ 35,00
          </button>
          <button
            type="button"
            className={`campeonatos-btn campeonatos-btn--primary camisa-avulsa-popup-modelo${
              modeloSelecionado === "brasil" ? " is-active" : ""
            }`}
            onClick={() => setModeloSelecionado("brasil")}
            aria-pressed={modeloSelecionado === "brasil"}
          >
            Modelo Brasil - R$ 40,00
          </button>
        </div>

        {modeloSelecionado ? (
          <div className="camisa-avulsa-popup-tamanhos">
            <p className="camisa-avulsa-popup-tamanhos-label">Escolha o tamanho</p>
            <div
              className="camisa-avulsa-popup-tamanhos-grid"
              role="group"
              aria-label={`Tamanhos do modelo ${
                modeloSelecionado === "brasil" ? "Brasil" : "padrão"
              }`}
            >
              {tamanhosDisponiveis.map((tamanho) => (
                <button
                  key={tamanho}
                  type="button"
                  className="camisa-avulsa-popup-tamanho"
                  onClick={() => abrirWhatsApp(modeloSelecionado, tamanho)}
                >
                  {tamanho}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="camisa-avulsa-popup-dica">Selecione um modelo para ver os tamanhos.</p>
        )}
        </div>
      </div>
    </div>
  );
}
