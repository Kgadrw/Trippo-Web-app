// Sound utility for playing notification beeps using Web Audio API

let audioContext: AudioContext | null = null;

/**
 * Get or create audio context - must be called from user interaction
 */
function getOrCreateAudioContext(): AudioContext | null {
  try {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext || (window as any).mozAudioContext;
      if (!AudioContextClass) {
        console.warn("⚠️ Web Audio API not supported in this browser");
        return null;
      }
      audioContext = new AudioContextClass();
      console.log("✅ Audio context created");
    }
    return audioContext;
  } catch (error) {
    console.error("❌ Error creating audio context:", error);
    return null;
  }
}

/**
 * Play a beep sound directly - assumes context is ready
 */
function playBeepDirectly(frequency: number, duration: number, volume: number, type: OscillatorType = "sine"): void {
  const ctx = getOrCreateAudioContext();
  if (!ctx) {
    console.warn("⚠️ Cannot play beep - audio context not available");
    return;
  }

  try {
    // Resume if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        playBeepNow(ctx, frequency, duration, volume, type);
      }).catch((err) => {
        console.error("❌ Error resuming audio context:", err);
      });
    } else {
      playBeepNow(ctx, frequency, duration, volume, type);
    }
  } catch (error) {
    console.error("❌ Error in playBeepDirectly:", error);
  }
}

/**
 * Internal function to actually create and play the beep
 */
function playBeepNow(ctx: AudioContext, frequency: number, duration: number, volume: number, type: OscillatorType): void {
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);

    oscillator.start(now);
    oscillator.stop(now + duration / 1000);
    
    console.log(`✅ 🔊 BEEP PLAYED: ${frequency}Hz, ${duration}ms, volume ${volume}, type ${type}, context state: ${ctx.state}`);
  } catch (error) {
    console.error("❌ Error creating beep:", error);
  }
}

/**
 * Plays a success beep (pleasant double beep)
 * Call this from user interaction context (button click)
 */
export function playSuccessBeep(): void {
  console.log("🔊 playSuccessBeep() called - attempting to play sound");
  
  // First beep - 880Hz, pleasant tone
  playBeepDirectly(880, 200, 0.9, "sine");

  // Second beep - 1100Hz after delay, higher confirming tone
  setTimeout(() => {
    playBeepDirectly(1100, 250, 0.9, "sine");
  }, 250);
}

/**
 * Plays an error beep (lower pitch, longer beep)
 * Call this from user interaction context (button click)
 */
export function playErrorBeep(): void {
  console.log("🔊 playErrorBeep() called - attempting to play sound");
  // Lower frequency (600Hz), longer duration (400ms), square wave for harsher sound
  playBeepDirectly(600, 400, 0.9, "square");
}

/**
 * Plays a sale recorded beep (upward triple beep - cash register sound)
 */
export function playSaleBeep(): void {
  console.log("🔊 playSaleBeep() called");
  playBeepDirectly(523, 150, 0.8, "sine"); // C note
  setTimeout(() => {
    playBeepDirectly(659, 150, 0.8, "sine"); // E note
  }, 150);
  setTimeout(() => {
    playBeepDirectly(784, 200, 0.8, "sine"); // G note
  }, 300);
}

/**
 * Plays a product added beep (pleasant ascending chord)
 */
export function playProductBeep(): void {
  console.log("🔊 playProductBeep() called");
  playBeepDirectly(440, 180, 0.85, "sine"); // A note
  setTimeout(() => {
    playBeepDirectly(554, 180, 0.85, "sine"); // C# note
  }, 180);
  setTimeout(() => {
    playBeepDirectly(659, 220, 0.85, "sine"); // E note
  }, 360);
}

/**
 * Plays a product updated beep (gentle double beep)
 */
export function playUpdateBeep(): void {
  console.log("🔊 playUpdateBeep() called");
  playBeepDirectly(698, 200, 0.8, "sine"); // F note
  setTimeout(() => {
    playBeepDirectly(880, 250, 0.8, "sine"); // A note
  }, 220);
}

/**
 * Plays a delete beep (descending tone - cautionary)
 */
export function playDeleteBeep(): void {
  console.log("🔊 playDeleteBeep() called");
  playBeepDirectly(880, 200, 0.75, "sine"); // A note
  setTimeout(() => {
    playBeepDirectly(659, 200, 0.75, "sine"); // E note
  }, 200);
  setTimeout(() => {
    playBeepDirectly(523, 250, 0.75, "sine"); // C note
  }, 400);
}

/**
 * Plays a warning beep (attention-grabbing double beep)
 */
export function playWarningBeep(): void {
  console.log("🔊 playWarningBeep() called");
  playBeepDirectly(800, 150, 0.9, "triangle");
  setTimeout(() => {
    playBeepDirectly(800, 150, 0.9, "triangle");
  }, 200);
}

/**
 * Plays an info beep (light single beep)
 */
export function playInfoBeep(): void {
  console.log("🔊 playInfoBeep() called");
  playBeepDirectly(660, 250, 0.7, "sine");
}

/**
 * Plays a sync beep (network-like sound - two quick beeps)
 */
export function playSyncBeep(): void {
  console.log("🔊 playSyncBeep() called");
  playBeepDirectly(587, 120, 0.8, "sine"); // D note
  setTimeout(() => {
    playBeepDirectly(740, 180, 0.8, "sine"); // F# note
  }, 150);
}

/**
 * Initialize audio context - call this on app load or user interaction
 */
export function initAudio(): void {
  const ctx = getOrCreateAudioContext();
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        console.log("✅ Audio context initialized and resumed - ready to play sounds");
      }).catch((err) => {
        console.warn("⚠️ Could not resume audio context:", err);
      });
    } else {
      console.log("✅ Audio context already active and ready");
    }
  } else {
    console.warn("⚠️ Could not create audio context");
  }
}

/**
 * Test function - call this to verify audio works
 * Open browser console and call: testBeep()
 */
export function testBeep(): void {
  console.log("🧪 Testing beep sound...");
  initAudio();
  setTimeout(() => {
    playBeepDirectly(800, 300, 0.9, "sine");
  }, 100);
}
