import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Sparkles,
  Download,
  Share2,
  RefreshCw,
  Send,
  Check,
  Image as ImageIcon,
  Layers,
  Palette,
  Eye,
  ArrowRight,
  X,
  Sliders,
  Scissors,
  PlusCircle,
  MessageCircle,
  Info,
  ChevronRight,
  Zap,
  SlidersHorizontal,
  Upload,
  Key,
  KeyRound,
  ExternalLink,
  Cpu,
  AlertCircle,
  EyeOff,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../auth/auth-context';
import {
  getStoredGeminiApiKey,
  saveStoredGeminiApiKey,
  generateNailDesignWithGemini,
  GeminiNailAnalysis,
} from '../lib/gemini';

// ── DEFINICIONES DE TIPOS & TAXONOMÍA PROFESIONAL DE MANICURA ─────────────
export type SkinToneId = 'porcelain' | 'fair' | 'warm-tan' | 'golden-caramel' | 'deep-bronze';
export type NailShapeId = 'almond' | 'coffin' | 'square' | 'oval' | 'stiletto' | 'natural-short';
export type NailLengthId = 'short' | 'medium' | 'long' | 'xl';

interface SkinTone {
  id: SkinToneId;
  name: string;
  hex: string;
  undertone: string;
}

interface NailShape {
  id: NailShapeId;
  name: string;
  description: string;
  curveFactor: number;
}

interface PresetDesign {
  id: string;
  name: string;
  category: string;
  prompt: string;
  description: string;
  difficulty: 'Fácil' | 'Intermedio' | 'Avanzado';
  estimatedTime: string;
  suggestedPrice: number;
  palette: Array<{ name: string; hex: string }>;
  accentFeatures: string[];
}

const SKIN_TONES: SkinTone[] = [
  { id: 'porcelain', name: 'Porcelana Frío', hex: '#FCE7D8', undertone: 'Subtono Rosado' },
  { id: 'fair', name: 'Trigueño Claro', hex: '#F4CBB2', undertone: 'Subtono Neutro' },
  { id: 'warm-tan', name: 'Trigueño Cálido', hex: '#DF9F77', undertone: 'Subtono Dorado' },
  { id: 'golden-caramel', name: 'Canela / Caramelo', hex: '#B8784C', undertone: 'Subtono Cálido Intenso' },
  { id: 'deep-bronze', name: 'Moreno Profundo', hex: '#633B26', undertone: 'Subtono Ébano Luminoso' },
];

const NAIL_SHAPES: NailShape[] = [
  { id: 'almond', name: 'Almendrada', description: 'Estiliza y alarga los dedos', curveFactor: 0.8 },
  { id: 'coffin', name: 'Coffin / Bailarina', description: 'Silueta recta con punta cónica', curveFactor: 0.5 },
  { id: 'square', name: 'Cuadrada', description: 'Clásica con bordes definidos', curveFactor: 0.2 },
  { id: 'oval', name: 'Ovalada', description: 'Suave, simétrica y orgánica', curveFactor: 0.9 },
  { id: 'stiletto', name: 'Stiletto', description: 'Punta afilada de alta costura', curveFactor: 1.0 },
  { id: 'natural-short', name: 'Corta Natural', description: 'Práctica, cómoda y prolija', curveFactor: 0.6 },
];

