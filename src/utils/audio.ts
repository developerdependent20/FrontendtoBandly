"use client";

/**
 * CLAN Audio Branding Engine
 * Gestiona los sonidos de la interfaz de forma sutil y optimizada.
 */

const SOUNDS = {
  click: "/sounds/click.mp3",
  success: "/sounds/success.mp3",
  reward: "/sounds/reward.mp3"
};

// Variable interna para silenciar
let isMuted = false;

// Inicialización persistente en cliente
if (typeof window !== "undefined") {
  isMuted = localStorage.getItem("clan_sounds_enabled") === "false";
}

/**
 * Reproduce un sonido de interfaz de forma no bloqueante.
 * @param type El tipo de sonido definido en SOUNDS.
 * @param volume Volumen de reproducción (0-1). Por defecto 0.15 (muy sutil).
 */
export const playUISound = (type: keyof typeof SOUNDS, volume: number = 0.15) => {
  if (isMuted || typeof window === "undefined") return;
  
  try {
    const audio = new Audio(SOUNDS[type]);
    audio.volume = volume;
    audio.play().catch(() => {
      // Los navegadores a veces bloquean el audio si no hay interacción previa. Silenciamos el error.
    });
  } catch (err) {
    console.warn("Audio Branding Error:", err);
  }
};

/**
 * Cambia el estado de silencio global.
 * @param muted true para silenciar, false para activar.
 */
export const setMuteSounds = (muted: boolean) => {
  isMuted = muted;
  if (typeof window !== "undefined") {
    localStorage.setItem("clan_sounds_enabled", (!muted).toString());
  }
};

/**
 * Devuelve el estado actual de los sonidos.
 */
export const areSoundsEnabled = () => !isMuted;
