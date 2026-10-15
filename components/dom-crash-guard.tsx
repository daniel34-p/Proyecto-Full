'use client';

// React asume que es el único que modifica el DOM dentro de la app. Si
// algo externo (una extensión del navegador, el autocompletado nativo de
// Chrome, un traductor) mueve o elimina un nodo que React todavía cree
// que está en su sitio, React intenta removeChild/insertBefore sobre un
// nodo que ya no es hijo de ese padre. Esa llamada lanza un
// "Failed to execute 'removeChild'/'insertBefore' on 'Node'" que no se
// captura en ningún try/catch de React y tumba toda la app (pantalla
// blanca de "Application error").
//
// Este parche se aplica una sola vez, apenas carga el bundle del cliente
// (antes de que React empiece a reconciliar), y hace que esas dos
// operaciones de Node.prototype, en el caso puntual de que el nodo ya no
// sea hijo del padre esperado, no hagan nada en vez de lanzar: React sigue
// con el resto del commit en vez de caerse entera. No cambia ningún
// comportamiento cuando el DOM está como React espera (el caso normal).
if (typeof window !== 'undefined' && !(window as unknown as { __domCrashGuardApplied?: boolean }).__domCrashGuardApplied) {
  (window as unknown as { __domCrashGuardApplied?: boolean }).__domCrashGuardApplied = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[dom-crash-guard] Se evitó un removeChild de un nodo que ya no era hijo de este padre (probablemente una extensión del navegador o el autocompletado modificó el DOM).');
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[dom-crash-guard] Se evitó un insertBefore con un nodo de referencia que ya no era hijo de este padre.');
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

export function DomCrashGuard() {
  return null;
}
