'use strict';

const path = require('node:path');
const express = require('express');
const cors = require('cors');
const productsRouter = require('./routes/products.routes');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false }));

app.use(express.static(publicDir, { index: false, maxAge: '1h' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    status: 'UP',
    service: 'web1',
    uptime: Number(process.uptime().toFixed(3)),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/products', productsRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rute ${req.method} ${req.originalUrl} tidak tersedia di layanan ini.`,
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Body permintaan bukan JSON yang valid.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Body permintaan terlalu besar.' });
  }

  console.error(`[web1] unhandled error: ${error.message}`);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan internal pada layanan.' });
});

module.exports = app;
