import type { Metadata } from "next";
import LandingMixta from "../landing-mixta/page";

export const metadata: Metadata = {
  title: "Buho Marc | Revisión y vigilancia integral de marcas",
  description:
    "Revisa una marca antes de inscribirla y vigílala después con detección fonética, visual y semántica.",
  openGraph: {
    title: "Buho Marc | Revisión y vigilancia integral de marcas",
    description:
      "Detección fonética, visual y semántica para revisar y vigilar marcas antes que el conflicto.",
  },
};

/** Copia independiente de la landing mixta para pruebas. */
export default function LandingMixtaPruebaDeepseek() {
  return <LandingMixta />;
}
