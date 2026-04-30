import type { CarouselImage } from "@/components/Carousel";
import HomeBody, { type Patrocinador, type RedeSocial, type PeladaInfo } from "@/components/HomeBody";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { CircleUser, Info, Share2 } from "lucide-react";

const LOGO_VOLEI_CLUB_JAMPA = "/logo/volei_club_jampa.png";

const patrocinadores: Patrocinador[] = [
  { src: "/patrocinadores/LOGOS_PNG_PARCEIROS/LOGO_BASSI_ESTUDIO.png", alt: "Bassi Studio" },
  { src: "/patrocinadores/LOGOS_PNG_PARCEIROS/LOGO_HARMONIA_CRIATIVA.png", alt: "Harmonia Criativa" },
  { src: "/patrocinadores/LOGOS_PNG_PARCEIROS/LOGO_HR_TRAINING.png", alt: "HR Training" },
  { src: "/patrocinadores/LOGOS_PNG_PARCEIROS/LOGO_LUDI.png", alt: "Ludi" },
  { src: "/patrocinadores/LOGOS_PNG_PARCEIROS/LOGO_MIUDIM.png", alt: "Miudim" },
  { src: "/patrocinadores/LOGOS_PNG_PARCEIROS/LOGO_OFICINA_JR.png", alt: "Oficina JR" },
  { src: "/patrocinadores/LOGOS_PNG_PARCEIROS/LOGO_PB_PHARMA.png", alt: "PB Pharma" },
  { src: "/patrocinadores/LOGOS_PNG_PARCEIROS/LOGO_PERSONA.png", alt: "Persona" },
  { src: "/patrocinadores/LOGOS_PNG_PARCEIROS/LOGO_SHAKE_ALTIPLANO.png", alt: "Shake Altiplano" },
  { src: "/patrocinadores/LOGOS_PNG_PARCEIROS/LOGO_ACE.png", alt: "Ace" },
  { src: "/patrocinadores/LOGOS_PNG_PARCEIROS/LOGO_PANIFICADORA_ALMEIDA.png", alt: "Panificadora Almeida" }
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
  { src: "/branding/carrossel_1.jpeg", alt: "Pelada Vôlei Club Jampa — foto 1" },
  { src: "/branding/carrossel_2.jpeg", alt: "Pelada Vôlei Club Jampa — foto 2" },
  { src: "/branding/carrossel_3.jpeg", alt: "Pelada Vôlei Club Jampa — foto 3" }
];

export default function Home() {
  return (
    <>
      <SiteHeader
        logoSrc={LOGO_VOLEI_CLUB_JAMPA}
        logoAlt="Vôlei Club Jampa"
        brandName="Vôlei Club Jampa"
        links={[
          { label: "Sobre nós", href: "#sobre-nos-titulo", icon: <Info /> },
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

