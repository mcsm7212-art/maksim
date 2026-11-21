// Service search in English, Spanish and Russian, for everyday words ("течёт под раковиной", "fuga debajo del fregadero",
// "outlet sparks"). Works in the browser and on the server, no network.
// 1) words are normalized and cut to a stem, so "смеситель", "смесителя" and "смесители" match each other;
// 2) everyday concepts (leak, faucet, clog, no hot water…) point to the catalog services that fix them;
// 3) the rest of the score comes from the service names in all three languages.

export type Searchable = { id: string; trade: string; name: string; ru: string; es: string; group: string; groupRu: string; groupEs: string };

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zа-я0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const RU_END = /(иями|ями|ами|ого|его|ому|ему|ыми|ими|ией|ия|ие|ий|ый|ой|ая|яя|ое|ее|ые|ых|их|ую|юю|ом|ем|ам|ям|ах|ях|ов|ев|ей|ет|ит|ут|ют|ат|ят|ла|ло|ли|ть|ти|а|я|о|е|и|ы|у|ю|ь|й)$/;
const STOP = new Set(['the', 'and', 'for', 'with', 'my', 'is', 'in', 'of', 'a', 'to', 'it', 'on', 'not', 'de', 'la', 'el', 'en', 'los', 'las', 'del', 'mi', 'que', 'se', 'no', 'por', 'con', 'una', 'un', 'y', 'у', 'в', 'на', 'и', 'с', 'не', 'по', 'под', 'из', 'для', 'мне', 'меня', 'нужно', 'надо', 'need', 'help', 'please', 'necesito', 'ayuda']);
export function stem(w: string): string {
  if (/[а-я]/.test(w)) { let s = w; for (let i = 0; i < 2 && s.length > 4 && RU_END.test(s); i++) s = s.replace(RU_END, ''); return s; }
  let s = w;
  if (s.length > 5 && s.endsWith('ing')) s = s.slice(0, -3);
  else if (s.length > 4 && s.endsWith('ed')) s = s.slice(0, -2);
  if (s.length > 4 && s.endsWith('es')) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith('s')) s = s.slice(0, -1);
  if (s.length > 4 && /[aoe]$/.test(s)) s = s.slice(0, -1); // spanish gender/plural endings, english silent e
  return s;
}
const stems = (s: string) => norm(s).split(' ').filter((w) => w.length > 1 && !STOP.has(w)).map(stem).filter((w) => w.length >= 2);
const same = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));

