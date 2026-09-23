// Textos de la landing. Los precios NO viven aquí: salen de utils/planFeatures.js
// (fuente única) para que landing, checkout y modal de bienvenida nunca discrepen.
// Cada plan: tag (para quién es), star (la función estrella) y features (lo demás).
export const landingDict = {
  es: {
    navFeatures: "Funciones",
    navPricing: "Planes",
    btnLogin: "Iniciar Sesión",
    btnSignup: "Probar Gratis",

    heroMain: "Toda tu música.",
    heroSub: "Bajo control.",
    heroDesc: "Multitracks, letras en pantalla y luces, sincronizados con un solo marcador.",
    btnStart: "Empezar Ahora",
    btnViewPlans: "Ver planes",
    availableOn: "Disponible en",

    premiumMini: "NADA SE COMPARA",
    premiumMain1: "Un mismo marcador mueve tu audio, tus letras",
    premiumMain2: "y tus luces,",
    premiumMain3: "al mismo tiempo.",
    premiumSupport: "Los marcadores del DAW disparan la letra en pantalla y la escena de luces en el mismo instante.",
    syncBadge1: "Bandly DAW",
    syncBadge1Desc: "Multitracks en vivo",
    syncBadge2: "Letras",
    syncBadge2Desc: "Bandly Presenter",
    syncBadge3: "Luces",
    syncBadge3Desc: "Bandly Lights (DMX/Art-Net)",

    dawTitle1: "Multitracks nativos",
    dawTitle2: "para Windows y Mac.",
    dawDesc: "Un motor de audio propio que se instala en tu computador: estable, sin depender del navegador.",
    dawAlt: "Bandly DAW",
    dawFeats: [
      { title: "Arma el arreglo en vivo", desc: "Salta el verso 2 o repite el coro con un clic, sin re-exportar." },
      { title: "Cada pista a su salida", desc: "Click al 3, pistas al 1-2, pads al 5-6, con ASIO nativo." },
      { title: "Tu guía CUE crea los marcadores", desc: "Escucha «Intro, 2, 3, 4» y nombra las secciones por ti." },
      { title: "Sin sustos en el show", desc: "Funciona sin internet y se reconecta solo si la interfaz se desconecta." }
    ],

    presenterMini: "PROYECCIÓN EN VIVO",
    presenterTitle1: "Bandly Presenter,",
    presenterTitle2: "letras en pantalla sin operador extra.",
    presenterDesc: "Proyecta letras y versículos sincronizados con el DAW, sin cambiar diapositivas a mano.",
    presenterAlt: "Bandly Presenter",
    presenterFeats: [
      { title: "Cambia solo", desc: "Los marcadores del DAW avanzan la diapositiva en tiempo real." },
      { title: "Stage Display", desc: "Pantalla para el escenario: letra actual, la siguiente y el reloj." },
      { title: "Fondos por canción", desc: "Fondo, tipografía y estilo propios, listos antes del evento." }
    ],

    teamTitle1: "Todo tu equipo,",
    teamTitle2: "en tu bolsillo.",
    teamDesc: "Agenda, ensayo y control remoto desde cualquier dispositivo.",
    teamAlts: ["Panel en el celular", "Reproductor en el celular", "Repertorios en el celular"],
    teamChips: [
      "Control remoto del setlist desde el celular",
      "Pedal o tecla MIDI para saltar de sección",
      "Charts en PDF y letras",
      "Eventos con confirmación del equipo"
    ],

    pricingTitle: "Empieza gratis, crece cuando lo necesites",
    pricingDesc: "Cada plan incluye todo lo del anterior.",
    monthly: "Mensual",
    annual: "Anual",
    save: "AHORRA 30%",
    monthLabel: "/mes",
    yearLabel: "/año",
    billedMonthly: "Facturado mensualmente",
    equalsPerMonth: (x) => `Equivale a $${x} / mes`,
    launchOffer: "🔥 OFERTA DE LANZAMIENTO",
    plans: {
      free: {
        name: "Gratis",
        tag: "Organiza a tu equipo",
        features: [
          "1 organización, hasta 10 usuarios",
          "300 MB de almacenamiento",
          "Calendario de eventos",
          "Repertorios y letras",
          "Enlaces de YouTube"
        ]
      },
      starter: {
        name: "Starter",
        tag: "Ensaya y toca con tus pistas",
        star: { title: "Bandly DAW", desc: "Mezcla y reproduce tus multitracks en vivo, en Windows y Mac." },
        features: [
          "Hasta 3 organizaciones y 25 usuarios",
          "10 GB de almacenamiento",
          "Reproductor multitrack en web y celular",
          "Charts en PDF y recursos por canción"
        ]
      },
      pro: {
        name: "Pro",
        tag: "Proyecta letras en vivo",
        star: { title: "Bandly Presenter", desc: "Letras en pantalla que cambian solas con el DAW, más Stage Display." },
        features: [
          "Todo lo de Starter",
          "Hasta 10 organizaciones y 75 usuarios",
          "45 GB de almacenamiento",
          "Sala de previsualización para ensayar"
        ]
      },
      elite: {
        name: "Elite",
        tag: "Control total del show",
        star: { title: "Bandly Lights", desc: "Luces DMX/Art-Net disparadas por el mismo marcador que la letra." },
        features: [
          "Todo lo de Pro",
          "Organizaciones y usuarios ilimitados",
          "100 GB de almacenamiento",
          "Roles y permisos",
          "Soporte prioritario y acceso anticipado"
        ]
      }
    },
    ctaFree: "Comenzar gratis",
    chooseStarter: "Elegir Starter",
    choosePro: "Elegir Pro",
    chooseElite: "Elegir Elite",

    ctaTitle: "¿Listo para tu próximo show?",
    ctaDesc: "Empieza gratis y sube de plan cuando lo necesites.",
    ctaBtn: "Comenzar gratis",
    footTerms: "Términos",
    footPriv: "Privacidad",
    footRefund: "Reembolsos",
    footContact: "Contacto",
    footOp: "Operado por Johan Sebastian Jimenez Calderon • Bogotá, Colombia",
    footRights: "© 2026 Bandly Live Engine. Todos los derechos reservados."
  },
  en: {
    navFeatures: "Features",
    navPricing: "Pricing",
    btnLogin: "Log In",
    btnSignup: "Try for Free",

    heroMain: "All your music.",
    heroSub: "Under control.",
    heroDesc: "Multitracks, on-screen lyrics and lights, synced by a single marker.",
    btnStart: "Start Now",
    btnViewPlans: "View Plans",
    availableOn: "Available on",

    premiumMini: "NOTHING COMPARES",
    premiumMain1: "One marker moves your audio, your lyrics",
    premiumMain2: "and your lights,",
    premiumMain3: "at the exact same time.",
    premiumSupport: "DAW markers fire the on-screen lyric and the lighting scene at the exact same instant.",
    syncBadge1: "Bandly DAW",
    syncBadge1Desc: "Live multitracks",
    syncBadge2: "Lyrics",
    syncBadge2Desc: "Bandly Presenter",
    syncBadge3: "Lights",
    syncBadge3Desc: "Bandly Lights (DMX/Art-Net)",

    dawTitle1: "Native multitracks",
    dawTitle2: "for Windows and Mac.",
    dawDesc: "Its own audio engine, installed on your computer: stable, with no browser in the way.",
    dawAlt: "Bandly DAW",
    dawFeats: [
      { title: "Arrange live", desc: "Skip verse 2 or repeat the chorus in one click, no re-exporting." },
      { title: "Every track to its own output", desc: "Click to 3, tracks to 1-2, pads to 5-6, with native ASIO." },
      { title: "Your CUE guide makes the markers", desc: "It hears “Intro, 2, 3, 4” and names the sections for you." },
      { title: "No surprises on show day", desc: "Works offline and reconnects by itself if your interface drops." }
    ],

    presenterMini: "LIVE PROJECTION",
    presenterTitle1: "Bandly Presenter,",
    presenterTitle2: "on-screen lyrics with no extra operator.",
    presenterDesc: "Project lyrics and verses synced with the DAW, no more switching slides by hand.",
    presenterAlt: "Bandly Presenter",
    presenterFeats: [
      { title: "Changes by itself", desc: "DAW markers advance the slide in real time." },
      { title: "Stage Display", desc: "A stage screen: current lyric, the next one and a clock." },
      { title: "Backgrounds per song", desc: "Its own background, font and style, ready before the event." }
    ],

    teamTitle1: "Your whole team,",
    teamTitle2: "in your pocket.",
    teamDesc: "Schedule, rehearsal and remote control from any device.",
    teamAlts: ["Dashboard on mobile", "Player on mobile", "Setlists on mobile"],
    teamChips: [
      "Remote control of your setlist from your phone",
      "MIDI pedal or key to jump between sections",
      "PDF charts and lyrics",
      "Events with team confirmation"
    ],

    pricingTitle: "Start free, grow when you need to",
    pricingDesc: "Every plan includes everything in the previous one.",
    monthly: "Monthly",
    annual: "Annual",
    save: "SAVE 30%",
    monthLabel: "/mo",
    yearLabel: "/yr",
    billedMonthly: "Billed monthly",
    equalsPerMonth: (x) => `Equals $${x} / month`,
    launchOffer: "🔥 LAUNCH OFFER",
    plans: {
      free: {
        name: "Free",
        tag: "Organize your team",
        features: [
          "1 organization, up to 10 users",
          "300 MB of storage",
          "Event calendar",
          "Setlists and lyrics",
          "YouTube links"
        ]
      },
      starter: {
        name: "Starter",
        tag: "Rehearse and play with your tracks",
        star: { title: "Bandly DAW", desc: "Mix and play your multitracks live, on Windows and Mac." },
        features: [
          "Up to 3 organizations and 25 users",
          "10 GB of storage",
          "Multitrack player on web and mobile",
          "PDF charts and resources per song"
        ]
      },
      pro: {
        name: "Pro",
        tag: "Project lyrics live",
        star: { title: "Bandly Presenter", desc: "On-screen lyrics that change by themselves with the DAW, plus Stage Display." },
        features: [
          "Everything in Starter",
          "Up to 10 organizations and 75 users",
          "45 GB of storage",
          "Preview room to rehearse"
        ]
      },
      elite: {
        name: "Elite",
        tag: "Total show control",
        star: { title: "Bandly Lights", desc: "DMX/Art-Net lights fired by the same marker that moves the lyrics." },
        features: [
          "Everything in Pro",
          "Unlimited organizations and users",
          "100 GB of storage",
          "Roles and permissions",
          "Priority support and early access"
        ]
      }
    },
    ctaFree: "Start for free",
    chooseStarter: "Choose Starter",
    choosePro: "Choose Pro",
    chooseElite: "Choose Elite",

    ctaTitle: "Ready for your next show?",
    ctaDesc: "Start for free and upgrade whenever you need to.",
    ctaBtn: "Start for free",
    footTerms: "Terms",
    footPriv: "Privacy",
    footRefund: "Refunds",
    footContact: "Contact",
    footOp: "Operated by Johan Sebastian Jimenez Calderon • Bogotá, Colombia",
    footRights: "© 2026 Bandly Live Engine. All rights reserved."
  }
};
