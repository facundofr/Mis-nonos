/**
 * Error de una regla de negocio, con un mensaje pensado para la persona que
 * usa la app ("Esa persona ya trabaja en la residencia"). Las Server Actions
 * lo muestran tal cual; cualquier otro error se registra y se muestra uno
 * genérico.
 */
export class DomainError extends Error {
  override readonly name = "DomainError";

  constructor(
    message: string,
    /** Campo del formulario al que se refiere, si corresponde. */
    readonly field?: string,
  ) {
    super(message);
  }
}

/** Alguien cambió el registro mientras otra persona lo editaba. */
export const CONCURRENT_CHANGE_MESSAGE =
  "Alguien cambió estos datos mientras los editabas. Volvé a abrirlos para ver la última versión.";
