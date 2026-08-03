import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { EstacionesService } from '../../core/services/estaciones.service';
import { AuthService } from '../../core/services/auth.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { Estacion } from '../../core/models/models';

@Component({
  selector: 'app-estaciones-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './estaciones-page.component.html',
  styleUrl: './estaciones-page.component.scss',
})
export class EstacionesPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ui = inject(UiFeedbackService);

  estaciones = signal<Estacion[]>([]);
  mostrarFormulario = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);
  // Id de la estación en edición; null = el formulario está en modo "crear"
  editando = signal<number | null>(null);

  form = this.fb.group({
    nombre: ['', Validators.required],
    razon_social: [''],
    rfc: [''],
    permiso_cre: [''],
    representante_legal: [''],
    rfc_representante_legal: [''],
    direccion: ['', Validators.required],
    municipio: [''],
    estado: [''],
    codigo_postal: [''],
    contacto_nombre: [''],
    contacto_tel: [''],
    correo: [''],
  });

  constructor(private svc: EstacionesService, public auth: AuthService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.svc.listar({ activo: true }).subscribe({
      next: (res) => this.estaciones.set(res.estaciones),
    });
  }

  toggleFormulario(): void {
    const abrir = !this.mostrarFormulario();
    this.mostrarFormulario.set(abrir);
    this.editando.set(null);
    this.error.set(null);
    this.form.reset();
  }

  editar(e: Estacion): void {
    this.editando.set(e.id);
    this.mostrarFormulario.set(true);
    this.error.set(null);
    this.form.patchValue({
      nombre: e.nombre,
      razon_social: e.razon_social || '',
      rfc: e.rfc || '',
      permiso_cre: e.permiso_cre || '',
      representante_legal: e.representante_legal || '',
      rfc_representante_legal: e.rfc_representante_legal || '',
      direccion: e.direccion,
      municipio: e.municipio || '',
      estado: e.estado || '',
      codigo_postal: e.codigo_postal || '',
      contacto_nombre: e.contacto_nombre || '',
      contacto_tel: e.contacto_tel || '',
      correo: e.correo || '',
    });
  }

  async eliminar(e: Estacion): Promise<void> {
    const ok = await this.ui.confirm({
      titulo: 'Eliminar estación',
      mensaje: `¿Eliminar la estación "${e.nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    this.svc.eliminar(e.id).subscribe({
      next: () => this.cargar(),
      error: (err) =>
        this.ui.toast(err?.error?.error?.message || 'No fue posible eliminar la estación', 'error'),
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando.set(true);

    const idEditando = this.editando();
    const peticion = idEditando
      ? this.svc.actualizar(idEditando, this.form.value as Partial<Estacion>)
      : this.svc.crear(this.form.value as Partial<Estacion>);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarFormulario.set(false);
        this.editando.set(null);
        this.form.reset();
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.error?.message || 'No fue posible guardar la estación');
      },
    });
  }
}