const PRESET_DESIGNS: PresetDesign[] = [
  {
    id: 'marble-gold',
    name: 'Mármol Carrara & Pan de Oro 24K',
    category: 'Haute Couture',
    prompt: 'Efecto mármol blanco traslúcido con vetas cuarzo grises, detalles orgánicos de pan de oro de 24k en relieve y acabado ultra glossy espejo.',
    description: 'Elegancia arquitectónica con vetas de piedra natural y destellos metálicos preciosos.',
    difficulty: 'Intermedio',
    estimatedTime: '75 min',
    suggestedPrice: 38,
    palette: [
      { name: 'Blanco Lechoso', hex: '#F8F9FA' },
      { name: 'Gris Cuarzo', hex: '#9E9E9E' },
      { name: 'Oro Puro 24K', hex: '#D4AF37' },
      { name: 'Nude Base', hex: '#EED9C4' },
    ],
    accentFeatures: ['Foil de Oro', 'Veteado Manual', 'Esmalte Gel Lechoso'],
  },
  {
    id: 'glazed-donut',
    name: 'Glazed Donut Hailey Cromo',
    category: 'Tendencia 2026',
    prompt: 'Base nude semitransparente con polvo de cromo perla reflectante, efecto glaseado líquido brillante y cutícula limpia rusa.',
    description: 'El fenómeno viral de alta costura: brillo aperlado iridiscente que refleja la luz con cada movimiento.',
    difficulty: 'Fácil',
    estimatedTime: '50 min',
    suggestedPrice: 30,
    palette: [
      { name: 'Nude Perla', hex: '#F3E5D8' },
      { name: 'Polvo Cromo', hex: '#FFFFFF' },
      { name: 'Gloss Cristal', hex: '#E6EEF8' },
    ],
    accentFeatures: ['Polvo Cromo Frotado', 'Efecto Iridiscente', 'Nude Translúcido'],
  },
  {
    id: 'velvet-cat-eye',
    name: 'Velvet Cat Eye Vino Borgoña',
    category: 'Gala & Fiesta',
    prompt: 'Gel magnético ojo de gato aterciopelado en color vino tinto profundo con halo tridimensional de luz violeta y champaña.',
    description: 'Textura óptica de terciopelo líquido con pigmentos magnéticos multidimensionales.',
    difficulty: 'Intermedio',
    estimatedTime: '65 min',
    suggestedPrice: 35,
    palette: [
      { name: 'Vino Borgoña', hex: '#4A0E17' },
      { name: 'Reflejo Velvet', hex: '#9B2242' },
      { name: 'Champaña Destello', hex: '#E5C378' },
    ],
    accentFeatures: ['Pigmento Magnético', 'Halo Terciopelo 3D', 'Vino Intenso'],
  },
  {
    id: 'baby-boomer-bride',
    name: 'Novias VIP Baby Boomer Perlado',
    category: 'Novias & Eventos',
    prompt: 'Degradé perfecto ombré francés desde blanco nieve en la punta hacia nude rosado en la base, con microcristales Swarovski en la lúnula.',
    description: 'Transición etérea sin cortes entre el blanco y el nude rosado, rematado con cristalería fina.',
    difficulty: 'Avanzado',
    estimatedTime: '85 min',
    suggestedPrice: 45,
    palette: [
      { name: 'Blanco Francés', hex: '#FFFFFF' },
      { name: 'Rosa Nude Suave', hex: '#FAD2E1' },
      { name: 'Cristal Aurora', hex: '#E0F2FE' },
    ],
    accentFeatures: ['Degradé Esponja Airbrush', 'Cristal Swarovski', 'Top Coat Blindado'],
  },
  {
    id: 'micro-french-sage',
    name: 'Micro-French Verde Salvia Minimal',
    category: 'Minimal Chic',
    prompt: 'Base nude mate porcelana con línea de sonrisa francesa ultrafina de 1mm en verde salvia y líneas orgánicas doradas.',
    description: 'Minimalismo escandinavo moderno con trazos milimétricos y contraste mate-brillo.',
    difficulty: 'Fácil',
    estimatedTime: '55 min',
    suggestedPrice: 28,
    palette: [
      { name: 'Verde Salvia', hex: '#87986A' },
      { name: 'Nude Porcelana', hex: '#F5E6D3' },
      { name: 'Línea Platino', hex: '#E2E8F0' },
    ],
    accentFeatures: ['Línea Micro-precisión', 'Acabado Mate Velvet', 'Trazo Orgánico'],
  },
  {
    id: 'noir-abstract',
    name: 'Noir Editorial & Negative Space',
    category: 'Vanguardia',
    prompt: 'Negro azabache profundo sobre base transparente de negative space con líneas geométricas curvas y detalles en cromo plateado líquido.',
    description: 'Diseño geométrico de pasarela con juego de transparencias negativas y trazos futuristas.',
    difficulty: 'Avanzado',
    estimatedTime: '90 min',
    suggestedPrice: 42,
    palette: [
      { name: 'Negro Azabache', hex: '#121212' },
      { name: 'Plata Líquida', hex: '#CBD5E1' },
      { name: 'Negative Space', hex: '#F1E3D3' },
    ],
    accentFeatures: ['Espacio Negativo', 'Líneas Curvas Abstractas', 'Relieve Cromado'],
  },
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  designPreview?: PresetDesign;
}

export function NailArtStudioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados de Entrada / Cámara
  const [captureMode, setCaptureMode] = useState<'camera' | 'upload' | 'preset'>('preset');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Estados de Personalización Anatómica
  const [selectedSkinTone, setSelectedSkinTone] = useState<SkinToneId>('warm-tan');
  const [selectedShape, setSelectedShape] = useState<NailShapeId>('almond');
  const [selectedLength, setSelectedLength] = useState<NailLengthId>('medium');

  // Estados del Chat y Generación
  const [activeDesign, setActiveDesign] = useState<PresetDesign>(PRESET_DESIGNS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [viewComparison, setViewComparison] = useState(false);

  // Estados de Google Gemini 2.0 Flash (100% Gratis)
  const [geminiApiKey, setGeminiApiKey] = useState(() => getStoredGeminiApiKey());
  const [geminiModalOpen, setGeminiModalOpen] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState('');
  const [showKeyText, setShowKeyText] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [keyValidationMsg, setKeyValidationMsg] = useState('');

  // Sincronizar clave al escuchar eventos del storage
  useEffect(() => {
    const syncKey = () => setGeminiApiKey(getStoredGeminiApiKey());
    window.addEventListener('glamos_gemini_key_changed', syncKey);
    return () => window.removeEventListener('glamos_gemini_key_changed', syncKey);
  }, []);

  const handleOpenGeminiModal = () => {
    setTempKeyInput(geminiApiKey);
    setKeyValidationStatus('idle');
    setKeyValidationMsg('');
    setGeminiModalOpen(true);
  };

  const handleSaveModalKey = () => {
    saveStoredGeminiApiKey(tempKeyInput);
    setGeminiApiKey(tempKeyInput.trim());
    setKeyValidationStatus('success');
    setKeyValidationMsg('¡Clave guardada con éxito!');
    setTimeout(() => {
      setGeminiModalOpen(false);
      setKeyValidationStatus('idle');
    }, 1200);
  };

  const handleTestModalKey = async () => {
    const k = tempKeyInput.trim();
    if (!k) return;
    setKeyValidationStatus('testing');
    setKeyValidationMsg('');
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${k}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hola' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });
      if (res.ok) {
        saveStoredGeminiApiKey(k);
        setGeminiApiKey(k);
        setKeyValidationStatus('success');
        setKeyValidationMsg('¡Conexión verificada! Gemini 2.0 Flash está activo y listo.');
      } else {
        const errData = await res.json().catch(() => ({}));
        setKeyValidationStatus('error');
        setKeyValidationMsg(errData.error?.message || 'Error al validar clave con Google.');
      }
    } catch (e: any) {
      setKeyValidationStatus('error');
      setKeyValidationMsg(e?.message || 'Error de conexión.');
    }
  };

  // Canvas y Video Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Historial de Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `¡Bienvenida al Nail Art Studio de GlamOS! ✨ He configurado el lienzo con tono de piel "${SKIN_TONES.find((s) => s.id === selectedSkinTone)?.name}" y forma "${NAIL_SHAPES.find((s) => s.id === selectedShape)?.name}". 
      
