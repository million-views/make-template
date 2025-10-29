const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from my-test-project!',
    author: 'John Doe',
    version: '1.0.0'
  });
});

app.listen(port, () => {
  console.log(`my-test-project listening at http://localhost:${port}`);
});