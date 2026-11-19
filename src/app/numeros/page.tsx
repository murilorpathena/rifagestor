import { Metadata } from "next";
import NumerosContent from "./numeros-content";

export const metadata: Metadata = { title: "Números" };

export default function NumerosPage() {
  return <NumerosContent />;
}
