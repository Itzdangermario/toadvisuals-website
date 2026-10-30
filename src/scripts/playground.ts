/**
 * Browser previews of Toad's Visuals features. They follow the mod's settings (names, ranges, options),
 * but are drawn with a canvas – in game the mod uses Minecraft's own rendering and particles.
 * No Minecraft textures are used: the figure, items and icons are simple shapes drawn here.
 */

type Ctx = CanvasRenderingContext2D;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fit(canvas: HTMLCanvasElement): { ctx: Ctx; w: number; h: number } {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const hsl = (h: number, s = 90, l = 62) => `hsl(${h % 360},${s}%,${l}%)`;

/** A soft daylight scene: sky, distant hills, grass. */
function scene(ctx: Ctx, w: number, h: number, ground = 0.72) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * ground);
  sky.addColorStop(0, '#6f8fd8');
  sky.addColorStop(1, '#b6c9f0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#7f9fc9';
  ctx.beginPath();
  ctx.moveTo(0, h * ground);
  for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h * ground - 18 - Math.sin(x / 90) * 14 - Math.sin(x / 37) * 6);
  ctx.lineTo(w, h * ground);
  ctx.fill();
  const g = ctx.createLinearGradient(0, h * ground, 0, h);
  g.addColorStop(0, '#5f8a3f');
  g.addColorStop(1, '#3f6129');
  ctx.fillStyle = g;
  ctx.fillRect(0, h * ground, w, h * (1 - ground));
}

/** A simple blocky player figure (not a Minecraft skin). */
type Tint = { rgb: [number, number, number]; a: number } | null;

function mixColor(hex: string, tint: Tint): string {
  if (!tint) return hex;
  const c = hexToRgb(hex);
  const m = (i: number) => Math.round(c[i] + (tint.rgb[i] - c[i]) * tint.a);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

function figure(ctx: Ctx, x: number, y: number, s: number, tint: Tint = null, alpha = 1, tilt = 0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const part = (px: number, py: number, pw: number, ph: number, c: string) => {
    ctx.fillStyle = mixColor(c, tint);
    ctx.fillRect(px * s, py * s, pw * s, ph * s);
  };
  // legs, body, arms, head (feet at y = 0)
  part(-4, -12, 4, 12, '#3b3f6b');
  part(0, -12, 4, 12, '#343861');
  part(-4, -24, 8, 12, '#6b4bb3');
  part(-8, -24, 4, 12, '#d9b38c');
  part(4, -24, 4, 12, '#d0aa83');
  part(-4, -32, 8, 8, '#e2bd95');
  part(-4, -32, 8, 2.5, '#4a2f1d');
  part(-2.6, -28.6, 1.4, 1.4, '#2b2b44');
  part(1.2, -28.6, 1.4, 1.4, '#2b2b44');
  ctx.restore();
}

/* ------------------------------------------------------------------ kill effects */

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  shape: 'sq' | 'heart' | 'circle' | 'line' | 'star';
  g: number;
  drag: number;
  spin?: number;
  a?: number;
}

function heart(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.fill();
}

