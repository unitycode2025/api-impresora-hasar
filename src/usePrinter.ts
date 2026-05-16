// ============================================================
//  usePrinter.ts — Hook React para imprimir desde Lovable
//
//  INSTALACIÓN EN LOVABLE:
//    1. Creá el archivo: src/hooks/usePrinter.ts
//    2. Copiá este contenido
//    3. Usalo en cualquier componente (ver ejemplos al final)
//
//  CONFIGURACIÓN:
//    Cambiá API_BASE_URL con la IP de la PC donde corre el servidor.
//    Si la app y el servidor están en la misma PC, usá localhost.
//    Si la PC del servidor es otra, usá su IP local: 192.168.x.x
// ============================================================

import { useState, useCallback } from 'react';

// ── Configuración ─────────────────────────────────────────────
//
//  HTTPS es obligatorio cuando Lovable corre en https://
//  Puerto 3443 = HTTPS, puerto 3001 = HTTP (solo para pruebas locales)
//
const API_BASE_URL = 'https://localhost:3443';
// const API_BASE_URL = 'https://192.168.1.100:3443';  // ← otra PC en la red

// ── Tipos ─────────────────────────────────────────────────────

export interface ItemTicket {
  descripcion: string;
  cantidad:    number;
  precio:      number;
  nota?:       string;
}

export interface DatosTicket {
  numero?:     string | number;
  fecha?:      string;
  hora?:       string;
  mesa?:       string | number;
  cliente?:    string;
  items:       ItemTicket[];
  total?:      number;
  descuento?:  number;
  metodoPago?: string;
  notaExtra?:  string;
  qrData?:     string;
  mensajePie?: string;
}

export interface EstadoImpresora {
  servidor:  'ok' | 'offline';
  impresora: 'ok' | 'offline';
  error?:    string;
}

interface PrinterState {
  imprimiendo: boolean;
  error:       string | null;
  exito:       boolean;
}

// ── Hook principal ────────────────────────────────────────────

export function usePrinter() {
  const [estado, setEstado] = useState<PrinterState>({
    imprimiendo: false,
    error:       null,
    exito:       false,
  });

  // Resetear estado
  const resetear = useCallback(() => {
    setEstado({ imprimiendo: false, error: null, exito: false });
  }, []);

  // ── Verificar estado de la impresora ──────────────────────
  const verificarEstado = useCallback(async (): Promise<EstadoImpresora | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),  // timeout 5 segundos
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[usePrinter] Error al verificar estado:', err);
      return null;
    }
  }, []);

  // ── Imprimir ticket de pedido ─────────────────────────────
  const imprimirTicket = useCallback(async (datos: DatosTicket): Promise<boolean> => {
    setEstado({ imprimiendo: true, error: null, exito: false });

    try {
      const res = await fetch(`${API_BASE_URL}/print/ticket`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(datos),
        signal:  AbortSignal.timeout(15000),  // timeout 15 segundos
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }

      setEstado({ imprimiendo: false, error: null, exito: true });
      return true;

    } catch (err: any) {
      const mensaje = err.name === 'TimeoutError'
        ? 'La impresora tardó demasiado en responder. Verificá que esté encendida.'
        : err.message || 'Error desconocido al imprimir.';

      console.error('[usePrinter] Error al imprimir:', mensaje);
      setEstado({ imprimiendo: false, error: mensaje, exito: false });
      return false;
    }
  }, []);

  // ── Imprimir texto libre ──────────────────────────────────
  const imprimirTexto = useCallback(async (lineas: string[], cortar = true): Promise<boolean> => {
    setEstado({ imprimiendo: true, error: null, exito: false });

    try {
      const res = await fetch(`${API_BASE_URL}/print/texto`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ lineas, cortar }),
        signal:  AbortSignal.timeout(15000),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }

      setEstado({ imprimiendo: false, error: null, exito: true });
      return true;

    } catch (err: any) {
      const mensaje = err.name === 'TimeoutError'
        ? 'Timeout — verificá que la impresora esté encendida.'
        : err.message || 'Error desconocido.';

      console.error('[usePrinter] Error al imprimir texto:', mensaje);
      setEstado({ imprimiendo: false, error: mensaje, exito: false });
      return false;
    }
  }, []);

  return {
    imprimiendo:    estado.imprimiendo,
    errorImpresion: estado.error,
    exitoImpresion: estado.exito,
    imprimirTicket,
    imprimirTexto,
    verificarEstado,
    resetear,
  };
}

// ============================================================
//  EJEMPLO DE USO EN UN COMPONENTE DE LOVABLE
// ============================================================
//
//  import { usePrinter } from '@/hooks/usePrinter';
//
//  function BotonImprimir({ pedido }) {
//    const { imprimirTicket, imprimiendo, errorImpresion } = usePrinter();
//
//    const handleImprimir = async () => {
//      const ok = await imprimirTicket({
//        numero:    pedido.id,
//        mesa:      pedido.mesa,
//        cliente:   pedido.cliente,
//        items:     pedido.items.map(i => ({
//          descripcion: i.nombre,
//          cantidad:    i.cantidad,
//          precio:      i.precio,
//        })),
//        total:      pedido.total,
//        metodoPago: pedido.metodoPago,
//        qrData:     `https://tuapp.lovable.app/pedido/${pedido.id}`,
//      });
//
//      if (ok) {
//        toast.success('Ticket impreso');
//      }
//    };
//
//    return (
//      <button onClick={handleImprimir} disabled={imprimiendo}>
//        {imprimiendo ? 'Imprimiendo...' : 'Imprimir ticket'}
//      </button>
//    );
//  }
// ============================================================
