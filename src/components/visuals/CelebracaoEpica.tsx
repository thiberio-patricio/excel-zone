import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Crown, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SuperMensagem } from "@/data/mensagensMetaMensal";

interface Props {
  mensagem: SuperMensagem | null;
  onClose: () => void;
}

/** ---------- Trilha sonora épica gerada via Web Audio (sem assets) ---------- */
function useEpicSoundtrack(active: boolean, enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active || !enabled) return;

    let cancelled = false;
    const AudioCtor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.2);
    const reverb = ctx.createConvolver();
    // impulse response sintética (cauda de reverb)
    const len = ctx.sampleRate * 2.4;
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = impulse.getChannelData(c);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
      }
    }
    reverb.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    master.connect(ctx.destination);
    master.connect(wet);
    wet.connect(reverb);
    reverb.connect(ctx.destination);

    const note = (
      freq: number,
      start: number,
      dur: number,
      gain = 0.18,
      type: OscillatorType = "sawtooth"
    ) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2200;
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(gain, start + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(filter);
      filter.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(start + dur + 0.1);
    };

    const t0 = ctx.currentTime + 0.05;

    // Fanfarra de metais (motivo heroico)
    const fanfare: Array<[number, number, number]> = [
      [392.0, 0, 0.35],
      [523.25, 0.3, 0.35],
      [659.25, 0.6, 0.5],
      [783.99, 1.05, 1.1],
    ];
    fanfare.forEach(([f, s, d]) => {
      note(f, t0 + s, d, 0.2, "square");
      note(f / 2, t0 + s, d, 0.12, "sawtooth");
    });

    // Progressão orquestral em loop (I - V - vi - IV em Dó)
    const chords = [
      [130.81, 196.0, 261.63, 329.63],
      [98.0, 146.83, 246.94, 392.0],
      [110.0, 164.81, 261.63, 329.63],
      [87.31, 174.61, 220.0, 349.23],
    ];
    const chordDur = 3.2;
    const loopStart = t0 + 1.4;
    for (let rep = 0; rep < 6; rep++) {
      chords.forEach((chord, i) => {
        const s = loopStart + (rep * chords.length + i) * chordDur;
        chord.forEach((f, k) =>
          note(f, s, chordDur * 0.95, k === 0 ? 0.16 : 0.09, k === 0 ? "triangle" : "sawtooth")
        );
        // batida de tímpano
        const kick = ctx.createOscillator();
        const kg = ctx.createGain();
        kick.type = "sine";
        kick.frequency.setValueAtTime(120, s);
        kick.frequency.exponentialRampToValueAtTime(45, s + 0.35);
        kg.gain.setValueAtTime(0.35, s);
        kg.gain.exponentialRampToValueAtTime(0.0001, s + 0.6);
        kick.connect(kg);
        kg.connect(master);
        kick.start(s);
        kick.stop(s + 0.7);
      });
    }

    stopRef.current = () => {
      if (cancelled) return;
      cancelled = true;
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        setTimeout(() => ctx.close().catch(() => {}), 800);
      } catch {
        ctx.close().catch(() => {});
      }
    };

    return () => stopRef.current?.();
  }, [active, enabled]);
}

/** ---------- Confete / partículas douradas em canvas ---------- */
function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = ["#ff2a2a", "#ff6b3d", "#ffd166", "#ffffff", "#ff9f1c"];
    const total = reduced ? 60 : 220;
    const parts = Array.from({ length: total }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: (4 + Math.random() * 8) * dpr,
      h: (6 + Math.random() * 12) * dpr,
      vy: (1.2 + Math.random() * 3.4) * dpr,
      vx: (Math.random() - 0.5) * 1.6 * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.18,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.7 + Math.random() * 0.3,
    }));

    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.y * 0.01) * 0.6 * dpr;
        p.rot += p.vr;
        if (p.y > canvas.height + 40) {
          p.y = -30;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  return canvasRef;
}

export default function CelebracaoEpica({ mensagem, onClose }: Props) {
  const active = !!mensagem;
  const [som, setSom] = useState(true);
  const confettiRef = useConfetti(active);
  useEpicSoundtrack(active, som);

  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!active) return;
    const el = rootRef.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set("[data-epic]", { autoAlpha: 1, y: 0, scale: 1 });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 })
        .fromTo(
          "[data-epic='halo']",
          { scale: 0.2, autoAlpha: 0 },
          { scale: 1, autoAlpha: 1, duration: 1.1, ease: "expo.out" },
          "-=0.2"
        )
        .fromTo(
          "[data-epic='crown']",
          { scale: 0, rotate: -45, autoAlpha: 0 },
          { scale: 1, rotate: 0, autoAlpha: 1, duration: 0.9, ease: "back.out(2.2)" },
          "-=0.8"
        )
        .fromTo(
          "[data-epic='titulo']",
          { y: 40, autoAlpha: 0, scale: 0.9, filter: "blur(12px)" },
          { y: 0, autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 0.9 },
          "-=0.4"
        )
        .fromTo(
          "[data-epic='linha']",
          { scaleX: 0 },
          { scaleX: 1, duration: 0.7, transformOrigin: "center" },
          "-=0.5"
        )
        .fromTo(
          "[data-epic='texto']",
          { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.8 },
          "-=0.35"
        )
        .fromTo(
          "[data-epic='assinatura']",
          { y: 16, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.6 },
          "-=0.4"
        )
        .fromTo(
          "[data-epic='acoes']",
          { y: 16, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.5 },
          "-=0.3"
        );

      gsap.to("[data-epic='halo']", {
        scale: 1.12,
        opacity: 0.85,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to("[data-epic='crown']", {
        y: -8,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, el);

    return () => ctx.revert();
  }, [active]);

  const fechar = () => {
    const el = rootRef.current;
    if (!el) return onClose();
    gsap.to(el, { autoAlpha: 0, duration: 0.4, onComplete: onClose });
  };

  if (!active) return null;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={mensagem!.titulo}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background/95 backdrop-blur-xl"
    >
      {/* raios de luz */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,hsl(var(--primary)/0.35),transparent_60%)]" />
      <canvas ref={confettiRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      <div className="relative z-10 mx-4 w-full max-w-2xl rounded-3xl border border-primary/30 bg-card/70 p-8 text-center shadow-2xl">
        <div className="relative mx-auto mb-6 h-28 w-28">
          <div
            data-epic="halo"
            className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-primary/60 to-accent blur-xl"
          />
          <div
            data-epic="crown"
            className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent shadow-2xl"
          >
            <Crown className="h-14 w-14 text-primary-foreground" />
          </div>
        </div>

        <h2
          data-epic="titulo"
          className="bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl"
        >
          {mensagem!.titulo}
        </h2>

        <div
          data-epic="linha"
          className="mx-auto my-5 h-px w-40 bg-gradient-to-r from-transparent via-primary to-transparent"
        />

        <p
          data-epic="texto"
          className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground"
        >
          {mensagem!.texto}
        </p>

        <p data-epic="assinatura" className="pt-5 text-sm font-semibold text-primary">
          {mensagem!.assinatura}
        </p>

        <div data-epic="acoes" className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={fechar} size="lg" className="sm:min-w-64">
            Obrigado! Rumo ao próximo recorde 🚀
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setSom((s) => !s)}
            aria-label={som ? "Desligar música" : "Ligar música"}
          >
            {som ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
