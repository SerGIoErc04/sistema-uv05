import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  metricas = signal<any | null>(null);

  constructor(private http: HttpClient, public auth: AuthService) {}

  ngOnInit(): void {
    // Las métricas agregadas solo aplican para el rol gerente (protegido también en backend)
    if (this.auth.esGerente()) {
      this.http.get<any>(`${environment.apiUrl}/dashboard/metricas`).subscribe({
        next: (res) => this.metricas.set(res.metricas),
        error: () => this.metricas.set(null),
      });
    }
  }
}
