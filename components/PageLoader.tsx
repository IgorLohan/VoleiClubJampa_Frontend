"use client";

export type PageLoaderProps = {
  /** Texto abaixo do spinner */
  label?: string;
  /** Tela cheia (rotas), bloco médio (listas/modais) ou compacto (inline) */
  variant?: "fullscreen" | "section" | "inline";
  className?: string;
};

/**
 * Loading consistente com a identidade VoleiClub (azul + laranja/vermelho).
 * Use variant="fullscreen" em loading.tsx; "section" em tabelas/cards; "inline" em linhas.
 */
export default function PageLoader({
  label = "Carregando",
  variant = "fullscreen",
  className = ""
}: PageLoaderProps) {
  const rootClass = ["page-loader", `page-loader--${variant}`, className].filter(Boolean).join(" ");

  return (
    <div className={rootClass} role="status" aria-live="polite" aria-busy="true">
      <div className="page-loader__glow" aria-hidden />
      <div className="page-loader__content">
        <div className="page-loader__spinner" aria-hidden>
          <span className="page-loader__ring page-loader__ring--a" />
          <span className="page-loader__ring page-loader__ring--b" />
        </div>
        <p className="page-loader__label">{label}</p>
        <div className="page-loader__dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
      <span className="page-loader__sr-only">Conteúdo em carregamento, aguarde.</span>
    </div>
  );
}
