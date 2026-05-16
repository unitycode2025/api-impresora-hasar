// ============================================================
//  server.js — API REST para imprimir en Hasar P181
//
//  Endpoints:
//    GET  /health            → estado del servidor e impresora
//    POST /print/ticket      → imprimir ticket de pedido completo
//    POST /print/texto       → imprimir líneas de texto libre
//
//  Inicio rápido:
//    1. npm install
//    2. node src/setup-ssl.js      (solo la primera vez)
//    3. npm start
//    4. Abrí https://localhost:3443 en el navegador y aceptá el certificado
// ============================================================

const express    = require('express');
const cors       = require('cors');
const https      = require('https');
const http       = require('http');
const fs         = require('fs');
const path       = require('path');

const config     = require('./config');
const { imprimirTicket, imprimirTextoLibre, verificarImpresora } = require('./printer');

const app = express();

// ── Middlewares ───────────────────────────────────────────────

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS — permite llamadas desde Lovable y cualquier origen configurado
const corsOptions = {
  origin: (origin, callback) => {
    // Sin origin = herramientas como curl / Postman → permitir siempre
    if (!origin) return callback(null, true);

    const permitido = config.ALLOWED_ORIGINS.includes('*') ||
                      config.ALLOWED_ORIGINS.includes(origin);

    if (permitido) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado para origen: ${origin}`));
    }
  },
  methods:            ['GET', 'POST', 'OPTIONS'],
  allowedHeaders:     ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,  // Compatibilidad con IE11/browsers viejos
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));  // Preflight para todos los endpoints

// ── Logger básico ─────────────────────────────────────────────
app.use((req, _res, next) => {
  const ts = new Date().toLocaleTimeString('es-AR');
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ─────────────────────────────────────────────────────────────
//  GET /health
//  Devuelve estado del servidor y de la impresora.
//  Útil para que Lovable verifique si la API está corriendo.
// ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const { conectada, error } = await verificarImpresora();

  res.json({
    servidor:   'ok',
    impresora:  conectada ? 'ok' : 'offline',
    interface:  config.PRINTER_INTERFACE,
    error:      conectada ? null : (error || 'sin respuesta'),
    timestamp:  new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
//  POST /print/ticket
//  Imprime un ticket de pedido formateado.
//
//  Body (JSON):
//  {
//    "numero":     "0042",
//    "fecha":      "15/01/2025",     // opcional
//    "hora":       "14:30",          // opcional
//    "mesa":       "5",              // opcional
//    "cliente":    "Juan Pérez",     // opcional
//    "items": [
//      { "descripcion": "Milanesa c/ papas", "cantidad": 2, "precio": 1500 },
//      { "descripcion": "Gaseosa 500ml",     "cantidad": 1, "precio":  600 }
//    ],
//    "total":       3600,
//    "descuento":   0,               // opcional
//    "metodoPago":  "Efectivo",      // opcional
//    "notaExtra":   "Sin cebolla",   // opcional
//    "qrData":      "https://...",   // opcional — imprime QR
//    "mensajePie":  "¡Gracias!"      // opcional
//  }
// ─────────────────────────────────────────────────────────────
app.post('/print/ticket', async (req, res) => {
  const data = req.body;

  // Validación mínima
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return res.status(400).json({
      ok:    false,
      error: 'El campo "items" es requerido y debe ser un array no vacío.',
    });
  }

  if (data.total === undefined && data.items.every(i => i.precio !== undefined)) {
    // Calcular total automáticamente si no se envía
    data.total = data.items.reduce((sum, i) => sum + (i.precio * (i.cantidad || 1)), 0);
  }

  try {
    await imprimirTicket(data);
    res.json({ ok: true, mensaje: 'Ticket impreso correctamente.' });
  } catch (err) {
    console.error('Error al imprimir ticket:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /print/texto
//  Imprime líneas de texto libre. Útil para comandas simples.
//
//  Body (JSON):
//  {
//    "lineas": ["Línea 1", "Línea 2", "..."],
//    "cortar": true   // opcional, default true
//  }
// ─────────────────────────────────────────────────────────────
app.post('/print/texto', async (req, res) => {
  const data = req.body;

  if (!data.lineas || !Array.isArray(data.lineas) || data.lineas.length === 0) {
    return res.status(400).json({
      ok:    false,
      error: 'El campo "lineas" es requerido y debe ser un array no vacío.',
    });
  }

  try {
    await imprimirTextoLibre(data);
    res.json({ ok: true, mensaje: 'Texto impreso correctamente.' });
  } catch (err) {
    console.error('Error al imprimir texto:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Manejo de rutas no encontradas ───────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ── Manejo global de errores ──────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Error no controlado:', err.message);
  res.status(500).json({ ok: false, error: err.message });
});

// ─────────────────────────────────────────────────────────────
//  Iniciar servidor (HTTPS y/o HTTP)
// ─────────────────────────────────────────────────────────────

const CERT_PATH = path.join(__dirname, '..', 'certs', 'cert.pem');
const KEY_PATH  = path.join(__dirname, '..', 'certs', 'key.pem');

function iniciarServidores() {
  // ── HTTP siempre arranca (para pruebas locales con curl/Postman) ──
  http.createServer(app).listen(config.PORT_HTTP, () => {
    console.log('');
    console.log('================================================');
    console.log(' API Impresora Hasar P181 — iniciada');
    console.log('================================================');
    console.log(` HTTP   →  http://localhost:${config.PORT_HTTP}`);
  });

  // ── HTTPS arranca si hay certificados ────────────────────────
  if (config.USE_HTTPS) {
    if (!fs.existsSync(CERT_PATH) || !fs.existsSync(KEY_PATH)) {
      console.warn('');
      console.warn('⚠️  HTTPS activado pero no se encontraron certificados.');
      console.warn('   Ejecutá:  node src/setup-ssl.js');
      console.warn('   El servidor HTTP sigue funcionando en el puerto', config.PORT_HTTP);
      console.warn('');
    } else {
      const sslOptions = {
        key:  fs.readFileSync(KEY_PATH),
        cert: fs.readFileSync(CERT_PATH),
      };

      https.createServer(sslOptions, app).listen(config.PORT_HTTPS, () => {
        console.log(` HTTPS  →  https://localhost:${config.PORT_HTTPS}`);
        console.log('');
        console.log(' ⚠️  IMPORTANTE — primera vez:');
        console.log(`    Abrí https://localhost:${config.PORT_HTTPS} en el navegador`);
        console.log('    y aceptá el certificado autofirmado.');
      });
    }
  }

  console.log('');
  console.log(` Impresora configurada: ${config.PRINTER_INTERFACE}`);
  console.log(' Endpoints disponibles:');
  console.log(`   GET  /health`);
  console.log(`   POST /print/ticket`);
  console.log(`   POST /print/texto`);
  console.log('================================================');
  console.log('');
}

iniciarServidores();
