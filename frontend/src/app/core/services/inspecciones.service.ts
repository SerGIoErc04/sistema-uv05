import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Inspeccion,
  Normativa,
  ResultadoInspeccion,
  Evidencia,
  DatosGeneralesInspeccion,
  TanqueInspeccion,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class InspeccionesService {
  private base = `${environment.apiUrl}/inspecciones`;

  constructor(private http: HttpClient) {}

  listar(filtros: Record<string, any> = {}) {
    const params: any = {};
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params[k] = v;
    });
    return this.http.get<{ ok: boolean; inspecciones: Inspeccion[] }>(this.base, { params });
  }

  obtener(id: number) {
    return this.http.get<{
      ok: boolean;
      inspeccion: Inspeccion;
      normativas_requeridas: Normativa[];
      resultados: ResultadoInspeccion[];
      evidencias: Evidencia[];
      asignaciones: any[];
      datos_generales: DatosGeneralesInspeccion | null;
      tanques: TanqueInspeccion[];
    }>(`${this.base}/${id}`);
  }

  crear(data: {
    estacion_id: number;
    tipo_inspeccion_id: number;
    fecha_programada: string;
    empleado_id: number;
    notas?: string;
    etapa?: string; // requerido solo cuando el tipo de inspección es NOM-005
    fecha_solicitud?: string;
    nombre_solicitante?: string;
    hora_programada?: string;
  }) {
    return this.http.post<{ ok: boolean; inspeccion: Inspeccion }>(this.base, data);
  }

  actualizar(
    id: number,
    data: {
      estacion_id?: number;
      empleado_id?: number;
      fecha_programada?: string;
      notas?: string;
      etapa?: string;
      fecha_solicitud?: string;
      nombre_solicitante?: string;
      hora_programada?: string;
    }
  ) {
    return this.http.put<{ ok: boolean; inspeccion: Inspeccion }>(`${this.base}/${id}`, data);
  }

  descargarOrdenTrabajo(id: number) {
    return this.http.get(`${this.base}/${id}/orden-trabajo`, { responseType: 'blob' });
  }

  eliminar(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }

  cambiarEstatus(id: number, estatus: string) {
    return this.http.patch<{ ok: boolean; inspeccion: Inspeccion }>(`${this.base}/${id}/estatus`, {
      estatus,
    });
  }

  actualizarHorario(
    id: number,
    data: { hora_inicio?: string; hora_termino?: string; fecha_finalizacion?: string }
  ) {
    return this.http.patch<{ ok: boolean; inspeccion: Inspeccion }>(`${this.base}/${id}/horario`, data);
  }

  guardarDatosGenerales(id: number, data: DatosGeneralesInspeccion) {
    return this.http.put<{ ok: boolean; datos_generales: DatosGeneralesInspeccion }>(
      `${this.base}/${id}/datos-generales`,
      data
    );
  }

  guardarTanques(id: number, tanques: TanqueInspeccion[]) {
    return this.http.put<{ ok: boolean; tanques: TanqueInspeccion[] }>(`${this.base}/${id}/tanques`, {
      tanques,
    });
  }

  registrarResultado(data: Partial<ResultadoInspeccion>) {
    return this.http.post<{ ok: boolean; resultado: ResultadoInspeccion }>(
      `${environment.apiUrl}/resultados`,
      data
    );
  }

  subirEvidencia(inspeccionId: number, archivo: File, normativaId?: number) {
    const formData = new FormData();
    formData.append('inspeccion_id', String(inspeccionId));
    if (normativaId) formData.append('normativa_id', String(normativaId));
    formData.append('archivo', archivo);
    return this.http.post<{ ok: boolean; evidencia: Evidencia }>(
      `${environment.apiUrl}/evidencias`,
      formData
    );
  }
}
