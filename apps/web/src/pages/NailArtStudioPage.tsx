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
  Layers,
  Palette,
  Eye,
  Sliders,
  SlidersHorizontal,
  Upload,
  MessageCircle,
  ZoomIn,
  Move,
  Maximize2,
  RotateCcw,
  Sparkle,
  ShieldCheck,
  Flame,
  Award,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../auth/auth-context';
import {
  getStoredGeminiApiKey,
  generateNailDesignWithGemini,
  GeminiNailAnalysis,
} from '../lib/gemini';

// ── DEFINICIONES DE TIPOS & TAXONOMÍA PROFESIONAL DE MANICURA ─────────────
export type SkinToneId = 'porcelain' | 'fair' | 'warm-tan' | 'golden-caramel' | 'deep-bronze';
export type NailShapeId = 'almond' | 'coffin' | 'square' | 'oval' | 'stiletto' | 'natural-short';
export type NailLengthId = 'short' | 'medium' | 'long' | 'xl';
export type ViewMode = 'hand' | 'macro';

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

export interface PresetDesign {
  id: string;
  themeKey: 'spiderman' | 'marble-gold' | 'glazed-donut' | 'velvet-cat-eye' | 'cyber-chrome' | 'baby-boomer-bride' | 'emerald-glam' | 'noir-abstract' | 'custom';
  name: string;
  category: string;
  prompt: string;
  description: string;
  difficulty: 'Fácil' | 'Intermedio' | 'Avanzado';
  estimatedTime: string;
  palette: Array<{ name: string; hex: string }>;
  accentFeatures: string[];
  stylistNotes: string;
  photoUrl?: string;
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

export const PRESET_DESIGNS: PresetDesign[] = [
  {
    id: 'spiderman-haute',
    themeKey: 'spiderman',
    name: 'Spiderman Arácnido Marvel VIP',
    category: 'Marvel & Pop Art',
    prompt: 'Diseño hiperrealista Spider-Man: base rojo rubí metálico profundo con telarañas geométricas negras finas trazadas a mano, uña anular acento con la icónica máscara de ojos Spider-Man blanco puro y relieve negro, y acabado gel UV 3D ultra glossy espejo.',
    description: 'La máxima tendencia geek-luxury: rojo rubí metalizado, micro-telarañas de precisión quirúrgica y ojos de Spider-Man plasmados con acabado de gel cristal en la uña de acento.',
    difficulty: 'Avanzado',
    estimatedTime: '80 min',
    palette: [
      { name: 'Rojo Rubí Spider', hex: '#B91C1C' },
      { name: 'Negro Telaraña', hex: '#0A0A0A' },
      { name: 'Blanco Lentes Máscara', hex: '#FFFFFF' },
      { name: 'Azul Noche Acento', hex: '#1E3A8A' },
    ],
    accentFeatures: [
      'Microtelarañas radiales con arcos curvos',
      'Lentes de máscara Spider-Man en uña anular',
      'Reflejo gel de alta costura 3D',
      'Rojo rubí metálico con destellos'
    ],
    stylistNotes: 'Aplica primero una base rojo rubí perlada curada en lámpara UV/LED. Traza la estructura de telaraña con pincel linner 000 y gel paint negro sin capa de dispersión. En el anular, esculpe los ojos angulados con blanco tiza y sella con top coat blindado 3D.',
    photoUrl: '/nails/spiderman.jpg',
  },
  {
    id: 'glazed-donut',
    themeKey: 'glazed-donut',
    name: 'Glazed Donut Hailey Bieber Cromo',
    category: 'Tendencia Pasarela',
    prompt: 'Base nude semitransparente con polvo de cromo perla reflectante, efecto glaseado líquido iridiscente y cutícula rusa impecable.',
    description: 'El fenómeno viral de alta costura: brillo aperlado iridiscente que refleja la luz con destellos prismáticos según el ángulo.',
    difficulty: 'Fácil',
    estimatedTime: '50 min',
    palette: [
      { name: 'Nude Perla', hex: '#F3E5D8' },
      { name: 'Polvo Cromo Nácar', hex: '#FFFFFF' },
      { name: 'Gloss Cristal', hex: '#E6EEF8' },
    ],
    accentFeatures: ['Polvo Cromo Frotado', 'Efecto Iridiscente', 'Nude Translúcido'],
    stylistNotes: 'Aplica una capa de nude lechoso semi-traslúcido, sella con top no-wipe 30 segundos y frota el pigmento de cromo perlado con aplicador de silicona.',
    photoUrl: '/nails/glazed-donut.jpg',
  },
  {
    id: 'velvet-cat-eye',
    themeKey: 'velvet-cat-eye',
    name: 'Velvet Cat Eye Vino Borgoña 3D',
    category: 'Gala & Fiesta',
    prompt: 'Gel magnético ojo de gato aterciopelado en vino tinto profundo con halo tridimensional de luz champaña y acabado terciopelo líquido.',
    description: 'Textura óptica de terciopelo líquido con pigmentos magnéticos multidimensionales que crean un halo de luz en movimiento.',
    difficulty: 'Intermedio',
    estimatedTime: '65 min',
    palette: [
      { name: 'Vino Borgoña', hex: '#4A0E17' },
      { name: 'Reflejo Velvet', hex: '#9B2242' },
      { name: 'Champaña Destello', hex: '#E5C378' },
    ],
    accentFeatures: ['Pigmento Magnético', 'Halo Terciopelo 3D', 'Vino Intenso'],
    stylistNotes: 'Aplica sobre base negra o vino intenso. Usa el imán cilíndrico desde los laterales para concentrar el haz de luz en diagonal aterciopelada.',
    photoUrl: '/nails/velvet-cat-eye.jpg',
  },
  {
    id: 'marble-gold',
    themeKey: 'marble-gold',
    name: 'Mármol Carrara & Pan de Oro 24K',
    category: 'Haute Couture',
    prompt: 'Efecto mármol blanco traslúcido con vetas cuarzo grises, detalles orgánicos de pan de oro de 24k en relieve y acabado ultra glossy espejo.',
    description: 'Elegancia arquitectónica con vetas de piedra natural y destellos metálicos preciosos.',
    difficulty: 'Intermedio',
    estimatedTime: '75 min',
    palette: [
      { name: 'Blanco Lechoso', hex: '#F8F9FA' },
      { name: 'Gris Cuarzo', hex: '#8E8E93' },
      { name: 'Oro Puro 24K', hex: '#D4AF37' },
      { name: 'Nude Base', hex: '#EED9C4' },
    ],
    accentFeatures: ['Foil de Oro 24K', 'Veteado Manual con Alcohol', 'Esmalte Gel Lechoso'],
    stylistNotes: 'Difumina las vetas de cuarzo con pincel mojado en alcohol isopropílico antes de curar. Coloca hojuelas de pan de oro con pinzas de precisión.',
    photoUrl: '/nails/marble-gold.jpg',
  },
  {
    id: 'cyber-chrome',
    themeKey: 'cyber-chrome',
    name: 'Cyber French Plata Líquida Espejo',
    category: 'Futurismo & Cromo',
    prompt: 'Base de negative space transparente con línea de sonrisa francesa en cromo plateado líquido reflectante y micro-gotas en relieve 3D.',
    description: 'Vanguardia cyberpunk con efecto espejo líquido plateado y relieves táctiles sobre base limpia de cristal.',
    difficulty: 'Intermedio',
    estimatedTime: '60 min',
    palette: [
      { name: 'Plata Espejo', hex: '#CBD5E1' },
      { name: 'Base Cristalina', hex: '#F1E5D8' },
      { name: 'Cromo Cromado', hex: '#94A3B8' },
    ],
    accentFeatures: ['Cromo Plata Líquida', 'Sonrisa Francesa Invertida', 'Base Vidrio Transparente'],
    stylistNotes: 'Dibuja la sonrisa francesa con gel painting blanco, cura y frota pigmento espejo de plata pura. Remata con gotas de builder gel transparente.',
    photoUrl: '/nails/cyber-chrome.jpg',
  },
  {
    id: 'baby-boomer-bride',
    themeKey: 'baby-boomer-bride',
    name: 'Novias VIP Baby Boomer & Swarovski',
    category: 'Novias & Eventos',
    prompt: 'Degradé perfecto ombré francés desde blanco nieve en la punta hacia nude rosado en la base, con microcristales Swarovski en la lúnula.',
    description: 'Transición etérea sin cortes entre el blanco y el nude rosado, rematado con cristalería fina sobre la cutícula.',
    difficulty: 'Avanzado',
    estimatedTime: '85 min',
    palette: [
      { name: 'Blanco Francés', hex: '#FFFFFF' },
      { name: 'Rosa Nude Suave', hex: '#FAD2E1' },
      { name: 'Cristal Aurora', hex: '#E0F2FE' },
    ],
    accentFeatures: ['Degradé Esponja Airbrush', 'Cristal Swarovski', 'Top Coat Blindado'],
    stylistNotes: 'Aplica degradado con aerógrafo o esponja de látex difuminada. Adhiere los cristales con gel de construcción de alta viscosidad.',
    photoUrl: '/nails/baby-boomer-bride.jpg',
  },
  {
    id: 'emerald-glam',
    themeKey: 'emerald-glam',
    name: 'Esmeralda Imperial & Polvo de Oro',
    category: 'Alta Joyería',
    prompt: 'Verde esmeralda profundo con destellos de micro-glitter champaña y filo dorado en relieve sobre cutícula rusa limpia.',
    description: 'Tonalidad regia inspirada en joyas imperiales con destellos dorados que enmarcan la uña.',
    difficulty: 'Intermedio',
    estimatedTime: '65 min',
    palette: [
      { name: 'Verde Esmeralda', hex: '#064E3B' },
      { name: 'Oro Micro-Glitter', hex: '#E5C378' },
      { name: 'Nude Olivo', hex: '#D1C2A5' },
    ],
    accentFeatures: ['Verde Joya Profundo', 'Polvo de Oro', 'Acabado Espejo'],
    stylistNotes: 'Aplica dos capas finas de verde esmeralda y espolvorea el micro-glitter dorado antes del segundo curado.',
    photoUrl: '/nails/emerald-glam.jpg',
  },
  {
    id: 'noir-abstract',
    themeKey: 'noir-abstract',
    name: 'Noir Vanguard & Negative Space',
    category: 'Vanguardia',
    prompt: 'Negro azabache profundo sobre base transparente de negative space con líneas geométricas curvas y detalles en cromo plateado líquido.',
    description: 'Diseño geométrico de pasarela con juego de transparencias negativas y trazos futuristas.',
    difficulty: 'Avanzado',
    estimatedTime: '90 min',
    palette: [
      { name: 'Negro Azabache', hex: '#121212' },
      { name: 'Plata Líquida', hex: '#CBD5E1' },
      { name: 'Negative Space', hex: '#F1E3D3' },
    ],
    accentFeatures: ['Espacio Negativo', 'Líneas Curvas Abstractas', 'Relieve Cromado'],
    stylistNotes: 'Usa cinta para nail art para definir los bordes nítidos del espacio negativo antes de aplicar el gel negro opaco.',
    photoUrl: '/nails/noir-abstract.jpg',
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

  // Modos de Entrada
  const [captureMode, setCaptureMode] = useState<'camera' | 'upload' | 'preset'>('preset');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Modos de Visualización
  const [viewMode, setViewMode] = useState<ViewMode>('hand');

  // Innovación: Acabados de Salón y Mapeo Dedo por Dedo
  const [selectedFinish, setSelectedFinish] = useState<'gloss' | 'matte' | 'chrome' | 'aurora'>('gloss');
  const [selectedFinger, setSelectedFinger] = useState<'ALL' | 'THUMB' | 'INDEX' | 'MIDDLE' | 'RING' | 'PINKY'>('ALL');

  // Personalización Anatómica
  const [selectedSkinTone, setSelectedSkinTone] = useState<SkinToneId>('warm-tan');
  const [selectedShape, setSelectedShape] = useState<NailShapeId>('almond');
  const [selectedLength, setSelectedLength] = useState<NailLengthId>('medium');

  // Calibración Interactiva de Uñas sobre Mano Real
  const [calibOffsetY, setCalibOffsetY] = useState<number>(0);
  const [calibOffsetX, setCalibOffsetX] = useState<number>(0);
  const [calibScale, setCalibScale] = useState<number>(1.0);
  const [calibSpread, setCalibSpread] = useState<number>(1.0);
  const [calibCurve, setCalibCurve] = useState<number>(0);
  const [showCalibrationPanel, setShowCalibrationPanel] = useState(false);

  // Estados del Chat y Generación
  const [activeDesign, setActiveDesign] = useState<PresetDesign>(PRESET_DESIGNS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');

  // Canvas y Video Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Historial de Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `¡Bienvenida al Nail Art Studio de GlamOS! ✨ He cargado el nuevo diseño estrella **"${PRESET_DESIGNS[0].name}"** con tono de piel "${SKIN_TONES.find((s) => s.id === selectedSkinTone)?.name}" y forma "${NAIL_SHAPES.find((s) => s.id === selectedShape)?.name}".

Puedes pedirme cualquier diseño en lenguaje natural (ej. "diseño de Spiderman", "uñas de mármol con pan de oro", "ojo de gato terciopelo"), capturar la mano real de tu clienta con la cámara o subir una foto para calibar y plasmar el diseño directamente sobre sus uñas reales.`,
      timestamp: 'Ahora',
      designPreview: PRESET_DESIGNS[0],
    },
  ]);

  // Manejo de Cámara WebRTC
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (captureMode === 'camera' && !capturedImage) {
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
  }, [captureMode, facingMode, capturedImage]);

  // Tomar Foto con la Cámara
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
      setCaptureMode('camera');
      setShowCalibrationPanel(true);
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
        setShowCalibrationPanel(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Restablecer parámetros de calibración
  const handleResetCalibration = () => {
    setCalibOffsetY(0);
    setCalibOffsetX(0);
    setCalibScale(1.0);
    setCalibSpread(1.0);
    setCalibCurve(0);
  };

  // ── MOTOR DE RENDERIZADO EN CANVAS (ESTUDIO GENERATIVO DE ALTA MANICURA) ──
  const renderNailArt = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 900;
    canvas.height = 900;

    const tone = SKIN_TONES.find((t) => t.id === selectedSkinTone) || SKIN_TONES[2];
    const shape = NAIL_SHAPES.find((s) => s.id === selectedShape) || NAIL_SHAPES[0];

    // Fondo elegante de estudio de manicura (mármol ahumado satinado)
    const bgGrad = ctx.createRadialGradient(450, 450, 100, 450, 450, 550);
    bgGrad.addColorStop(0, '#15141B');
    bgGrad.addColorStop(1, '#09080C');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (capturedImage) {
      // ── MODO CÁMARA CLIENTA: FOTO REAL CON UÑAS ESCULPIDAS CALIBRADAS ───────
      const img = new window.Image();
      img.onload = () => {
        ctx.save();
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const vignette = ctx.createRadialGradient(450, 450, 300, 450, 450, 550);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        drawCalibratedNailsOnRealHand(ctx, activeDesign, tone, shape);
      };
      img.src = capturedImage;
    } else if (selectedFinger !== 'ALL' || viewMode === 'macro') {
      // ── MODO ENFOQUE MACRO 4K POR DEDO (FACTIBILIDAD TÉCNICA HUMANA) ───────
      drawSingleNailMacroFocus(
        ctx,
        selectedFinger === 'ALL' ? 'RING' : selectedFinger,
        activeDesign,
        tone,
        shape,
        selectedLength,
        selectedFinish
      );
    } else {
      // ── MODO MANO ANATÓMICA COMPLETA DE ALTA MANICURA ──────────────────────
      drawAnatomicalHandWithNails(
        ctx,
        activeDesign,
        tone,
        shape,
        selectedLength,
        selectedFinish
      );
    }
  };

  // ── DIBUJA LA MANO ANATÓMICA CON LAS 5 UÑAS ESCULPIDAS VIVAS ─────────────
  const drawAnatomicalHandWithNails = (
    ctx: CanvasRenderingContext2D,
    design: PresetDesign,
    tone: SkinTone,
    shape: NailShape,
    length: NailLengthId,
    finish: 'gloss' | 'matte' | 'chrome' | 'aurora'
  ) => {
    ctx.save();

    // Sombra perimetral suave de la mano sobre el lienzo
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 25;

    // Palma anatómica con dispersión dérmica realista
    const skinGrad = ctx.createLinearGradient(450, 850, 450, 220);
    skinGrad.addColorStop(0, tone.hex);
    skinGrad.addColorStop(0.65, tone.hex);
    skinGrad.addColorStop(1, adjustBrightness(tone.hex, 14));
    ctx.fillStyle = skinGrad;

    ctx.beginPath();
    ctx.ellipse(450, 680, 215, 200, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dedos anatómicos estilizados
    const fingers = [
      { id: 'pinky', x: 260, y: 510, w: 48, h: 220, rot: -0.22, nailX: 236, nailY: 410, nailW: 28, nailH: 44, accent: false, idx: 0 },
      { id: 'ring', x: 352, y: 430, w: 52, h: 285, rot: -0.09, nailX: 340, nailY: 300, nailW: 33, nailH: 50, accent: true, idx: 1 }, // Uña acento Spider-Man
      { id: 'middle', x: 450, y: 400, w: 54, h: 305, rot: 0.00, nailX: 450, nailY: 260, nailW: 35, nailH: 52, accent: false, idx: 2 },
      { id: 'index', x: 548, y: 435, w: 52, h: 280, rot: 0.09, nailX: 560, nailY: 308, nailW: 33, nailH: 48, accent: false, idx: 3 },
      { id: 'thumb', x: 655, y: 565, w: 56, h: 195, rot: 0.35, nailX: 680, nailY: 480, nailW: 36, nailH: 48, accent: false, idx: 4 },
    ];

    fingers.forEach((f) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);

      ctx.beginPath();
      ctx.roundRect(-f.w / 2, -f.h / 2, f.w, f.h, [f.w / 2, f.w / 2, 22, 22]);
      ctx.fill();

      // Pliegues y nudillos
      ctx.strokeStyle = adjustBrightness(tone.hex, -18);
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(0, -f.h * 0.08, f.w * 0.28, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, f.h * 0.18, f.w * 0.3, 0, Math.PI);
      ctx.stroke();

      ctx.restore();
    });

    // Factor de longitud
    const lenMul = length === 'short' ? 0.88 : length === 'long' ? 1.28 : length === 'xl' ? 1.55 : 1.05;

    // Dibujar las 5 uñas esculpidas con el arte artesanal
    fingers.forEach((f) => {
      drawSculptedArtisanNail(
        ctx,
        f.nailX,
        f.nailY,
        f.nailW,
        f.nailH * lenMul,
        f.rot,
        design,
        tone,
        shape,
        finish,
        f.accent,
        f.idx
      );
    });

    ctx.restore();
  };

  // ── ENFOQUE MACRO 4K DE UN DEDO ESPECÍFICO (FACTIBILIDAD TÉCNICA) ─────────
  const drawSingleNailMacroFocus = (
    ctx: CanvasRenderingContext2D,
    fingerId: string,
    design: PresetDesign,
    tone: SkinTone,
    shape: NailShape,
    length: NailLengthId,
    finish: 'gloss' | 'matte' | 'chrome' | 'aurora'
  ) => {
    ctx.save();

    // Fondo macro con viñeta de estudio
    const bgGrad = ctx.createRadialGradient(450, 450, 80, 450, 450, 540);
    bgGrad.addColorStop(0, '#161420');
    bgGrad.addColorStop(1, '#09080C');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 900, 900);

    // Dedo en primer plano anatómico macro
    ctx.save();
    ctx.fillStyle = tone.hex;
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.beginPath();
    ctx.roundRect(330, 240, 240, 580, [120, 120, 40, 40]);
    ctx.fill();
    ctx.restore();

    const lenMul = length === 'short' ? 0.88 : length === 'long' ? 1.28 : length === 'xl' ? 1.55 : 1.05;
    const isAccent = fingerId === 'RING';
    const nailW = 150;
    const nailH = 220 * lenMul;

    drawSculptedArtisanNail(
      ctx,
      450,
      395,
      nailW,
      nailH,
      0,
      design,
      tone,
      shape,
      finish,
      isAccent,
      isAccent ? 1 : fingerId === 'THUMB' ? 4 : fingerId === 'INDEX' ? 3 : fingerId === 'MIDDLE' ? 2 : 0
    );

    // Distintivo de Factibilidad Humana y Técnica
    ctx.fillStyle = 'rgba(18, 17, 24, 0.9)';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(140, 35, 620, 56, 28);
    ctx.fill();
    ctx.stroke();

    const fingerNames: Record<string, string> = {
      THUMB: 'DEDO PULGAR · TELARAÑA ASIMÉTRICA DE SOPORTE',
      INDEX: 'DEDO ÍNDICE · ROJO RUBÍ PROFUNDO METÁLICO',
      MIDDLE: 'DEDO MEDIO · TELARAÑA CONCÉNTRICA RADIAL',
      RING: 'UÑA ANULAR · ACENTO MASTER MÁSCARA SPIDER-MAN 3D',
      PINKY: 'DEDO MEÑIQUE · EQUILIBRIO CROMÁTICO Y GLOSS',
    };

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DISEÑO GENIAL & 100% FACTIBLE PARA ESTILISTA HUMANA', 450, 58);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px Plus Jakarta Sans, sans-serif';
    ctx.fillText(fingerNames[fingerId] || 'ENFOQUE DETALLADO DE ALTA MANICURA', 450, 78);

    ctx.restore();
  };

  // Dibuja las uñas sobre la mano real con los controles de calibración interactiva
  const drawCalibratedNailsOnRealHand = (
    ctx: CanvasRenderingContext2D,
    design: PresetDesign,
    tone: SkinTone,
    shape: NailShape
  ) => {
    ctx.save();

    // Posiciones base de las 5 uñas
    const basePositions = [
      { id: 'pinky', label: 'Meñique', x: 262, y: 405, w: 28, h: 44, rot: -0.22, accent: false },
      { id: 'ring', label: 'Anular', x: 350, y: 295, w: 32, h: 50, rot: -0.09, accent: true }, // Uña acento Spider-Man / Joya
      { id: 'middle', label: 'Medio', x: 450, y: 255, w: 34, h: 52, rot: 0.00, accent: false },
      { id: 'index', label: 'Índice', x: 550, y: 302, w: 32, h: 49, rot: 0.09, accent: false },
      { id: 'thumb', label: 'Pulgar', x: 672, y: 485, w: 36, h: 48, rot: 0.35, accent: false },
    ];

    // Aplicar transformaciones de calibración interactiva
    const centerX = 450;
    const centerY = 450;
    const lenMul = selectedLength === 'short' ? 0.88 : selectedLength === 'long' ? 1.28 : selectedLength === 'xl' ? 1.55 : 1.05;

    basePositions.forEach((np, idx) => {
      // Cálculo de desplazamiento y apertura
      const relX = np.x - centerX;
      const spreadX = relX * calibSpread;
      const finalX = centerX + spreadX + calibOffsetX;
      const finalY = np.y + calibOffsetY + (Math.abs(relX) / 100) * calibCurve;

      const finalW = np.w * calibScale;
      const finalH = np.h * calibScale * lenMul;

      drawSculptedArtisanNail(
        ctx,
        finalX,
        finalY,
        finalW,
        finalH,
        np.rot,
        design,
        tone,
        shape,
        selectedFinish,
        np.accent,
        idx
      );
    });

    ctx.restore();
  };

  // ── ESCULPIDO INDIVIDUAL DE UNA UÑA CON DISEÑO DETALLADO Y FACTIBLE ───────
  const drawSculptedArtisanNail = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    rot: number,
    design: PresetDesign,
    tone: SkinTone,
    shape: NailShape,
    finish: 'gloss' | 'matte' | 'chrome' | 'aurora',
    isAccent: boolean,
    nailIndex: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // Sombra de inserción en el surco periungueal
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = Math.max(8, w * 0.15);
    ctx.shadowOffsetY = 4;

    // ── SILUETA ANATÓMICA ESCULPIDA SEGÚN LA FORMA ELEGIDA ─────────────────
    ctx.beginPath();
    if (shape.id === 'almond') {
      ctx.moveTo(-w / 2, h / 2);
      ctx.bezierCurveTo(-w / 2, -h * 0.25, -w * 0.22, -h / 2, 0, -h / 2);
      ctx.bezierCurveTo(w * 0.22, -h / 2, w / 2, -h * 0.25, w / 2, h / 2);
      ctx.quadraticCurveTo(0, h / 2 + 5, -w / 2, h / 2);
    } else if (shape.id === 'coffin') {
      ctx.moveTo(-w / 2, h / 2);
      ctx.lineTo(-w * 0.32, -h / 2);
      ctx.lineTo(w * 0.32, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.quadraticCurveTo(0, h / 2 + 5, -w / 2, h / 2);
    } else if (shape.id === 'stiletto') {
      ctx.moveTo(-w / 2, h / 2);
      ctx.lineTo(0, -h / 2 - 8);
      ctx.lineTo(w / 2, h / 2);
      ctx.quadraticCurveTo(0, h / 2 + 5, -w / 2, h / 2);
    } else if (shape.id === 'oval') {
      ctx.moveTo(-w / 2, h / 2);
      ctx.bezierCurveTo(-w / 2, -h * 0.35, -w * 0.38, -h / 2, 0, -h / 2);
      ctx.bezierCurveTo(w * 0.38, -h / 2, w / 2, -h * 0.35, w / 2, h / 2);
      ctx.quadraticCurveTo(0, h / 2 + 5, -w / 2, h / 2);
    } else {
      // Cuadrada o Natural Corta
      ctx.roundRect(-w / 2, -h / 2, w, h, [6, 6, 12, 12]);
    }
    ctx.closePath();
    ctx.clip();

    // ── 1. COLORIMETRÍA BASE CON PROFUNDIDAD POLIMÉRICA 3D ──────────────────
    const baseColor = design.palette[0]?.hex || '#B91C1C';

    // Gradiente cilíndrico lateral para dar volumen y ápice
    const nailGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    nailGrad.addColorStop(0, adjustBrightness(baseColor, -25));
    nailGrad.addColorStop(0.35, baseColor);
    nailGrad.addColorStop(0.5, adjustBrightness(baseColor, 15));
    nailGrad.addColorStop(0.75, baseColor);
    nailGrad.addColorStop(1, adjustBrightness(baseColor, -25));
    ctx.fillStyle = nailGrad;
    ctx.fillRect(-w, -h * 1.5, w * 2, h * 3);

    // ── 2. ARTE DE PRECISIÓN DE LA ESTILISTA HUMANA ─────────────────────────
    if (design.themeKey === 'spiderman') {
      // Fondo rojo rubí profundo con destellos de glitter
      const rubyGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, h);
      rubyGrad.addColorStop(0, '#DC2626');
      rubyGrad.addColorStop(0.65, '#B91C1C');
      rubyGrad.addColorStop(1, '#5C0D0D');
      ctx.fillStyle = rubyGrad;
      ctx.fillRect(-w, -h, w * 2, h * 2);

      if (isAccent) {
        // ── UÑA ANULAR: MÁSCARA ICONICA SPIDER-MAN EN RELIEVE 3D ───────────
        // Telaraña en abanico
        ctx.strokeStyle = 'rgba(10, 10, 10, 0.45)';
        ctx.lineWidth = Math.max(1, w * 0.035);
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(0, h * 0.4);
          ctx.lineTo(i * (w * 0.25), -h * 0.5);
          ctx.stroke();
        }

        // Ojos de la máscara Spider-Man esculpidos
        ctx.save();
        const eyeW = w * 0.38;
        const eyeH = h * 0.32;
        const eyeY = -h * 0.05;

        // Ojo Izquierdo
        drawSpiderManEye(ctx, -w * 0.22, eyeY, eyeW, eyeH, -0.22);
        // Ojo Derecho
        drawSpiderManEye(ctx, w * 0.22, eyeY, eyeW, eyeH, 0.22);
        ctx.restore();
      } else {
        // ── UÑAS DE SOPORTE: MICRO-TELARAÑA DE PRECISIÓN CON PINCEL LINNER ──
        const originX = nailIndex % 2 === 0 ? -w * 0.35 : w * 0.35;
        const originY = h * 0.35;

        ctx.strokeStyle = '#0A0A0A';
        ctx.lineWidth = Math.max(1.2, w * 0.038);
        ctx.lineCap = 'round';

        // Rayos radiales
        const rayAngles = [-1.4, -1.0, -0.6, -0.2, 0.2, 0.6, 1.0, 1.4];
        const rayLength = h * 1.3;

        rayAngles.forEach((ang) => {
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(originX + Math.sin(ang) * rayLength, originY - Math.cos(ang) * rayLength);
          ctx.stroke();
        });

        // Arcos concéntricos de telaraña trazados a mano
        const webRadii = [h * 0.18, h * 0.38, h * 0.6, h * 0.85];
        webRadii.forEach((r) => {
          ctx.beginPath();
          for (let i = 0; i < rayAngles.length - 1; i++) {
            const a1 = rayAngles[i];
            const a2 = rayAngles[i + 1];
            const x1 = originX + Math.sin(a1) * r;
            const y1 = originY - Math.cos(a1) * r;
            const x2 = originX + Math.sin(a2) * r;
            const y2 = originY - Math.cos(a2) * r;

            const midA = (a1 + a2) / 2;
            const curveSag = r * 0.88;
            const cx = originX + Math.sin(midA) * curveSag;
            const cy = originY - Math.cos(midA) * curveSag;

            if (i === 0) ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(cx, cy, x2, y2);
          }
          ctx.stroke();
        });
      }
    } else if (design.themeKey === 'glazed-donut') {
      // Brillo cromo nacarado iridiscente Hailey Bieber
      const chromeGrad = ctx.createLinearGradient(-w, -h, w, h);
      chromeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      chromeGrad.addColorStop(0.3, 'rgba(235, 245, 255, 0.35)');
      chromeGrad.addColorStop(0.6, 'rgba(255, 230, 245, 0.5)');
      chromeGrad.addColorStop(1, 'rgba(240, 255, 250, 0.65)');
      ctx.fillStyle = chromeGrad;
      ctx.fillRect(-w, -h * 1.5, w * 2, h * 3);
    } else if (design.themeKey === 'velvet-cat-eye') {
      // Reflejo magnético terciopelo 3D en diagonal
      const catEyeGrad = ctx.createLinearGradient(-w * 0.6, -h * 0.6, w * 0.6, h * 0.6);
      catEyeGrad.addColorStop(0, 'rgba(74, 14, 23, 0.95)');
      catEyeGrad.addColorStop(0.46, 'rgba(229, 195, 120, 0.85)');
      catEyeGrad.addColorStop(0.52, 'rgba(255, 255, 255, 0.95)');
      catEyeGrad.addColorStop(0.58, 'rgba(155, 34, 66, 0.9)');
      catEyeGrad.addColorStop(1, 'rgba(74, 14, 23, 0.95)');
      ctx.fillStyle = catEyeGrad;
      ctx.fillRect(-w, -h * 1.5, w * 2, h * 3);
    } else if (design.themeKey === 'marble-gold') {
      // Mármol de Carrara con vetas orgánicas y pan de oro
      ctx.strokeStyle = 'rgba(130, 130, 140, 0.45)';
      ctx.lineWidth = Math.max(1.5, w * 0.045);
      ctx.beginPath();
      ctx.moveTo(-w * 0.4, h * 0.35);
      ctx.bezierCurveTo(0, 0, -w * 0.2, -h * 0.2, w * 0.35, -h * 0.42);
      ctx.stroke();

      // Hojuelas de Pan de Oro 24K en relieve
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(-w * 0.12, -h * 0.1, w * 0.1, 0, Math.PI * 2);
      ctx.arc(w * 0.22, h * 0.18, w * 0.08, 0, Math.PI * 2);
      ctx.arc(-w * 0.25, h * 0.28, w * 0.06, 0, Math.PI * 2);
      ctx.fill();
    } else if (design.themeKey === 'cyber-chrome') {
      // Francés invertido plata líquida
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.4, w * 0.48, h * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (design.themeKey === 'baby-boomer-bride') {
      // Cristal Swarovski en el dedo anular
      if (isAccent) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, h * 0.35, Math.max(3, w * 0.1), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#D4AF37';
        ctx.beginPath();
        ctx.arc(0, h * 0.35, Math.max(1.2, w * 0.04), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (design.themeKey === 'emerald-glam') {
      // Destellos dorados en el borde libre
      ctx.fillStyle = '#E5C378';
      ctx.beginPath();
      ctx.arc(w * 0.2, -h * 0.3, w * 0.07, 0, Math.PI * 2);
      ctx.arc(-w * 0.15, -h * 0.25, w * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 3. ACABADO DEL TOP COAT PERSONALIZABLE ──────────────────────────────
    if (finish === 'gloss') {
      // Brillo curvo de anillo LED de salón sobre el ápice
      const glossGrad = ctx.createLinearGradient(-w * 0.4, 0, w * 0.4, 0);
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      glossGrad.addColorStop(0.38, 'rgba(255, 255, 255, 0.45)');
      glossGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
      glossGrad.addColorStop(0.75, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glossGrad;
      ctx.fillRect(-w * 0.3, -h * 1.5, w * 0.5, h * 3);
    } else if (finish === 'chrome') {
      // Reflejo espejo metálico
      const mirrorGrad = ctx.createLinearGradient(-w, -h, w, h);
      mirrorGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      mirrorGrad.addColorStop(0.5, 'rgba(200, 220, 240, 0.2)');
      mirrorGrad.addColorStop(1, 'rgba(255, 255, 255, 0.6)');
      ctx.fillStyle = mirrorGrad;
      ctx.fillRect(-w, -h * 1.5, w * 2, h * 3);
    } else if (finish === 'aurora') {
      // Destello iridiscente prismático
      const auroraGrad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      auroraGrad.addColorStop(0, 'rgba(255, 180, 220, 0.3)');
      auroraGrad.addColorStop(0.5, 'rgba(180, 240, 255, 0.35)');
      auroraGrad.addColorStop(1, 'rgba(255, 240, 180, 0.3)');
      ctx.fillStyle = auroraGrad;
      ctx.fillRect(-w, -h * 1.5, w * 2, h * 3);
    }
    // En 'matte' no se dibuja brillo especular para mantener textura aterciopelada

    // ── 4. LÚNULA & CUTÍCULA ANATÓMICA ──────────────────────────────────────
    ctx.strokeStyle = adjustBrightness(tone.hex, -35);
    ctx.lineWidth = Math.max(1.5, w * 0.04);
    ctx.beginPath();
    ctx.arc(0, h / 2, w * 0.45, 0, Math.PI);
    ctx.stroke();

    ctx.restore();
  };

  // Helper para dibujar los ojos angulados de Spider-Man
  function drawSpiderManEye(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Silueta del ojo triangular-angulada
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.quadraticCurveTo(w * 0.6, -h * 0.1, w * 0.4, h / 2);
    ctx.quadraticCurveTo(-w * 0.2, h * 0.35, -w * 0.5, -h * 0.1);
    ctx.closePath();

    // Relleno blanco con ligero destello plateado
    const eyeGrad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    eyeGrad.addColorStop(0, '#FFFFFF');
    eyeGrad.addColorStop(0.7, '#F8FAFC');
    eyeGrad.addColorStop(1, '#E2E8F0');
    ctx.fillStyle = eyeGrad;
    ctx.fill();

    // Borde negro grueso estilizado
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = Math.max(2, w * 0.2);
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.restore();
  }

  // Helper para ajustar brillo de colores hex
  function adjustBrightness(col: string, percent: number) {
    let clean = col.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const num = parseInt(clean, 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
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

  // Renderizar al cambiar estados
  useEffect(() => {
    renderNailArt();
  }, [
    capturedImage,
    activeDesign,
    selectedSkinTone,
    selectedShape,
    selectedLength,
    viewMode,
    calibOffsetY,
    calibOffsetX,
    calibScale,
    calibSpread,
    calibCurve,
  ]);

  // ── ENVIAR MENSAJE AL ASISTENTE DE IA ────────────────────────────────────
  const handleSendMessage = async () => {
    if (!inputPrompt.trim() || isGenerating) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: 'Ahora',
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsGenerating(true);

    const lower = userText.toLowerCase();

    // 1. Reconocimiento rápido para la temática Spider-Man
    if (
      lower.includes('spider') ||
      lower.includes('aracn') ||
      lower.includes('arácn') ||
      lower.includes('hombre araña') ||
      lower.includes('marvel')
    ) {
      const spideyDesign = PRESET_DESIGNS[0];
      setActiveDesign(spideyDesign);

      setTimeout(() => {
        const aiReply: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `🕷️ **¡Activando ${spideyDesign.name}!**
          
He plasmado el diseño de Spider-Man con base rojo rubí metálico profundo, telarañas geométricas trazadas a mano y la icónica máscara arácnida en relieve sobre la uña de acento (anular).
          
💅 **Técnica en mesa:** ${spideyDesign.stylistNotes}
⏱️ **Tiempo de aplicación:** ${spideyDesign.estimatedTime} · **Dificultad:** ${spideyDesign.difficulty}
🎨 **Paleta de esmaltes:** ${spideyDesign.palette.map((p) => p.name).join(', ')}`,
          timestamp: 'Ahora',
          designPreview: spideyDesign,
        };

        setMessages((prev) => [...prev, aiReply]);
        setIsGenerating(false);
      }, 500);
      return;
    }

    // 2. Consulta con Google Gemini (usando la clave maestra global sin pedir key al usuario)
    try {
      const geminiResult = await generateNailDesignWithGemini(userText, capturedImage);

      // Mapear tono de piel sugerido
      if (geminiResult.detectedSkinTone) {
        const skLower = geminiResult.detectedSkinTone.toLowerCase();
        if (skLower.includes('porcelan') || skLower.includes('rosad')) setSelectedSkinTone('porcelain');
        else if (skLower.includes('claro') || skLower.includes('neutr')) setSelectedSkinTone('fair');
        else if (skLower.includes('cálid') || skLower.includes('dorad')) setSelectedSkinTone('warm-tan');
        else if (skLower.includes('canela') || skLower.includes('caramel')) setSelectedSkinTone('golden-caramel');
        else if (skLower.includes('moren') || skLower.includes('éban') || skLower.includes('profund')) setSelectedSkinTone('deep-bronze');
      }

      // Mapear silueta de uña sugerida
      if (geminiResult.recommendedShape) {
        const shLower = geminiResult.recommendedShape.toLowerCase();
        if (shLower.includes('almen')) setSelectedShape('almond');
        else if (shLower.includes('coffin') || shLower.includes('bailar')) setSelectedShape('coffin');
        else if (shLower.includes('cuadr')) setSelectedShape('square');
        else if (shLower.includes('oval')) setSelectedShape('oval');
        else if (shLower.includes('stiletto') || shLower.includes('afil')) setSelectedShape('stiletto');
        else if (shLower.includes('cort') || shLower.includes('natur')) setSelectedShape('natural-short');
      }

      const customDesign: PresetDesign = {
        id: `gemini-${Date.now()}`,
        themeKey: 'custom',
        name: geminiResult.designName || `Creación de Alta Costura`,
        category: 'GlamOS Stylist AI',
        prompt: userText,
        description: geminiResult.description || `Diseño exclusivo analizado para la anatomía y tono de piel del cliente.`,
        difficulty: geminiResult.difficulty || 'Intermedio',
        estimatedTime: geminiResult.estimatedTime || '65 min',
        palette:
          geminiResult.palette && geminiResult.palette.length > 0
            ? geminiResult.palette
            : [
                { name: 'Color Primario', hex: '#D4AF37' },
                { name: 'Base Nude', hex: '#EED9C4' },
                { name: 'Acento Gloss', hex: '#FFFFFF' },
              ],
        accentFeatures: [geminiResult.technique, geminiResult.stylistAdvice].filter(Boolean),
        stylistNotes: geminiResult.stylistAdvice || 'Aplica base de adherencia y cura en lámpara UV/LED.',
      };

      setActiveDesign(customDesign);

      const aiReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `✨ **${customDesign.name}**
*(Diseño generado y adaptado en tiempo real)*

${geminiResult.description}

💅 **Técnica recomendada:** ${geminiResult.technique}
🎯 **Consejo para la manicurista:** ${geminiResult.stylistAdvice}
⏱️ **Tiempo estimado:** ${geminiResult.estimatedTime} · **Dificultad:** ${geminiResult.difficulty}
🎨 **Paleta de esmaltes:** ${customDesign.palette.map((p) => p.name).join(', ')}`,
        timestamp: 'Ahora',
        designPreview: customDesign,
      };

      setMessages((prev) => [...prev, aiReply]);
      setIsGenerating(false);
      return;
    } catch (geminiError: any) {
      console.warn('Fallback a catálogo inteligente:', geminiError);
    }

    // 3. Fallback inteligente a catálogo predeterminado
    setTimeout(() => {
      let matched = PRESET_DESIGNS.find(
        (p) =>
          userText.toLowerCase().includes(p.name.toLowerCase()) ||
          userText.toLowerCase().includes(p.category.toLowerCase())
      );

      if (!matched) {
        matched = {
          id: `custom-${Date.now()}`,
          themeKey: 'custom',
          name: `Diseño: "${userText.slice(0, 32)}..."`,
          category: 'Creación Exclusiva GlamOS',
          prompt: userText,
          description: `Diseño a medida adaptado para la clienta según su petición: "${userText}".`,
          difficulty: 'Intermedio',
          estimatedTime: '70 min',
          palette: [
            { name: 'Color Primario', hex: '#800020' },
            { name: 'Acento Champaña', hex: '#D4AF37' },
            { name: 'Nude Base', hex: '#F5E6D3' },
          ],
          accentFeatures: ['Técnica Mixta', 'Acabado de Salón VIP', 'Capa Gloss Blindada'],
          stylistNotes: 'Aplica técnica de esmaltado semipermanente con doble capa y sellado de bordes libres.',
        };
      }

      setActiveDesign(matched);

      const aiReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `¡Listo! He plasmado el diseño **"${matched.name}"** adaptándolo al tono ${SKIN_TONES.find((s) => s.id === selectedSkinTone)?.name} y silueta ${NAIL_SHAPES.find((s) => s.id === selectedShape)?.name}. 
        
He ajustado la paleta con ${matched.palette.map((p) => p.name).join(', ')}. Puedes descargarlo en PNG de alta definición o enviarlo a tu clienta por WhatsApp.`,
        timestamp: 'Ahora',
        designPreview: matched,
      };

      setMessages((prev) => [...prev, aiReply]);
      setIsGenerating(false);
    }, 500);
  };

  // ── DESCARGAR DISEÑO EN PNG DE ALTA CALIDAD (SIN VALORES DE COSTO) ────────
  const handleDownloadPng = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1080;
    exportCanvas.height = 1350; // Proporción editorial de Instagram / Portafolio
    const eCtx = exportCanvas.getContext('2d');
    if (!eCtx) return;

    // Fondo oscuro de lujo
    eCtx.fillStyle = '#09080C';
    eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Cabecera Editorial
    eCtx.fillStyle = '#D4AF37';
    eCtx.font = 'bold 22px Cormorant Garamond, serif';
    eCtx.fillText('GLAMOS HAUTE SALON SUITE · VIRTUAL NAIL ART', 90, 75);

    eCtx.fillStyle = '#FFFFFF';
    eCtx.font = 'bold 38px Cormorant Garamond, serif';
    eCtx.fillText(activeDesign.name, 90, 125);

    // Dibujar render central
    eCtx.drawImage(canvas, 90, 160, 900, 900);

    // Pie de Ficha Técnica Profesional (SIN PRECIOS NI COSTOS)
    eCtx.fillStyle = '#141218';
    eCtx.roundRect(90, 1085, 900, 195, 24);
    eCtx.fill();
    eCtx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    eCtx.lineWidth = 1.5;
    eCtx.stroke();

    eCtx.fillStyle = '#E5C378';
    eCtx.font = 'bold 18px Plus Jakarta Sans, sans-serif';
    eCtx.fillText('FICHA TÉCNICA DE MANICURA PROFESIONAL', 120, 1125);

    eCtx.fillStyle = '#FFFFFF';
    eCtx.font = '15px Plus Jakarta Sans, sans-serif';
    eCtx.fillText(
      `Silueta: ${NAIL_SHAPES.find((s) => s.id === selectedShape)?.name} · Dificultad: ${activeDesign.difficulty} · Duración: ${activeDesign.estimatedTime}`,
      120,
      1165
    );

    eCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    eCtx.font = '13px Plus Jakarta Sans, sans-serif';
    const cleanNotes = activeDesign.stylistNotes.length > 95 ? activeDesign.stylistNotes.slice(0, 95) + '...' : activeDesign.stylistNotes;
    eCtx.fillText(`Técnica en Mesa: ${cleanNotes}`, 120, 1200);

    // Muestras de la Paleta de Colorimetría
    activeDesign.palette.forEach((p, i) => {
      eCtx.fillStyle = p.hex;
      eCtx.beginPath();
      eCtx.arc(135 + i * 55, 1245, 14, 0, Math.PI * 2);
      eCtx.fill();
      eCtx.strokeStyle = '#FFFFFF';
      eCtx.lineWidth = 1.5;
      eCtx.stroke();
    });

    const link = document.createElement('a');
    link.download = `GlamOS-NailArt-${activeDesign.name.replace(/\s+/g, '-')}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  // Enviar a la Clienta por WhatsApp
  const handleShareWhatsApp = () => {
    const text = `¡Hola! ✨ Te comparto la simulación exclusiva de tu diseño de uñas en GlamOS:

💅 *${activeDesign.name}*
✨ *Forma Esculpida:* ${NAIL_SHAPES.find((s) => s.id === selectedShape)?.name}
🎨 *Estilo:* ${activeDesign.description}
⏱️ *Duración en mesa:* ${activeDesign.estimatedTime}
🎨 *Paleta:* ${activeDesign.palette.map((p) => p.name).join(', ')}

¡Quedará espectacular en tus manos! Nos vemos en el salón. 💖`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 select-none">
      {/* ── HEADER DE PÁGINA ─────────────────────────────────────────────── */}
      <PageHeader
        title="Nail Art Studio IA"
        subtitle="Captura la mano real de tu clienta, calibra y plasma diseños hiperrealistas adaptados a su tono de piel."
        badge="Alta Manicura Virtual"
        badgeVariant="gold"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode((prev) => (prev === 'hand' ? 'macro' : 'hand'))}
              className={`text-xs font-bold ${
                viewMode === 'macro' ? 'bg-amber-400/20 text-amber-300 border-amber-400/50' : ''
              }`}
            >
              <ZoomIn className="w-4 h-4 mr-1.5 text-amber-400" />
              <span>{viewMode === 'macro' ? 'Ver Mano Completa' : 'Zoom Macro 5 Uñas'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPng}
              className="text-xs font-bold"
            >
              <Download className="w-4 h-4 mr-1.5 text-amber-400" />
              <span>Descargar PNG 4K</span>
            </Button>
            <Button
              variant="glam"
              size="sm"
              onClick={handleShareWhatsApp}
              className="text-xs font-bold"
            >
              <MessageCircle className="w-4 h-4 mr-1.5" />
              <span>Compartir WhatsApp</span>
            </Button>
          </div>
        }
      />

      {/* ── CUADRÍCULA PRINCIPAL: LIENZO DE MANO + ESTUDIO CHAT ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: VISUALIZADOR & CÁMARA (7 Columnas) */}
        <div className="lg:col-span-7 space-y-4">
          <Card variant="glass" className="overflow-hidden border-amber-400/20">
            <CardHeader className="pb-3 border-b border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <CardTitle className="text-base">
                  {viewMode === 'macro' ? 'Lienzo Macro: Primer Plano de Uñas' : 'Lienzo Biométrico de la Mano'}
                </CardTitle>
              </div>

              {/* Selector de Modo de Entrada */}
              <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCapturedImage(null);
                    setCaptureMode('camera');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    captureMode === 'camera' && !capturedImage
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
                  <span>Subir Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCapturedImage(null);
                    setCaptureMode('preset');
                    setShowCalibrationPanel(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    captureMode === 'preset'
                      ? 'bg-amber-400 text-neutral-950 shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Mano Modelo</span>
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

                    {/* Guía Silueta de la Mano */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-64 h-84 rounded-full border-2 border-dashed border-amber-400/60 animate-pulse flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-[11px] font-bold text-amber-300 bg-neutral-950/85 px-3 py-1.5 rounded-full border border-amber-400/40">
                          Alinea los dedos aquí extendidos
                        </span>
                      </div>
                    </div>

                    {/* Controles de Disparo */}
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

                {/* Badge de Fotografía de Estudio Real */}
                {!capturedImage && activeDesign.photoUrl && (
                  <div className="absolute top-4 left-4 py-1 px-3 rounded-full bg-neutral-950/85 border border-amber-400/50 text-[11px] font-bold text-amber-300 flex items-center gap-1.5 backdrop-blur-md shadow-md animate-in fade-in">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fotografía 4K de Estudio Haute Couture</span>
                  </div>
                )}

                {/* Si se tomó foto con cámara, botón para repetir */}
                {capturedImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedImage(null);
                      setCaptureMode('camera');
                      setShowCalibrationPanel(false);
                    }}
                    className="absolute top-4 right-4 py-1.5 px-3 rounded-xl bg-neutral-950/80 border border-white/20 text-xs text-neutral-300 hover:text-white flex items-center gap-1.5 backdrop-blur-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Repetir Foto</span>
                  </button>
                )}

                {/* Botón para alternar Calibrador Anatómico */}
                {capturedImage && (
                  <button
                    type="button"
                    onClick={() => setShowCalibrationPanel(!showCalibrationPanel)}
                    className={`absolute bottom-4 left-4 py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all ${
                      showCalibrationPanel
                        ? 'bg-amber-400 text-neutral-950 border-amber-400 shadow-md'
                        : 'bg-neutral-950/80 text-amber-300 border-amber-400/40 hover:bg-neutral-900'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{showCalibrationPanel ? 'Ocultar Calibrador' : 'Ajustar a las Uñas'}</span>
                  </button>
                )}

                {/* Overlay de Carga de IA */}
                {isGenerating && (
                  <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-20 animate-in fade-in">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center animate-spin">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="font-editorial text-lg text-white font-bold tracking-tight">
                      Esculpiendo Nail Art Hiperrealista...
                    </span>
                    <span className="text-xs text-neutral-400">
                      Adaptando trazos, reflejos y cutículas en tiempo real
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

              {/* ── PANEL DE CALIBRACIÓN ANATÓMICA SOBRE MANO REAL ─────────── */}
              {capturedImage && showCalibrationPanel && (
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-400/30 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-400/20">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-200">
                        Calibración Anatómica sobre la Mano de la Clienta
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetCalibration}
                      className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 underline"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restablecer</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Offset Vertical Y */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-neutral-300">
                        <span>Posición Vertical (Cutícula)</span>
                        <span className="font-mono text-amber-400">{calibOffsetY}px</span>
                      </div>
                      <input
                        type="range"
                        min="-140"
                        max="140"
                        value={calibOffsetY}
                        onChange={(e) => setCalibOffsetY(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    {/* Offset Horizontal X */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-neutral-300">
                        <span>Posición Horizontal</span>
                        <span className="font-mono text-amber-400">{calibOffsetX}px</span>
                      </div>
                      <input
                        type="range"
                        min="-120"
                        max="120"
                        value={calibOffsetX}
                        onChange={(e) => setCalibOffsetX(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    {/* Escala / Tamaño de Uña */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-neutral-300">
                        <span>Tamaño / Escala de Uñas</span>
                        <span className="font-mono text-amber-400">{calibScale.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.6"
                        max="1.6"
                        step="0.05"
                        value={calibScale}
                        onChange={(e) => setCalibScale(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    {/* Apertura de Dedos */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-neutral-300">
                        <span>Separación de Dedos</span>
                        <span className="font-mono text-amber-400">{calibSpread.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1.4"
                        step="0.02"
                        value={calibSpread}
                        onChange={(e) => setCalibSpread(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── BARRA DE MAPEO DEDO POR DEDO (INSPECCIÓN MACRO 4K) ──────── */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300">
                    <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mapeo Dedo por Dedo (Inspección de Factibilidad Humana)</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-semibold">
                    {selectedFinger === 'ALL'
                      ? '🖐️ Vista Completa 5 Uñas'
                      : selectedFinger === 'RING'
                      ? '💍 Uña Anular (Acento Protagonista)'
                      : selectedFinger === 'MIDDLE'
                      ? '🖕 Dedo Medio (Telaraña)'
                      : selectedFinger === 'INDEX'
                      ? '☝️ Dedo Índice'
                      : selectedFinger === 'THUMB'
                      ? '👍 Dedo Pulgar'
                      : '🤙 Dedo Meñique'}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { id: 'ALL', label: '🖐️ Mano', sub: '5 Uñas' },
                    { id: 'RING', label: '💍 Anular', sub: 'Spider-Man' },
                    { id: 'MIDDLE', label: '🖕 Medio', sub: 'Telaraña' },
                    { id: 'INDEX', label: '☝️ Índice', sub: 'Rubí Metálico' },
                    { id: 'THUMB', label: '👍 Pulgar', sub: 'Macro Art' },
                    { id: 'PINKY', label: '🤙 Meñique', sub: 'Delicado' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSelectedFinger(f.id as any);
                        if (f.id !== 'ALL') setViewMode('macro');
                        else setViewMode('hand');
                      }}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedFinger === f.id
                          ? 'bg-gradient-to-tr from-[#D4AF37] to-[#B88A22] text-neutral-950 font-bold border-amber-400 shadow-md scale-[1.02]'
                          : 'bg-white/[0.03] border-white/10 text-neutral-300 hover:border-amber-400/40 hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="text-[11px] block font-bold leading-tight">{f.label}</span>
                      <span className={`text-[9px] block ${selectedFinger === f.id ? 'text-neutral-900 font-medium' : 'text-neutral-500'}`}>
                        {f.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── SELECTOR DE FORMA, LONGITUD, ACABADO & TONO DE PIEL ───────── */}
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
                          className="w-5 h-5 rounded-lg border border-white/20 shrink-0 shadow-xs"
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

                {/* Longitud Esculpida */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-300">Longitud de Estructura</span>
                    <span className="text-[11px] text-amber-400 font-semibold">
                      {selectedLength === 'short' && 'Corta Natural (Comodidad diaria)'}
                      {selectedLength === 'medium' && 'Media Salón (Elegancia clásica)'}
                      {selectedLength === 'long' && 'Larga Stylist (Alta Manicura)'}
                      {selectedLength === 'xl' && 'XL Haute Couture (Pasarela)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'short', name: 'Corta Natural', desc: 'Nivel 1' },
                      { id: 'medium', name: 'Media Salón', desc: 'Nivel 2' },
                      { id: 'long', name: 'Larga Stylist', desc: 'Nivel 3' },
                      { id: 'xl', name: 'XL Couture', desc: 'Nivel 4' },
                    ].map((len) => (
                      <button
                        key={len.id}
                        type="button"
                        onClick={() => setSelectedLength(len.id as any)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          selectedLength === len.id
                            ? 'bg-gradient-to-tr from-[#D4AF37] to-[#B88A22] text-neutral-950 font-bold border-amber-400 shadow-sm'
                            : 'bg-white/[0.02] border-white/10 text-neutral-300 hover:border-amber-400/30'
                        }`}
                      >
                        <span className="text-[11px] block font-bold">{len.name}</span>
                        <span className={`text-[9px] block ${selectedLength === len.id ? 'text-neutral-900' : 'text-neutral-500'}`}>
                          {len.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Acabado del Top Coat (Salón) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-300">Acabado del Top Coat (Salón)</span>
                    <span className="text-[11px] text-amber-400 font-semibold">
                      {selectedFinish === 'gloss' && '✨ Gel Gloss 3D UV (Brillo Espejo)'}
                      {selectedFinish === 'matte' && '🌫️ Velvet Mate (Aterciopelado)'}
                      {selectedFinish === 'chrome' && '🪞 Cromo Líquido (Ultra Reflectante)'}
                      {selectedFinish === 'aurora' && '🌈 Aurora Prismática (Iridiscente)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'gloss', name: '✨ Gel Gloss 3D', desc: 'Curva LED' },
                      { id: 'matte', name: '🌫️ Velvet Mate', desc: 'Sin brillo' },
                      { id: 'chrome', name: '🪞 Cromo Líquido', desc: 'Metálico' },
                      { id: 'aurora', name: '🌈 Aurora Prism', desc: 'Nácar' },
                    ].map((fin) => (
                      <button
                        key={fin.id}
                        type="button"
                        onClick={() => setSelectedFinish(fin.id as any)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          selectedFinish === fin.id
                            ? 'bg-gradient-to-tr from-[#D4AF37] to-[#B88A22] text-neutral-950 font-bold border-amber-400 shadow-sm'
                            : 'bg-white/[0.02] border-white/10 text-neutral-300 hover:border-amber-400/30'
                        }`}
                      >
                        <span className="text-[11px] block font-bold">{fin.name}</span>
                        <span className={`text-[9px] block ${selectedFinish === fin.id ? 'text-neutral-900' : 'text-neutral-500'}`}>
                          {fin.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── FICHA TÉCNICA DEL DISEÑO ACTIVO (CERO VALORES DE COSTO) ────── */}
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
                    Tiempo de Ejecución
                  </span>
                  <span className="font-editorial text-xl font-extrabold text-amber-300 block">
                    ⏱️ {activeDesign.estimatedTime}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    Nivel: {activeDesign.difficulty}
                  </span>
                </div>
              </div>

              {/* Guía de Factibilidad Humana y Técnica para la Estilista */}
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-400/30 text-xs text-neutral-300 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-400/20">
                  <div className="flex items-center gap-2 font-bold text-amber-200">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Factibilidad Humana: 100% Realizable por Manicurista en Mesa</span>
                  </div>
                  <Badge variant="gold" className="text-[10px]">
                    Sin Costos · Protocolo Puro
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[#F5E5C4] block">
                    Instrucciones Técnicas de Aplicación:
                  </span>
                  <p className="leading-relaxed text-neutral-300 text-xs">
                    {activeDesign.stylistNotes}
                  </p>
                </div>

                {/* Protocolo por Capas & Lámpara UV/LED */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-white/10 space-y-1">
                    <span className="font-bold text-amber-300 block">🛠️ Herramientas de Mesa:</span>
                    <ul className="text-neutral-300 list-disc list-inside space-y-0.5 text-[10.5px]">
                      <li>Pincel linner 000 de cerda extra fina</li>
                      <li>Punzón dotting tool punta micro</li>
                      <li>Base rubber con nivelación de ápice</li>
                      <li>Gel paint negro puro sin capa de dispersión</li>
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-white/10 space-y-1">
                    <span className="font-bold text-amber-300 block">⚡ Tiempos en Lámpara LED 48W:</span>
                    <ul className="text-neutral-300 list-disc list-inside space-y-0.5 text-[10.5px]">
                      <li>Base rubber & ápice: 60s</li>
                      <li>Color base esmalte semi: 30s</li>
                      <li>Líneas finas & nail art mano alzada: 60s</li>
                      <li>Top coat blindado ({selectedFinish}): 60s</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Paleta de Colorimetría */}
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

              {/* Botones de Acción */}
              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleDownloadPng}
                  className="flex-1 font-bold text-xs"
                >
                  <Download className="w-4 h-4 mr-1.5 text-amber-400" />
                  <span>Descargar Ficha en PNG 4K</span>
                </Button>

                <Button
                  variant="outline"
                  size="default"
                  onClick={handleShareWhatsApp}
                  className="flex-1 font-bold text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/40"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  <span>Enviar a Clienta (WhatsApp)</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: CHAT CON LA IA & CATÁLOGO DE TENDENCIAS (5 Columnas) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          {/* ── CHAT CON EL ASISTENTE DE NAIL ART ──────────────────────────── */}
          <Card variant="glass" className="flex-1 flex flex-col h-[520px] border-amber-400/20">
            <CardHeader className="pb-3 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 flex items-center justify-center font-bold text-xs shadow-xs">
                  AI
                </div>
                <div>
                  <CardTitle className="text-sm">GlamOS Nail Stylist AI</CardTitle>
                  <span className="text-[10px] text-amber-400 font-semibold block">Visión Multimodal & Colorimetría</span>
                </div>
              </div>
              <Badge variant="gold" className="text-[10px]">
                En Línea
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
                  placeholder="Ej. Spiderman, cromo aperlado, ojo de gato..."
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
                    onClick={() => setActiveDesign(preset)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      activeDesign.id === preset.id
                        ? 'bg-amber-400/15 border-amber-400/50'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-amber-400/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-xs bg-neutral-900">
                        {preset.photoUrl ? (
                          <img
                            src={preset.photoUrl}
                            alt={preset.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <span
                            className="w-full h-full"
                            style={{
                              background: `linear-gradient(135deg, ${preset.palette[0]?.hex || '#fff'}, ${
                                preset.palette[1]?.hex || '#000'
                              })`,
                            }}
                          />
                        )}
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
                      <span className="text-[11px] text-amber-400 font-semibold block">
                        ⏱️ {preset.estimatedTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
