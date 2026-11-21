// Everyday queries in three languages must find the right job in the top 3. Run: npx tsx tests/unit/search.test.ts
import { SERVICES, searchRanked } from '../../lib/catalog';
const CASES: [string, string][] = [
  // English
  ['leak under sink', 'under-sink-leak-repair'], ['leaking faucet', 'faucet-replacement'], ['dripping tap', 'faucet-replacement'], ['clogged toilet', 'clogged-toilet'],
  ['toilet keeps running', 'running-toilet-repair'], ['no hot water', 'water-heater-repair'], ['water heater leaking', 'water-heater-repair'], ['burst pipe', 'burst-pipe-emergency'],
  ['slow drain in shower', 'sink-tub-or-shower-drain-clearing'], ['replace outlet', 'outlet-replacement'], ['outlet sparks', 'sparking-outlet-or-burning-smell'], ['breaker keeps tripping', 'troubleshooting-tripping-breaker-partial-outage'],
  ['install ceiling fan', 'ceiling-fan-installation'], ['tesla charger', 'level-2-ev-charger-installation'], ['mount tv', 'tv-wall-mounting'], ['ikea assembly', 'furniture-assembly'],
  ['hole in wall', 'drywall-patch-and-repair'], ['door does not close', 'door-repair-and-adjustment'], ['gas smell', 'gas-leak-detection-and-repair'], ['kitchen remodel', 'kitchen-remodel'],
  ['replace main water line', 'water-service-line-replacement-meter-to-house'], ['water line from meter to house', 'water-service-line-replacement-meter-to-house'],
  // Russian
  ['течёт под раковиной', 'under-sink-leak-repair'], ['течёт смеситель', 'faucet-replacement'], ['смеситель', 'faucet-replacement'], ['заменить кран на кухне', 'faucet-replacement'],
  ['засор унитаза', 'clogged-toilet'], ['забилась раковина', 'sink-tub-or-shower-drain-clearing'], ['бачок постоянно течёт', 'running-toilet-repair'], ['бойлер не греет', 'water-heater-repair'],
  ['нет горячей воды', 'water-heater-repair'], ['прорвало трубу', 'burst-pipe-emergency'], ['искрит розетка', 'sparking-outlet-or-burning-smell'], ['поменять розетку', 'outlet-replacement'],
  ['выбивает автомат', 'troubleshooting-tripping-breaker-partial-outage'], ['нет света', 'troubleshooting-tripping-breaker-partial-outage'], ['повесить телевизор', 'tv-wall-mounting'], ['собрать шкаф', 'bed-or-wardrobe-assembly'],
  ['дырка в стене', 'drywall-patch-and-repair'], ['зарядка для теслы', 'level-2-ev-charger-installation'], ['пахнет газом', 'gas-leak-detection-and-repair'], ['ремонт ванной под ключ', 'bathroom-remodel'],
  ['замена трубы от счётчика до дома', 'water-service-line-replacement-meter-to-house'], ['мейн лайн воды', 'water-service-line-replacement-meter-to-house'],
  // Spanish
  ['fuga debajo del fregadero', 'under-sink-leak-repair'], ['gotea la llave', 'faucet-replacement'], ['cambiar grifo', 'faucet-replacement'], ['inodoro tapado', 'clogged-toilet'],
  ['el inodoro no para', 'running-toilet-repair'], ['no hay agua caliente', 'water-heater-repair'], ['calentador gotea', 'water-heater-repair'], ['tubo reventado', 'burst-pipe-emergency'],
  ['desagüe tapado', 'sink-tub-or-shower-drain-clearing'], ['cambiar enchufe', 'outlet-replacement'], ['enchufe echa chispas', 'sparking-outlet-or-burning-smell'], ['se bota la pastilla', 'troubleshooting-tripping-breaker-partial-outage'],
  ['instalar ventilador de techo', 'ceiling-fan-installation'], ['cargador para carro eléctrico', 'level-2-ev-charger-installation'], ['colgar televisión', 'tv-wall-mounting'], ['armar muebles', 'furniture-assembly'],
  ['hoyo en la pared', 'drywall-patch-and-repair'], ['pintar un cuarto', 'paint-touch-up-one-wall-or-room'], ['olor a gas', 'gas-leak-detection-and-repair'], ['remodelar cocina', 'kitchen-remodel'],
];
const ids = new Set(SERVICES.map((s) => s.id));
let fail = 0;
for (const [q, id] of CASES) {
  if (!ids.has(id)) { console.log('UNKNOWN id', id); fail++; continue; }
  const top = searchRanked(q, null, 3).map((h) => h.s.id);
  const ok = top.includes(id);
  if (!ok) { fail++; console.log('MISS', JSON.stringify(q), '→', top.join(', ') || '(nothing)', '| want', id); }
}
console.log(`${CASES.length - fail}/${CASES.length} queries find the right job in the top 3`);
process.exit(fail ? 1 : 0);
