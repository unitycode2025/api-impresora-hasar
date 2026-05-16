// ============================================================
//  setup-ssl.js — Genera certificado SSL autofirmado para HTTPS local
//
//  Ejecutá UNA SOLA VEZ antes de iniciar el servidor:
//    node src/setup-ssl.js
//
//  Luego, en el navegador que usará la app, aceptá la advertencia
//  de seguridad entrando a:  https://localhost:3443
// ============================================================

const selfsigned = require('selfsigned');
const fs         = require('fs');
const path       = require('path');

const CERTS_DIR = path.join(__dirname, '..', 'certs');

if (!fs.existsSync(CERTS_DIR)) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
}

const certPath = path.join(CERTS_DIR, 'cert.pem');
const keyPath  = path.join(CERTS_DIR, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('✅ Certificados ya existen en /certs — no se regeneran.');
  console.log('   Para forzar regeneración, borrá los archivos en /certs y volvé a correr.');
  process.exit(0);
}

console.log('🔐 Generando certificado SSL autofirmado...');

const attrs = [
  { name: 'commonName',       value: 'localhost' },
  { name: 'organizationName', value: 'API Impresora Local' },
];

const opts = {
  days:       3650,  // 10 años — no necesitás renovarlo
  algorithm:  'sha256',
  extensions: [
    { name: 'subjectAltName', altNames: [
      { type: 2, value: 'localhost' },
      { type: 7, ip: '127.0.0.1' },
    ]},
  ],
};

const pems = selfsigned.generate(attrs, opts);

fs.writeFileSync(certPath, pems.cert);
fs.writeFileSync(keyPath,  pems.private);

console.log('✅ Certificados generados en /certs');
console.log('');
console.log('PASO IMPORTANTE — Aceptar el certificado en el navegador:');
console.log('  1. Iniciá el servidor:  npm start');
console.log('  2. Abrí en el navegador: https://localhost:3443');
console.log('  3. Hacé clic en "Avanzado" → "Continuar de todos modos"');
console.log('  4. Listo. Desde ese momento Lovable puede llamar a la API sin errores.');
