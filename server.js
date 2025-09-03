const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// Tipos MIME para diferentes archivos
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Obtener la ruta del archivo
  let filePath = path.join(__dirname, 'src', req.url === '/' ? 'index.html' : req.url);
  
  // Obtener la extensión del archivo
  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  // Leer el archivo
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Archivo no encontrado
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Archivo no encontrado</h1>');
      } else {
        // Error del servidor
        res.writeHead(500);
        res.end(`Error del servidor: ${err.code}`);
      }
    } else {
      // Archivo encontrado, enviarlo
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log('📱 Abre tu navegador y ve a la URL de arriba');
  console.log('⚡ Presiona Ctrl+C para detener el servidor');
});

// Manejo de errores
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ El puerto ${PORT} ya está en uso. Intenta cerrar otros servidores.`);
  } else {
    console.log('❌ Error del servidor:', err);
  }
});