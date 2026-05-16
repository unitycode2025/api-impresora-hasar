const escpos     = require('escpos');
escpos.Serial    = require('escpos-serialport');

// Probá estos puertos uno por uno:
const PUERTOS = ['COM1', 'COM2', 'COM3', 'COM4', 'LPT1', 'LPT2'];

async function probarPuerto(puerto) {
  return new Promise((resolve) => {
    try {
      const device  = new escpos.Serial(puerto, { baudRate: 9600 });
      const printer = new escpos.Printer(device);

      device.open(function(err) {
        if (err) {
          resolve({ puerto, ok: false, error: err.message });
          return;
        }
        printer.text(`TEST ${puerto}`).cut().close();
        resolve({ puerto, ok: true });
      });
    } catch (err) {
      resolve({ puerto, ok: false, error: err.message });
    }
  });
}

async function main() {
  for (const p of PUERTOS) {
    const r = await probarPuerto(p);
    console.log(r.ok ? `✅ ${r.puerto}` : `❌ ${r.puerto} → ${r.error}`);
  }
}

main();