Puedes pedirme cualquier diseño en lenguaje natural (ej. "quiero un estilo esmeralda con pan de oro para gala"), capturar la mano real de tu clienta con la cámara o seleccionar una de nuestras tendencias de alta costura.`,
      timestamp: 'Ahora',
      designPreview: PRESET_DESIGNS[0],
    },
  ]);

  // Manejo de Cámara WebRTC
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (captureMode === 'camera') {
      setCameraError(null);
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
            setCameraActive(true);
          }
        })
        .catch((err) => {
          console.warn('Error accediendo a la cámara:', err);
          setCameraError('No se pudo acceder a la cámara. Revisa los permisos o sube una foto de tu galería.');
          setCameraActive(false);
        });
    } else {
      setCameraActive(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [captureMode, facingMode]);

  // Tomar Foto con la Cámara
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
      setCaptureMode('camera');
      renderNailArtOnCanvas(dataUrl, activeDesign, selectedSkinTone, selectedShape);
    }
  };

  // Subir Foto desde Galería / Archivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedImage(dataUrl);
        setCaptureMode('upload');
        renderNailArtOnCanvas(dataUrl, activeDesign, selectedSkinTone, selectedShape);
      };
      reader.readAsDataURL(file);
    }
  };

  // Motor de Renderizado en Canvas (Hiperrealismo de Uñas)
  const renderNailArtOnCanvas = (
    baseHandImage: string | null,
    design: PresetDesign,
    skinToneId: SkinToneId,
    shapeId: NailShapeId
  ) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 900;
    canvas.height = 900;

    const tone = SKIN_TONES.find((t) => t.id === skinToneId) || SKIN_TONES[2];
    const shape = NAIL_SHAPES.find((s) => s.id === shapeId) || NAIL_SHAPES[0];

    // Fondo elegante de salón de lujo (mármol ahumado / satinado)
    const bgGrad = ctx.createRadialGradient(450, 450, 100, 450, 450, 550);
    bgGrad.addColorStop(0, '#1A1820');
    bgGrad.addColorStop(1, '#0A090D');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Si hay foto capturada por la cámara, dibujarla como base
    if (baseHandImage) {
      const img = new window.Image();
      img.onload = () => {
        // Dibujar mano original con viñeta estética
        ctx.save();
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Aplicar capa de uñas esculpidas con blend modes de alta costura
        drawRealisticNails(ctx, design, tone, shape);
      };
      img.src = baseHandImage;
    } else {
      // Si está en modo preset virtual, dibujar mano estética con el tono de piel seleccionado
      drawVirtualModelHand(ctx, tone);
      drawRealisticNails(ctx, design, tone, shape);
    }
  };

  // Dibuja una mano modelo hiperrealista con el tono de piel exacto
  const drawVirtualModelHand = (ctx: CanvasRenderingContext2D, tone: SkinTone) => {
    ctx.save();

    // Sombra de la mano
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetY = 20;

    // Gradiente anatómico de la piel
    const skinGrad = ctx.createLinearGradient(450, 850, 450, 200);
    skinGrad.addColorStop(0, tone.hex);
    skinGrad.addColorStop(0.5, tone.hex);
    skinGrad.addColorStop(1, adjustBrightness(tone.hex, 15));

    ctx.fillStyle = skinGrad;

    // Palma y base de la mano
    ctx.beginPath();
    ctx.ellipse(450, 680, 210, 200, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5 Dedos extendidos perfectamente proporcionados
    const fingers = [
      { x: 260, y: 520, w: 46, h: 220, rot: -0.22 }, // Meñique
      { x: 350, y: 440, w: 50, h: 280, rot: -0.09 }, // Anular
      { x: 450, y: 410, w: 52, h: 300, rot: 0.00 },  // Medio
      { x: 550, y: 445, w: 50, h: 275, rot: 0.09 },  // Índice
      { x: 650, y: 580, w: 54, h: 190, rot: 0.35 },  // Pulgar
    ];

    fingers.forEach((f) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);

      ctx.beginPath();
      ctx.roundRect(-f.w / 2, -f.h / 2, f.w, f.h, [f.w / 2, f.w / 2, 20, 20]);
      ctx.fill();

      // Pliegues y nudillos realistas
      ctx.strokeStyle = adjustBrightness(tone.hex, -20);
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, -f.h * 0.1, f.w * 0.3, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, f.h * 0.15, f.w * 0.32, 0, Math.PI);
      ctx.stroke();

      ctx.restore();
    });

    ctx.restore();
  };

  // Dibuja las uñas con el diseño, técnica, curvatura y brillo
  const drawRealisticNails = (
    ctx: CanvasRenderingContext2D,
    design: PresetDesign,
    tone: SkinTone,
    shape: NailShape
  ) => {
    ctx.save();

    const nailPositions = [
      { x: 262, y: 405, w: 26, h: 42, rot: -0.22 }, // Meñique
      { x: 350, y: 295, w: 30, h: 48, rot: -0.09 }, // Anular
      { x: 450, y: 255, w: 32, h: 50, rot: 0.00 },  // Medio
      { x: 550, y: 302, w: 30, h: 47, rot: 0.09 },  // Índice
      { x: 672, y: 485, w: 34, h: 46, rot: 0.35 },  // Pulgar
    ];

    nailPositions.forEach((np, idx) => {
      ctx.save();
      ctx.translate(np.x, np.y);
      ctx.rotate(np.rot);

      // Sombra proyectada del lecho ungueal
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      // Trazo de la silueta de la uña según la forma elegida
      ctx.beginPath();
      if (shape.id === 'almond') {
        ctx.moveTo(-np.w / 2, np.h / 2);
        ctx.bezierCurveTo(-np.w / 2, -np.h * 0.2, -np.w * 0.2, -np.h / 2, 0, -np.h / 2);
        ctx.bezierCurveTo(np.w * 0.2, -np.h / 2, np.w / 2, -np.h * 0.2, np.w / 2, np.h / 2);
        ctx.quadraticCurveTo(0, np.h / 2 + 5, -np.w / 2, np.h / 2);
      } else if (shape.id === 'coffin') {
        ctx.moveTo(-np.w / 2, np.h / 2);
        ctx.lineTo(-np.w * 0.35, -np.h / 2);
        ctx.lineTo(np.w * 0.35, -np.h / 2);
        ctx.lineTo(np.w / 2, np.h / 2);
        ctx.quadraticCurveTo(0, np.h / 2 + 4, -np.w / 2, np.h / 2);
      } else if (shape.id === 'stiletto') {
        ctx.moveTo(-np.w / 2, np.h / 2);
        ctx.lineTo(0, -np.h / 2 - 6);
        ctx.lineTo(np.w / 2, np.h / 2);
        ctx.quadraticCurveTo(0, np.h / 2 + 4, -np.w / 2, np.h / 2);
      } else {
        // Cuadrada o Redondeada natural
        ctx.roundRect(-np.w / 2, -np.h / 2, np.w, np.h, [8, 8, 14, 14]);
      }
      ctx.closePath();

      // Clip para dibujar el arte estrictamente dentro de la uña
      ctx.clip();

      // 1. Color base de esmalte
      const baseColor = design.palette[0]?.hex || '#FFFFFF';
      const secondaryColor = design.palette[1]?.hex || '#EED9C4';
      const accentColor = design.palette[2]?.hex || '#D4AF37';

      const nailGrad = ctx.createLinearGradient(0, np.h / 2, 0, -np.h / 2);
      nailGrad.addColorStop(0, secondaryColor);
      nailGrad.addColorStop(0.6, baseColor);
      nailGrad.addColorStop(1, adjustBrightness(baseColor, 10));
      ctx.fillStyle = nailGrad;
      ctx.fillRect(-np.w, -np.h, np.w * 2, np.h * 2);

      // 2. Arte y Efectos Específicos
      if (design.id === 'marble-gold') {
        // Vetas de Mármol orgánicas
        ctx.strokeStyle = 'rgba(120, 120, 120, 0.4)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-np.w * 0.4, np.h * 0.4);
        ctx.bezierCurveTo(0, 0, -np.w * 0.2, -np.h * 0.2, np.w * 0.3, -np.h * 0.4);
        ctx.stroke();

        // Pan de Oro 24K en relieve
        ctx.fillStyle = '#D4AF37';
        ctx.beginPath();
        ctx.arc(-np.w * 0.1, -np.h * 0.1, 3.5, 0, Math.PI * 2);
        ctx.arc(np.w * 0.2, np.h * 0.2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (design.id === 'glazed-donut') {
        // Brillo cromo nacarado iridiscente
        const chromeGrad = ctx.createLinearGradient(-np.w, -np.h, np.w, np.h);
        chromeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        chromeGrad.addColorStop(0.5, 'rgba(230, 240, 255, 0.2)');
        chromeGrad.addColorStop(1, 'rgba(255, 220, 230, 0.5)');
        ctx.fillStyle = chromeGrad;
        ctx.fillRect(-np.w, -np.h, np.w * 2, np.h * 2);
      } else if (design.id === 'velvet-cat-eye') {
        // Reflejo magnético ojo de gato en diagonal
        const catEyeGrad = ctx.createLinearGradient(-np.w * 0.5, -np.h * 0.5, np.w * 0.5, np.h * 0.5);
        catEyeGrad.addColorStop(0, 'rgba(74, 14, 23, 0.9)');
        catEyeGrad.addColorStop(0.48, 'rgba(229, 195, 120, 0.85)');
        catEyeGrad.addColorStop(0.52, 'rgba(255, 255, 255, 0.95)');
        catEyeGrad.addColorStop(1, 'rgba(74, 14, 23, 0.9)');
        ctx.fillStyle = catEyeGrad;
        ctx.fillRect(-np.w, -np.h, np.w * 2, np.h * 2);
      } else if (design.id === 'micro-french-sage') {
        // Micro-french ultrafino en la punta
        ctx.fillStyle = '#87986A';
        ctx.fillRect(-np.w, -np.h / 2, np.w * 2, 6);
      } else if (design.id === 'baby-boomer-bride') {
        // Cristal Swarovski en el dedo anular (idx === 1)
        if (idx === 1) {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(0, np.h * 0.35, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#D4AF37';
          ctx.beginPath();
          ctx.arc(0, np.h * 0.35, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Brillo de Top-Coat Gel Espejo (Specular Highlight)
      const glossGrad = ctx.createLinearGradient(-np.w * 0.4, 0, np.w * 0.4, 0);
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      glossGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.55)');
      glossGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.8)');
      glossGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = glossGrad;
      ctx.fillRect(-np.w * 0.2, -np.h, np.w * 0.35, np.h * 2);

      // Línea de cutícula sombreada para realismo de inserción
      ctx.strokeStyle = adjustBrightness(tone.hex, -40);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, np.h / 2, np.w * 0.45, 0, Math.PI);
      ctx.stroke();

      ctx.restore();
    });

    ctx.restore();
  };

  // Helper para ajustar brillo de colores hex
  function adjustBrightness(col: string, percent: number) {
    let num = parseInt(col.replace('#', ''), 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = ((num >> 8) & 0x00ff) + amt;
    let B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  // Render inicial al cargar o cambiar parámetros
  useEffect(() => {
    renderNailArtOnCanvas(capturedImage, activeDesign, selectedSkinTone, selectedShape);
  }, [capturedImage, activeDesign, selectedSkinTone, selectedShape, selectedLength]);

  // Enviar Prompt en el Chat de la Estilista
  const handleSendMessage = async () => {
    if (!inputPrompt.trim() || isGenerating) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');

    // Mensaje del usuario
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: 'Ahora',
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsGenerating(true);

    const key = getStoredGeminiApiKey();

    if (key) {
      try {
        const geminiResult = await generateNailDesignWithGemini(userText, capturedImage, key);

        // Mapear tono de piel sugerido si la IA lo detectó en la foto
        if (geminiResult.detectedSkinTone) {
          const lower = geminiResult.detectedSkinTone.toLowerCase();
          if (lower.includes('porcelan') || lower.includes('rosad')) setSelectedSkinTone('porcelain');
          else if (lower.includes('claro') || lower.includes('neutr')) setSelectedSkinTone('fair');
          else if (lower.includes('cálid') || lower.includes('dorad')) setSelectedSkinTone('warm-tan');
          else if (lower.includes('canela') || lower.includes('caramel')) setSelectedSkinTone('golden-caramel');
          else if (lower.includes('moren') || lower.includes('éban') || lower.includes('profund')) setSelectedSkinTone('deep-bronze');
        }

        // Mapear silueta de uña sugerida
        if (geminiResult.recommendedShape) {
          const lower = geminiResult.recommendedShape.toLowerCase();
          if (lower.includes('almen')) setSelectedShape('almond');
          else if (lower.includes('coffin') || lower.includes('bailar')) setSelectedShape('coffin');
          else if (lower.includes('cuadr')) setSelectedShape('square');
          else if (lower.includes('oval')) setSelectedShape('oval');
          else if (lower.includes('stiletto') || lower.includes('afil')) setSelectedShape('stiletto');
          else if (lower.includes('cort') || lower.includes('natur')) setSelectedShape('natural-short');
        }

        const customDesign: PresetDesign = {
          id: `gemini-${Date.now()}`,
          name: geminiResult.designName || `Diseño Alta Costura`,
          category: 'Google Gemini 2.0 Flash',
          prompt: userText,
          description: geminiResult.description || `Diseño exclusivo analizado para la anatomía y tono de piel del cliente.`,
          difficulty: geminiResult.difficulty || 'Intermedio',
          estimatedTime: geminiResult.estimatedTime || '65 min',
          suggestedPrice: 38,
          palette: geminiResult.palette && geminiResult.palette.length > 0 ? geminiResult.palette : [
            { name: 'Color Primario', hex: '#D4AF37' },
            { name: 'Base Nude', hex: '#EED9C4' },
            { name: 'Acento Gloss', hex: '#FFFFFF' },
          ],
          accentFeatures: [geminiResult.technique, geminiResult.stylistAdvice].filter(Boolean),
        };

        setActiveDesign(customDesign);
        renderNailArtOnCanvas(capturedImage, customDesign, selectedSkinTone, selectedShape);

        const aiReply: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `✨ **${customDesign.name}**
