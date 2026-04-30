"use client";

import { useParams } from "next/navigation";
import InscricaoCampeonatoContent from "@/components/InscricaoCampeonatoContent";

export default function InscricaoPage() {
  const params = useParams<{ id: string }>();
  return (
    <InscricaoCampeonatoContent campeonatoId={params?.id} variant="page" />
  );
}
