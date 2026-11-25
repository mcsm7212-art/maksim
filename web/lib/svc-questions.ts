// Two or three quick questions for the most common jobs, so the pro does not have to ask them again.
// Answers are sent to the pro in English (the texts below); the client sees them in their language.
type Q = [string, string[]];
const YN = ['Yes', 'No'];
const TOILETS: Q = ['How many toilets?', ['One', 'Two or more']];
const SHUT: Q = ['Is the water shut off?', ['Yes', 'No', 'I do not know where the valve is']];
const HAVE = (thing: string): Q => [`Do you already have the new ${thing}?`, ['Yes', 'No, the pro should bring it']];
const FUEL: Q = ['Gas or electric?', ['Gas', 'Electric', 'Not sure']];
const HOWMANY = (what: string): Q => [`How many ${what}?`, ['1', '2–4', '5 or more']];
const CEILING: Q = ['Ceiling height?', ['Normal', 'High, a tall ladder is needed']];
const WALL: Q = ['What is the wall?', ['Drywall', 'Brick or concrete', 'Not sure']];
const PANEL: Q = ['Is there free space in the electrical panel?', ['Yes', 'No', 'Not sure']];
const SIZE: Q = ['How big is the job?', ['Small', 'Medium', 'Large']];
const PLANS: Q = ['Do you have a design or plans?', ['Yes', 'Not yet']];

