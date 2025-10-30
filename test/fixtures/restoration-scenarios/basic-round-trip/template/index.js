import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from {{PROJECT_NAME}}!',
    author: '{{AUTHOR_NAME}}',
    version: '1.0.0'
  });
});

try {
  const __filename = fileURLToPath(import.meta.url);
  if (process.env.NODE_ENV !== 'test' && process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    app.listen(port, () => {
      console.log(`{{PROJECT_NAME}} listening at http://localhost:${port}`);
    });
  }
} catch (e) {
  // Do not start server when being imported by tests
}