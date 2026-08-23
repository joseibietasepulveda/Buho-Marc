import type { Metadata } from "next";
import PortadaTres from "../portada-3/page";

export const metadata: Metadata = {
  title: "Buho Marc | Vigilancia integral de marcas",
  description: "Trackeo de la propiedad intelectual integral de tus clientes.",
};

export default function Landing() {
  return <PortadaTres scannerMode="multimodal" headlineSecondLine="intelectual integral" dashboardMode="preview" />;
}
