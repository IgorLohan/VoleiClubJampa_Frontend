import type { CarouselImage } from "@/components/Carousel";
import CamisaAvulsaPopup from "@/components/CamisaAvulsaPopup";
import HomeBody, { type Patrocinador, type RedeSocial, type PeladaInfo } from "@/components/HomeBody";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { CircleUser, Info, Share2 } from "lucide-react";

const LOGO_VOLEI_CLUB_JAMPA = "/logo/volei_club_jampa.png";

const PASTA_LOGOS_PARCEIROS_COLORIDAS = "/patrocinadores/LOGOS_PNG_PARCEIROS_COLORIDAS";

function logoParceiroColorido(nomeArquivo: string) {
  return `${PASTA_LOGOS_PARCEIROS_COLORIDAS}/${encodeURIComponent(nomeArquivo)}`;
}

/** Logos em `public/patrocinadores/LOGOS_PNG_PARCEIROS_COLORIDAS` (versões coloridas). */
const patrocinadores: Patrocinador[] = [
  { src: logoParceiroColorido("ACE ARENA.png"), alt: "ACE Arena" },
  { src: logoParceiroColorido("AGENCIA LUDI.png"), alt: "Agência Ludi" },
  { src: logoParceiroColorido("DIGITAL STUDIO.png"), alt: "Digital Studio" },
  { src: logoParceiroColorido("HARMONIA CRIATIVA.png"), alt: "Harmonia Criativa" },
  { src: logoParceiroColorido("HR ACADEMIA LOGO.png"), alt: "HR Academia" },
  { src: logoParceiroColorido("LOGO COMPLETA_Prancheta 1.png"), alt: "Rede de parceiros" },
  { src: logoParceiroColorido("MUDIM MINIATURAS.png"), alt: "Miudim Miniaturas" },
  { src: logoParceiroColorido("Oficina JR.png"), alt: "Oficina JR" },
  { src: logoParceiroColorido("PANIFICADORA ALMEIDA.png"), alt: "Panificadora Almeida" },
  { src: logoParceiroColorido("PAULA THALITA FISIO.png"), alt: "Paula Thalita — fisioterapia" },
  { src: logoParceiroColorido("PB PHARMA.png"), alt: "PB Pharma" },
  { src: logoParceiroColorido("PERSONA.png"), alt: "Persona" },
  { src: logoParceiroColorido("SHAKE ALTIPLANO.png"), alt: "Shake Altiplano" },
  { src: logoParceiroColorido("ÓTICA OCULAR.png"), alt: "Ótica Ocular" }
];

/** Ajuste os links com os perfis reais do clube. */
const redesSociais: RedeSocial[] = [
  {
    id: "instagram",
    href: "https://www.instagram.com/voleiclubjampa/",
    label: "Instagram"
  },
  { id: "youtube", href: "https://www.youtube.com/", label: "YouTube" },
  { id: "whatsapp", href: "https://wa.me/558394191818", label: "WhatsApp" }
];

const pelada: PeladaInfo = {
  dias: "Sexta e Domingo",
  horario: "16:00",
  local: "Arena Ace Altiplano"
};

const images: CarouselImage[] = [
  { src: "/branding/carrossel_1.jpg", alt: "Pelada Vôlei Club Jampa — foto 1" },
  { src: "/branding/carrossel_2.jpg", alt: "Pelada Vôlei Club Jampa — foto 2" },
  { src: "/branding/carrossel_3.jpeg", alt: "Pelada Vôlei Club Jampa — foto 3" },
  { src: "/branding/carrossel_4.JPG", alt: "Pelada Vôlei Club Jampa — foto 4" },
  { src: "/branding/carrossel_5.jpeg", alt: "Pelada Vôlei Club Jampa — foto 5" },
  { src: "/branding/carrossel_6.jpg", alt: "Pelada Vôlei Club Jampa — foto 6" },
  { src: "/branding/carrossel_7.jpeg", alt: "Pelada Vôlei Club Jampa — foto 7" }
];

export default function Home() {
  return (
    <>
      <CamisaAvulsaPopup />
      <SiteHeader
        logoSrc={LOGO_VOLEI_CLUB_JAMPA}
        logoAlt="Vôlei Club Jampa"
        brandName="Vôlei Club Jampa"
        links={[
          { label: "Sobre nós", href: "#sobre-nos-titulo", icon: <Info /> },
          { label: "Torneios", href: "/torneio" },
          { label: "Redes sociais", href: "#redes-titulo", icon: <Share2 /> },
          { label: "Login", href: "/login", variant: "cta", icon: <CircleUser /> }
        ]}
      />
      <HomeBody
        images={images}
        pelada={pelada}
        patrocinadores={patrocinadores}
        redesSociais={redesSociais}
      />
      <SiteFooter brandName="Vôlei Club Jampa" />
    </>
  );
}

