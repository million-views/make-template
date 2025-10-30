import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'complex-test-app',
    version: '2.1.0',
    author: 'Jane Smith',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

try {
  const __filename = fileURLToPath(import.meta.url);
  if (process.env.NODE_ENV !== 'test' && process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    app.listen(port, () => {
      console.log(`complex-test-app server running on port ${port}`);
    });
  }
} catch (e) {
  // Do not start server when being imported by tests
}