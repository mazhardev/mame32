/**
 * Original Word Groups puzzles. Each has four groups of four, from the most
 * direct (level 0) to the trickiest (level 3). Several hide a red herring: a
 * word that seems to fit a second group, though only one way of splitting all
 * sixteen words works.
 */
export interface Group {
  name: string;
  words: [string, string, string, string];
  level: 0 | 1 | 2 | 3;
}

type Row = [string, string, 0 | 1 | 2 | 3];
const g = ([name, words, level]: Row): Group => ({ name, words: words.split(' ') as Group['words'], level });

export const PUZZLES: Group[][] = (
  [
    [['Shades of blue', 'NAVY SKY TEAL COBALT', 0], ['Planets', 'MARS VENUS SATURN MERCURY', 1], ['Card games', 'SNAP POKER RUMMY BRIDGE', 2], ['___fish', 'GOLD SWORD STAR CAT', 3]],
    [['Kitchen tools', 'WHISK LADLE SPATULA TONGS', 0], ['Dog breeds', 'BOXER POODLE BEAGLE PUG', 1], ['Things with rings', 'TREE CIRCUS PHONE ONION', 2], ['___board', 'SURF KEY CHESS BILL', 3]],
    [['Weather', 'RAIN SNOW HAIL FOG', 0], ['Chess pieces', 'KING QUEEN ROOK KNIGHT', 1], ['Units of time', 'SECOND MINUTE HOUR DECADE', 2], ['Hidden body parts', 'SHIP EARTH CHINA SHANDY', 3]],
    [['Instruments', 'DRUM FLUTE HARP VIOLIN', 0], ['Sea creatures', 'SHARK OCTOPUS SQUID WHALE', 1], ['Things you can break', 'RECORD PROMISE NEWS ICE', 2], ['___stick', 'LIP CHOP JOY YARD', 3]],
    [['Rainbow colours', 'RED ORANGE YELLOW VIOLET', 0], ['Breakfast foods', 'TOAST CEREAL PANCAKE OMELETTE', 1], ['Things you raise', 'FLAG EYEBROW ALARM BAR', 2], ['Magic ___', 'CARPET WAND TRICK MIRROR', 3]],
    [['Vegetables', 'CARROT CELERY LEEK RADISH', 0], ['Sports with nets', 'TENNIS VOLLEYBALL BADMINTON NETBALL', 1], ['Animals that bark', 'DOG SEAL FOX DEER', 2], ['___cake', 'CUP PAN CHEESE SPONGE', 3]],
    [['Farm animals', 'COW PIG SHEEP GOAT', 0], ['In a classroom', 'DESK CHALK RULER GLOBE', 1], ['Shades of white', 'IVORY PEARL SNOW CREAM', 2], ['Hidden numbers', 'CANINE OFTEN WEIGHT STONE', 3]],
    [['Capital cities', 'PARIS ROME CAIRO LIMA', 0], ['Things with wings', 'PLANE BAT ANGEL BUTTERFLY', 1], ['Hairstyles', 'BOB BUN BRAID MULLET', 2], ['___apple', 'PINE CRAB BIG TOFFEE', 3]],
    [['Bodies of water', 'LAKE RIVER POND SEA', 0], ['Desserts', 'TART MOUSSE SORBET PUDDING', 1], ['A small amount', 'DASH PINCH DROP TRIFLE', 2], ['___bell', 'DOOR BLUE DUMB COW', 3]],
    [['Shapes', 'CIRCLE SQUARE TRIANGLE OVAL', 0], ['Ways to cook', 'BAKE ROAST STEAM GRILL', 1], ['Things you pitch', 'TENT IDEA BALL ROOF', 2], ['Add S in front for a new word', 'NOW HOP PEAR LIP', 3]],
    [['Trees', 'OAK ELM ASH BIRCH', 0], ['In a wallet', 'CARD CASH RECEIPT PHOTO', 1], ['Tennis terms', 'LOVE ACE DEUCE LET', 2], ['Fire___', 'WORK MAN PLACE FLY', 3]],
    [['Breads', 'BAGEL BAGUETTE PITA ROLL', 0], ['Dances', 'TANGO WALTZ SAMBA FOXTROT', 1], ['Dips', 'HUMMUS GUACAMOLE TZATZIKI SALSA', 2], ['Things that roll', 'DICE THUNDER CREDITS EYES', 3]],
    [['Birds', 'ROBIN CROW WREN SWAN', 0], ['Tools', 'HAMMER DRILL WRENCH CHISEL', 1], ['Things with teeth', 'COMB ZIP GEAR SAW', 2], ['Jack___', 'POT KNIFE RABBIT FRUIT', 3]],
    [['Months', 'JANUARY MARCH OCTOBER DECEMBER', 0], ['Board games', 'CHESS CHECKERS LUDO BACKGAMMON', 1], ['Things with faces', 'CLOCK COIN CLIFF DICE', 2], ['___man', 'SNOW POST SPACE MILK', 3]],
    [['Pasta', 'PENNE FUSILLI LASAGNE RAVIOLI', 0], ['Islands', 'CUBA MALTA CRETE BALI', 1], ['Coffee', 'LATTE MOCHA ESPRESSO JAVA', 2], ['Rhymes with BAKE', 'CAKE LAKE SNAKE STEAK', 3]],
    [['Sports', 'GOLF RUGBY HOCKEY POLO', 0], ['Insects', 'BEETLE MOTH ANT CRICKET', 1], ['Things with shells', 'EGG NUT TURTLE SNAIL', 2], ['Car parts', 'WHEEL BRAKE HORN MIRROR', 3]],
    [['Gemstones', 'RUBY EMERALD SAPPHIRE OPAL', 0], ['Flowers', 'ROSE TULIP DAISY LILY', 1], ['___fly', 'BUTTER DRAGON FIRE HOUSE', 2], ['Things you cast', 'SPELL VOTE SHADOW NET', 3]],
    [['Clothes', 'SHIRT SCARF GLOVE SOCK', 0], ['Kitchen appliances', 'OVEN KETTLE TOASTER FRIDGE', 1], ['___ball', 'FOOT BASKET SNOW MEAT', 2], ['Things with pockets', 'KANGAROO JEANS SNOOKER JACKET', 3]],
    [['Hot drinks', 'TEA COFFEE COCOA CHAI', 0], ['In space', 'COMET NEBULA GALAXY ASTEROID', 1], ['Shooting ___', 'STAR PAINS GALLERY RANGE', 2], ['___pot', 'FLOWER CHIMNEY HOT CRACK', 3]],
    [['Ice-cream flavours', 'VANILLA STRAWBERRY PISTACHIO CHOCOLATE', 0], ['Spices', 'CINNAMON NUTMEG PAPRIKA CUMIN', 1], ['In perfect condition', 'MINT PRISTINE SPOTLESS IMMACULATE', 2], ['___stone', 'KEY MILE HAIL BRIM', 3]],
    [['Vehicles', 'TRAM FERRY TAXI VAN', 0], ['Fish', 'COD HADDOCK PLAICE TROUT', 1], ['Things you catch', 'COLD BREATH FIRE FISH', 2], ['Silent first letter', 'KNEE WRIST GNOME PSALM', 3]],
    [['Pets', 'HAMSTER PARROT GOLDFISH KITTEN', 0], ['In a castle', 'MOAT TOWER DUNGEON DRAWBRIDGE', 1], ['___hole', 'BLACK KEY POT RABBIT', 2], ['Palindromes', 'LEVEL RADAR KAYAK CIVIC', 3]],
    [['At the beach', 'SAND SHELL TOWEL PIER', 0], ['Hand gestures', 'WAVE POINT SALUTE CLAP', 1], ['Computer parts', 'MOUSE SCREEN KEYBOARD SPEAKER', 2], ['Potato ___', 'SALAD PEELER MASHER CHIP', 3]],
    [['Big cats', 'LION LEOPARD JAGUAR CHEETAH', 0], ['Star signs', 'ARIES TAURUS GEMINI SCORPIO', 1], ['Things with stripes', 'ZEBRA BARCODE FLAG TIGER', 2], ['___print', 'FOOT FINGER BLUE NEWS', 3]],
    [['In the garden', 'SHED HOSE LAWN FENCE', 0], ['Happy', 'GLAD CHEERFUL JOLLY MERRY', 1], ['Winter festivities', 'HOLLY TINSEL STOCKING CRACKER', 2], ['Snow___', 'MAN FLAKE BALL DRIFT', 3]],
    [['Office supplies', 'STAPLER PEN FOLDER ERASER', 0], ['Noble titles', 'DUKE EARL BARON PRINCE', 1], ['Paper ___', 'CLIP PLANE CUT WEIGHT', 2], ['Things that run', 'RIVER NOSE ENGINE TAP', 3]],
    [['Nuts', 'ALMOND CASHEW WALNUT PECAN', 0], ['Things you crack', 'CODE SAFE JOKE SMILE', 1], ['Parts of a ship', 'DECK MAST HULL KEEL', 2], ['___tie', 'NECK CABLE HOG BOW', 3]],
    [['Fast animals', 'CHEETAH FALCON HARE HORSE', 0], ['Tempo markings', 'ALLEGRO LARGO ADAGIO ANDANTE', 1], ['Magic words', 'ABRACADABRA PRESTO ALAKAZAM SHAZAM', 2], ['Hidden EAR', 'BEARD HEART PEARL LEARN', 3]],
    [['Cheeses', 'BRIE CHEDDAR FETA GOUDA', 0], ['Bicycle parts', 'PEDAL CHAIN SADDLE BELL', 1], ['Past tenses', 'SPOKE WROTE SANG DROVE', 2], ['Shades of yellow', 'LEMON MUSTARD GOLD CANARY', 3]],
    [['School subjects', 'MATHS HISTORY MUSIC SCIENCE', 0], ['Things with a bridge', 'NOSE GUITAR SHIP GLASSES', 1], ['Rocks', 'GRANITE MARBLE SLATE CHALK', 2], ['___work', 'HOME TEAM CLOCK ART', 3]],
  ] as Row[][]
).map((p) => p.map(g));
