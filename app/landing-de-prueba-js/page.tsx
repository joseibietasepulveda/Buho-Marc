import type { Metadata } from "next";
import PortadaTres from "../portada-3/page";

export const metadata: Metadata = {
  title: "Landing de prueba JS | Buho Marc",
  description: "Trackeo de la propiedad intelectual intelectual de tus clientes.",
  robots: { index: false, follow: false },
};

// Ruta privada de prueba: reutiliza la misma landing sin exponerla desde la navegación pública.
export default PortadaTres;
