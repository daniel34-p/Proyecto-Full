// Registro muy liviano de qué formularios tienen cambios sin guardar en
// este momento. Deliberadamente NO es estado de React (no vive en un
// Context ni dispara re-renders) - es solo un Set en memoria que los
// formularios actualizan y que VersionWatcher lee de forma sincrónica justo
// antes de decidir si recarga la página.
const formulariosConCambios = new Set<string>();

export function marcarCambiosSinGuardar(id: string, tieneCambios: boolean) {
  if (tieneCambios) {
    formulariosConCambios.add(id);
  } else {
    formulariosConCambios.delete(id);
  }
}

export function hayCambiosSinGuardar(): boolean {
  return formulariosConCambios.size > 0;
}
