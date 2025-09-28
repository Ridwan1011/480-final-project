// server.js (CommonJS)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

app.use(cors({
  origin: [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https?:\/\/.*\.onrender\.com$/,          // your backend (and frontend if you host there)
    /^https?:\/\/ridwan1011\.github\.io$/,     // <- change to your real frontend domain
  ]
}));


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' });
    }

    const r = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: messages,
      max_output_tokens: 350
    });

    res.json({ text: r.output_text ?? '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Proxy error' });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on port ${PORT}`);
});
