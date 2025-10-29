const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from {{PROJECT_NAME}}!',
    author: '{{AUTHOR_NAME}}',
    version: '1.0.0'
  });
});

app.listen(port, () => {
  console.log(`{{PROJECT_NAME}} listening at http://localhost:${port}`);
});