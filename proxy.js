const express = require('express');
const cors = require('cors');
const https = require('https');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

app.post('/messages', (req, res) => {
  const body = JSON.stringify(req.body);
  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'x-api-key': req.headers['x-api-key'],
      'anthropic-version': '2023-06-01',
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      res.status(apiRes.statusCode).set('Content-Type', 'application/json').send(data);
    });
  });

  apiReq.on('error', (e) => res.status(500).json({ error: e.message }));
  apiReq.write(body);
  apiReq.end();
});

app.listen(process.env.PORT || 3000);
