import { Suspense } from "react";
import PageLoader from "@/components/PageLoader";
import VerificarEmailClient from "./verificar-email-client";

export default function VerificarEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page">
          <div className="auth-shell">
            <section className="auth-card" aria-label="Verificação de e-mail">
              <PageLoader label="Carregando" variant="section" />
            </section>
          </div>
        </main>
      }
    >
      <VerificarEmailClient />
    </Suspense>
  );
}

