const escpos  = require('escpos');
escpos.Network = require('escpos-network');

// En Windows usamos el puerto de red virtual del spooler
// Primero probá con el nombre de la impresora compartida
const device  = new escpos.Network('localhost', 9100);
const printer = new escpos.Printer(device);

device.open(function(err) {
  if (err) {
    console.error('Error:', err.message);
    return;
  }
  printer
    .text('TEST HASAR P181')
    .cut()
    .close();
  console.log('OK');
});