export function killEffects(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-ke-canvas]')!;
  const form = root.querySelector<HTMLFormElement>('[data-ke-form]')!;
  let parts: P[] = [];
  let bolts: { pts: [number, number][]; life: number }[] = [];
  let rings: { r: number; v: number; life: number; max: number; color: string; flat?: boolean; w: number }[] = [];
  let beams: { life: number; max: number; color: string }[] = [];
  let grave: { life: number } | null = null;
  let flash = 0;
  let dead = 0; // frames the figure is gone
  let t = 0;
  let last = 0;
  let replay = 0;

  const opts = () => {
    const f = new FormData(form);
    return {
      id: String(f.get('effect') ?? 'lightning'),
      size: Number(f.get('size') ?? 100) / 100,
      color: hexToRgb(String(f.get('colour') ?? '#a755ff')),
      rainbow: f.get('rainbow') === 'on',
    };
  };

  const col = (o: ReturnType<typeof opts>, i = 0, a = 1) => (o.rainbow ? hsl(t * 3 + i * 23) : rgba(o.color, a));
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);

  function spawn(w: number, h: number) {
    const o = opts();
    const x = w / 2;
    const y = h * 0.72;
    const S = o.size;
    parts = [];
    bolts = [];
    rings = [];
    beams = [];
    grave = null;
    dead = 120;
    const add = (n: number, f: (i: number) => Partial<P>) => {
      for (let i = 0; i < n; i++) {
        const p = f(i);
        parts.push({ x, y: y - 40 * S, vx: 0, vy: 0, life: 0, max: 60, size: 4, color: '#fff', shape: 'sq', g: 0, drag: 0.98, ...p } as P);
      }
    };
    switch (o.id) {
      case 'lightning': {
        flash = 1;
        let px = x + rnd(-10, 10);
        const pts: [number, number][] = [[px, 0]];
        for (let py = 0; py < y; py += 18) {
          px += rnd(-14, 14);
          pts.push([px, py]);
        }
        pts.push([x, y]);
        bolts.push({ pts, life: 26 });
        add(26, () => ({ x, y, vx: rnd(-2, 2) * S, vy: rnd(-3, -0.5) * S, color: '#8a8a8a', size: rnd(4, 8) * S, max: 70, g: -0.02, shape: 'circle' }));
        break;
      }
      case 'gravestone':
        grave = { life: 0 };
        add(16, () => ({ x: x + rnd(-20, 20), y, vx: rnd(-0.6, 0.6), vy: rnd(-1.2, -0.3), color: '#9a8f86', size: rnd(3, 6), max: 50, shape: 'circle' }));
        break;
      case 'smoke':
        add(70 * S, (i) => ({ x: x + rnd(-14, 14) * S, y: y - rnd(0, 10), vx: rnd(-0.4, 0.4), vy: rnd(-2.2, -0.8) * S, color: `rgba(${120 + (i % 40)},${120 + (i % 40)},${125 + (i % 40)},0.8)`, size: rnd(8, 18) * S, max: rnd(70, 120), shape: 'circle', g: -0.005 }));
        break;
      case 'firework':
        flash = 0.25;
        add(110 * S, (i) => {
          const a = (i / (110 * S)) * Math.PI * 2;
          const v = rnd(2.4, 4.2) * S;
          return { y: y - 120 * S, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color: o.rainbow ? hsl(i * 7) : rgba(o.color, 1), size: 3.2, max: rnd(50, 80), g: 0.04, drag: 0.965, shape: 'star' };
        });
        break;
      case 'totem':
        add(120 * S, (i) => {
          const a = i * 0.5;
          return { x: x + Math.cos(a) * 10, y: y - 10, vx: Math.cos(a) * rnd(1, 3) * S, vy: rnd(-6, -2.5) * S, color: i % 3 ? '#f4d03f' : '#4caf50', size: rnd(3, 5), max: rnd(60, 90), g: 0.08, drag: 0.97 };
        });
        break;
      case 'souls':
        add(26 * S, () => ({ x: x + rnd(-30, 30) * S, y: y - rnd(0, 20), vx: rnd(-0.3, 0.3), vy: rnd(-1.4, -0.7), color: 'rgba(130,220,255,0.9)', size: rnd(5, 9) * S, max: rnd(90, 140), shape: 'circle', g: -0.01, drag: 0.995 }));
        break;
      case 'red_burst':
        add(90 * S, () => {
          const a = rnd(0, Math.PI * 2);
          const v = rnd(1.5, 5) * S;
          return { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, color: `rgb(${rnd(170, 230) | 0},20,30)`, size: rnd(3, 6), max: rnd(40, 70), g: 0.12, drag: 0.95 };
        });
        break;
      case 'hearts':
        add(14, (i) => {
          const a = (i / 14) * Math.PI * 2;
          return { x: x + Math.cos(a) * 34 * S, y: y - 40 * S + Math.sin(a) * 14 * S, vx: Math.cos(a) * 0.5, vy: -0.7, color: '#ff4d6d', size: 13 * S, max: 90, shape: 'heart', drag: 0.99 };
        });
        break;
      case 'explosion':
        flash = 0.7;
        add(70 * S, (i) => {
          const a = rnd(0, Math.PI * 2);
          const v = rnd(0.5, 4.5) * S;
          return { vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 1, color: i % 4 ? `rgba(${rnd(150, 210) | 0},${rnd(150, 210) | 0},${rnd(150, 210) | 0},0.9)` : '#ffb347', size: rnd(10, 24) * S, max: rnd(40, 80), shape: 'circle', drag: 0.93, g: -0.02 };
        });
        break;
      case 'flames':
        add(110 * S, (i) => {
          const a = i * 0.32;
          return { x: x + Math.cos(a) * 26 * S, y: y - i * 1.1 * S, vx: Math.cos(a + 1.57) * 0.5, vy: -0.6, color: i % 3 ? '#ff8c1a' : '#ffd23f', size: rnd(3, 6), max: 40 + i * 0.4, drag: 0.99, shape: 'circle' };
        });
        break;
      case 'ender':
        add(90 * S, () => ({ x: x + rnd(-14, 14), y: y - rnd(0, 60) * S, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), color: rnd(0, 1) > 0.5 ? '#c13cff' : '#7a1fd1', size: rnd(2, 4), max: rnd(40, 80), drag: 0.96 }));
        break;
      case 'confetti':
        add(140 * S, (i) => ({ y: y - 70 * S, vx: rnd(-4, 4) * S, vy: rnd(-7, -2) * S, color: o.rainbow ? hsl(i * 13) : [hsl(0), hsl(50), hsl(140), hsl(210), hsl(290)][i % 5], size: rnd(3, 6), max: rnd(80, 130), g: 0.09, drag: 0.98, spin: rnd(-0.3, 0.3), a: 0 }));
        break;
      case 'ring':
        rings.push({ r: 4, v: 4.2 * S, life: 0, max: 50, color: 'c', w: 5 }, { r: 2, v: 3.2 * S, life: 0, max: 50, color: 'c', w: 3 });
        break;
      case 'sonic':
        for (let i = 0; i < 5; i++) rings.push({ r: 4 + i * 10, v: 5.5 * S, life: -i * 4, max: 36, color: '#3fd2c7', flat: true, w: 4 });
        break;
      case 'helix':
        add(160, (i) => {
          const side = i % 2 ? 0 : Math.PI;
          return { x, y, vx: 0, vy: 0, color: 'c', size: 4, max: 140, shape: 'circle', a: side + i * 0.0, spin: i };
        });
        break;
      case 'pillar':
        beams.push({ life: 0, max: 80, color: 'c' });
        add(40, () => ({ x: x + rnd(-10, 10), y: y - rnd(0, 200), vx: 0, vy: rnd(-3, -1), color: '#fff', size: rnd(2, 4), max: 60, shape: 'circle' }));
        break;
      case 'crystal':
        flash = 0.8;
        add(80 * S, () => {
          const a = rnd(0, Math.PI * 2);
          const v = rnd(2, 6) * S;
          return { y: y - 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color: rnd(0, 1) > 0.5 ? '#ff9de2' : '#ffffff', size: rnd(2, 4), max: rnd(30, 60), drag: 0.93, shape: 'star' };
        });
        break;
      case 'wind':
        add(36 * S, (i) => {
          const a = (i / (36 * S)) * Math.PI * 2;
          return { y: y - 30, vx: Math.cos(a) * 4 * S, vy: Math.sin(a) * 1.6 * S, color: 'rgba(235,245,255,0.9)', size: 14, max: 40, drag: 0.94, shape: 'line' };
        });
        break;
      default: {
        // only the item
        dead = 60;
      }
    }
  }

  function frame(now: number) {
    if (!canvas.offsetParent) {
      last = 0;
      requestAnimationFrame(frame);
      return;
    }
    const { ctx, w, h } = fit(canvas);
    const dt = last ? Math.min(3, (now - last) / 16.7) : 1;
    last = now;
    t += dt;
    const o = opts();
    scene(ctx, w, h);
    const x = w / 2;
    const y = h * 0.72;

    if (dead > 0) dead -= dt;
    const fig = Math.max(28, Math.min(h, w) / 9) / 8;
    if (dead <= 0) figure(ctx, x, y, fig);
    else if (dead > 95) figure(ctx, x, y, fig, { rgb: [255, 40, 40], a: 0.55 }, (dead - 95) / 25, ((120 - dead) / 25) * 1.2);

    // beams
    for (const b of beams) {
      b.life += dt;
      const k = 1 - b.life / b.max;
      if (k <= 0) continue;
      const g = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
      const c = o.rainbow ? hsl(t * 4) : rgba(o.color, 0.9 * k);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, c);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 18 * o.size, 0, 36 * o.size, y);
    }
    // bolts
    for (const b of bolts) {
      b.life -= dt;
      if (b.life <= 0) continue;
      ctx.strokeStyle = `rgba(230,240,255,${Math.min(1, b.life / 10)})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#bcd7ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      b.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // rings
    for (const r of rings) {
      r.life += dt;
      if (r.life < 0) continue;
      r.r += r.v * dt;
      const k = 1 - r.life / r.max;
      if (k <= 0) continue;
      ctx.strokeStyle = r.color === 'c' ? col(o, 0, k) : r.color.startsWith('#') ? r.color : r.color;
      ctx.globalAlpha = k;
      ctx.lineWidth = r.w;
      ctx.beginPath();
      if (r.flat) ctx.ellipse(x, y - 34 * o.size, r.r * 0.35, r.r * 0.5, 0, 0, Math.PI * 2);
      else ctx.ellipse(x, y, r.r, r.r * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // grave
    if (grave) {
      grave.life += dt;
      const k = Math.min(1, grave.life / 14);
      const gw = 34 * o.size;
      const gh = 44 * o.size * k;
      ctx.fillStyle = '#8d8a86';
      ctx.fillRect(x - gw / 2, y - gh, gw, gh);
      ctx.fillStyle = '#6f6c69';
      ctx.fillRect(x - gw / 2, y - gh, gw, 6);
      ctx.fillStyle = '#5c5955';
      ctx.fillRect(x - 3, y - gh + 10, 6, 18 * o.size * k);
      ctx.fillRect(x - 9, y - gh + 15, 18, 5);
      if (k >= 1) {
        ctx.font = '600 14px Manrope Variable, system-ui';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(x - 34, y - gh - 30, 68, 20);
        ctx.fillStyle = '#fff';
        ctx.fillText('Steve', x, y - gh - 15);
      }
      if (grave.life > 150) grave = null;
    }
    // particles
    for (const p of parts) {
      p.life += dt;
      if (p.life > p.max) continue;
      if (o.id === 'helix' && p.spin !== undefined) {
        const k = p.life / p.max;
        const ang = (p.a ?? 0) + p.life * 0.12;
        p.x = x + Math.cos(ang) * 30 * o.size;
        p.y = y - k * 180 * o.size - Math.floor((p.spin ?? 0) / 2) * 0.6;
      } else {
        p.vx *= Math.pow(p.drag, dt);
        p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
      ctx.fillStyle = p.color === 'c' ? col(o, (p.spin ?? 0) * 2) : p.color;
      ctx.strokeStyle = ctx.fillStyle;
      switch (p.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'heart':
          heart(ctx, p.x, p.y, p.size);
          break;
        case 'line':
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4);
          ctx.stroke();
          break;
        case 'star':
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          ctx.globalAlpha *= 0.35;
          ctx.fillRect(p.x - p.vx * 2 - 1, p.y - p.vy * 2 - 1, 2, 2);
          break;
        default:
          if (p.spin) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.a = (p.a ?? 0) + p.spin * dt));
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
          } else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.6})`;
      ctx.fillRect(0, 0, w, h);
      flash = Math.max(0, flash - 0.06 * dt);
    }
    replay -= dt;
    if (replay <= 0 && !reduced) {
      spawn(w, h);
      replay = 230;
    }
    if (!document.hidden) requestAnimationFrame(frame);
    else setTimeout(() => requestAnimationFrame(frame), 500);
  }

  const play = () => {
    const { w, h } = fit(canvas);
    spawn(w, h);
    replay = 230;
  };
  form.addEventListener('input', play);
  root.querySelector('[data-ke-play]')?.addEventListener('click', play);
  requestAnimationFrame(frame);
  if (reduced) setTimeout(play, 50);
}

