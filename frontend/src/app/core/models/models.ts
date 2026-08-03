export type Rol = 'gerente' | 'empleado';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  puesto?: string;
  rol: Rol;
  activo?: boolean;
}

export interface LoginResponse {
  ok: boolean;
  token: string;
  usuario: Usuario;
}

export interface Estacion {
  id: number;
  nombre: string;
  razon_social?: string;
  rfc?: string;
  permiso_cre?: string;
  direccion: string;
  municipio?: string;
  estado?: string;
  codigo_postal?: string;
  contacto_nombre?: string;
  contacto_tel?: string;
  correo?: string;
  representante_legal?: string;
  rfc_representante_legal?: string;
  activo?: boolean;
}

export interface TipoInspeccion {
  id: number;
  clave: string; // 'NOM-005' | 'ANEXOS-21-22' | 'NOM-016'
  nombre: string; // 'NOM-005-ASEA-2016' | 'Anexos 21-22' | 'NOM-016-CRE-2016'
  descripcion?: string;
  normativas: Normativa[];
}

export type EtapaNom005 = 'diseno' | 'construccion' | 'operacion_mantenimiento';

export const ETAPAS_NOM005: { value: EtapaNom005; label: string }[] = [
  { value: 'diseno', label: 'Diseño' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'operacion_mantenimiento', label: 'Operación y Mantenimiento' },
];

export const TIPOS_DOCUMENTO_TESTIGO = [
  'INE', 'Pasaporte', 'Licencia de conducir', 'Cédula profesional', 'Otro',
];

export const PRODUCTOS_COMBUSTIBLE = ['Magna', 'Premium', 'Diésel', 'Otro'];

export interface DatosGeneralesInspeccion {
  testigo1_nombre?: string;
  testigo1_tipo_documento?: string;
  testigo1_documento_id?: string;
  testigo1_domicilio?: string;
  testigo2_nombre?: string;
  testigo2_tipo_documento?: string;
  testigo2_documento_id?: string;
  testigo2_domicilio?: string;
}

export interface TanqueInspeccion {
  id?: number;
  numero_tanque?: string;
  capacidad?: string;
  producto?: string;
}

export type EstatusInspeccion = 'pendiente' | 'en_proceso' | 'completada' | 'cancelada';

export interface Inspeccion {
  id: number;
  estacion_id: number;
  estacion_nombre?: string;
  tipo_inspeccion_id: number;
  tipo_inspeccion_clave?: string;
  tipo_inspeccion_nombre?: string;
  folio: string; // Para NOM-005 es la Orden de Trabajo (OT-AA/NNN)
  etapa?: EtapaNom005; // Solo aplica a NOM-005
  folio_lista_inspeccion?: string; // Solo aplica a NOM-005 (LD/LC/LOM-AA/NNN)
  folio_acta?: string; // Solo aplica a NOM-005 (AD/AC/AOM-AA/NNN)
  fecha_programada: string;
  hora_programada?: string;
  fecha_solicitud?: string;
  nombre_solicitante?: string;
  fecha_realizada?: string;
  fecha_finalizacion?: string;
  hora_inicio?: string;
  hora_termino?: string;
  estatus: EstatusInspeccion;
  empleado_id?: number;
  empleado_nombre?: string;
  empleado_apellido?: string;
}

export interface Normativa {
  id: number;
  clave: string;
  nombre: string;
  descripcion?: string;
}

export interface ResultadoInspeccion {
  id?: number;
  inspeccion_id: number;
  normativa_id: number;
  normativa_clave?: string;
  cumple: boolean | null;
  calificacion?: number;
  observaciones?: string;
}

export interface Evidencia {
  id: number;
  inspeccion_id: number;
  tipo_archivo: 'imagen' | 'pdf' | 'documento';
  nombre_original: string;
  ruta_archivo: string;
  creado_en: string;
}
