# 🏐 Volei Club Jampa

Plataforma web completa para **gestão de campeonatos de vôlei amador** em João Pessoa/PB.
O sistema cobre todo o ciclo de vida de um torneio: cadastro de participantes, inscrições (por equipe ou individuais), análise/aprovação de pagamentos, geração automática de chaveamentos, registro de placares set a set, pódio e resumo final.

O projeto é dividido em duas aplicações independentes que se comunicam por uma API REST:

- **`VoleiClubJampa_Frontend`** – Aplicação web em Next.js (este diretório).
- **`VoleiClubJampa_Backend`** – API REST em Node.js + Express + Prisma + PostgreSQL.

---

## 📑 Sumário

1. [Visão geral do produto](#-visão-geral-do-produto)
2. [Arquitetura](#-arquitetura)
3. [Stack tecnológica](#-stack-tecnológica)
4. [Modelo de domínio](#-modelo-de-domínio)
5. [Funcionalidades](#-funcionalidades)
6. [Estrutura de pastas](#-estrutura-de-pastas)
7. [Como rodar o projeto](#-como-rodar-o-projeto)
8. [Variáveis de ambiente](#-variáveis-de-ambiente)
9. [Roadmap](#-roadmap)

---

## 🎯 Visão geral do produto

O Volei Club Jampa atende dois perfis de usuários:

- **Participantes (atletas)** – criam conta, confirmam e-mail, se inscrevem em campeonatos (sozinhos ou em equipe), enviam comprovante de pagamento, escolhem tamanho de camisa, acompanham suas inscrições, criam/recebem convites para equipes e visualizam chaveamentos públicos.
- **Administradores (organização)** – criam e configuram campeonatos (formato, categoria, modo de inscrição, limite de vagas), aprovam/reprovam inscrições individuais, montam equipes a partir de inscrições avulsas, geram chaveamento automaticamente, registram placares, encerram/reabrem inscrições e gerenciam usuários.

O front é uma SPA renderizada pelo Next.js com áreas públicas (home, campeonatos, login, cadastro) e áreas autenticadas (`/dashboard/*`) que mudam de acordo com o papel (`ADMIN` ou `PARTICIPANTE`).

---

## 🏗 Arquitetura

```
┌────────────────────────┐        HTTPS / JSON         ┌──────────────────────────┐
│   Frontend (Next.js)   │  ───────────────────────▶   │   Backend (Express API)  │
│   React 19 + TS + Tw   │  ◀───────────────────────   │   Node.js + Prisma ORM   │
└────────────┬───────────┘                             └────────────┬─────────────┘
             │                                                       │
             │  uploads (multipart/form-data)                        │
             │                                                       ▼
             │                                          ┌──────────────────────────┐
             │                                          │  PostgreSQL (Neon)       │
             │                                          └──────────────────────────┘
             │                                                       │
             │                                                       ▼
             │                                          ┌──────────────────────────┐
             └────────────────────────────────────────▶ │  Resend (e-mails)        │
                                                        └──────────────────────────┘
```

- **Autenticação**: JWT por header `Authorization: Bearer <token>`, com tokens distintos para admin e participante (`localStorage.tokenAdmin` / `tokenParticipante`).
- **Upload de arquivos**: foto de perfil e comprovantes via `multer`, servidos estaticamente em `/uploads`.
- **E-mails transacionais**: confirmação de cadastro/verificação via Resend.
- **Banco**: PostgreSQL gerenciado (Neon), migrações controladas pelo Prisma.

---

## 🧰 Stack tecnológica

### Frontend (`VoleiClubJampa_Frontend`)
- **Next.js 15** (App Router) e **React 19**
- **TypeScript 6**
- **Tailwind CSS 4** + PostCSS + Autoprefixer
- **lucide-react** para ícones
- **xlsx** para exportação de planilhas (chaveamento, inscrições)
- Camada de API tipada em `lib/api.ts` (`fazerRequisicao<T>`)

### Backend (`VoleiClubJampa_Backend`)
- **Node.js** com **Express 4** (ESM)
- **Prisma 6** + **PostgreSQL**
- **JWT** (`jsonwebtoken`) + **bcryptjs** para autenticação
- **Multer** para upload de imagens
- **Resend** para envio de e-mails transacionais
- **CORS**, **dotenv**, **nodemon** (dev)

---

## 🗃 Modelo de domínio

Resumo das principais entidades em `prisma/schema.prisma`:

| Entidade | Papel |
| --- | --- |
| **Usuario** | Conta de admin ou participante. Suporta verificação de e-mail, foto de perfil, sexo, contato, etc. |
| **Equipe** + **EquipeMembro** + **ConviteEquipe** | Equipes criadas por um dono, com membros e convites por token. |
| **Campeonato** | Configuração do torneio: tipo (`DUPLA`/`TIME`), categoria (`MASCULINO`/`FEMININO`/`MISTA`), formato e modo de inscrição. |
| **Participante** | Inscrição confirmada de uma equipe num campeonato (status `PENDENTE`/`APROVADA`/`RECUSADA`). |
| **Jogador** | Atletas vinculados a uma inscrição (`Participante`). |
| **InscricaoIndividual** | Inscrição avulsa com pagamento, comprovante, tamanho de camisa e análise do admin. |
| **Jogo** + **SetJogo** | Confrontos do chaveamento e placares set a set. |

**Formatos suportados**: `MATA_MATA`, `DUPLA_ELIMINACAO`, `TODOS_CONTRA_TODOS`, `GRUPOS_3X4_REPESCAGEM`.
**Modos de inscrição**: `POR_EQUIPE` (admin/participante cadastra a equipe completa) e `INDIVIDUAL` (atletas se inscrevem sozinhos e o admin monta as equipes).

---

## ⚙️ Funcionalidades

### Área pública
- Landing page com carrossel e listagem de campeonatos.
- Cadastro de participante com verificação de e-mail (token único e expiração).
- Login de participante e de admin (rotas separadas).
- Página pública de cada campeonato (resumo, equipes inscritas, chaveamento e pódio).

### Painel do participante (`/dashboard`)
- Edição do perfil + upload de foto.
- Criação de equipe, envio/aceite de convites por token.
- Inscrição em campeonato como equipe ou individualmente.
- Envio de comprovante de pagamento + tamanho de camisa.
- Acompanhamento de "Minhas inscrições" e status de análise.

### Painel administrativo (`/dashboard` com papel `ADMIN`)
- CRUD completo de campeonatos.
- Inscrição manual de equipes pelo admin.
- Aprovação/recusa de inscrições individuais com observação.
- Montagem de equipes a partir de inscrições individuais aprovadas.
- Encerrar/reabrir inscrições.
- Geração automática de chaveamento por formato.
- Registro de placar set a set; cálculo automático do vencedor.
- Pódio e resumo do campeonato.
- Gestão de usuários (papéis, redefinição de senha, exclusão).

### API REST (rotas principais)
| Prefixo | Descrição |
| --- | --- |
| `/admin/*` | Login e operações administrativas sobre usuários. |
| `/usuarios/*` | Cadastro, login, verificação de e-mail, perfil, foto, "minhas inscrições". |
| `/campeonatos` | CRUD de campeonatos + listagens públicas. |
| `/campeonatos/:id/inscricoes` | Inscrições por equipe (participante e admin). |
| `/campeonatos/:id/inscricoes-individuais` | Inscrições individuais e fluxo de aprovação. |
| `/campeonatos/:id/chaveamento` | Geração e consulta do chaveamento. |
| `/campeonatos/:id/resumo` e `/resumo-publico` | Visão consolidada do campeonato. |
| `/campeonatos/:id/podio` | Pódio final. |
| `/jogos/:id/placar` | Registro de sets. |
| `/equipes/*` | Equipes, membros e convites. |
| `/uploads/*` | Servir estaticamente fotos e comprovantes. |

A camada de cliente do front está consolidada em `lib/api.ts`, com funções tipadas como `criarCampeonato`, `gerarChaveamento`, `aprovarInscricaoIndividual`, `montarEquipeComInscricoesIndividuais`, etc.

---

## 📂 Estrutura de pastas

### Frontend
```
VoleiClubJampa_Frontend/
├── app/
│   ├── admin/                 # Login do administrador
│   ├── campeonatos/           # Listagem e detalhe público
│   ├── dashboard/             # Área autenticada (admin + participante)
│   │   ├── campeonatos/       # CRUD de campeonatos
│   │   ├── chaveamento/       # Geração e visualização do chaveamento
│   │   ├── equipes/           # Gestão de equipes e convites
│   │   ├── inscricao/         # Inscrição em campeonato
│   │   ├── inscricoes/        # Análise admin de inscrições individuais
│   │   ├── minhas-inscricoes/ # Visão do participante
│   │   └── usuarios/          # Gestão de usuários (admin)
│   ├── inscricao/             # Fluxo público de inscrição
│   ├── login/                 # Login do participante
│   ├── participante/          # Cadastro do participante
│   ├── verificar-email/       # Confirmação de e-mail
│   ├── globals.css            # Tailwind + estilos globais
│   ├── layout.tsx
│   └── page.tsx               # Home
├── components/                # Componentes compartilhados (Header, Footer, Carousel, etc.)
├── lib/
│   ├── api.ts                 # Cliente HTTP tipado da API
│   └── sessao.ts              # Helpers de sessão/JWT no client
├── public/
├── tailwind.config.ts
├── next.config.mjs
└── tsconfig.json
```

### Backend
```
VoleiClubJampa_Backend/
├── prisma/
│   ├── schema.prisma          # Modelo de dados completo
│   └── migrations/
├── src/
│   ├── app.js                 # Configuração do Express e rotas
│   ├── servidor.js            # Bootstrap do servidor
│   ├── rotas/                 # Definição de endpoints
│   ├── controladores/         # Camada HTTP (validação + resposta)
│   ├── servicos/              # Regras de negócio (campeonato, chaveamento, e-mails…)
│   ├── middlewares/           # Autenticação admin/participante e upload
│   ├── banco/                 # Cliente Prisma
│   ├── utilitarios/           # Helpers diversos
│   └── scripts/               # Scripts utilitários (seed, manutenção)
├── uploads/                   # Arquivos enviados (foto de perfil, comprovantes)
├── package.json
└── .env
```

---

## ▶️ Como rodar o projeto

### Pré-requisitos
- Node.js 20+ e npm
- PostgreSQL acessível (local ou Neon)
- Conta no [Resend](https://resend.com) para os e-mails (opcional em dev)

### 1) Backend
```bash
cd VoleiClubJampa_Backend
npm install
# Configure o .env (ver seção abaixo)
npx prisma migrate dev
npm run dev   # http://localhost:3333
```

Scripts disponíveis:
- `npm run dev` – inicia com nodemon
- `npm run build` – `prisma generate`
- `npm start` – aplica migrações e sobe o servidor (produção)
- `npm run prisma:studio` – abre o Prisma Studio

### 2) Frontend
```bash
cd VoleiClubJampa_Frontend
npm install
npm run dev   # http://localhost:3000
```

Por padrão o front aponta para a API de produção. Para usar o backend local, descomente a linha de `API_BASE` em `lib/api.ts` ou exporte:
```bash
NEXT_PUBLIC_API_BASE=http://localhost:3333
```

---

## 🔐 Variáveis de ambiente

### Backend (`VoleiClubJampa_Backend/.env`)
| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | String de conexão PostgreSQL (Neon em produção) |
| `PORTA` | Porta do servidor (padrão `3333`) |
| `JWT_SECRET` | Segredo usado para assinar os JWTs |
| `RESEND_API_KEY` | Chave do Resend para envio de e-mails |
| `EMAIL_FROM` | Remetente padrão (ex.: `Volei Club Jampa <nao-responda@...>`) |
| `URL_FRONTEND` | URL do front, usada nos links dos e-mails |

### Frontend
| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_API_BASE` | URL base da API (sobrescreve o default em `lib/api.ts`) |

> ⚠️ Não comite o arquivo `.env`. Em produção, configure as variáveis no provedor (Railway/Vercel).

---

## 🗺 Roadmap

Esta é a visão de evolução planejada do Volei Club Jampa. Itens marcados com ✅ já estão em produção.

### ✅ Versão 1.0 – MVP atual
- [x] Cadastro e login de participantes com verificação de e-mail
- [x] Login administrativo separado
- [x] CRUD de campeonatos com 4 formatos (mata-mata, dupla eliminação, todos contra todos, grupos 3×4 + repescagem)
- [x] Inscrição por equipe (admin e participante)
- [x] Inscrição individual com comprovante de pagamento e tamanho de camisa
- [x] Aprovação/recusa de inscrições individuais pelo admin
- [x] Montagem de equipes a partir de inscrições individuais
- [x] Geração automática de chaveamento
- [x] Registro de placar set a set e definição automática do vencedor
- [x] Pódio e resumo público do campeonato
- [x] Sistema de equipes com convites por token
- [x] Upload de foto de perfil
- [x] Exportação de dados em planilha (xlsx)

### 🔜 Versão 1.1 – Estabilização e UX
- [ ] Tela "Esqueci minha senha" com link de redefinição por e-mail
- [ ] Notificações in-app (status de inscrição aprovado/reprovado, novo jogo, próxima rodada)
- [ ] Página pública do atleta (histórico de campeonatos e títulos)
- [ ] Mobile-first review de todas as telas do dashboard
- [ ] Skeletons e estados de erro consistentes em todas as listagens
- [ ] Testes E2E (Playwright) cobrindo fluxos críticos

### 🧩 Versão 1.2 – Pagamentos e financeiro
- [ ] Integração com gateway de pagamento (Pix automático via Mercado Pago/Asaas)
- [ ] Geração de QR Code Pix por inscrição
- [ ] Confirmação automática de pagamento (webhook) substituindo o upload manual de comprovante
- [ ] Relatório financeiro por campeonato (entradas, devoluções, taxas)
- [ ] Emissão de recibo em PDF

### 📊 Versão 1.3 – Estatísticas e engajamento
- [ ] Estatísticas individuais (jogos, sets ganhos, aproveitamento)
- [ ] Ranking de equipes e atletas por temporada
- [ ] Linha do tempo do campeonato (jogos ao vivo)
- [ ] Compartilhamento de resultados em redes sociais (cards prontos)
- [ ] Galeria de fotos por campeonato

### 🤝 Versão 1.4 – Comunidade
- [ ] Mural de avisos por campeonato
- [ ] Chat/grupo por equipe
- [ ] Sistema de avaliação fair-play entre equipes
- [ ] Convite de árbitros e mesários com permissões dedicadas

### 🛠 Versão 2.0 – Plataforma multi-clube
- [ ] Multi-tenant: vários clubes/organizações usando a mesma plataforma
- [ ] Personalização visual por clube (logo, cores, domínio próprio)
- [ ] App mobile nativo (React Native/Expo) para participantes
- [ ] PWA com modo offline para registro de placar em quadra
- [ ] API pública documentada (OpenAPI/Swagger) para integrações
- [ ] Internacionalização (PT-BR, EN, ES)

---

## 📝 Licença

Projeto privado do **Volei Club Jampa**. Todos os direitos reservados.
