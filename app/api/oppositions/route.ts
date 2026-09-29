import { NextResponse } from "next/server";
import { getSql } from "@/db";
import { withSession } from "@/lib/auth";
import { fetchInapi, isRealSource } from "@/lib/inapi-provider";
import { sourceError } from "@/lib/source-api";
import { proceedingInput } from "@/lib/proceeding-input";
import { createProceeding } from "@/db/proceedings";
export const POST = withSession(async request => {
  try {
    if (!isRealSource()) return NextResponse.json({ message: "La conexión real con INAPI no está configurada" }, { status: 409 });
    const input = proceedingInput.parse(await request.json());
    const { records } = await fetchInapi({ applicationIds: [input.applicationNumber], registrationIds: [] });
    const record = records.find(row => row.applicationNumber === input.applicationNumber);
    if (!record) return NextResponse.json({ message: "No se encontró el expediente" }, { status: 404 });
    if (!input.confirm) return NextResponse.json({ record });
    return NextResponse.json(await getSql().begin(tx => createProceeding(tx, input, record)));
  } catch (error) { return sourceError(error); }
});