/* ------------------------------------------------------------------ glint */

/** An original 16×16 pixel sword (own design). */
const SWORD = [
  '..............ww',
  '.............wlw',
  '............wlw.',
  '...........wlw..',
  '..........wlw...',
  '.........wlw....',
  '........wlw.....',
  '.......wlw......',
  '..g...wlw.......',
  '..gg.wlw........',
  '...ggww.........',
  '....hgg.........',
  '...hh.gg........',
  '..hh...g........',
  '.oh.............',
  'oo..............',
];
const SWORD_COL: Record<string, string> = { w: '#5fe0d0', l: '#b6fff4', g: '#3a2a55', h: '#7a5230', o: '#3a2a55' };

export function glint(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-gl-canvas]')!;
  const form = root.querySelector<HTMLFormElement>('[data-gl-form]')!;
  let t = 0;
  const frame = () => {
    if (!canvas.offsetParent) {
      requestAnimationFrame(frame);
      return;
    }
    const { ctx, w, h } = fit(canvas);
    const f = new FormData(form);
    const style = String(f.get('style') ?? 'tint');
    const c = hexToRgb(String(f.get('colour') ?? '#a755ff'));
    const strength = Number(f.get('strength') ?? 100) / 100;
    t += reduced ? 0 : 1;
    const bg = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) / 1.4);
    bg.addColorStop(0, '#2a1d44');
    bg.addColorStop(1, '#120c1e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const px = Math.floor(Math.min(w, h) / 22);
    const ox = Math.round(w / 2 - 8 * px);
    const oy = Math.round(h / 2 - 8 * px);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const k = SWORD[y][x];
        if (k === '.') continue;
        ctx.fillStyle = SWORD_COL[k];
        ctx.fillRect(ox + x * px, oy + y * px, px, px);
        // glint on top of the item pixels
        let a = 0;
        let color = rgba(c, 1);
        const d = x - y; // diagonal
        switch (style) {
          case 'tint': {
            const band = ((d + 16 + t * 0.25) % 32) / 32;
            a = 0.25 + 0.55 * Math.max(0, 1 - Math.abs(band - 0.5) * 4);
            break;
          }
          case 'rainbow':
            color = hsl(t * 2 + (x + y) * 12);
            a = 0.55;
            break;
          case 'waves':
            a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin((x + y) * 0.7 - t * 0.12));
            break;
          case 'sparkle': {
            const n = Math.sin(x * 12.9898 + y * 78.233 + Math.floor(t / 12) * 3.1) * 43758.5453;
            a = n - Math.floor(n) > 0.82 ? 0.95 : 0.15;
            break;
          }
          case 'solid':
            a = 0.5;
            break;
          case 'subtle': {
            const band = ((d + 16 + t * 0.12) % 32) / 32;
            a = 0.08 + 0.25 * Math.max(0, 1 - Math.abs(band - 0.5) * 4);
            break;
          }
        }
        ctx.globalAlpha = Math.min(1, a * strength);
        ctx.fillStyle = color;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillRect(ox + x * px, oy + y * px, px, px);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ block outline */

