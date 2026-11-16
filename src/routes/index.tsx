import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Leaf, Heart, MessageCircle, MapPin, Phone, Sunrise, Sunset, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Bengre Farm — Fresh Dairy Delivered" },
      { name: "description", content: "Bengre Farm delivers fresh dairy products from village to your door. Every product gives you the vibes of village." },
    ],
  }),
});

const PHONE_DISPLAY = "98886 06082";
const PHONE_TEL = "tel:+919888606082";
const PHONE_WA = "https://wa.me/919888606082";

/* ───────────────────────── Product data ───────────────────────── */

type Product = {
  name: string;
  img?: string;
  emoji?: string;
  tint: string;
  points: string[];
  soon?: boolean;
};

const deliveryProducts: Product[] = [
  {
    name: "Paneer",
    img: "/products/paneer.jpg",
    tint: "bg-amber-50",
    points: ["No soda added", "No milk powder", "Made from pure, fresh milk", "Soft, fresh & made in small batches"],
  },
  {
    name: "Gud",
    emoji: "🍯",
    tint: "bg-orange-100",
    soon: true,
    points: ["Traditional jaggery", "No added colour", "Rich, earthy sweetness", "Made the village way"],
  },
  {
    name: "Shakkar",
    img: "/products/shakkar.svg",
    tint: "bg-yellow-50",
    soon: true,
    points: ["Unrefined desi shakkar", "No bleaching", "Natural, mellow sweetness", "Perfect for chai & milk"],
  },
  {
    name: "Atta Biscuits",
    img: "/products/biscuits.svg",
    tint: "bg-amber-100",
    soon: true,
    points: ["Made with whole wheat atta", "No maida", "No artificial colour", "Crunchy, home-style taste"],
  },
];

const storeProducts: Product[] = [
  { name: "Milk", img: "/products/milk.jpg", tint: "bg-sky-50", points: ["Fresh & pure farm milk", "Cow, buffalo & mix options", "Delivered fresh every day"] },
  { name: "Lassi", img: "/products/lassi.jpg", tint: "bg-rose-50", points: ["Bilona-style thick lassi", "Cool & refreshing", "Made from fresh curd"] },
  { name: "Ghee", img: "/products/buffalo-ghee.jpg", tint: "bg-yellow-50", points: ["Rich in aroma & taste", "Made from pure milk fat", "No added flavour"] },
  { name: "Gud", emoji: "🍯", tint: "bg-orange-100", points: ["Traditional jaggery", "No added colour", "Rich, earthy sweetness"] },
  { name: "Shakkar", img: "/products/shakkar.svg", tint: "bg-yellow-50", points: ["Unrefined desi shakkar", "No bleaching", "Natural sweetness"] },
  { name: "Paneer", img: "/products/paneer.jpg", tint: "bg-amber-50", points: ["No soda, no milk powder", "Made from pure milk", "Soft & fresh"] },
  { name: "Desi Ghee", img: "/products/cow-ghee.jpg", tint: "bg-yellow-50", points: ["Bilona-style ghee", "Golden colour & rich aroma", "Pure & unadulterated"] },
  { name: "Biscuits", img: "/products/biscuits.svg", tint: "bg-amber-100", points: ["Whole wheat atta", "No maida", "Crunchy home-style taste"] },
  { name: "White Makhan", img: "/products/makhan.jpg", tint: "bg-stone-50", points: ["Fresh, hand-pressed", "Soft & creamy", "No preservatives"] },
];

/* ───────────────────────── Animations (scoped CSS) ───────────────────────── */

const css = `
@keyframes bf-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes bf-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes bf-cloud{from{transform:translateX(-30vw)}to{transform:translateX(110vw)}}
@keyframes bf-graze{0%,100%{transform:translateY(0)}50%{transform:translateY(3px)}}
@keyframes bf-sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
.bf-track{display:flex;width:max-content;animation:bf-marquee var(--d,40s) linear infinite}
.bf-track.rev{animation-direction:reverse}
.bf-marquee:hover .bf-track{animation-play-state:paused}
.bf-float{animation:bf-float 5s ease-in-out infinite}
.bf-cloud{animation:bf-cloud linear infinite}
.bf-graze{transform-box:fill-box;transform-origin:center bottom;animation:bf-graze 4s ease-in-out infinite}
.bf-sway{transform-box:fill-box;transform-origin:center bottom;animation:bf-sway 5s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){
  .bf-track,.bf-float,.bf-cloud,.bf-graze,.bf-sway{animation:none!important}
  .bf-marquee{overflow-x:auto}
}
`;

/* ───────────────────────── Small building blocks ───────────────────────── */

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setShown(true);
        io.disconnect();
      }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

