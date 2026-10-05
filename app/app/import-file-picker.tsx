"use client";

import { FileXls } from "@phosphor-icons/react";

export function ImportFilePicker({ filename, disabled, onFile }: {
  filename: string;
  disabled: boolean;
  onFile: (file?: File) => void;
}) {
  return <label className={`import-file-picker${disabled ? " is-disabled" : ""}`}>
    <input type="file" accept=".xls,.xlsx,.csv" disabled={disabled} aria-label="Seleccionar archivo Excel o CSV" onChange={event => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (file) onFile(file);
    }} />
    <span className="import-file-icon" aria-hidden><FileXls size={32} /></span>
    <span className="import-file-copy"><strong>{filename || "Selecciona tu archivo"}</strong><small>Excel (.xls o .xlsx) o CSV · hasta 2 MB</small></span>
    <span className="import-file-button">{filename ? "Cambiar archivo" : "Elegir archivo"}</span>
  </label>;
}
