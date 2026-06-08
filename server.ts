import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini safely on the server-side with metadata tracking header
const initGemini = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('WARNING: GEMINI_API_KEY environment variable is not set!');
  }
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const ai = initGemini();

// API Endpoint for AI Diagnostics Assist
app.post('/api/diagnose', async (req, res) => {
  const { brand, model, stats, message, history } = req.body;

  try {
    const doubleClickRatio = stats.totalClicks > 0 ? (stats.totalDoubleClicks / stats.totalClicks) * 100 : 0;

    // Build engineering-level context prompt
    const systemPrompt = `You are a professional hardware engineer and senior technician specializing in peripherals, keyboards, and computer mice.
Your job is to provide direct, specific, and actionable repair, cleaning, and diagnostic steps for a computer mouse.
You must speak in Russian (русский язык) as requested by the user.

Target Mouse Specification:
- Brand/Manufacturer: ${brand || 'Unknown'}
- Model Name: ${model || 'Generic Mouse'}

Captured Live Diagnostics Logs from Web Testing:
- Total button clicks executed: ${stats.totalClicks || 0}
- Double-clicks detected (Premature click bounce/fault): ${stats.totalDoubleClicks || 0} (Ratio: ${doubleClickRatio.toFixed(1)}%)
- Scroll wheel direction jitter/errors detected: ${stats.totalScrollJitters || 0}
- Maximum Polling rate achieved: ${stats.peakPollingRate || 0} Hz ${stats.peakPollingRate > 0 ? `(Target expected standard: ${stats.peakPollingRate > 700 ? '1000' : stats.peakPollingRate > 350 ? '500' : '125'} Hz)` : ''}

Strict Behavioral Constraints:
1. Speak with elite expertise but formulate your advice in extremely practical, easy-to-understand, step-by-step instructions.
2. Address details specific to the ${brand} ${model} mouse if known. If it uses specific switches (OMRON, optical switches, Kailh, Huano) or has tricky disassembly tricks, explain them!
3. Format output in neat markdown with headers (using ## and ###), bullet points (using -), and numbered lists. Do not use excessive symbols. Avoid low-quality slop like repeating telemetry or PORT numbers.
4. If there is a double click or scroll wheel jump indicated in the diagnostics stats above, refer to it explicitly and offer tailored recommendations (e.g. cleaning microswitches with alcohol, tightening encoder, ordering Kailh GM 8.0, Huano Blue Blue Shell, or Alps encooders).`;

    const chatContent = history && Array.isArray(history) && history.length > 0 
      ? [
          ...history.map((h: any) => ({
            role: h.role, // 'user' or 'model'
            parts: [{ text: h.text }],
          })),
          { role: 'user', parts: [{ text: `${message}\n\nPlease analyze based on my stats: ${JSON.stringify(stats)}` }] }
        ]
      : `${systemPrompt}\n\nUser Question: ${message}`;

    // Invoke Gemini 3.5 Flash server-side
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: chatContent,
      config: {
        systemInstruction: systemPrompt,
        temperature: 1.0,
      }
    });

    const text = response.text || 'Извините, не удалось получить экспертный ответ от ИИ.';
    res.json({ reply: text });
  } catch (error: any) {
    console.error('Gemini Diagnostics execution failed:', error);
    res.status(500).json({ error: error.message || 'Ошибка на сервере при обработке запроса.' });
  }
});

// App routing and static assets handler
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express Server boot complete on http://0.0.0.0:${PORT}`);
  });
}

start();
