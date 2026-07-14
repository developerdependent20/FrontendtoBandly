// Defaults de departamentos/instrumentos: usados como respaldo cuando una
// organización no ha personalizado su configuración en la pestaña Equipo.
// Fuente compartida entre OrgSettingsModal, TeamList y EventPlanner.

export const DEFAULT_LEADERSHIP_ROLES = [
  { id: 'director_musical', label: 'Director Musical', icon: '🎼' },
  { id: 'eventos', label: 'Dir. Eventos', icon: '📅' },
  { id: 'lider_produccion', label: 'Líder Producción', icon: '🎬' },
  { id: 'lider_logistica', label: 'Líder Logística', icon: '📋' }
];

export const DEFAULT_PRODUCTION_ROLES = [
  { id: 'media', label: 'Media/Visuales', icon: '📽️' },
  // 🎚️ (fader) en vez de 🎛️ (perillas) — ese último ya lo usa "Sintetizador"
  // y compartían el mismo ícono para dos roles completamente distintos.
  { id: 'sonido', label: 'Audio/Sonido', icon: '🎚️' },
  { id: 'transmision', label: 'Transmisión', icon: '📡' },
  { id: 'iluminacion', label: 'Iluminación', icon: '💡' }
];

export const DEFAULT_LOGISTICS_ROLES = [
  { id: 'logistica', label: 'Staff/Logística', icon: '🛠️' },
  { id: 'decoracion', label: 'Decoración', icon: '🎨' },
  { id: 'bienvenida', label: 'Bienvenida', icon: '👋' },
  { id: 'finanzas', label: 'Finanzas', icon: '💰' }
];

export const DEFAULT_INSTRUMENTS = [
  { id: 'bateria', label: 'Batería', icon: '🥁' },
  // No existe un emoji dedicado para "bajo eléctrico"; se usa 🪕 (banjo, cuerdas
  // graves punteadas) solo para diferenciarlo visualmente de guitarra/acústica,
  // que sí conservan 🎸.
  { id: 'bajo', label: 'Bajo', icon: '🪕' },
  { id: 'guitarra', label: 'Guitarra', icon: '🎸' },
  { id: 'piano', label: 'Teclado', icon: '🎹' },
  { id: 'voz', label: 'Voz/Cantante', icon: '🎤' },
  { id: 'percusion', label: 'Percusión', icon: '🪘' },
  { id: 'acustica', label: 'Acústica', icon: '🎸' },
  { id: 'cuerdas', label: 'Cuerdas', icon: '🎻' },
  { id: 'brass', label: 'Metales (Brass)', icon: '🎺' },
  { id: 'saxo', label: 'Saxofón', icon: '🎷' },
  { id: 'sintetizador', label: 'Sintetizador', icon: '🎛️' },
];