export function outline(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-ol-canvas]')!;
  const form = root.querySelector<HTMLFormElement>('[data-ol-form]')!;
  let t = 0;
  const frame = () => {
    if (!canvas.offsetParent) {
      requestAnimationFrame(frame);
      return;
    }
    const { ctx, w, h } = fit(canvas);
    const f = new FormData(form);
    const c = hexToRgb(String(f.get('colour') ?? '#a755ff'));
    const rainbow = f.get('rainbow') === 'on';
    const width = Number(f.get('width') ?? 200) / 100;
    const opacity = Number(f.get('opacity') ?? 100) / 100;
    const fill = f.get('fill') === 'on';
    t += reduced ? 0 : 1;
    scene(ctx, w, h, 0.5);
    // three blocks in isometric view; the middle one is looked at
    const s = Math.min(w, h) / 6;
    const iso = (bx: number, by: number, bz: number): [number, number] => [w / 2 + (bx - bz) * s * 0.87, h * 0.58 + (bx + bz) * s * 0.5 - by * s];
    const block = (bx: number, bz: number, top: string, left: string, right: string) => {
      const p = (x: number, y: number, z: number) => iso(bx + x, y, bz + z);
      const poly = (pts: [number, number][], col: string) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fill();
      };
      poly([p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)], top);
      poly([p(0, 1, 1), p(1, 1, 1), p(1, 0, 1), p(0, 0, 1)], left);
      poly([p(1, 1, 0), p(1, 1, 1), p(1, 0, 1), p(1, 0, 0)], right);
      return p;
    };
    block(-1, 0, '#6aa84f', '#7a5a3a', '#5e4529');
    block(0, -1, '#6aa84f', '#7a5a3a', '#5e4529');
    const p = block(0, 0, '#74b356', '#836141', '#664b2e');
    const color = rainbow ? hsl(t * 2) : rgba(c, opacity);
    if (fill) {
      ctx.fillStyle = rainbow ? hsl(t * 2, 90, 62).replace('hsl', 'hsla').replace(')', ',0.25)') : rgba(c, 0.25 * opacity);
      ctx.beginPath();
      [p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1), p(0, 0, 1), p(0, 1, 1)].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, width * 2.2);
    ctx.lineJoin = 'round';
    const edges: [number, number, number, number, number, number][] = [
      [0, 1, 0, 1, 1, 0], [1, 1, 0, 1, 1, 1], [1, 1, 1, 0, 1, 1], [0, 1, 1, 0, 1, 0],
      [0, 1, 1, 0, 0, 1], [1, 1, 1, 1, 0, 1], [1, 1, 0, 1, 0, 0], [0, 0, 1, 1, 0, 1], [1, 0, 1, 1, 0, 0],
    ];
    ctx.beginPath();
    for (const e of edges) {
      const a = p(e[0], e[1], e[2]);
      const b = p(e[3], e[4], e[5]);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ hit colour */

export function hitColour(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-hc-canvas]')!;
  const form = root.querySelector<HTMLFormElement>('[data-hc-form]')!;
  let hit = 0;
  let next = 40;
  const frame = () => {
    if (!canvas.offsetParent) {
      requestAnimationFrame(frame);
      return;
    }
    const { ctx, w, h } = fit(canvas);
    const f = new FormData(form);
    const c = hexToRgb(String(f.get('colour') ?? '#a755ff'));
    const strength = Number(f.get('strength') ?? 35) / 100;
    scene(ctx, w, h);
    const s = Math.max(3, Math.min(h, w) / 9 / 8);
    const shake = hit > 0 ? Math.sin(hit) * 3 : 0;
    figure(ctx, w / 2 + shake, h * 0.72, s, hit > 0 ? { rgb: c, a: Math.min(0.9, strength * 1.6) } : null);
    if (hit > 0) hit -= 1;
    next -= reduced ? 0 : 1;
    if (next <= 0) {
      hit = 10;
      next = 70;
    }
    requestAnimationFrame(frame);
  };
  root.querySelector('[data-hc-hit]')?.addEventListener('click', () => (hit = 10));
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ PvP HUD */

const ICONS: Record<string, string[]> = {
  totem: ['..yyyy..', '.yyyyyy.', '.ykyyky.', '..yyyy..', 'yyyyyyyy', '..gyyg..', '..yyyy..', '...yy...'],
  crystal: ['...pp...', '..pwwp..', '.pwppwp.', 'pwppppwp', 'pwppppwp', '.pwppwp.', '..pwwp..', '...pp...'],
  gapple: ['...b....', '....l...', '.yyyyyy.', 'yywyyyyy', 'ywyyyyyy', 'yyyyyyyy', '.yyyyyy.', '..yyyy..'],
  pearl: ['..tttt..', '.tTTTtt.', 'tTttttTt', 'tTtddtTt', 'tttddttt', 'ttttttTt', '.tttttt.', '..tttt..'],
  potion: ['...ww...', '...ww...', '..wrrw..', '.wrrrrw.', 'wrrRrrrw', 'wrrrrrrw', 'wrrrrrrw', '.wwwwww.'],
};
const ICON_COL: Record<string, string> = { y: '#f4c430', k: '#3a2a10', g: '#4caf50', p: '#e86bd0', w: '#ffffff', b: '#5b3a1a', l: '#4caf50', t: '#1f8f7a', T: '#6fe3cf', d: '#0b3d33', r: '#e0457b', R: '#ffb3cc' };

export function hud(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-hud-canvas]')!;
  const form = root.querySelector<HTMLFormElement>('[data-hud-form]')!;
  const counts: Record<string, number> = { totem: 3, crystal: 64, gapple: 17, pearl: 12, potion: 6 };
  let t = 0;
  const frame = () => {
    if (!canvas.offsetParent) {
      requestAnimationFrame(frame);
      return;
    }
    const { ctx, w, h } = fit(canvas);
    const f = new FormData(form);
    const row = f.get('layout') === 'row';
    const bg = f.get('bg') === 'on';
    const text = String(f.get('text') ?? '#ffffff');
    const accent = String(f.get('accent') ?? '#a755ff');
    const scale = Number(f.get('scale') ?? 100) / 100;
    const show = ['totem', 'crystal', 'gapple', 'pearl', 'potion'].filter((k) => f.get(k) === 'on');
    t += 1;
    scene(ctx, w, h);
    // a simple hotbar silhouette
    const hbW = Math.min(w * 0.7, 420);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(w / 2 - hbW / 2, h - 46, hbW, 36);
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(w / 2 - hbW / 2 + 3 + (i * (hbW - 6)) / 9, h - 43, (hbW - 6) / 9 - 3, 30);
    }
    // HUD
    const ip = Math.max(2, Math.round(3 * scale));
    const cell = 8 * ip;
    const pad = 8 * scale;
    const gap = 6 * scale;
    ctx.font = `700 ${Math.round(15 * scale)}px Manrope Variable, system-ui`;
    const itemW = cell + 8 + ctx.measureText('64').width;
    const boxW = row ? pad * 2 + show.length * itemW + (show.length - 1) * gap * 2 : pad * 2 + itemW;
    const boxH = row ? pad * 2 + cell : pad * 2 + show.length * cell + (show.length - 1) * gap;
    const bx = 16;
    const by = 16;
    if (bg && show.length) {
      ctx.fillStyle = 'rgba(10,6,18,0.62)';
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 8);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(bx, by, 3, boxH);
    }
    show.forEach((k, i) => {
      const x = bx + pad + (row ? i * (itemW + gap * 2) : 0);
      const y = by + pad + (row ? 0 : i * (cell + gap));
      const icon = ICONS[k];
      for (let yy = 0; yy < 8; yy++)
        for (let xx = 0; xx < 8; xx++) {
          const ch = icon[yy][xx];
          if (ch === '.') continue;
          ctx.fillStyle = ICON_COL[ch];
          ctx.fillRect(x + xx * ip, y + yy * ip, ip, ip);
        }
      const low = k === 'totem' && counts.totem <= 1;
      ctx.fillStyle = low ? (Math.floor(t / 20) % 2 ? '#ff5555' : text) : text;
      ctx.textBaseline = 'middle';
      ctx.fillText(String(counts[k]), x + cell + 8, y + cell / 2 + 1);
    });
    requestAnimationFrame(frame);
  };
  root.querySelector('[data-hud-pop]')?.addEventListener('click', () => {
    counts.totem = counts.totem > 0 ? counts.totem - 1 : 3;
  });
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ tabs */

export function tabs(root: HTMLElement) {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const select = (b: HTMLButtonElement, focus = false) => {
    buttons.forEach((x) => {
      const on = x === b;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      const panel = root.querySelector<HTMLElement>(`#${x.getAttribute('aria-controls')}`);
      if (panel) panel.hidden = !on;
    });
    if (focus) b.focus();
    try {
      history.replaceState(null, '', `#${b.dataset.tab}`);
    } catch {
      /* ignore */
    }
  };
  buttons.forEach((b, i) => {
    b.addEventListener('click', () => select(b));
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (d) {
        e.preventDefault();
        select(buttons[(i + d + buttons.length) % buttons.length], true);
      }
    });
  });
  const start = buttons.find((b) => `#${b.dataset.tab}` === location.hash) ?? buttons[0];
  select(start);
}
