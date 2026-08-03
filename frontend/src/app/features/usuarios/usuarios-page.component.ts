import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { UsuariosService } from '../../core/services/usuarios.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { Usuario } from '../../core/models/models';

@Component({
  selector: 'app-usuarios-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuarios-page.component.html',
  styleUrl: './usuarios-page.component.scss',
})
export class UsuariosPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ui = inject(UiFeedbackService);

  usuarios = signal<Usuario[]>([]);
  mostrarFormulario = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    telefono: [''],
    puesto: ['Inspector'],
    rol: ['empleado', Validators.required],
  });

  constructor(private svc: UsuariosService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.svc.listar().subscribe((res) => this.usuarios.set(res.usuarios));
  }

  toggleFormulario(): void {
    this.mostrarFormulario.set(!this.mostrarFormulario());
    this.error.set(null);
  }

  crear(): void {
    if (this.form.invalid) return;
    this.guardando.set(true);
    this.svc.crear(this.form.value as any).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarFormulario.set(false);
        this.form.reset({ rol: 'empleado', puesto: 'Inspector' });
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.error?.message || 'No fue posible crear el usuario');
      },
    });
  }

  async desactivar(u: Usuario): Promise<void> {
    const ok = await this.ui.confirm({
      titulo: 'Desactivar usuario',
      mensaje: `¿Desactivar a ${u.nombre} ${u.apellido}? Ya no podrá iniciar sesión.`,
      textoConfirmar: 'Desactivar',
      peligro: true,
    });
    if (!ok) return;
    this.svc.eliminar(u.id).subscribe({
      next: () => this.cargar(),
      error: (err) =>
        this.ui.toast(err?.error?.error?.message || 'No fue posible desactivar el usuario', 'error'),
    });
  }

  async reactivar(u: Usuario): Promise<void> {
    const ok = await this.ui.confirm({
      titulo: 'Reactivar usuario',
      mensaje: `¿Reactivar a ${u.nombre} ${u.apellido}?`,
      textoConfirmar: 'Reactivar',
    });
    if (!ok) return;
    this.svc.actualizar(u.id, { activo: true }).subscribe({
      next: () => this.cargar(),
      error: (err) =>
        this.ui.toast(err?.error?.error?.message || 'No fue posible reactivar el usuario', 'error'),
    });
  }
}
