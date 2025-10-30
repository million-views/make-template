import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from my-node-app!',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Guard against starting servers during test runs or when files are imported
try {
  const __filename = fileURLToPath(import.meta.url);
  if (process.env.NODE_ENV !== 'test' && process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
} catch (e) {
  // In some test harnesses process.argv[1] may be undefined; don't start server
}