import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

const app = express();
app.use(express.json({ limit: '2mb' }));

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('La variable GEMINI_API_KEY no está configurada en el servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.post('/api/insights', async (req, res) => {
  try {
    const digest = req.body?.digest;
    if (!digest || typeof digest !== 'object') {
      res.status(400).json({ error: 'Falta el resumen estadístico de los datos para analizar.' });
      return;
    }

    const ai = getAiClient();

    const prompt = `Analiza el siguiente resumen estadístico real de un conjunto de datos cargado en un panel de control interactivo y genera un informe ejecutivo en español claro, preciso y accionable.

IMPORTANTE:
- Cita únicamente cifras y porcentajes reales presentes en los datos proporcionados. No inventes datos ni proyecciones no respaldadas.
- Menciona productos, categorías, métodos o periodos concretos por su nombre exacto.
- Si hay filtros activos, ten en cuenta que el análisis corresponde a ese subconjunto filtrado.

Datos estadísticos:
${JSON.stringify(digest, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'Eres un analista senior de inteligencia de negocios y datos comerciales. Respondes siempre en español profesional, conciso, cuantitativo y directo, sin relleno ni tecnicismos innecesarios.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resumenEjecutivo: {
              type: Type.STRING,
              description: 'Resumen ejecutivo de 2 a 3 oraciones con las cifras clave del conjunto analizado.',
            },
            tendenciasClave: {
              type: Type.ARRAY,
              description: 'De 3 a 4 tendencias principales observadas en el tiempo, categorías o métodos.',
              items: {
                type: Type.OBJECT,
                properties: {
                  titulo: { type: Type.STRING },
                  detalle: { type: Type.STRING },
                  impacto: {
                    type: Type.STRING,
                    description: 'Valores permitidos: positivo, atencion, neutral',
                  },
                },
                required: ['titulo', 'detalle', 'impacto'],
              },
            },
            anomaliasYConcentracion: {
              type: Type.ARRAY,
              description: 'De 1 a 3 hallazgos sobre concentración Pareto, picos, estacionalidad o cestas múltiples.',
              items: {
                type: Type.STRING,
              },
            },
            recomendaciones: {
              type: Type.ARRAY,
              description: 'De 2 a 3 recomendaciones prácticas basadas directamente en los datos.',
              items: {
                type: Type.STRING,
              },
            },
          },
          required: [
            'resumenEjecutivo',
            'tendenciasClave',
            'anomaliasYConcentracion',
            'recomendaciones',
          ],
        },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText);
    res.json({ insights: parsed });
  } catch (err) {
    console.error('Error generating AI insights:', err);
    const message =
      err instanceof Error ? err.message : 'Error inesperado al generar el análisis con IA.';
    const status = message.includes('GEMINI_API_KEY') ? 500 : 502;
    res.status(status).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
