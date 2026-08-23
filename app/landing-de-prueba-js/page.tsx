import type { Metadata } from "next";
import PortadaTres from "../portada-3/page";

export const metadata: Metadata = {
  title: "Landing de prueba JS | Buho Marc",
  description: "Trackeo de la propiedad intelectual integral de tus clientes.",
  robots: { index: false, follow: false },
};

// Ruta privada de prueba: activa el escáner multimodal sin modificar la landing pública.
export default function LandingDePruebaJs() {
  return <PortadaTres scannerMode="multimodal" headlineSecondLine="intelectual integral" />;
}