*(Diseño generado en tiempo real con Google Gemini 2.0 Flash)*

${geminiResult.description}

💅 **Técnica recomendada:** ${geminiResult.technique}
🎯 **Consejo para la manicurista:** ${geminiResult.stylistAdvice}
⏱️ **Tiempo estimado:** ${geminiResult.estimatedTime} · **Dificultad:** ${geminiResult.difficulty}
🎨 **Paleta de colores:** ${customDesign.palette.map((p) => p.name).join(', ')}`,
          timestamp: 'Ahora',
          designPreview: customDesign,
        };

        setMessages((prev) => [...prev, aiReply]);
        setIsGenerating(false);
        return;
      } catch (geminiError: any) {
        console.warn('Error en consulta con Gemini, aplicando generador inteligente local:', geminiError);
      }
    }

    // Motor Procedural Inteligente Local (Fallback Offline o Sin Clave)
    setTimeout(() => {
      let matched = PRESET_DESIGNS.find(
        (p) =>
          userText.toLowerCase().includes(p.name.toLowerCase()) ||
          userText.toLowerCase().includes(p.category.toLowerCase())
      );

      if (!matched) {
        matched = {
          id: `custom-${Date.now()}`,
          name: `Diseño: "${userText.slice(0, 30)}..."`,
          category: 'Creación Exclusiva GlamOS',
          prompt: userText,
          description: `Diseño a medida generado según la petición: "${userText}".`,
          difficulty: 'Intermedio',
          estimatedTime: '70 min',
          suggestedPrice: 35,
          palette: [
            { name: 'Color Primario', hex: '#800020' },
            { name: 'Acento Champaña', hex: '#D4AF37' },
            { name: 'Nude Base', hex: '#F5E6D3' },
          ],
          accentFeatures: ['Técnica Mixta', 'Acabado de Salón VIP', 'Capa Gloss Blindada'],
        };
      }

      setActiveDesign(matched);
      renderNailArtOnCanvas(capturedImage, matched, selectedSkinTone, selectedShape);

      const aiReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `¡Listo! He plasmado el diseño "${matched.name}" adaptándolo al tono ${SKIN_TONES.find((s) => s.id === selectedSkinTone)?.name} y forma ${NAIL_SHAPES.find((s) => s.id === selectedShape)?.name}. 
        
