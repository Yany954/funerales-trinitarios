import { Afiliado, PersonaCubierta } from "../../domain/entities/afiliado";

/**
 * Puerto (interfaz): el caso de uso depende de ESTO, no de Firestore directamente.
 * La implementación real vive en infrastructure/firebase/afiliados.repository.firestore.ts.
 * Esto es lo que permite, el día de mañana, cambiar de base de datos sin tocar
 * la lógica de negocio.
 */
export interface AfiliadosRepository {
  crear(afiliado: Omit<Afiliado, "id">): Promise<Afiliado>;
  obtenerPorId(id: string): Promise<Afiliado | null>;
  sincronizarPersonasCubiertas(afiliado: Afiliado): Promise<void>;
  buscarPersonaCubiertaPorNombreOCedula(termino: string): Promise<PersonaCubierta[]>;
}
