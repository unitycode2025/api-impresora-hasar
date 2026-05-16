// ============================================================
//  printer.js — Impresión via spooler de Windows (child_process)
// ============================================================

const { execSync } = require('child_process');
const fs           = require('fs');
const os           = require('os');
const path         = require('path');
const config       = require('./config');

// ── Bytes ESC/POS ─────────────────────────────────────────────
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

const CMD = {
  INIT:         Buffer.from([ESC, 0x40]),
  ALIGN_LEFT:   Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_RIGHT:  Buffer.from([ESC, 0x61, 0x02]),
  BOLD_ON:      Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF:     Buffer.from([ESC, 0x45, 0x00]),
  DOUBLE_W:     Buffer.from([ESC, 0x21, 0x20]),
  NORMAL_SIZE:  Buffer.from([ESC, 0x21, 0x00]),
  CUT:          Buffer.from([GS,  0x56, 0x41, 0x10]),
  LF:           Buffer.from([LF]),
};

const W = config.PAPER_WIDTH_CHARS;

// ── Enviar buffer al spooler de Windows ───────────────────────
function enviarAlSpooler(buffer) {
  const tmpFile        = path.join(os.tmpdir(), `ticket_${Date.now()}.bin`);
  const nombreImpresora = config.PRINTER_INTERFACE.replace(/^printer:/, '');

  console.log('[spooler] Enviando a:', nombreImpresora);
  console.log('[spooler] Bytes:', buffer.length);

  fs.writeFileSync(tmpFile, buffer);

  try {
    // Intentar primero con nombre compartido
    const cmd = `copy /b "${tmpFile}" "\\\\localhost\\${nombreImpresora}"`;
    console.log('[spooler] Comando:', cmd);
    const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe', windowsHide: true });
    console.log('[spooler] OK:', out.trim());
  } catch (err) {
    console.error('[spooler] Falló nombre compartido, intentando puerto directo...');
    try {
      // Fallback: puerto directo
      const puerto = config.PRINTER_INTERFACE.startsWith('//.')
        ? config.PRINTER_INTERFACE.replace('//./', '')  // //./USB001 → USB001
        : 'USB001';
      const cmd2 = `copy /b "${tmpFile}" "${puerto}"`;
      console.log('[spooler] Comando fallback:', cmd2);
      execSync(cmd2, { encoding: 'utf8', stdio: 'pipe', windowsHide: true });
      console.log('[spooler] OK con puerto directo');
    } catch (err2) {
      throw new Error(`No se pudo enviar a la impresora.\nIntento 1: ${err.message}\nIntento 2: ${err2.message}`);
    }
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

// ── Verificar impresora ───────────────────────────────────────
async function verificarImpresora() {
  // No usamos isPrinterConnected() — no funciona bien en Windows
  // La verificación real la hace enviarAlSpooler() al ejecutar
  return { conectada: true };
}

// ── Helpers ───────────────────────────────────────────────────
function txt(texto) {
  return Buffer.from(texto + '\n', 'latin1');
}

function sep(char = '-') {
  return txt(char.repeat(W));
}

function dobleCol(izq, der) {
  const esp = W - izq.length - der.length;
  return txt(`${izq}${esp > 0 ? ' '.repeat(esp) : ' '}${der}`);
}

function precio(num) {
  return `$${Number(num || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function truncar(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '.' : str;
}

// ── Imprimir ticket ───────────────────────────────────────────
async function imprimirTicket(data) {
  const ahora = new Date();
  const fecha = data.fecha || ahora.toLocaleDateString('es-AR');
  const hora  = data.hora  || ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const p = [];

  p.push(CMD.INIT);
  p.push(CMD.LF);

  // Subtítulo — Bienvenidos
  p.push(CMD.ALIGN_CENTER);
  p.push(CMD.BOLD_ON);
  p.push(txt('¡Bienvenido/a!'));
  p.push(CMD.BOLD_OFF);
  p.push(CMD.LF);

  // Separador
  p.push(sep('-'));

  // Nombre y apellido del cliente
  p.push(CMD.DOUBLE_W);
  p.push(txt(data.cliente || ''));
  p.push(CMD.NORMAL_SIZE);
  p.push(CMD.LF);

  // Empresa
  p.push(CMD.BOLD_ON);
  p.push(txt(data.empresa || ''));
  p.push(CMD.BOLD_OFF);
  p.push(CMD.LF);

  // Separador
  p.push(sep('-'));

  // Fecha y hora
  p.push(CMD.ALIGN_CENTER);
  p.push(txt(`Fecha: ${fecha}`));
  p.push(txt(`Hora: ${hora}`));
  p.push(CMD.LF);
  p.push(CMD.LF);
  p.push(CMD.LF);

  // Corte
  p.push(CMD.CUT);

  enviarAlSpooler(Buffer.concat(p));
}

// ── Imprimir texto libre ──────────────────────────────────────
async function imprimirTextoLibre(data) {
  const p = [CMD.INIT];
  for (const linea of (data.lineas || [])) {
    p.push(txt(linea));
  }
  if (data.cortar !== false) p.push(CMD.CUT);
  enviarAlSpooler(Buffer.concat(p));
}

// ── QR nativo ESC/POS (sin imagen, más compatible) ───────────
function generarQREscPos(texto) {
  const data = Buffer.from(texto, 'utf8');
  const len  = data.length + 3;
  const pL   = len & 0xff;
  const pH   = (len >> 8) & 0xff;
  return Buffer.concat([
    Buffer.from([GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06]),
    Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]),
    Buffer.from([GS, 0x28, 0x6B, pL,   pH,   0x31, 0x50, 0x30]),
    data,
    Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]),
  ]);
}

module.exports = {
  imprimirTicket,
  imprimirTextoLibre,
  verificarImpresora,
};35157577
