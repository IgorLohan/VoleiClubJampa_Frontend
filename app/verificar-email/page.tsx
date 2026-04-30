import { Suspense } from "react";
import VerificarEmailClient from "./verificar-email-client";

export default function VerificarEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page">
          <div className="auth-shell">
            <section className="auth-card" aria-label="Verificação de e-mail">
              <div className="auth-title">
                <h2>Verificação de e-mail</h2>
                <p>Carregando...</p>
              </div>
            </section>
          </div>
        </main>
      }
    >
      <VerificarEmailClient />
    </Suspense>
  );
}

