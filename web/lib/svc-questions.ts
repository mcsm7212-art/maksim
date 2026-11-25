// Two or three quick questions for the most common jobs, so the pro does not have to ask them again.
// Answers are sent to the pro in English (the keys below); the client sees them in their language.
type Q = [string, string[]];
const TOILETS: Q = ['How many toilets?', ['One', 'Two or more']];
export const SVC_QUESTIONS: Record<string, Q[]> = {
  'faucet-replacement': [['Where is the faucet?', ['Kitchen', 'Bathroom', 'Other']], ['What is wrong?', ['Leaks from the spout', 'Leaks under the handle', 'Leaks under the sink', 'Works, I want a new one']]],
  'pipe-leak-repair': [['Where is the leak?', ['Under a sink', 'In a wall or ceiling', 'Outside', 'Not sure']], ['Is the water shut off?', ['Yes', 'No', 'I do not know where the valve is']]],
  'under-sink-leak-repair': [['Which sink?', ['Kitchen', 'Bathroom']], ['Is the water shut off?', ['Yes', 'No', 'I do not know where the valve is']]],
  'sink-tub-or-shower-drain-clearing': [['Which drain?', ['Kitchen sink', 'Bathroom sink', 'Tub or shower', 'Several drains']], ['How bad is it?', ['Drains slowly', 'Fully blocked']]],
  'running-toilet-repair': [TOILETS, ['Since when?', ['Today', 'A few days', 'Longer']]],
  'clogged-toilet': [TOILETS, ['Is it overflowing?', ['Yes', 'No']]],
  'toilet-installation-replacement': [TOILETS, ['Do you already have the new toilet?', ['Yes', 'No, the pro should bring it']]],
  'water-heater-repair': [['What type?', ['Tank', 'Tankless', 'Not sure']], ['Gas or electric?', ['Gas', 'Electric', 'Not sure']], ['What is wrong?', ['No hot water', 'Leaking', 'Noise or smell']]],
  'garbage-disposal-repair': [['What is wrong?', ['Hums but does not spin', 'Leaks', 'No power at all']]],
  'troubleshooting-tripping-breaker-partial-outage': [['What happens?', ['One breaker keeps tripping', 'Part of the house has no power', 'Lights flicker']], ['Any burning smell?', ['Yes', 'No']]],
  'outlet-replacement': [['How many outlets?', ['1', '2–4', '5 or more']], ['Any sparks or heat?', ['Yes', 'No']]],
  'light-fixture-replacement': [['How many fixtures?', ['1', '2–4', '5 or more']], ['Ceiling height?', ['Normal', 'High, a tall ladder is needed']]],
  'tv-wall-mounting': [['TV size?', ['Up to 55"', '56–75"', 'Bigger']], ['What is the wall?', ['Drywall', 'Brick or concrete', 'Not sure']], ['Hide the wires in the wall?', ['Yes', 'No']]],
  'door-repair-and-adjustment': [['Which door?', ['Interior', 'Exterior', 'Sliding']], ['What is wrong?', ['Sticks', 'Does not latch', 'Damaged']]],
};