export const SVC_QUESTIONS: Record<string, Q[]> = {
  // plumbing
  'faucet-replacement': [['Where is the faucet?', ['Kitchen', 'Bathroom', 'Other']], ['What is wrong?', ['Leaks from the spout', 'Leaks under the handle', 'Leaks under the sink', 'Works, I want a new one']], HAVE('faucet')],
  'kitchen-sink-installation': [HAVE('sink'), ['Same size as the old one?', ['Yes', 'No', 'Not sure']]],
  'garbage-disposal-installation': [['Is there a disposal now?', ['Yes, replace it', 'No, first one']], HAVE('disposal')],
  'garbage-disposal-repair': [['What is wrong?', ['Hums but does not spin', 'Leaks', 'No power at all']]],
  'shut-off-valve-replacement': [HOWMANY('valves'), ['Where?', ['Under a sink', 'Behind a toilet', 'Main house valve']]],
  'under-sink-leak-repair': [['Which sink?', ['Kitchen', 'Bathroom']], SHUT],
  'running-toilet-repair': [TOILETS, ['Since when?', ['Today', 'A few days', 'Longer']]],
  'clogged-toilet': [TOILETS, ['Is it overflowing?', YN]],
  'toilet-installation-replacement': [TOILETS, HAVE('toilet')],
  'sink-tub-or-shower-drain-clearing': [['Which drain?', ['Kitchen sink', 'Bathroom sink', 'Tub or shower', 'Several drains']], ['How bad is it?', ['Drains slowly', 'Fully blocked']]],
  'main-sewer-line-clearing': [['Is sewage backing up into the house?', YN], ['Is there a cleanout outside?', ['Yes', 'No', 'Not sure']]],
  'water-heater-repair': [['What type?', ['Tank', 'Tankless', 'Not sure']], FUEL, ['What is wrong?', ['No hot water', 'Leaking', 'Noise or smell']]],
  'tank-water-heater-replacement': [FUEL, ['What size?', ['40 gallons', '50 gallons', 'Bigger', 'Not sure']], ['Where is it?', ['Garage', 'Closet', 'Outside', 'Attic or crawl space']]],
  'tankless-water-heater-installation': [FUEL, ['What is there now?', ['A tank heater', 'A tankless heater', 'Nothing']]],
  'leak-detection': [['What do you see?', ['Wet spot on a wall or ceiling', 'Wet floor', 'High water bill', 'Sound of running water']]],
  'pipe-leak-repair': [['Where is the leak?', ['Under a sink', 'In a wall or ceiling', 'Outside', 'Not sure']], SHUT],
  'burst-pipe-emergency': [SHUT, ['Where is it?', ['Inside the house', 'Outside', 'Under the house']]],
  'outdoor-spigot-hose-bib-replacement': [HOWMANY('spigots'), ['What is wrong?', ['Drips', 'Does not open', 'Leaks inside the wall']]],
  'shower-valve-cartridge-replacement': [['What is wrong?', ['Drips', 'No hot water', 'Hard to turn', 'Not sure']], ['Do you know the brand?', ['Moen', 'Delta', 'Kohler', 'Other or not sure']]],
  'dishwasher-installation': [['Is there a dishwasher now?', ['Yes, replace it', 'No, first one']], HAVE('dishwasher')],
  'washing-machine-hookup': [['Are the water valves and drain already there?', ['Yes', 'No', 'Not sure']]],
  'gas-leak-detection-repair': [['Do you smell gas right now?', ['Yes: leave the house and call PG&E 1-800-743-5000', 'No, only sometimes']], ['Is the gas shut off?', YN]],
  // electrical
  'outlet-replacement': [HOWMANY('outlets'), ['Any sparks or heat?', YN]],
  'gfci-outlet-installation': [HOWMANY('outlets'), ['Where?', ['Kitchen', 'Bathroom', 'Garage', 'Outside']]],
  'light-switch-or-dimmer-replacement': [HOWMANY('switches'), ['Switch or dimmer?', ['Switch', 'Dimmer']]],
  'light-fixture-replacement': [HOWMANY('fixtures'), CEILING],
  'recessed-lighting': [HOWMANY('lights'), ['Is there attic access above?', ['Yes', 'No', 'Not sure']]],
  'ceiling-fan-installation': [['Is there a light or a fan there now?', ['Yes', 'No, a new spot']], CEILING, HAVE('fan')],
  'troubleshooting-tripping-breaker-partial-outage': [['What happens?', ['One breaker keeps tripping', 'Part of the house has no power', 'Lights flicker']], ['Any burning smell?', YN]],
  'new-dedicated-circuit': [['What is it for?', ['Kitchen appliance', 'Laundry', 'Garage tools', 'Other']], PANEL],
  'level-2-ev-charger-installation': [['Where will the charger be?', ['Garage', 'Outside wall', 'Carport']], ['How far from the electrical panel?', ['Same wall', 'Up to 30 feet', 'Farther']], PANEL],
  'sparking-outlet-or-burning-smell': [['Is it happening right now?', ['Yes: turn off the breaker', 'No, it stopped']], ['Is the outlet warm or dark?', YN]],
  // handyman
  'tv-wall-mounting': [['TV size?', ['Up to 55"', '56–75"', 'Bigger']], WALL, ['Hide the wires in the wall?', YN]],
  'shelves-installation': [HOWMANY('shelves'), WALL],
  'furniture-assembly': [HOWMANY('items'), ['What kind?', ['IKEA or similar', 'Other brand']]],
  'drywall-patch-repair': [['How big is the hole?', ['Smaller than a hand', 'About a sheet of paper', 'Bigger']], ['Paint after the repair?', YN]],
  'paint-touch-up-one-wall-or-room': [['How much?', ['One wall', 'One room', 'Several rooms']], ['Do you have the paint?', YN]],
  'door-repair-adjustment': [['Which door?', ['Interior', 'Exterior', 'Sliding']], ['What is wrong?', ['Sticks', 'Does not latch', 'Damaged']]],
  'door-lock-hardware-replacement': [HOWMANY('locks'), ['What kind?', ['Regular lock', 'Deadbolt', 'Smart lock']], HAVE('lock')],
  'fence-gate-repair': [['What needs repair?', ['Gate', 'A few boards', 'A post', 'A whole section']]],
  // construction
  'kitchen-remodel': [SIZE, PLANS, ['When do you want to start?', ['Within a month', 'In 1–3 months', 'Later']]],
  'bathroom-remodel': [SIZE, PLANS, ['When do you want to start?', ['Within a month', 'In 1–3 months', 'Later']]],
  'roof-repair': [['Is it leaking now?', YN], ['What is the roof?', ['Shingles', 'Tile', 'Flat roof', 'Not sure']]],
};
