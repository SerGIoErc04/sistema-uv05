import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { InspeccionesService } from '../../../core/services/inspecciones.service';
import { EstacionesService } from '../../../core/services/estaciones.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { TiposInspeccionService } from '../../../core/services/tipos-inspeccion.service';
import { AuthService } from '../../../core/services/auth.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';
import { Inspeccion, Estacion, Usuario, TipoInspeccion, ETAPAS_NOM005 } from '../../../core/models/models';

@Component({
  selector: 'app-inspecciones-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './inspecciones-page.component.html',
  styleUrl: './inspecciones-page.component.scss',
})
export class InspeccionesPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ui = inject(UiFeedbackService);

  inspecciones = signal<Inspeccion[]>([]);
  estaciones = signal<Estacion[]>([]);
  empleados = signal<Usuario[]>([]);
  tiposInspeccion = signal<TipoInspeccion[]>([]);
  // El módulo actual (NOM-005 / Anexos 21-22 / NOM-016), resuelto desde la URL
  tipoActual = signal<TipoInspeccion | null>(null);
  etapas = ETAPAS_NOM005;

  mostrarFormulario = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);
  // Id de la inspección que se está editando; null = el formulario está en modo "crear"
  editando = signal<number | null>(null);

  filtros = this.fb.group({
    estacion_id: [''],
    estatus: [''],
    fecha_desde: [''],
    fecha_hasta: [''],
  });

  form = this.fb.group({
    estacion_id: ['', Validators.required],
    empleado_id: ['', Validators.required],
    fecha_programada: ['', Validators.required],
    hora_programada: [''],
    etapa: [''], // solo requerido cuando el módulo actual es NOM-005
    fecha_solicitud: [''],
    nombre_solicitante: [''],
    notas: [''],
  });

  constructor(
    private svc: InspeccionesService,
    private estacionesSvc: EstacionesService,
    private usuariosSvc: UsuariosService,
    private tiposSvc: TiposInspeccionService,
    private route: ActivatedRoute,
    public auth: AuthService
  ) {}

  get esModuloNom005(): boolean {
    return this.tipoActual()?.clave === 'NOM-005';
  }

  // Etiquetas de columnas/folios según el módulo. NOM-005 y Anexos 21-22 generan
  // 3 folios cada uno (con prefijos distintos); NOM-016 por ahora usa el folio genérico.
  get etiquetasFolio(): { folio: string; lista: string; acta: string } | null {
    const clave = this.tipoActual()?.clave;
    if (clave === 'NOM-005') return { folio: 'OT', lista: 'Lista Insp.', acta: 'Acta' };
    if (clave === 'ANEXOS-21-22') return { folio: 'No. de Servicio', lista: 'Lista Insp.', acta: 'Acta' };
    return null;
  }

  ngOnInit(): void {
    this.estacionesSvc.listar({ activo: true }).subscribe((res) => this.estaciones.set(res.estaciones));
    if (this.auth.esGerente()) {
      this.usuariosSvc.listar('empleado').subscribe((res) => this.empleados.set(res.usuarios));
    }

    // Cargar catálogo de tipos y luego resolver cuál corresponde a la URL actual.
    // route.paramMap se suscribe también a cambios (ej. si navegas de NOM-005 a NOM-016
    // sin recargar la página, gracias al routerLink en el sidebar).
    this.tiposSvc.listar().subscribe((res) => {
      this.tiposInspeccion.set(res.tipos_inspeccion);
      this.route.paramMap.subscribe((params) => {
        const claveUrl = (params.get('clave') || '').toUpperCase();
        const tipo = res.tipos_inspeccion.find((t) => t.clave === claveUrl) || null;
        this.tipoActual.set(tipo);
        this.mostrarFormulario.set(false);
        this.editando.set(null);
        this.cargar();
      });
    });
  }

  cargar(): void {
    const tipo = this.tipoActual();
    if (!tipo) return;

    const filtrosValidos = Object.fromEntries(
      Object.entries(this.filtros.value).filter(([, v]) => v)
    );
    this.svc
      .listar({ ...filtrosValidos, tipo_inspeccion_id: tipo.id })
      .subscribe((res) => this.inspecciones.set(res.inspecciones));
  }

  toggleFormulario(): void {
    const abrir = !this.mostrarFormulario();
    this.mostrarFormulario.set(abrir);
    this.editando.set(null);
    this.error.set(null);
    this.form.reset();
  }

  // Precarga el formulario con los datos de la fila y lo pone en modo edición (solo gerente)
  editar(i: Inspeccion): void {
    this.editando.set(i.id);
    this.mostrarFormulario.set(true);
    this.error.set(null);
    this.form.patchValue({
      estacion_id: String(i.estacion_id),
      empleado_id: i.empleado_id ? String(i.empleado_id) : '',
      fecha_programada: (i.fecha_programada || '').slice(0, 10),
      hora_programada: (i.hora_programada || '').slice(0, 5),
      etapa: i.etapa || '',
      fecha_solicitud: (i.fecha_solicitud || '').slice(0, 10),
      nombre_solicitante: i.nombre_solicitante || '',
      notas: '',
    });
  }

  async eliminar(i: Inspeccion): Promise<void> {
    const ok = await this.ui.confirm({
      titulo: 'Eliminar inspección',
      mensaje: `¿Eliminar la inspección ${i.folio}? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    this.svc.eliminar(i.id).subscribe({
      next: () => this.cargar(),
      error: (err) =>
        this.ui.toast(err?.error?.error?.message || 'No fue posible eliminar la inspección', 'error'),
    });
  }

  guardar(): void {
    const tipo = this.tipoActual();
    if (this.form.invalid || !tipo) return;

    if (this.esModuloNom005 && !this.form.value.etapa) {
      this.error.set('Selecciona la etapa (Diseño, Construcción u Operación y Mantenimiento)');
      return;
    }

    this.guardando.set(true);
    const idEditando = this.editando();
    const peticion = idEditando
      ? this.svc.actualizar(idEditando, this.form.value as any)
      : this.svc.crear({ ...(this.form.value as any), tipo_inspeccion_id: tipo.id });

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
        this.error.set(err?.error?.error?.message || 'No fue posible guardar la inspección');
      },
    });
  }

  claseEstatus(estatus: string): string {
    return `badge badge-${estatus}`;
  }
}
