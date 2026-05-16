# API Impresora Hasar P181

API local Node/Express para imprimir tickets desde apps web (Lovable, etc.) en segundo plano.

---

## Estructura del proyecto

```
api-impresora-hasar/
├── src/
│   ├── server.js       ← Servidor Express (HTTP + HTTPS)
│   ├── printer.js      ← Lógica ESC/POS para Hasar P181
│   ├── config.js       ← Configuración (editá esto primero)
│   ├── setup-ssl.js    ← Genera certificado SSL autofirmado
│   └── usePrinter.ts   ← Hook React para usar en Lovable
├── certs/              ← Certificados generados (no subir a git)
├── package.json
└── README.md
```

---

## Instalación — paso a paso

### 1. Requisitos previos

- Node.js 18 o superior → https://nodejs.org
- Impresora Hasar P181 conectada por USB y con driver instalado
- Verificar que aparezca en: Panel de control → Dispositivos e impresoras

### 2. Instalar dependencias

```bash
cd api-impresora-hasar
npm install
```

### 3. Configurar la impresora

Abrí `src/config.js` y editá:

```js
// Copiá el nombre EXACTO de la impresora en Windows:
PRINTER_INTERFACE: 'printer:Hasar P-181F',

// Si usás conexión USB directa:
// PRINTER_INTERFACE: '//./USB001',

// Nombre de tu negocio en el ticket:
BUSINESS_NAME: 'MI COMEDOR',
BUSINESS_ADDRESS: 'Av. San Martín 123',
BUSINESS_PHONE: '(0299) 4XX-XXXX',
```

### 4. Generar certificado SSL (OBLIGATORIO para Lovable)

Lovable corre en `https://`, por lo que necesitás que la API también use HTTPS.

```bash
node src/setup-ssl.js
```

Esto genera `certs/cert.pem` y `certs/key.pem` (válidos por 10 años).

### 5. Iniciar el servidor

```bash
npm start
```

Deberías ver:
```
================================================
 API Impresora Hasar P181 — iniciada
================================================
 HTTP   →  http://localhost:3001
 HTTPS  →  https://localhost:3443
...
```

### 6. Aceptar el certificado en el navegador (UNA SOLA VEZ)

Este paso es crítico. Sin él, Lovable no podrá llamar a la API.

1. Abrí el navegador que usás para acceder a tu app Lovable
2. Entrá a: `https://localhost:3443/health`
3. Aparecerá una advertencia de seguridad → hacé clic en **"Avanzado"**
4. Hacé clic en **"Continuar de todos modos"** (o similar)
5. Deberías ver: `{"servidor":"ok","impresora":"ok",...}`

A partir de ahí, el navegador recuerda el certificado y Lovable puede llamar a la API sin problemas.

---

## Uso desde Lovable

### Copiar el hook

1. En tu proyecto Lovable, creá el archivo: `src/hooks/usePrinter.ts`
2. Copiá el contenido de `src/usePrinter.ts` de este proyecto

### Ajustar la URL (si la API corre en otra PC)

Si la PC con la impresora es distinta a la del navegador, editá en `usePrinter.ts`:

```ts
// Cambiá localhost por la IP local de la PC con la impresora:
const API_BASE_URL = 'https://192.168.1.100:3443';
```

Para saber la IP local de la PC: `ipconfig` en Windows, `ip a` en Linux.

### Ejemplo de uso en componente

```tsx
import { usePrinter } from '@/hooks/usePrinter';

function BotonImprimir({ pedido }) {
  const { imprimirTicket, imprimiendo, errorImpresion } = usePrinter();

  const handleImprimir = async () => {
    await imprimirTicket({
      numero:    pedido.id,
      mesa:      pedido.mesa,
      cliente:   pedido.cliente,
      items: pedido.items.map(i => ({
        descripcion: i.nombre,
        cantidad:    i.cantidad,
        precio:      i.precio,
      })),
      total:      pedido.total,
      metodoPago: pedido.metodoPago,
      qrData:     `https://tuapp.lovable.app/pedido/${pedido.id}`,
    });
  };

  return (
    <>
      <button onClick={handleImprimir} disabled={imprimiendo}>
        {imprimiendo ? 'Imprimiendo...' : 'Imprimir ticket'}
      </button>
      {errorImpresion && <p style={{color:'red'}}>{errorImpresion}</p>}
    </>
  );
}
```

---

## Endpoints

### `GET /health`
Verifica que el servidor y la impresora estén funcionando.

**Respuesta:**
```json
{
  "servidor":  "ok",
  "impresora": "ok",
  "interface": "printer:Hasar P-181F",
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

---

### `POST /print/ticket`
Imprime un ticket de pedido formateado.

**Body:**
```json
{
  "numero":     "0042",
  "mesa":       "5",
  "cliente":    "Juan Pérez",
  "items": [
    { "descripcion": "Milanesa c/ papas", "cantidad": 2, "precio": 1500 },
    { "descripcion": "Gaseosa 500ml",     "cantidad": 1, "precio":  600, "nota": "con hielo" }
  ],
  "total":      3600,
  "metodoPago": "Efectivo",
  "notaExtra":  "Sin cebolla",
  "qrData":     "https://tuapp.lovable.app/pedido/42"
}
```

**Respuesta:**
```json
{ "ok": true, "mensaje": "Ticket impreso correctamente." }
```

---

### `POST /print/texto`
Imprime líneas de texto libre.

**Body:**
```json
{
  "lineas": ["COMANDA COCINA", "Mesa 5", "2x Milanesa"],
  "cortar": true
}
```

---

## Correr en segundo plano con PM2

Para que la API arranque automáticamente con Windows y quede corriendo siempre:

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar la API
pm2 start src/server.js --name api-impresora

# Guardar la lista de procesos
pm2 save

# Configurar arranque automático con Windows
pm2 startup

# Ver logs en tiempo real
pm2 logs api-impresora

# Otros comandos útiles
pm2 status              # ver estado
pm2 restart api-impresora
pm2 stop api-impresora
```

---

## Solución de problemas

### "Impresora no disponible"
- Verificá que la Hasar P181 esté encendida y conectada por USB
- Comprobá que el nombre en `config.js` coincida EXACTAMENTE con el de Panel de control
- Probá con el puerto directo: `'//./USB001'`

### "Failed to fetch" desde Lovable
- ¿Aceptaste el certificado? Entrá a `https://localhost:3443/health` y aceptalo
- Si la API corre en otra PC, usá la IP local en lugar de `localhost`
- Verificá que el firewall de Windows permita el puerto 3443

### Caracteres con tilde o ñ mal impresos
- La Hasar P181 usa codificación PC858. Está configurada por defecto.
- Si seguís viendo caracteres raros, probá `CharacterSet.PC437` en `printer.js`

### El QR no se imprime
- Asegurate de tener instalado `npm install qrcode`
- La librería `node-thermal-printer` necesita que la imagen sea un Buffer PNG válido