// Everyday concepts → services. Triggers are stems (any of them). `need` = another concept that must also be present.
type Concept = { k: string; t: string[]; s: Record<string, number>; need?: string[] };
const C: Concept[] = [
  // objects
  { k: 'faucet', t: ['faucet', 'tap', 'смесител', 'кран', 'grifo', 'llave', 'mezclador'], s: { 'faucet-replacement': 6 } },
  { k: 'sink', t: ['sink', 'раковин', 'мойк', 'умывальник', 'fregader', 'lavab', 'lavaman', 'tarja'], s: { 'kitchen-sink-installation': 2, 'under-sink-leak-repair': 1 } },
  { k: 'toilet', t: ['toilet', 'унитаз', 'бачок', 'бачк', 'inodor', 'excusad', 'taza', 'bano'], s: { 'toilet-installation-replacement': 3, 'running-toilet-repair': 3 } },
  { k: 'heater', t: ['heater', 'boiler', 'бойлер', 'водонагревател', 'нагревател', 'calentador', 'boiler', 'agua caliente', 'tankles', 'проточн'], s: { 'water-heater-repair': 5, 'tank-water-heater-replacement': 3 } },
  { k: 'pipe', t: ['pipe', 'труб', 'tuberi', 'tubo', 'cano'], s: { 'pipe-leak-repair': 4 } },
  { k: 'mainline', t: ['main line', 'main water', 'water main', 'water service', 'service line', 'meter', 'счетчик', 'счётчик', 'митер', 'мейн', 'маин', 'от счетчик', 'linea principal', 'línea principal', 'medidor', 'toma principal'], s: { 'water-service-line-replacement-meter-to-house': 8 } },
  { k: 'drain', t: ['drain', 'слив', 'сток', 'канализац', 'desague', 'drenaj', 'cañeri'], s: { 'sink-tub-or-shower-drain-clearing': 4 } },
  { k: 'sewer', t: ['sewer', 'канализац', 'alcantarill', 'drenaje principal'], s: { 'main-sewer-line-clearing': 5, 'sewer-camera-inspection': 2 } },
  { k: 'shower', t: ['shower', 'душ', 'ducha', 'regadera'], s: { 'shower-valve-cartridge-replacement': 4, 'showerhead-or-handheld-shower-install': 2 } },
  { k: 'tub', t: ['tub', 'bathtub', 'ванн', 'tina', 'banera'], s: { 'sink-tub-or-shower-drain-clearing': 2, 'tub-and-shower-re-caulking': 2 } },
  { k: 'disposal', t: ['disposal', 'garburator', 'измельчител', 'triturador'], s: { 'garbage-disposal-repair': 4, 'garbage-disposal-installation': 3 } },
  { k: 'dishwasher', t: ['dishwasher', 'посудомо', 'lavavajill', 'lavaplat'], s: { 'dishwasher-installation': 6 } },
  { k: 'washer', t: ['washer', 'washing machine', 'стиральн', 'lavadora'], s: { 'washing-machine-hookup': 6 } },
  { k: 'gas', t: ['gas', 'газ'], s: { 'gas-leak-detection-and-repair': 5, 'gas-line-installation-extension': 2 } },
  { k: 'outlet', t: ['outlet', 'socket', 'plug', 'розетк', 'enchuf', 'tomacorrient', 'contacto'], s: { 'outlet-replacement': 6, 'gfci-outlet-installation': 2 } },
  { k: 'switch', t: ['switch', 'dimmer', 'выключател', 'диммер', 'apagador', 'interruptor'], s: { 'light-switch-or-dimmer-replacement': 6 } },
  { k: 'light', t: ['light', 'lamp', 'fixture', 'светильник', 'свет', 'лампа', 'люстр', 'lampara', 'luz', 'foco'], s: { 'light-fixture-replacement': 5, 'recessed-lighting': 1 } },
  { k: 'fan', t: ['fan', 'вентилятор', 'ventilador'], s: { 'ceiling-fan-installation': 6 } },
  { k: 'breaker', t: ['breaker', 'автомат', 'пробк', 'выбива', 'щиток', 'щит', 'panel', 'breaker', 'pastilla', 'interruptor automatic', 'tablero'], s: { 'troubleshooting-tripping-breaker-partial-outage': 5, 'breaker-replacement': 3, 'panel-upgrade-100a-to-200a': 1 } },
  { k: 'ev', t: ['ev', 'tesla', 'charger', 'зарядк', 'электромобил', 'cargador', 'electric car', 'carro electric', 'auto electric'], s: { 'level-2-ev-charger-installation': 6 } },
  { k: 'power', t: ['power', 'нет свет', 'электричеств', 'no hay luz', 'sin luz', 'electricidad', 'outage'], s: { 'troubleshooting-tripping-breaker-partial-outage': 5 } },
  { k: 'tv', t: ['tv', 'television', 'телевизор', 'тв', 'televis', 'tele'], s: { 'tv-wall-mounting': 6 } },
  { k: 'furniture', t: ['furniture', 'ikea', 'мебел', 'шкаф', 'кроват', 'mueble', 'armar', 'cama'], s: { 'furniture-assembly': 5, 'bed-or-wardrobe-assembly': 3 } },
  { k: 'shelf', t: ['shelf', 'shelv', 'полк', 'repisa', 'estant'], s: { 'shelves-installation': 6 } },
  { k: 'drywall', t: ['drywall', 'hole in wall', 'дыр', 'гипсокартон', 'стен', 'pared', 'tablaroca', 'hoyo', 'agujero'], s: { 'drywall-patch-and-repair': 5 } },
  { k: 'paint', t: ['paint', 'покрас', 'краск', 'pintar', 'pintur'], s: { 'paint-touch-up-one-wall-or-room': 6 } },
  { k: 'door', t: ['door', 'двер', 'puerta'], s: { 'door-repair-and-adjustment': 5, 'interior-door-replacement-pre-hung': 2 } },
  { k: 'lock', t: ['lock', 'замок', 'замк', 'cerradur', 'chapa'], s: { 'door-lock-and-hardware-replacement': 6 } },
  { k: 'fence', t: ['fence', 'gate', 'забор', 'калитк', 'cerca', 'barda', 'reja'], s: { 'fence-and-gate-repair': 4, 'new-fence-installation': 3 } },
  { k: 'kitchen', t: ['kitchen', 'кухн', 'cocina'], s: { 'kitchen-remodel': 2 } },
  { k: 'bathroom', t: ['bathroom', 'ванн', 'туалет', 'bano'], s: { 'bathroom-remodel': 2 } },
  { k: 'roof', t: ['roof', 'крыш', 'кровл', 'techo', 'tejado'], s: { 'roof-repair': 6 } },
  { k: 'smoke', t: ['smoke detector', 'detector', 'датчик дым', 'пищит', 'detector de humo', 'alarma'], s: { 'battery-smoke-detector-replacement': 4, 'hardwired-smoke-and-co-detectors': 3 } },
  // problems / symptoms
  { k: 'leak', t: ['leak', 'drip', 'течет', 'теч', 'протек', 'протечк', 'капа', 'капл', 'подтека', 'fuga', 'gote', 'gotea', 'escap'], s: { 'leak-detection': 2, 'pipe-leak-repair': 2 } },
  { k: 'clog', t: ['clog', 'block', 'засор', 'забил', 'забит', 'не уход', 'не слива', 'tapad', 'tapo', 'atascad', 'atasc'], s: { 'sink-tub-or-shower-drain-clearing': 5 } },
  { k: 'running', t: ['running', 'runs', 'не набира', 'постоянно теч', 'не перестает', 'no para'], s: { 'running-toilet-repair': 4 } },
  { k: 'nohot', t: ['no hot', 'нет горяч', 'не грее', 'холодн', 'no calienta', 'sin agua caliente', 'agua fria'], s: { 'water-heater-repair': 6 } },
  { k: 'spark', t: ['spark', 'burn', 'smell', 'искрит', 'искр', 'гар', 'горит', 'дым', 'chispa', 'quemad', 'olor'], s: { 'sparking-outlet-or-burning-smell': 6 } },
  { k: 'burst', t: ['burst', 'flood', 'прорв', 'лопнул', 'потоп', 'залив', 'revent', 'inund'], s: { 'burst-pipe-emergency': 7 } },
  { k: 'remodel', t: ['remodel', 'renovat', 'ремонт под ключ', 'реконструкц', 'remodel', 'renovac'], s: { 'kitchen-remodel': 3, 'bathroom-remodel': 3 } },
];
// Object + symptom combinations that point to one exact job.
const COMBO: { need: string[]; s: Record<string, number> }[] = [
  { need: ['leak', 'sink'], s: { 'under-sink-leak-repair': 14 } },
  { need: ['leak', 'faucet'], s: { 'faucet-replacement': 8, 'under-sink-leak-repair': 6 } },
  { need: ['leak', 'toilet'], s: { 'running-toilet-repair': 8, 'toilet-reseal-wax-ring': 7 } },
  { need: ['leak', 'heater'], s: { 'water-heater-repair': 8, 'tank-water-heater-replacement': 6 } },
  { need: ['leak', 'pipe'], s: { 'pipe-leak-repair': 10 } },
  { need: ['mainline', 'pipe'], s: { 'water-service-line-replacement-meter-to-house': 14 } },
  { need: ['mainline', 'leak'], s: { 'water-service-line-replacement-meter-to-house': 10, 'leak-detection': 4 } },
  { need: ['leak', 'shower'], s: { 'shower-valve-cartridge-replacement': 10 } },
  { need: ['leak', 'roof'], s: { 'roof-repair': 8 } },
  { need: ['clog', 'toilet'], s: { 'clogged-toilet': 14 } },
  { need: ['clog', 'sink'], s: { 'sink-tub-or-shower-drain-clearing': 8 } },
  { need: ['clog', 'shower'], s: { 'sink-tub-or-shower-drain-clearing': 8 } },
  { need: ['clog', 'tub'], s: { 'sink-tub-or-shower-drain-clearing': 8 } },
  { need: ['running', 'toilet'], s: { 'running-toilet-repair': 10 } },
  { need: ['spark', 'outlet'], s: { 'sparking-outlet-or-burning-smell': 10 } },
  { need: ['power', 'breaker'], s: { 'troubleshooting-tripping-breaker-partial-outage': 6 } },
  { need: ['nohot', 'heater'], s: { 'water-heater-repair': 6 } },
  { need: ['gas', 'leak'], s: { 'gas-leak-detection-and-repair': 10 } },
  { need: ['gas', 'spark'], s: { 'gas-leak-detection-and-repair': 10 } },
];
const REPLACE = ['replac', 'new', 'install', 'замен', 'нов', 'постав', 'установ', 'cambi', 'nuev', 'instal', 'reemplaz', 'poner'];
const REPAIR = ['repair', 'fix', 'почин', 'ремонт', 'отремонт', 'устран', 'arregl', 'repar', 'compon'];

