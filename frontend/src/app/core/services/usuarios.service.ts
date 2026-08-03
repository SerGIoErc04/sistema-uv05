import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Usuario } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private base = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  listar(rol?: 'gerente' | 'empleado') {
    const params: any = rol ? { rol } : {};
    return this.http.get<{ ok: boolean; usuarios: Usuario[] }>(this.base, { params });
  }

  crear(data: { nombre: string; apellido: string; email: string; password: string; telefono?: string; rol: string }) {
    return this.http.post<{ ok: boolean; usuario: Usuario }>(this.base, data);
  }

  actualizar(id: number, data: Partial<Usuario>) {
    return this.http.put<{ ok: boolean; usuario: Usuario }>(`${this.base}/${id}`, data);
  }

  eliminar(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
