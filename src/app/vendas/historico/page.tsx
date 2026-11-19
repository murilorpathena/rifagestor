import { Metadata } from "next";
import HistoricoContent from "./historico-content";

export const metadata: Metadata = { title: "Histórico de vendas" };

export default function HistoricoPage() {
  return <HistoricoContent />;
}