export type Hit<S> = { s: S; score: number };
export function rank<S extends Searchable>(services: S[], query: string): Hit<S>[] {
  const q = norm(query); if (!q) return [];
  const qs = stems(query);
  const has = (trigger: string) => (trigger.includes(' ') ? q.includes(norm(trigger)) : qs.some((w) => same(w, stem(norm(trigger)))));
  const found = new Set(C.filter((c) => c.t.some(has)).map((c) => c.k));
  const wantsReplace = REPLACE.some(has), wantsRepair = REPAIR.some(has);
  const ids = new Set(services.map((s) => s.id));
  const bonus = new Map<string, number>();
  const add = (id: string, n: number) => { if (ids.has(id)) bonus.set(id, (bonus.get(id) ?? 0) + n); };
  for (const c of C) if (found.has(c.k)) Object.entries(c.s).forEach(([id, n]) => add(id, n));
  for (const c of COMBO) if (c.need.every((k) => found.has(k))) Object.entries(c.s).forEach(([id, n]) => add(id, n));
  return services.map((s) => {
    let sc = bonus.get(s.id) ?? 0;
    const name = stems(`${s.name} ${s.ru} ${s.es}`), group = stems(`${s.group} ${s.groupRu} ${s.groupEs}`);
    for (const w of qs) { if (w.length < 3) continue; if (name.some((x) => same(w, x))) sc += 3; else if (group.some((x) => same(w, x))) sc += 1; }
    if (norm(s.name) === q || norm(s.ru) === q || norm(s.es) === q) sc += 10;
    if (sc > 0) {
      const n = norm(s.name);
      if (wantsReplace && /replace|installation|install|new/.test(n)) sc += 3;
      if (wantsRepair && /repair|clearing|troubleshoot|fix|detection/.test(n)) sc += 3;
    }
    return { s, score: sc };
  }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score);
}

/** True when the top result is clearly the job (no need to ask "repair or replace?"). */
export const confident = <S>(hits: Hit<S>[]) => hits.length > 0 && (hits.length === 1 || hits[0].score >= 1.6 * hits[1].score);
