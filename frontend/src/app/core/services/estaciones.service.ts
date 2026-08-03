import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Estacion } from '../models/models';

@Injectable({ providedIn: 'root' })
export class EstacionesService {
  private base = `${environment.apiUrl}/estaciones`;

  constructor(private http: HttpClient) {}

  listar(filtros: Partial<{ estado: string; municipio: string; activo: boolean }> = {}) {
    const params: any = {};
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params[k] = v;
    });
    return this.http.get<{ ok: boolean; estaciones: Estacion[] }>(this.base, { params });
  }

  obtener(id: number) {
    return this.http.get<{ ok: boolean; estacion: Estacion }>(`${this.base}/${id}`);
  }

  crear(data: Partial<Estacion>) {
    return this.http.post<{ ok: boolean; estacion: Estacion }>(this.base, data);
  }

  actualizar(id: number, data: Partial<Estacion>) {
    return this.http.put<{ ok: boolean; estacion: Estacion }>(`${this.base}/${id}`, data);
  }

  eliminar(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