He ajustado la paleta con ${matched.palette.map((p) => p.name).join(', ')}. Puedes descargarlo en PNG de alta definición o enviárselo a tu clienta por WhatsApp.${
          !key
            ? '\n\n💡 *Tip VIP:* Puedes conectar tu clave gratuita de Google Gemini en el botón superior para analizar la foto real de la mano con visión multimodal 100% gratis.'
            : ''
        }`,
        timestamp: 'Ahora',
        designPreview: matched,
      };

      setMessages((prev) => [...prev, aiReply]);
      setIsGenerating(false);
    }, 800);
  };

  // Descargar Diseño en PNG de Alta Calidad con Marca de Agua GlamOS
  const handleDownloadPng = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    // Crear canvas de exportación con membrete editorial de salón
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1080;
    exportCanvas.height = 1350; // Proporción Instagram / Portafolio
    const eCtx = exportCanvas.getContext('2d');
    if (!eCtx) return;

    // Fondo oscuro de lujo
    eCtx.fillStyle = '#09090B';
    eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Dibujar render de la mano centrado
    eCtx.drawImage(canvas, 90, 160, 900, 900);

    // Cabecera Editorial
    eCtx.fillStyle = '#D4AF37';
    eCtx.font = 'bold 24px Cormorant Garamond, serif';
    eCtx.fillText('GLAMOS HAUTE SALON SUITE · VIRTUAL NAIL ART', 90, 80);

    eCtx.fillStyle = '#FFFFFF';
    eCtx.font = 'bold 36px Cormorant Garamond, serif';
    eCtx.fillText(activeDesign.name, 90, 125);

    // Pie de Ficha Técnica
    eCtx.fillStyle = '#141218';
    eCtx.roundRect(90, 1090, 900, 190, 24);
    eCtx.fill();
    eCtx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    eCtx.stroke();

    eCtx.fillStyle = '#E5C378';
    eCtx.font = 'bold 18px Plus Jakarta Sans, sans-serif';
    eCtx.fillText('FICHA TÉCNICA PARA MANICURISTA', 120, 1135);

    eCtx.fillStyle = '#FFFFFF';
    eCtx.font = '16px Plus Jakarta Sans, sans-serif';
    eCtx.fillText(`Forma: ${NAIL_SHAPES.find((s) => s.id === selectedShape)?.name} · Dificultad: ${activeDesign.difficulty} · Tiempo: ${activeDesign.estimatedTime}`, 120, 1175);
    eCtx.fillText(`Precio Sugerido en Salón: ${formatCurrency(activeDesign.suggestedPrice)}`, 120, 1210);

    // Paleta de colores en círculos
    activeDesign.palette.forEach((p, i) => {
      eCtx.fillStyle = p.hex;
      eCtx.beginPath();
      eCtx.arc(130 + i * 45, 1245, 12, 0, Math.PI * 2);
      eCtx.fill();
      eCtx.strokeStyle = '#FFFFFF';
      eCtx.lineWidth = 1;
      eCtx.stroke();
    });

    // Descarga en formato PNG
    const link = document.createElement('a');
    link.download = `GlamOS-NailArt-${activeDesign.name.replace(/\s+/g, '-')}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  // Enviar a la Clienta por WhatsApp
  const handleShareWhatsApp = () => {
    const text = `¡Hola! ✨ Te comparto la simulación exclusiva de tu diseño de uñas en GlamOS:

💅 *${activeDesign.name}*
✨ *Forma:* ${NAIL_SHAPES.find((s) => s.id === selectedShape)?.name}
🎨 *Estilo:* ${activeDesign.description}
⏱️ *Duración en salón:* ${activeDesign.estimatedTime}

¡Quedará espectacular en tus manos! Nos vemos en el salón. 💖`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 select-none">
      {/* ── HEADER DE PÁGINA ─────────────────────────────────────────────── */}
      <PageHeader
        title="Nail Art Studio IA"
        subtitle="Captura la mano de tu clienta, genera nail art hiperrealista adaptado a su tono de piel y exporta la ficha técnica en PNG."
        badge="Alta Manicura Virtual"
        badgeVariant="gold"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenGeminiModal}
              className={`text-xs font-bold border-amber-400/30 ${
                geminiApiKey ? 'bg-amber-400/10 text-amber-300' : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              <span>{geminiApiKey ? 'Google Gemini Activo' : 'Conectar Clave Google'}</span>
              <Badge variant={geminiApiKey ? 'gold' : 'outline'} dot className="ml-1.5 scale-90">
                {geminiApiKey ? '100% Gratis' : 'Offline'}
              </Badge>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPng}
              className="text-xs font-bold"
            >
              <Download className="w-4 h-4 mr-1.5 text-amber-400" />
              <span>Descargar PNG</span>
            </Button>
            <Button
              variant="glam"
              size="sm"
              onClick={() => navigate('/sales/new')}
              className="text-xs font-bold"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              <span>Cobrar en Salón</span>
            </Button>
          </div>
        }
      />

      {/* ── CUADRÍCULA PRINCIPAL: LIENZO DE MANO + ESTUDIO CHAT ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: VISUALIZADOR & CÁMARA (7 Columnas) */}
        <div className="lg:col-span-7 space-y-4">
          <Card variant="glass" className="overflow-hidden border-amber-400/20">
            <CardHeader className="pb-3 border-b border-white/[0.08] flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <CardTitle className="text-base">Lienzo Biométrico de la Mano</CardTitle>
              </div>

              {/* Selector de Modo de Entrada */}
              <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setCaptureMode('camera')}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    captureMode === 'camera'
                      ? 'bg-amber-400 text-neutral-950 shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cámara</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    captureMode === 'upload'
                      ? 'bg-amber-400 text-neutral-950 shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Galería</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCapturedImage(null);
                    setCaptureMode('preset');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    captureMode === 'preset'
                      ? 'bg-amber-400 text-neutral-950 shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Mano Virtual</span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Contenedor del Visor / Cámara */}
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-neutral-950 border border-white/10 shadow-2xl flex items-center justify-center group">
                {/* Vista en Vivo de Cámara WebRTC */}
                {captureMode === 'camera' && !capturedImage && (
                  <div className="relative w-full h-full">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Silueta Guía de la Mano */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-64 h-80 rounded-full border-2 border-dashed border-amber-400/50 animate-pulse flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-[11px] font-bold text-amber-300 bg-neutral-950/80 px-3 py-1 rounded-full border border-amber-400/30">
                          Coloca la mano aquí extendida
                        </span>
                      </div>
                    </div>

                    {/* Botón Disparador Flotante */}
                    <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-4 z-10">
                      <button
                        type="button"
                        onClick={() =>
                          setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                        }
                        className="p-3 rounded-full bg-neutral-900/80 text-white border border-white/20 hover:bg-neutral-800"
                        title="Cambiar Cámara"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleSnapPhoto}
                        className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] p-1 shadow-xl hover:scale-105 active:scale-95 transition-transform"
                      >
                        <div className="w-full h-full rounded-full border-2 border-neutral-950 flex items-center justify-center text-neutral-950">
                          <Camera className="w-6 h-6 stroke-[2.2]" />
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Canvas de Renderizado de la Mano con Nail Art */}
                <canvas
                  ref={previewCanvasRef}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    captureMode === 'camera' && !capturedImage ? 'hidden' : 'block'
                  }`}
                />

                {/* Si se tomó foto con cámara, botón para repetir */}
                {capturedImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedImage(null);
                      setCaptureMode('camera');
                    }}
                    className="absolute top-4 right-4 py-1.5 px-3 rounded-xl bg-neutral-950/80 border border-white/20 text-xs text-neutral-300 hover:text-white flex items-center gap-1.5 backdrop-blur-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Repetir Foto</span>
                  </button>
                )}

                {/* Overlay de Carga de IA */}
                {isGenerating && (
                  <div className="absolute inset-0 bg-neutral-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-20 animate-in fade-in">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center animate-spin">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="font-editorial text-lg text-white font-bold tracking-tight">
                      Esculpiendo Nail Art Hiperrealista...
                    </span>
                    <span className="text-xs text-neutral-400">
                      Adaptando tonos, reflejos y cutículas en tiempo real
                    </span>
                  </div>
                )}
              </div>

              {/* Input oculto para subir archivo de imagen */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* ── BARRA DE CALIBRACIÓN ANATÓMICA ─────────────────────────── */}
              <div className="space-y-3.5 pt-2">
                {/* Tono de Piel */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-300">Tono de Piel Detectado</span>
                    <span className="text-[11px] text-amber-400 font-semibold">
                      {SKIN_TONES.find((t) => t.id === selectedSkinTone)?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => setSelectedSkinTone(tone.id)}
                        className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl border text-xs transition-all shrink-0 ${
                          selectedSkinTone === tone.id
                            ? 'bg-amber-400/15 border-amber-400/60 text-white font-bold'
                            : 'bg-white/[0.02] border-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-lg border border-white/20 shrink-0"
                          style={{ backgroundColor: tone.hex }}
                        />
                        <span className="text-[11px]">{tone.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Forma de la Uña */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-300">Forma Esculpida de Uña</span>
                    <span className="text-[11px] text-amber-400 font-semibold">
                      {NAIL_SHAPES.find((s) => s.id === selectedShape)?.description}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {NAIL_SHAPES.map((shape) => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => setSelectedShape(shape.id)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          selectedShape === shape.id
                            ? 'bg-gradient-to-tr from-[#D4AF37] to-[#B88A22] text-neutral-950 font-bold border-amber-400 shadow-sm'
                            : 'bg-white/[0.02] border-white/10 text-neutral-300 hover:border-amber-400/30'
                        }`}
                      >
                        <span className="text-[11px] block truncate">{shape.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── FICHA TÉCNICA DEL DISEÑO ACTIVO ────────────────────────────── */}
          <Card variant="glass" className="border-amber-400/20 bg-gradient-to-br from-neutral-900/90 to-neutral-950">
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="gold">{activeDesign.category}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {activeDesign.difficulty}
                    </Badge>
                  </div>
                  <h3 className="font-editorial text-xl font-bold text-white mt-1">
                    {activeDesign.name}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">{activeDesign.description}</p>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                    Precio Sugerido
                  </span>
                  <span className="font-editorial text-2xl font-extrabold text-amber-300 block">
                    {formatCurrency(activeDesign.suggestedPrice)}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    ⏱️ {activeDesign.estimatedTime}
                  </span>
                </div>
              </div>

              {/* Paleta de Colorimetría Recomendada */}
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                  Paleta de Esmaltes & Pigmentos
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {activeDesign.palette.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs"
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-white/30 shrink-0 shadow-xs"
                        style={{ backgroundColor: p.hex }}
                      />
                      <span className="font-medium text-neutral-200">{p.name}</span>
                      <span className="text-[10px] font-mono text-neutral-500">{p.hex}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de Acción Inmediata */}
              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleDownloadPng}
                  className="flex-1 font-bold text-xs"
                >
                  <Download className="w-4 h-4 mr-1.5 text-amber-400" />
                  <span>Descargar PNG 4K</span>
                </Button>

                <Button
                  variant="outline"
                  size="default"
                  onClick={handleShareWhatsApp}
                  className="flex-1 font-bold text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/40"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  <span>Enviar por WhatsApp</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: CHAT CON LA IA & CATÁLOGO DE TENDENCIAS (5 Columnas) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          {/* ── CHAT CON EL ASISTENTE DE NAIL ART ──────────────────────────── */}
          <Card variant="glass" className="flex-1 flex flex-col h-[520px] border-amber-400/20">
            <CardHeader className="pb-3 border-b border-white/[0.08] flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 flex items-center justify-center font-bold text-xs">
                  AI
                </div>
                <div>
                  <CardTitle className="text-sm">GlamOS Nail Stylist AI</CardTitle>
                  <span className="text-[10px] text-amber-400 font-semibold block">En Línea · Listo para Crear</span>
                </div>
              </div>
              <Badge variant="gold" className="text-[10px]">
                Modo Multimodal
              </Badge>
            </CardHeader>

            {/* Feed de Conversación */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-amber-500/20 text-white border border-amber-400/30 rounded-tr-xs'
                        : 'bg-white/[0.04] text-neutral-200 border border-white/10 rounded-tl-xs space-y-2'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>

                    {m.designPreview && (
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-amber-300 font-bold truncate">
                          💅 {m.designPreview.name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {m.designPreview.difficulty}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-neutral-500 mt-1 px-1">{m.timestamp}</span>
                </div>
              ))}
            </div>

            {/* Input de Petición para la Estilista */}
            <div className="p-3 border-t border-white/[0.08] bg-neutral-950/40">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Describe un diseño, color o evento..."
                  disabled={isGenerating}
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <Button
                  type="submit"
                  variant="glam"
                  size="sm"
                  disabled={!inputPrompt.trim() || isGenerating}
                  className="shrink-0 h-10 px-3.5"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>

          {/* ── CATÁLOGO DE TENDENCIAS DE ALTA COSTURA (1-Click) ───────────── */}
          <Card variant="glass" className="border-white/10">
            <CardHeader className="pb-2.5 border-b border-white/[0.08]">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-interface">
                Tendencias Rápidas de Pasarela (1-Click)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5">
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                {PRESET_DESIGNS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => {
                      setActiveDesign(preset);
                      renderNailArtOnCanvas(capturedImage, preset, selectedSkinTone, selectedShape);
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      activeDesign.id === preset.id
                        ? 'bg-amber-400/15 border-amber-400/50'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-amber-400/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                        <span
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(135deg, ${preset.palette[0]?.hex || '#fff'}, ${
                              preset.palette[1]?.hex || '#000'
                            })`,
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-white block truncate group-hover:text-amber-200">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 block truncate">
                          {preset.category} · {preset.difficulty}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-editorial text-sm font-bold text-amber-300 block">
                        {formatCurrency(preset.suggestedPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── MODAL FLOTANTE DE CONFIGURACIÓN CLAVE GOOGLE GEMINI (100% GRATIS) ── */}
      {geminiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-neutral-900 border border-amber-400/30 p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setGeminiModalOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-editorial text-2xl font-bold text-white flex items-center gap-2">
                  Google AI Studio (Gemini 2.0)
                </h3>
                <p className="text-xs text-neutral-400">100% Gratis de por vida · Sin tarjeta de crédito</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-400/20 text-xs text-neutral-300 space-y-2">
              <p className="leading-relaxed">
                Google AI Studio te ofrece <strong>1,500 peticiones diarias totalmente gratuitas</strong> para analizar con visión artificial la foto de la mano de tu clienta y diseñar uñas adaptadas a su tono de piel y fisonomía en tiempo real.
              </p>
              <div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 underline font-semibold"
                >
                  <span>1. Clic aquí para generar tu clave en Google AI Studio (10 seg)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
                2. Pega tu Clave de API de Google (AIzaSy...)
              </label>
              <div className="relative">
                <input
                  type={showKeyText ? 'text' : 'password'}
                  value={tempKeyInput}
                  onChange={(e) => {
                    setTempKeyInput(e.target.value);
                    setKeyValidationStatus('idle');
                  }}
                  placeholder="AIzaSy..."
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white font-mono text-xs placeholder:text-neutral-600 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/40"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {keyValidationStatus === 'success' && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{keyValidationMsg}</span>
              </div>
            )}

            {keyValidationStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{keyValidationMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestModalKey}
                disabled={!tempKeyInput.trim() || keyValidationStatus === 'testing'}
                className="border-amber-400/30 text-amber-300 hover:bg-amber-400/10"
              >
                {keyValidationStatus === 'testing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Zap className="w-3.5 h-3.5 mr-1" />}
                {keyValidationStatus === 'testing' ? 'Verificando...' : 'Probar Clave'}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGeminiModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleSaveModalKey}
                  disabled={!tempKeyInput.trim()}
                >
                  Guardar y Activar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
