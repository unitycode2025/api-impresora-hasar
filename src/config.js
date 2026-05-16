// ============================================================
//  config.js — Configuración centralizada de la API
//  Editá este archivo para adaptar a tu entorno.
// ============================================================

module.exports = {

  // ── Servidor ──────────────────────────────────────────────
  PORT_HTTP:  3001,   // Puerto HTTP  (solo para desarrollo local sin HTTPS)
  PORT_HTTPS: 3443,   // Puerto HTTPS (usar en producción / Lovable)

  // Activá HTTPS = true cuando tu app Lovable corre en https://
  // Lovable siempre usa HTTPS, así que en producción esto DEBE ser true.
  USE_HTTPS: true,

  // ── Impresora ─────────────────────────────────────────────
  //
  // OPCIÓN A — Nombre del spooler de Windows (más común)
  //   Abrí: Panel de control → Dispositivos e impresoras
  //   Copiá el nombre exacto de la Hasar P181
  //   Ejemplo: 'Hasar P-181F' o 'HASAR 181'
  //
  // OPCIÓN B — Puerto USB directo (si el spooler no funciona)
  //   Windows: '//./USB001'  o  '//./COM3'
  //   Linux:   '/dev/usb/lp0'
  //
  PRINTER_INTERFACE: 'printer:POS Printer 203DPI Series',

  // Ancho del papel en caracteres (57mm ≈ 32 chars, 80mm ≈ 48 chars)
  PAPER_WIDTH_CHARS: 32,

  // Nombre del negocio que aparece en el encabezado del ticket
  BUSINESS_NAME: 'ARCEO',
  BUSINESS_ADDRESS: '',   // Opcional: 'Av. San Martín 123'
  BUSINESS_PHONE: '',     // Opcional: '(0299) 4XX-XXXX'

  // ── CORS ──────────────────────────────────────────────────
  //
  // Lista de orígenes permitidos para llamar a la API.
  // Agregá el dominio de tu app Lovable: 'https://tuapp.lovable.app'
  // Usá '*' solo en desarrollo — en producción es inseguro.
  //
  ALLOWED_ORIGINS: [
    '*',
    // 'https://tuapp.lovable.app',   // ← descomentá y ajustá
    // 'http://localhost:8080',        // ← para pruebas locales
  ],
};
