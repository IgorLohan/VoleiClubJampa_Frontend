export const chavesSessao = {
  tokenAdmin: "tokenAdmin",
  adminLogado: "adminLogado",
  tokenParticipante: "tokenParticipante",
  participanteLogado: "participanteLogado"
} as const;

export type ChaveSessao = (typeof chavesSessao)[keyof typeof chavesSessao];

export function getJSONStorage<T = unknown>(chave: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(chave);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJSONStorage(chave: string, valor: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(chave, JSON.stringify(valor));
}

export function getStorage(chave: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(chave);
}

export function setStorage(chave: string, valor: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(chave, valor);
}

export function removeStorage(chave: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(chave);
}

export function logoutAdmin(): void {
  removeStorage(chavesSessao.tokenAdmin);
  removeStorage(chavesSessao.adminLogado);
}

export function logoutParticipante(): void {
  removeStorage(chavesSessao.tokenParticipante);
  removeStorage(chavesSessao.participanteLogado);
}

