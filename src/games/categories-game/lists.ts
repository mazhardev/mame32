import type { Rng } from '@/utils/random';

/**
 * Answer lists for Categories. Answers are compared lowercase with spaces,
 * hyphens and apostrophes removed, so "sea horse" and "seahorse" both match.
 */
export const LISTS: Record<string, string> = {
  Animals:
    'aardvark albatross alligator alpaca anteater antelope ape armadillo baboon badger bat bear beaver bee beetle bison boar buffalo bull butterfly camel canary caribou cat caterpillar cheetah chicken chimpanzee chinchilla chipmunk cobra cockatoo cod cougar cow coyote crab crane cricket crocodile crow deer dingo dog dolphin donkey dove dragonfly duck eagle eel elephant elk emu falcon ferret finch flamingo fox frog gazelle gecko gerbil gibbon giraffe goat goldfish goose gorilla grasshopper guineapig gull hamster hare hawk hedgehog heron hippo hippopotamus horse hummingbird hyena ibis iguana impala jackal jaguar jellyfish kangaroo kingfisher kiwi koala kookaburra ladybird ladybug lemur leopard lion lizard llama lobster lynx macaw magpie manatee meerkat mink mole mongoose monkey moose mosquito moth mouse mule narwhal newt nightingale ocelot octopus opossum orangutan ostrich otter owl ox oyster panda panther parrot peacock pelican penguin pheasant pig pigeon piranha platypus polarbear pony porcupine possum puffin puma python quail rabbit raccoon rat raven reindeer rhino rhinoceros robin salamander salmon scorpion seahorse seal shark sheep shrimp skunk sloth snail snake sparrow spider squid squirrel starfish stingray stork swan tapir tiger toad tortoise toucan trout tuna turkey turtle viper vulture walrus wasp weasel whale wolf wombat woodpecker worm yak zebra',
  'Fruits & vegetables':
    'apple apricot artichoke asparagus aubergine avocado banana beetroot blackberry blueberry broccoli cabbage cantaloupe carrot cauliflower celery cherry chickpea clementine coconut courgette cranberry cucumber currant date eggplant elderberry fennel fig garlic gooseberry grape grapefruit guava honeydew jackfruit kale kiwi kohlrabi kumquat leek lemon lettuce lime lychee mandarin mango melon mushroom nectarine okra olive onion orange papaya parsnip passionfruit pea peach pear pepper persimmon pineapple plum pomegranate potato pumpkin quince radish raisin raspberry rhubarb rocket shallot spinach squash strawberry swede sweetcorn sweetpotato tangerine tomato turnip ugli watercress watermelon yam zucchini',
  Countries:
    'afghanistan albania algeria andorra angola argentina armenia australia austria azerbaijan bahamas bahrain bangladesh barbados belarus belgium belize benin bhutan bolivia bosnia botswana brazil brunei bulgaria burkinafaso burundi cambodia cameroon canada chad chile china colombia comoros congo costarica croatia cuba cyprus czechia denmark djibouti dominica ecuador egypt elsalvador england eritrea estonia eswatini ethiopia fiji finland france gabon gambia georgia germany ghana greece grenada guatemala guinea guyana haiti honduras hungary iceland india indonesia iran iraq ireland israel italy jamaica japan jordan kazakhstan kenya kiribati kosovo kuwait kyrgyzstan laos latvia lebanon lesotho liberia libya liechtenstein lithuania luxembourg madagascar malawi malaysia maldives mali malta mauritania mauritius mexico moldova monaco mongolia montenegro morocco mozambique myanmar namibia nauru nepal netherlands newzealand nicaragua niger nigeria northkorea norway oman pakistan palau panama paraguay peru philippines poland portugal qatar romania russia rwanda samoa sanmarino saudiarabia scotland senegal serbia seychelles sierraleone singapore slovakia slovenia somalia southafrica southkorea spain srilanka sudan suriname sweden switzerland syria taiwan tajikistan tanzania thailand togo tonga trinidad tunisia turkey turkmenistan tuvalu uganda ukraine uruguay usa uzbekistan vanuatu vaticancity venezuela vietnam wales yemen zambia zimbabwe',
  Sports:
    'archery athletics badminton baseball basketball biathlon bobsleigh bowling boxing canoeing climbing cricket croquet curling cycling darts diving dodgeball equestrian fencing football golf gymnastics handball hiking hockey hurling judo karate kayaking kickboxing lacrosse luge marathon netball orienteering paddleboarding pentathlon pickleball polo powerlifting racquetball rafting rounders rowing rugby running sailing shooting skateboarding skating skiing snooker snowboarding soccer softball squash sumo surfing swimming tabletennis taekwondo tennis triathlon volleyball wakeboarding waterpolo weightlifting windsurfing wrestling yoga',
  Jobs: 'accountant actor architect artist astronaut athlete author baker banker barber barista builder butcher carpenter cashier chef chemist cleaner coach cook dancer dentist designer detective doctor driver economist editor electrician engineer farmer firefighter fisherman florist gardener geologist guard hairdresser historian illustrator inspector janitor jeweller journalist judge juggler lawyer lecturer librarian lifeguard locksmith magician manager mechanic midwife miner musician nanny navigator nurse optician painter paramedic pharmacist photographer physicist pianist pilot plumber poet police policeman porter postman potter professor programmer psychologist receptionist referee reporter sailor scientist secretary shepherd singer soldier surgeon tailor teacher technician translator tutor umpire vet veterinarian waiter waitress welder writer zookeeper',
  'Things in a kitchen':
    'apron blender bowl bread breadbin cabinet colander cooker counter cup cupboard cuttingboard dishwasher fork freezer fridge frypan glass grater grill jar jug kettle knife ladle lid microwave mixer mop mug napkin oven pan pantry peeler pepper plate pot rollingpin salt saucepan scales shelf sieve sink skillet sponge spatula spoon stove strainer table tap teapot thermos timer tin toaster tongs towel tray whisk wok',
  Clothing:
    'anorak apron bandana beanie belt beret bikini blazer blouse boots bowtie bra cap cape cardigan cloak coat corset dress dungarees earmuffs flipflops gloves gown hat headband helmet hoodie jacket jeans jersey jumper kilt kimono leggings leotard mittens nightgown overalls overcoat pajamas pants parka poncho pullover pyjamas raincoat robe sandals sari sarong scarf shawl shirt shoes shorts skirt slippers socks stockings suit sunglasses sweater sweatshirt swimsuit tie tights toga top trainers trousers tshirt tuxedo uniform vest waistcoat wetsuit',
  'Body parts':
    'ankle arm armpit artery back belly bladder bone brain calf cheek chest chin collarbone ear elbow eye eyebrow eyelash eyelid face finger fingernail foot forehead gum hair hand head heart heel hip intestine jaw kidney knee knuckle leg lip liver lung mouth muscle nail navel neck nerve nose palm pupil rib scalp shin shoulder skin skull spine stomach teeth temple thigh throat thumb toe tongue tooth vein waist wrist',
  'Musical instruments':
    'accordion bagpipes banjo bass bassoon bell bongo bugle castanets cello clarinet cornet cymbals didgeridoo drum drums dulcimer euphonium fiddle flute glockenspiel gong guitar harmonica harp harpsichord horn kazoo keyboard lute lyre mandolin maracas marimba oboe ocarina organ piano piccolo recorder saxophone sitar synthesizer tabla tambourine timpani triangle trombone trumpet tuba ukulele viola violin xylophone zither',
  'Foods & dishes':
    'bagel baguette biryani biscuit bread brownie burger burrito cake casserole cereal cheese chips chowder cookie couscous croissant crumble cupcake curry custard doughnut dumpling egg enchilada falafel fries fudge gnocchi goulash granola gravy hotdog hummus icecream jam jelly kebab ketchup lasagne lasagna macaroni meatball muffin noodles nachos omelette pancake pasta pastry pie pizza popcorn porridge pretzel pudding quiche ramen ravioli rice risotto roll salad sandwich sausage scone soup spaghetti stew sushi taco tart toast tortilla trifle waffle wrap yogurt yoghurt',
  Vehicles:
    'aeroplane airplane ambulance bicycle bike boat bulldozer bus cab camper canoe car caravan carriage coach convertible crane digger dinghy ferry firetruck forklift glider gondola helicopter hovercraft jeep jetski kayak limousine lorry minibus moped motorbike motorcycle pickup raft rickshaw rocket sailboat scooter sedan ship skateboard sled sledge snowmobile spaceship submarine subway tank taxi tractor train tram tricycle trolley truck unicycle van wagon yacht',
};

