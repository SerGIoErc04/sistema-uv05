import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InspeccionesService } from '../../core/services/inspecciones.service';
import { TiposInspeccionService } from '../../core/services/tipos-inspeccion.service';
import { Inspeccion, TipoInspeccion } from '../../core/models/models';

interface DiaCalendario {
  fecha: Date;
  iso: string; // YYYY-MM-DD, para casar con fecha_programada
  enMesActual: boolean;
  esHoy: boolean;
  inspecciones: Inspeccion[];
}

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function aIso(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Component({
  selector: 'app-calendario-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendario-page.component.html',
  styleUrl: './calendario-page.component.scss',
})
export class CalendarioPageComponent implements OnInit {
  mesVisible = signal<Date>(this.primerDiaDelMes(new Date()));
  tiposInspeccion = signal<TipoInspeccion[]>([]);
  filtroTipoId: number | 'todas' = 'todas';
  inspecciones = signal<Inspeccion[]>([]);
  cargando = signal(false);

  hoyIso = aIso(new Date());
  diasSemana = DIAS_SEMANA;

  tituloMes = computed(() => {
    const m = this.mesVisible();
    return `${NOMBRES_MES[m.getMonth()]} ${m.getFullYear()}`;
  });

  semanas = computed<DiaCalendario[][]>(() => {
    const primerDia = this.mesVisible();
    const anio = primerDia.getFullYear();
    const mes = primerDia.getMonth();
    const ultimoDiaNum = new Date(anio, mes + 1, 0).getDate();

    // Lunes = 0 ... Domingo = 6
    const offsetInicio = (primerDia.getDay() + 6) % 7;
    const totalCeldas = Math.ceil((offsetInicio + ultimoDiaNum) / 7) * 7;

    const inspeccionesPorDia = new Map<string, Inspeccion[]>();
    for (const i of this.inspecciones()) {
      const iso = (i.fecha_programada || '').slice(0, 10);
      if (!inspeccionesPorDia.has(iso)) inspeccionesPorDia.set(iso, []);
      inspeccionesPorDia.get(iso)!.push(i);
    }

    const dias: DiaCalendario[] = [];
    for (let idx = 0; idx < totalCeldas; idx++) {
      const numeroDia = idx - offsetInicio + 1;
      const fecha = new Date(anio, mes, numeroDia);
      const iso = aIso(fecha);
      dias.push({
        fecha,
        iso,
        enMesActual: fecha.getMonth() === mes,
        esHoy: iso === this.hoyIso,
        inspecciones: inspeccionesPorDia.get(iso) || [],
      });
    }

    const semanas: DiaCalendario[][] = [];
    for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
    return semanas;
  });

  constructor(
    private svc: InspeccionesService,
    private tiposSvc: TiposInspeccionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.tiposSvc.listar().subscribe((res) => this.tiposInspeccion.set(res.tipos_inspeccion));
    this.cargar();
  }

  private primerDiaDelMes(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  }

  cargar(): void {
    const m = this.mesVisible();
    const desde = aIso(new Date(m.getFullYear(), m.getMonth(), 1));
    const hasta = aIso(new Date(m.getFullYear(), m.getMonth() + 1, 0));

    const filtros: Record<string, any> = { fecha_desde: desde, fecha_hasta: hasta };
    if (this.filtroTipoId !== 'todas') filtros['tipo_inspeccion_id'] = this.filtroTipoId;

    this.cargando.set(true);
    this.svc.listar(filtros).subscribe({
      next: (res) => {
        this.inspecciones.set(res.inspecciones);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  mesAnterior(): void {
    const m = this.mesVisible();
    this.mesVisible.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
    this.cargar();
  }

  mesSiguiente(): void {
    const m = this.mesVisible();
    this.mesVisible.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
    this.cargar();
  }

  irAHoy(): void {
    this.mesVisible.set(this.primerDiaDelMes(new Date()));
    this.cargar();
  }

  onCambiarFiltro(): void {
    this.cargar();
  }

  irADetalle(inspeccion: Inspeccion): void {
    this.router.navigate(['/inspecciones/detalle', inspeccion.id]);
  }

  claseTipo(clave?: string): string {
    if (clave === 'NOM-005') return 'chip-nom005';
    if (clave === 'ANEXOS-21-22') return 'chip-anexos';
    if (clave === 'NOM-016') return 'chip-nom016';
    return 'chip-generico';
  }
}
