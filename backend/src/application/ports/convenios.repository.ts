import { Convenio, TarifaConvenio } from "../../domain/entities/convenio";

export interface ConveniosRepository {
  crear(convenio: Omit<Convenio, "id">): Promise<Convenio>;
  listar(): Promise<Convenio[]>;
  guardarTarifa(convenioId: string, tarifa: TarifaConvenio): Promise<void>;
  obtenerPorId(id: string): Promise<Convenio | null>;
}