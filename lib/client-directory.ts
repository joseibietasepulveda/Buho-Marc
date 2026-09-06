import { z } from "zod";

export const clientDataSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos dos caracteres").max(180),
  rut: z.string().trim().max(30), contact: z.string().trim().max(180),
  phone: z.string().trim().max(60), email: z.union([z.literal(""), z.string().trim().email("Ingresa un correo válido").max(255)]),
}).strict();
export type ClientData = z.infer<typeof clientDataSchema>;
export type Client = ClientData & { id: string; version: number; mock: boolean };
export type ClientField = keyof ClientData;
export const CLIENT_FIELDS: { key: ClientField; label: string }[] = [{key:"name",label:"Nombre del estudio"},{key:"rut",label:"RUT"},{key:"contact",label:"Nombre de contacto"},{key:"phone",label:"Teléfono de contacto"},{key:"email",label:"Mail de contacto"}];
export const clientPatchSchema = z.object({ id: z.string().regex(/^CL-\d+$/), version: z.number().int().positive(), field: z.enum(["name","rut","contact","phone","email"]), value: z.string().max(255) }).strict();

export const demoClients = [
  { id: "CL-01", name: "Araya & Montes Abogados", rut: "77.810.240-6", contact: "Catalina Araya", phone: "+56 2 2400 0101", email: "catalina.araya@example.com" },
  { id: "CL-02", name: "Estudio Rivas del Valle", rut: "77.810.241-4", contact: "Tomás Rivas", phone: "+56 2 2400 0102", email: "tomas.rivas@example.com" },
  { id: "CL-03", name: "Fuentes y Lagos Propiedad Intelectual", rut: "77.810.242-2", contact: "Antonia Lagos", phone: "+56 2 2400 0103", email: "antonia.lagos@example.com" },
  { id: "CL-04", name: "Estudio Córdova Legal", rut: "77.810.243-0", contact: "Diego Córdova", phone: "+56 2 2400 0104", email: "diego.cordova@example.com" },
  { id: "CL-05", name: "Valdés & Pizarro Asociados", rut: "77.810.244-9", contact: "Josefina Valdés", phone: "+56 2 2400 0105", email: "josefina.valdes@example.com" },
  { id: "CL-06", name: "Estudio Andrade Sur", rut: "77.810.245-7", contact: "Nicolás Andrade", phone: "+56 2 2400 0106", email: "nicolas.andrade@example.com" },
];

// Preserve the existing mock relationships by immutable ID, even after renaming a client.
export function mockClientId(brand: string) {
  const key = brand.trim().toLocaleUpperCase("es");
  return demoClients[Array.from(key).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % demoClients.length].id;
}

export type ClientBrand = { id: string; name: string; provider?: string; clientId?: string };
export function associatedClientId(brand: ClientBrand) {
  return brand.clientId || (brand.provider === "inapi" ? undefined : mockClientId(brand.name));
}
export function resolveBrandClientId(brands: ClientBrand[], name: string, id?: string) {
  const matches = brands.filter(brand => id ? brand.id === id : brand.name.trim().toLocaleUpperCase("es") === name.trim().toLocaleUpperCase("es"));
  const ids = new Set(matches.map(associatedClientId));
  // Duplicate mock names may share a client; ambiguous real/mock names never infer one.
  return ids.size === 1 ? ids.values().next().value : undefined;
}
