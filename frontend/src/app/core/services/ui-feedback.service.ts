import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligro?: boolean; // true = estilo rojo, para acciones destructivas (eliminar, desactivar)
}

interface EstadoConfirm extends ConfirmOptions {
  visible: boolean;
}

export type TipoToast = 'error' | 'exito' | 'info';

interface Toast {
  id: number;
  mensaje: string;
  tipo: TipoToast;
}

@Injectable({ providedIn: 'root' })
export class UiFeedbackService {
  estadoConfirm = signal<EstadoConfirm>({ visible: false, mensaje: '' });
  private resolver: ((valor: boolean) => void) | null = null;

  toasts = signal<Toast[]>([]);
  private toastIdSeq = 0;

  /** Reemplaza a window.confirm(). Se usa con await/then. */
  confirm(opciones: ConfirmOptions): Promise<boolean> {
    this.estadoConfirm.set({ visible: true, ...opciones });
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  resolverConfirm(valor: boolean): void {
    this.estadoConfirm.update((e) => ({ ...e, visible: false }));
    this.resolver?.(valor);
    this.resolver = null;
  }

  /** Reemplaza a window.alert() para errores/avisos, con estilo de tarjeta flotante. */
  toast(mensaje: string, tipo: TipoToast = 'info'): void {
    const id = ++this.toastIdSeq;
    this.toasts.update((t) => [...t, { id, mensaje, tipo }]);
    setTimeout(() => this.cerrarToast(id), 4500);
  }

  cerrarToast(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