function ProductCard({ p, badge }: { p: Product; badge?: string }) {
  return (
    <div className="mr-5 w-64 shrink-0 overflow-hidden rounded-2xl border border-emerald-100 bg-white/90 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className={`relative flex h-40 items-center justify-center overflow-hidden ${p.tint}`}>
        {p.img ? (
          <img src={p.img} alt={p.name} loading="lazy" className={`h-full w-full object-cover ${p.soon ? "saturate-75" : ""}`} />
        ) : (
          <span className="text-7xl drop-shadow-sm">{p.emoji}</span>
        )}
        {p.soon && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/45">
            <span className="-rotate-6 rounded-full border-2 border-amber-300 bg-amber-100 px-4 py-1 text-sm font-bold tracking-wide text-amber-800 shadow">
              Coming Soon
            </span>
          </div>
        )}
        {badge && !p.soon && (
          <span className="absolute left-3 top-3 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 shadow-sm">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-display text-xl font-bold text-stone-800">{p.name}</h3>
        <ul className="space-y-1">
          {p.points.map((pt) => (
            <li key={pt} className="flex items-start gap-2 text-xs leading-snug text-stone-600">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {pt}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Marquee({ items, badge, reverse = false }: { items: Product[]; badge?: string; reverse?: boolean }) {
  // Make sure one half of the track is wider than a big screen so there is never a gap
  const half = items.length < 8 ? [...items, ...items] : items;
  return (
    <div className="bf-marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
      <div className={`bf-track py-4 ${reverse ? "rev" : ""}`} style={{ ["--d" as string]: `${half.length * 6}s` }}>
        {[...half, ...half].map((p, i) => (
          <div key={`${p.name}-${i}`} aria-hidden={i >= half.length ? true : undefined}>
            <ProductCard p={p} badge={badge} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ label, title, sub }: { label: string; title: string; sub?: string }) {
  return (
    <Reveal className="mb-6 text-center">
      <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
        {label}
      </span>
      <h2 className="mt-3 font-display text-3xl font-bold text-stone-800 lg:text-4xl">{title}</h2>
      {sub && <p className="mx-auto mt-2 max-w-xl text-sm text-stone-500">{sub}</p>}
    </Reveal>
  );
}

/* The Bengre Farm handshake logo */
function HandsLogo({ className = "" }: { className?: string }) {
  return <img src="/handshake-logo.svg" alt="Bengre Farm logo" className={className} />;
}

function Cow({ x, y, s = 1, flip = false, delay = 0 }: { x: number; y: number; s?: number; flip?: boolean; delay?: number }) {
  const t = flip ? `translate(${x + 100 * s} ${y}) scale(${-s} ${s})` : `translate(${x} ${y}) scale(${s})`;
  return (
    <g transform={t}>
      <g className="bf-graze" style={{ animationDelay: `${delay}s` }} stroke="#d8c8b0" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M10 22 q-9 6 -5 22" fill="none" strokeLinecap="round" />
        <rect x="17" y="38" width="7" height="18" rx="3" fill="#fff" />
        <rect x="30" y="38" width="7" height="18" rx="3" fill="#fff" />
        <rect x="52" y="38" width="7" height="18" rx="3" fill="#fff" />
        <rect x="64" y="38" width="7" height="18" rx="3" fill="#fff" />
        <rect x="10" y="12" width="64" height="30" rx="14" fill="#fff" />
        <ellipse cx="30" cy="24" rx="9" ry="6" fill="#ecdcc6" stroke="none" />
        <ellipse cx="55" cy="31" rx="7" ry="5" fill="#ecdcc6" stroke="none" />
        <ellipse cx="82" cy="24" rx="12" ry="10" fill="#fff" />
        <ellipse cx="90" cy="29" rx="6" ry="4.5" fill="#f8dcd6" stroke="none" />
        <ellipse cx="75" cy="16" rx="5" ry="3" fill="#ecdcc6" transform="rotate(-25 75 16)" />
        <circle cx="85" cy="21" r="1.6" fill="#7a6a58" stroke="none" />
      </g>
    </g>
  );
}

function VillageBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-sky-50 via-amber-50/70 to-emerald-50">
      {/* drifting clouds */}
      {[{ top: "6%", dur: 90, delay: -10, w: 140 }, { top: "16%", dur: 120, delay: -60, w: 100 }, { top: "10%", dur: 150, delay: -100, w: 180 }].map((c, i) => (
        <div key={i} className="bf-cloud absolute left-0" style={{ top: c.top, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
          <svg width={c.w} height={c.w * 0.45} viewBox="0 0 140 63">
            <g fill="#ffffff" opacity="0.9">
              <ellipse cx="40" cy="42" rx="32" ry="18" />
              <ellipse cx="72" cy="32" rx="30" ry="22" />
              <ellipse cx="102" cy="43" rx="28" ry="16" />
            </g>
          </svg>
        </div>
      ))}
      {/* hills, grass and cows */}
      <svg className="absolute bottom-0 left-0 h-[55vh] w-full" viewBox="0 0 1440 500" preserveAspectRatio="xMidYMax slice">
        <defs>
          <pattern id="bf-grass" width="28" height="36" patternUnits="userSpaceOnUse">
            <path d="M4 36 Q6 18 2 6 Q9 18 9 36Z" fill="#a9d68b" />
            <path d="M14 36 Q15 14 14 2 Q20 16 19 36Z" fill="#b9e09d" />
            <path d="M22 36 Q24 20 27 10 Q28 22 27 36Z" fill="#a9d68b" />
          </pattern>
        </defs>
        <path d="M0 260 C240 190 480 230 720 210 C960 190 1200 240 1440 200 L1440 500 L0 500Z" fill="#e3f3d6" />
        <path d="M0 330 C300 270 560 320 820 295 C1080 270 1260 320 1440 290 L1440 500 L0 500Z" fill="#d5ecc2" />
        <Cow x={170} y={250} s={0.8} delay={0} />
        <Cow x={640} y={262} s={0.7} flip delay={1.2} />
        <Cow x={1110} y={246} s={0.85} delay={2.1} />
        <path d="M0 410 C260 370 520 410 800 392 C1080 374 1280 408 1440 385 L1440 500 L0 500Z" fill="#c6e4ae" />
        <Cow x={380} y={338} s={1.35} delay={0.6} />
        <Cow x={930} y={332} s={1.2} flip delay={1.8} />
        <rect x="0" y="405" width="1440" height="95" fill="url(#bf-grass)" opacity="0.8" />
        <g className="bf-sway">
          <path d="M60 470 Q64 440 58 420 Q72 442 70 470Z" fill="#98cf78" />
          <path d="M1300 470 Q1304 438 1296 416 Q1312 440 1310 470Z" fill="#98cf78" />
        </g>
      </svg>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

function HomePage() {
  const { currentUser, state } = useStore();
  const navigate = useNavigate();

  const points = [
    { icon: <ShieldCheck className="h-7 w-7" />, title: "100% Pure", desc: "Direct from our own farm", color: "bg-sky-50 text-sky-600 border-sky-100" },
    { icon: <Leaf className="h-7 w-7" />, title: "Farm Fresh", desc: "No preservatives, no chemicals", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { icon: <Heart className="h-7 w-7" />, title: "Traditional", desc: "Traditional methods, pure taste", color: "bg-rose-50 text-rose-500 border-rose-100" },
  ];

  return (
    <div className="relative isolate min-h-screen">
      <style>{css}</style>
      <VillageBackground />
      <Header />
      <main>
        {/* Available for delivery */}
        <section className="bg-white/50 py-14 backdrop-blur-[2px]">
          <SectionTitle label="Fresh from our farm" title="Available for Delivery" sub="Paneer is ready for your doorstep today — more village favourites are on the way." />
          <Marquee items={deliveryProducts} badge="Available for delivery" />
        </section>

        {/* Hero */}
        <section className="border-b border-white/60 bg-white/40 backdrop-blur-[2px]">
          <div className="container mx-auto flex flex-col items-center px-4 py-14 text-center lg:py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <HandsLogo className="bf-float h-auto w-48 drop-shadow-md lg:w-64" />
            <h1 className="mt-4 font-display text-5xl font-bold leading-tight text-primary lg:text-7xl">Bengre Farm</h1>
            <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-emerald-300" />
            <p className="mt-4 text-[11px] uppercase tracking-[0.25em] text-muted-foreground lg:text-sm lg:tracking-[0.3em]">
              Every product gives you the vibes of village
            </p>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Fresh, farm-to-door dairy. Cow milk, buffalo milk, curd, paneer &amp; ghee — delivered morning and evening right to your doorstep.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {currentUser ? (
                <Link
                  to={currentUser.role === "admin" ? "/admin" : currentUser.role === "delivery" ? "/delivery" : "/shop"}
                  className="rounded-xl bg-gradient-primary px-8 py-4 text-lg font-bold text-white shadow-warm transition-opacity hover:opacity-90"
                >
                  Go to {currentUser.role === "admin" ? "Dashboard" : currentUser.role === "delivery" ? "Deliveries" : "Shop"} →
                </Link>
              ) : (
                <>
                  <Link to="/login" className="rounded-xl bg-gradient-primary px-8 py-4 text-lg font-bold text-white shadow-warm transition-opacity hover:opacity-90">
                    Login
                  </Link>
                  <Link to="/signup" className="rounded-xl border-2 border-primary/20 bg-white/60 px-8 py-4 text-lg font-bold text-primary transition-colors hover:bg-primary/5">
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Available at store */}
        <section className="bg-white/50 py-14 backdrop-blur-[2px]">
          <SectionTitle label="Visit our store" title="Available at Store" sub="Everything we make, with the quality you can taste." />
          <Marquee items={storeProducts} reverse />
        </section>

        {/* Daily route */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <SectionTitle label="Zero delivery charge" title="Daily Route Delivery" />
            <Reveal className="mx-auto max-w-4xl rounded-2xl border-2 border-emerald-100 bg-white/85 p-8 shadow-warm backdrop-blur">
              <div className="mb-6 flex flex-wrap justify-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-5 py-2 text-sm font-bold text-amber-700 ring-1 ring-amber-200">
                  <Sunrise className="h-5 w-5" /> Morning delivery: 6 – 8 AM
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-5 py-2 text-sm font-bold text-orange-700 ring-1 ring-orange-200">
                  <Sunset className="h-5 w-5" /> Evening delivery: 4 – 6 PM
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm font-semibold sm:grid-cols-3">
                {state.areas.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-primary">
                    <MapPin className="h-4 w-4 opacity-50" /> {a.name}
                  </div>
                ))}
              </div>
              <div className="mt-8 space-y-2 border-t pt-6 text-center text-sm text-muted-foreground">
                <p>Morning delivery: order any time until <strong>11:59 PM</strong> the night before.</p>
                <p>Evening delivery: order until <strong>3:00 PM</strong> on the delivery day.</p>
                <p>Pick your delivery date from the calendar when you order.</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Our promise */}
        <section className="bg-white/50 py-16 backdrop-blur-[2px]">
          <div className="container mx-auto px-4">
            <SectionTitle label="Our promise" title="Why Bengre Farm" />
            <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
              {points.map((p, i) => (
                <Reveal key={p.title} delay={i * 150}>
                  <div className="rounded-2xl border border-white bg-white/90 p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-lg">
                    <div className={`bf-float mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border ${p.color}`} style={{ animationDelay: `${i * 0.6}s` }}>
                      {p.icon}
                    </div>
                    <h3 className="font-display text-xl font-bold text-stone-800">{p.title}</h3>
                    <p className="mt-1 text-sm text-stone-500">{p.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-white/80 py-12 backdrop-blur">
          <div className="container mx-auto px-4">
            <div className="grid items-start gap-8 md:grid-cols-3">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <HandsLogo className="h-auto w-24" />
                  <div>
                    <h3 className="font-display text-xl font-bold text-primary">Bengre Farm</h3>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Vibes of Village</p>
                  </div>
                </div>
                <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                  We bring the pure, unadulterated taste of the village to your city home. Freshness you can trust, quality you can taste.
                </p>
                <Badge variant="outline" className="border-primary/20 text-[10px] text-primary/60">
                  FSSAI No. 30250711120704466
                </Badge>
              </div>

              <div className="space-y-4">
                <h4 className="font-display text-lg font-bold">Contact Us</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <MapPin className="h-5 w-5 shrink-0 text-primary" />
                    <span>Shop no.3, Residence Complex,<br />Panjab University, Chandigarh</span>
                  </div>
                  <a href={PHONE_TEL} className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary">
                    <Phone className="h-5 w-5 shrink-0 text-primary" />
                    <span className="font-semibold">{PHONE_DISPLAY} (tap to call)</span>
                  </a>
                  <a
                    href={PHONE_WA}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition-colors hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-5 w-5" /> Chat on WhatsApp
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-display text-lg font-bold">Quick Links</h4>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <Button variant="link" className="h-auto justify-start p-0 text-muted-foreground hover:text-primary" onClick={() => navigate({ to: "/login" })}>Customer Login</Button>
                  <Button variant="link" className="h-auto justify-start p-0 text-muted-foreground hover:text-primary" onClick={() => navigate({ to: "/signup" })}>Create Account</Button>
                  <Button variant="link" className="h-auto justify-start p-0 text-muted-foreground hover:text-primary" onClick={() => navigate({ to: "/shop" })}>View Menu</Button>
                </div>
              </div>
            </div>
            <div className="mt-12 border-t pt-8 text-center text-[10px] text-muted-foreground">
              <p>© {new Date().getFullYear()} Bengre Farm™ — All Rights Reserved.</p>
              <p className="mt-1 font-medium">Naturally Sourced • Traditionally Crafted • Freshly Delivered</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
