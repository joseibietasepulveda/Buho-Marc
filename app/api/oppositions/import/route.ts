import { NextResponse } from "next/server";
import { z } from "zod";
import { withSession } from "@/lib/auth";
import { readProceedingFile } from "@/lib/proceeding-import";
import { proceedingInput } from "@/lib/proceeding-input";
import { fetchInapi, isRealSource } from "@/lib/inapi-provider";
import { sourceError } from "@/lib/source-api";
import { getSql } from "@/db";
import { organizationId } from "@/lib/tenant-context";
import { createProceeding } from "@/db/proceedings";
const schema = z.object({ action: z.enum(["preview", "import"]), rows: z.array(z.object({ key: z.string().max(200), applicationNumber: z.string().regex(/^[1-9]\d{0,8}$/), type: z.enum(["opposition", "nullity"]), role: z.enum(["opponent", "respondent"]).optional(), opponent: z.string().trim().max(180).default("") }).strict()).min(1).max(10) }).strict();
export const POST = withSession(async request => {
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData(), file = form.get("file");
      if (!(file instanceof File) || file.size > 2 * 1024 * 1024) return NextResponse.json({ message: "Elige un archivo de hasta 2 MB" }, { status: 400 });
      try { return NextResponse.json(await readProceedingFile(Buffer.from(await file.arrayBuffer()), file.name)); }
      catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Archivo inválido" }, { status: 400 }); }
    }
    const input = schema.parse(await request.json());
    if (input.action === "import" && input.rows.some(row => !row.role)) return NextResponse.json({ message: "Selecciona el rol del cliente en todas las filas" }, { status: 400 });
    if (!isRealSource()) return NextResponse.json({ message: "La conexión con INAPI no está configurada" }, { status: 409 });
    const results = [];
    for (const row of input.rows) {
      try {
        const { records } = await fetchInapi({ applicationIds: [row.applicationNumber], registrationIds: [] });
        const record = records.find(r => r.applicationNumber === row.applicationNumber);
        if (!record) throw new Error("No se encontró el expediente en la fuente");
        if (input.action === "import") {
          const saved = await getSql().begin(tx => createProceeding(tx, proceedingInput.parse({ applicationNumber: row.applicationNumber, type: row.type, role: row.role, opponent: row.opponent, confirm: true }), record));
          results.push({ key: row.key, record, outcome: saved.existing ? "existing" : "imported", caseId: saved.caseId });
        } else {
          const [existing] = await getSql()`SELECT public_code, proceeding FROM cases WHERE organization_id = ${organizationId()} AND proceeding->'record'->>'applicationNumber' = ${row.applicationNumber} AND COALESCE(proceeding->>'type', 'opposition') = ${row.type}`;
          results.push({ key: row.key, record, outcome: existing ? "existing" : "ready", caseId: existing?.public_code, existingRole: existing?.proceeding.role });
        }
      } catch (error) { results.push({ key: row.key, outcome: "error", message: error instanceof Error ? error.message : "No se pudo consultar" }); }
    }
    return NextResponse.json({ results });
  } catch (error) { return sourceError(error); }
});