export const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

const sets = new Map<string, Set<string>>(
  Object.entries(LISTS).map(([k, v]) => [k, new Set(v.split(' '))]),
);

/** Accepts the listed word, or a simple plural of it. */
export function isValidAnswer(category: string, raw: string, letter: string): boolean {
  const a = normalize(raw);
  if (!a.startsWith(letter)) return false;
  const set = sets.get(category);
  if (!set) return false;
  if (set.has(a)) return true;
  if (a.endsWith('es') && set.has(a.slice(0, -2))) return true;
  if (a.endsWith('s') && set.has(a.slice(0, -1))) return true;
  return false;
}

export function examples(category: string, letter: string, limit = 3): string[] {
  return [...(sets.get(category) ?? [])].filter((w) => w.startsWith(letter)).slice(0, limit);
}

export function countFor(category: string, letter: string): number {
  return [...(sets.get(category) ?? [])].filter((w) => w.startsWith(letter)).length;
}

export const PER_ROUND = 6;

export interface Round {
  letter: string;
  categories: string[];
}

/** A letter where each chosen category has at least two listed answers. */
export function makeRound(rng: Rng, avoid: string[]): Round {
  for (;;) {
    const letter = rng.pick('abcdefghiklmnoprstw'.split('').filter((l) => !avoid.includes(l)));
    const fair = Object.keys(LISTS).filter((c) => countFor(c, letter) >= 2);
    if (fair.length >= PER_ROUND)
      return { letter, categories: rng.shuffle(fair).slice(0, PER_ROUND) };
  }
}
