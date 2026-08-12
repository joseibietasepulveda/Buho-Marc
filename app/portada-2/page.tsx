import type { Metadata } from "next";
import ScannerShowcase from "./scanner-showcase";

export const metadata: Metadata = {
  title: "Portada 2 | Image Watch",
  description: "El algoritmo visual de Image Watch en acción.",
};

export default function PortadaDos() {
  return <ScannerShowcase />;
}
