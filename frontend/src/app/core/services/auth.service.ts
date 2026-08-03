import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, Usuario } from '../models/models';

const TOKEN_KEY = 'uv05_token';
const USER_KEY = 'uv05_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private usuarioSignal = signal<Usuario | null>(this.leerUsuarioGuardado());

  usuario = computed(() => this.usuarioSignal());
  estaAutenticado = computed(() => !!this.usuarioSignal());
  esGerente = computed(() => this.usuarioSignal()?.rol === 'gerente');

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
          this.usuarioSignal.set(res.usuario);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.usuarioSignal.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private leerUsuarioGuardado(): Usuario | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
