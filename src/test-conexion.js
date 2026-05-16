const ntp = require('node-thermal-printer');
const ThermalPrinter = ntp.ThermalPrinter || ntp.default;
const { PrinterTypes, CharacterSet } = ntp;

// ── Poné acá los valores que te dio Get-Printer y Get-PrinterPort ──
const INTERFACES_A_PROBAR = [
  'printer:Hasar P-181F',   // ← reemplazá con tu nombre exacto
  '//./USB001',
  '//./USB002',
  '//./USB003',
  '//./COM1',
  '//./COM3',
];

async function probar(interfaz) {
  return new Promise(async (resolve) => {
    try {
      const printer = new ThermalPrinter({
        type:      PrinterTypes.EPSON,
        interface: interfaz,
        options:   { timeout: 3000 },
      });

      const ok = await printer.isPrinterConnected();
      resolve({ interfaz, ok, error: null });
    } catch (err) {
      resolve({ interfaz, ok: false, error: err.message });
    }
  });
}

async function main() {
  console.log('\n🔍 Probando interfaces...\n');

  for (const iface of INTERFACES_A_PROBAR) {
    const res = await probar(iface);
    const icono = res.ok ? '✅' : '❌';
    const detalle = res.error ? `  → ${res.error}` : '';
    console.log(`${icono}  ${res.interfaz}${detalle}`);
  }

  console.log('\nUsá la interfaz que mostró ✅ en config.js');
}

main();