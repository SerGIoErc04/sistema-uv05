import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TipoInspeccion } from '../models/models';

@Injectable({ providedIn: 'root' })
export class TiposInspeccionService {
  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<{ ok: boolean; tipos_inspeccion: TipoInspeccion[] }>(
      `${environment.apiUrl}/tipos-inspeccion`
    );
  }
}
