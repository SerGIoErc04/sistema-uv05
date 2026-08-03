import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InspeccionesService } from '../../../core/services/inspecciones.service';
import { AuthService } from '../../../core/services/auth.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';
import {
  Inspeccion,
  Normativa,
  ResultadoInspeccion,
  Evidencia,
  DatosGeneralesInspeccion,
  TanqueInspeccion,
  TIPOS_DOCUMENTO_TESTIGO,
  PRODUCTOS_COMBUSTIBLE,
} from '../../../core/models/models';

@Component({
  selector: 'app-inspeccion-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inspeccion-detalle.component.html',
  styleUrl: './inspeccion-detalle.component.scss',
})
export class InspeccionDetalleComponent implements OnInit {
  private ui = inject(UiFeedbackService);

  inspeccion = signal<Inspeccion | null>(null);
  resultados = signal<ResultadoInspeccion[]>([]);
  evidencias = signal<Evidencia[]>([]);
  // Solo las normativas del módulo/tipo de ESTA inspección (ya decidido por el gerente al agendar)
  normativasRequeridas = signal<Normativa[]>([]);
  subiendo = signal(false);
  mensaje = signal<string | null>(null);

  guardandoHorario = signal(false);
  // Campos editables de horario (el usuario los captura manualmente, ya no hay botón "Iniciar")
  horaInicio = '';
  horaTermino = '';
  fechaFinalizacion = '';

  // Datos generales: 2 testigos designados durante la inspección
  guardandoDatosGenerales = signal(false);
  datosGenerales: DatosGeneralesInspeccion = {};
  tiposDocumento = TIPOS_DOCUMENTO_TESTIGO;

  // Tanques de la estación registrados en esta inspección
  guardandoTanques = signal(false);
  tanques = signal<TanqueInspeccion[]>([]);
  productos = PRODUCTOS_COMBUSTIBLE;

  descargando = signal(false);

  inspeccionId!: number;

  constructor(private route: ActivatedRoute, private svc: InspeccionesService, public auth: AuthService) {}

  ngOnInit(): void {
    this.inspeccionId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  cargar(): void {
    this.svc.obtener(this.inspeccionId).subscribe((res) => {
      this.inspeccion.set(res.inspeccion);
      this.resultados.set(res.resultados);
      this.evidencias.set(res.evidencias);
      this.normativasRequeridas.set(res.normativas_requeridas);
      // Precargar los inputs de horario con lo que ya esté guardado (formato HH:MM)
      this.horaInicio = (res.inspeccion.hora_inicio || '').slice(0, 5);
      this.horaTermino = (res.inspeccion.hora_termino || '').slice(0, 5);
      // Por defecto la fecha de finalización es la misma que la programada
      this.fechaFinalizacion = (
        res.inspeccion.fecha_finalizacion || res.inspeccion.fecha_programada || ''
      ).slice(0, 10);

      this.datosGenerales = res.datos_generales ? { ...res.datos_generales } : {};
      this.tanques.set(res.tanques.length ? res.tanques : []);
    });
  }

  resultadoDe(normativaId: number): ResultadoInspeccion | undefined {
    return this.resultados().find((r) => r.normativa_id === normativaId);
  }

  registrarResultado(normativa: Normativa, cumple: boolean): void {
    this.svc
      .registrarResultado({ inspeccion_id: this.inspeccionId, normativa_id: normativa.id, cumple })
      .subscribe(() => this.cargar());
  }

  cambiarEstatus(estatus: string): void {
    this.svc.cambiarEstatus(this.inspeccionId, estatus).subscribe((res) => this.inspeccion.set(res.inspeccion));
  }

  guardarHorario(): void {
    if (!this.horaInicio && !this.horaTermino && !this.fechaFinalizacion) return;
    this.guardandoHorario.set(true);
    this.svc
      .actualizarHorario(this.inspeccionId, {
        hora_inicio: this.horaInicio || undefined,
        hora_termino: this.horaTermino || undefined,
        fecha_finalizacion: this.fechaFinalizacion || undefined,
      })
      .subscribe({
        next: (res) => {
          this.guardandoHorario.set(false);
          this.inspeccion.set(res.inspeccion);
          this.ui.toast('Horario actualizado', 'exito');
        },
        error: () => {
          this.guardandoHorario.set(false);
          this.ui.toast('No fue posible guardar el horario', 'error');
        },
      });
  }

  guardarDatosGenerales(): void {
    this.guardandoDatosGenerales.set(true);
    this.svc.guardarDatosGenerales(this.inspeccionId, this.datosGenerales).subscribe({
      next: () => {
        this.guardandoDatosGenerales.set(false);
        this.ui.toast('Datos de la inspección guardados', 'exito');
      },
      error: (err) => {
        this.guardandoDatosGenerales.set(false);
        this.ui.toast(err?.error?.error?.message || 'No fue posible guardar los datos', 'error');
      },
    });
  }

  agregarTanque(): void {
    this.tanques.update((t) => [...t, { numero_tanque: '', capacidad: '', producto: '' }]);
  }

  quitarTanque(index: number): void {
    this.tanques.update((t) => t.filter((_, i) => i !== index));
  }

  guardarTanques(): void {
    this.guardandoTanques.set(true);
    this.svc.guardarTanques(this.inspeccionId, this.tanques()).subscribe({
      next: (res) => {
        this.guardandoTanques.set(false);
        this.tanques.set(res.tanques);
        this.ui.toast('Tanques guardados', 'exito');
      },
      error: (err) => {
        this.guardandoTanques.set(false);
        this.ui.toast(err?.error?.error?.message || 'No fue posible guardar los tanques', 'error');
      },
    });
  }

  descargarOrdenTrabajo(): void {
    this.descargando.set(true);
    this.svc.descargarOrdenTrabajo(this.inspeccionId).subscribe({
      next: (blob) => {
        this.descargando.set(false);
        const folio = this.inspeccion()?.folio || 'inspeccion';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OT_${folio.replace(/[\\/]/g, '-')}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.descargando.set(false);
        this.mensaje.set('No fue posible generar la Orden de Trabajo');
      },
    });
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const archivo = input.files[0];

    this.subiendo.set(true);
    this.mensaje.set(null);
    // La evidencia queda ligada directamente a la inspección; ya no se pide
    // normativa porque el gerente ya definió el módulo (NOM-005 / Anexos 21-22 / NOM-016)
    // al agendarla.
    this.svc.subirEvidencia(this.inspeccionId, archivo).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.mensaje.set('Evidencia subida correctamente');
        this.cargar();
        input.value = '';
      },
      error: (err) => {
        this.subiendo.set(false);
        this.mensaje.set(err?.error?.error?.message || 'Error al subir la evidencia');
      },
    });
  }
}
