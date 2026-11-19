import { Metadata } from "next";
import PainelContent from "./painel-content";

export const metadata: Metadata = { title: "Painel" };

export default function PainelPage() {
  return <PainelContent />;
}
