export const GEMINI_STORAGE_KEY = 'glamos_gemini_api_key';

export function getStoredGeminiApiKey(): string {
  return localStorage.getItem(GEMINI_STORAGE_KEY) || import.meta.env.VITE_GEMINI_API_KEY || '';
}

export function saveStoredGeminiApiKey(key: string): void {
  const clean = key.trim();
  if (clean) {
    localStorage.setItem(GEMINI_STORAGE_KEY, clean);
  } else {
    localStorage.removeItem(GEMINI_STORAGE_KEY);
  }
  window.dispatchEvent(new Event('glamos_gemini_key_changed'));
}

export interface GeminiNailAnalysis {
  detectedSkinTone: string;
  recommendedShape: string;
  designName: string;
  description: string;
  palette: Array<{ name: string; hex: string }>;
  difficulty: 'Fácil' | 'Intermedio' | 'Avanzado';
  estimatedTime: string;
  technique: string;
  stylistAdvice: string;
  generatedImageUrl?: string;
}

/**
 * Consulta la API gratuita de Google Gemini 2.0 Flash enviando la foto de la mano
 * y el prompt de diseño solicitado por la estilista o clienta.
 */
export async function generateNailDesignWithGemini(
  prompt: string,
  base64Image?: string | null,
  apiKey?: string
): Promise<GeminiNailAnalysis> {
  const key = apiKey || getStoredGeminiApiKey();
  if (!key) {
    throw new Error('API_KEY_REQUIRED');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

  const systemInstruction = `Eres "GlamOS Nail Stylist AI", una inteligencia artificial de alta costura experta en diseño de uñas, manicura rusa, colorimetría según escala de tonos de piel y anatomía de manos.
Tu tarea es analizar la petición de la clienta o estilista (y la foto de su mano si se proporciona) y generar una ficha técnica y diseño exclusivo que sea 100% realizable por una manicurista en salón.
Debes responder ÚNICAMENTE un objeto JSON válido con esta estructura:
{
  "detectedSkinTone": "Porcelana / Trigueño Claro / Trigueño Cálido / Canela / Moreno Profundo",
  "recommendedShape": "Almendrada / Coffin / Cuadrada / Ovalada / Stiletto / Corta Natural",
  "designName": "Nombre elegante del diseño",
  "description": "Descripción visual detallada de cómo lucen las uñas en la mano",
  "palette": [
    { "name": "Nombre color 1", "hex": "#HEX" },
    { "name": "Nombre color 2", "hex": "#HEX" },
    { "name": "Nombre acento", "hex": "#HEX" }
  ],
  "difficulty": "Fácil / Intermedio / Avanzado",
  "estimatedTime": "ej. 60 min",
  "technique": "ej. Soft Gel Tips + Esmaltado Semipermanente con Polvo Cromo",
  "stylistAdvice": "Consejo profesional para la manicurista sobre cómo aplicarlo en mesa"
}`;

  const parts: any[] = [
    {
      text: `${systemInstruction}\n\nPetición de diseño de la estilista o clienta: "${prompt}".`,
    },
  ];

  // Si se envió foto de la mano capturada con la cámara, adjuntarla como multimodal
  if (base64Image && base64Image.startsWith('data:')) {
    try {
      const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      const mimeMatch = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: cleanBase64,
        },
      });
    } catch (e) {
      console.warn('No se pudo procesar la imagen para Gemini:', e);
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `Error en la API de Google: ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    throw new Error('No se recibió contenido válido desde Google Gemini.');
  }

  const parsed = JSON.parse(textContent);
  return parsed as GeminiNailAnalysis;
}
