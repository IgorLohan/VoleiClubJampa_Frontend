import type { CSSProperties } from "react";
import Carousel, { type CarouselImage } from "@/components/Carousel";

export type Patrocinador = {
  src: string;
  alt: string;
  href?: string;
};

export type RedeSocialId = "instagram" | "youtube" | "whatsapp" | "tiktok";

export type RedeSocial = {
  id: RedeSocialId;
  href: string;
  label: string;
};

export type PeladaInfo = {
  dias: string;
  horario: string;
  local: string;
};

export type HomeBodyProps = {
  images: CarouselImage[];
  pelada: PeladaInfo;
  patrocinadores: Patrocinador[];
  redesSociais: RedeSocial[];
};

function IconCalendario() {
  return (
    <svg
      className="about-detail-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function IconRelogio() {
  return (
    <svg
      className="about-detail-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.2V12l3.2 1.9" />
    </svg>
  );
}

function IconLocal() {
  return (
    <svg
      className="about-detail-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}

function RedeIcon({ id }: { id: RedeSocialId }) {
  const cls = "home-social-icon-svg";
  switch (id) {
    case "instagram":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.163 6.163 0 1 0 0 12.325 6.163 6.163 0 0 0 0-12.325zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 1-2.881.001 1.44 1.44 0 0 1 2.881-.001z" />
        </svg>
      );
    case "youtube":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function HomeBody({
  images,
  pelada,
  patrocinadores,
  redesSociais
}: HomeBodyProps) {
  return (
    <main className="home-hero">
      <section className="hero-carousel-section" aria-label="Destaque em fotos">
        <div className="hero-media hero-media--full">
          <Carousel images={images} />
        </div>
      </section>

      <section className="home-about" aria-labelledby="sobre-nos-titulo">
        <div className="home-about-inner">
          <article className="about-card">
            <h1 id="sobre-nos-titulo" className="home-about-title">
              Sobre nós
            </h1>
            <p className="home-about-lead">
              O Vôlei Club Jampa reúne quem ama vôlei em peladas semanais e
              campeonatos — ambiente acolhedor para jogar, evoluir e criar amizade.
            </p>
            <p className="home-about-lead">
              Nosso encontro fixo é pra quem quer treinar com leveza e
              competitividade saudável.
            </p>

            <div className="about-details" role="list" aria-label="Detalhes da pelada">
              <div className="about-detail" role="listitem">
                <span className="about-detail-icon-wrap" aria-hidden>
                  <IconCalendario />
                </span>
                <span className="about-detail-label">Dias</span>
                <strong className="about-detail-value">{pelada.dias}</strong>
              </div>
              <div className="about-detail" role="listitem">
                <span className="about-detail-icon-wrap" aria-hidden>
                  <IconRelogio />
                </span>
                <span className="about-detail-label">Horário</span>
                <strong className="about-detail-value">{pelada.horario}</strong>
              </div>
              <div className="about-detail" role="listitem">
                <span className="about-detail-icon-wrap" aria-hidden>
                  <IconLocal />
                </span>
                <span className="about-detail-label">Local</span>
                <strong className="about-detail-value">{pelada.local}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="home-sponsors" aria-labelledby="patrocinadores-titulo">
        <div className="home-sponsors-inner">
          <h2 id="patrocinadores-titulo" className="home-sponsors-title">
            Patrocinadores
          </h2>
          <p className="home-sponsors-lead">Parceiros que apoiam o Vôlei Club Jampa</p>

          {patrocinadores.length > 0 ? (
            <div
              className="home-sponsors-orbit"
              style={
                {
                  "--orbit-count": patrocinadores.length
                } as CSSProperties
              }
            >
              <div className="home-sponsors-orbit-rays" aria-hidden />
              <div className="home-sponsors-orbit-center">
                <img
                  src="/logo/volei_club_jampa.png"
                  alt="Vôlei Club Jampa"
                  width={160}
                  height={160}
                />
              </div>
              <ul className="home-sponsors-orbit-list" role="list">
                {patrocinadores.map((p, i) => (
                  <li
                    key={`${p.src}-${i}`}
                    className="home-sponsors-orbit-item"
                    style={
                      {
                        "--orbit-index": i
                      } as CSSProperties
                    }
                  >
                    <div className="home-sponsors-orbit-upright">
                      <div className="home-sponsors-orbit-counter">
                        {p.href ? (
                          <a
                            href={p.href}
                            className="home-sponsors-card home-sponsors-card--orbit"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img src={p.src} alt={p.alt} />
                          </a>
                        ) : (
                          <div className="home-sponsors-card home-sponsors-card--orbit">
                            <img src={p.src} alt={p.alt} />
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="home-sponsors-empty">Em breve os logos dos nossos parceiros.</p>
          )}
        </div>
      </section>

      {redesSociais.length > 0 ? (
        <section className="home-social" aria-labelledby="redes-titulo">
          <div className="home-social-inner">
            <h2 id="redes-titulo" className="home-social-title">
              Redes sociais
            </h2>
            <p className="home-social-lead">
              Siga o Vôlei Club Jampa e fique por dentro de fotos, avisos e eventos.
            </p>
            <ul className="home-social-list" role="list">
              {redesSociais.map((rede) => (
                <li key={rede.id} role="listitem">
                  <a
                    href={rede.href}
                    className={`home-social-link home-social-link--${rede.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${rede.label} (abre em nova aba)`}
                  >
                    <span className="home-social-icon" aria-hidden>
                      <RedeIcon id={rede.id} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </main>
  );
}
