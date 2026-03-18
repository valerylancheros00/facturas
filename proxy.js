const express = require('express');
const cors = require('cors');
const https = require('https');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

app.post('/messages', (req, res) => {
  const { messages, max_tokens } = req.body;
  const apiKey = req.headers['x-api-key'];

  // Convertir formato Anthropic a Gemini
  const contents = [];
  for (const msg of messages) {
    const parts = [];
    if (Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c.type === 'text') {
          parts.push({ text: c.text });
        } else if (c.type === 'image') {
          parts.push({ inline_data: { mime_type: c.source.media_type, data: c.source.data } });
        } else if (c.type === 'document') {
          parts.push({ inline_data: { mime_type: 'application/pdf', data: c.source.data } });
        }
      }
    } else {
      parts.push({ text: msg.content });
    }
    contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });
  }

  const geminiBody = JSON.stringify({
    contents,
    generationConfig: { maxOutputTokens: max_tokens || 800 }
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(geminiBody),
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        const geminiResp = JSON.parse(data);
        const text = geminiResp.candidates?.[0]?.content?.parts?.[0]?.text || '';
        // Devolver en formato Anthropic para que el HTML no cambie
        res.json({ content: [{ type: 'text', text }] });
      } catch(e) {
        res.status(500).json({ error: 'Error procesando respuesta: ' + data });
      }
    });
  });

  apiReq.on('error', (e) => res.status(500).json({ error: e.message }));
  apiReq.write(geminiBody);
  apiReq.end();
});

app.listen(process.env.PORT || 3000);
