/* ============================================================
   WordBubbles — part-of-speech hints.
   A compact curated dictionary plus light morphology rules so
   inflected forms (walked / walking / walks / easier / babies)
   resolve back to their base word. Unknown words simply show
   no hint rather than a wrong one.
   ============================================================ */
const POS_DATA = {
  'n.': 'air afternoon animal arm baby bag ball basketball beach bean bed bell bike bird birthday ' +
    'boat book boot bowl box boy branch bread breakfast breath bridge brother bubble bus cake camp ' +
    'candle card castle cat chicken child chocolate city class clothes cloud coat collar color corner ' +
    'country cousin cow day deer dog door driver egg elephant end evening face fact family farm farmer ' +
    'father feather foot field finger fire flour flower foam food friend fruit fun game garden gate ' +
    'gift glove goal gold grandmother grass ground group hall hand hat hay hill hobby home homework ' +
    'honey horse hour house instrument job joy kitchen kite lake lap leg library life lunch magnet man ' +
    'market math meal milk mind mistake mixture model monkey month morning mother mountain music name ' +
    'nature neighbor nest night noon note number orange pan pancake paper parent park part party path ' +
    'pet piano picture piece place plan plant plate pool project question rain rainbow rice ring river ' +
    'road robot room salt sand sandwich scarf school science sea season seed shade shape sheep shelf ' +
    'shell shoe shop side sister sky snow snowball snowman soccer soda soil song sound soup spoon ' +
    'spring star stick story street string student sugar summer sun tag tail teacher team tea tent ' +
    'thing tiger time tire tomato town toy tree trunk umbrella vegetable village volcano wall warmth ' +
    'waste water wave way weather weed week wheat window winter word wool work yard year zoo leaves ' +
    'shelves clothes adventure autumn children edge feet guide hen light lot match moment past people ' +
    'pile wind woman worker',

  'v.': 'add arrive ask eat bake become begin believe blow borrow buy break bring build call come care ' +
    'carry change cheer clean close collect cook cut dig draw drink drive dry enjoy fall feed feel ' +
    'fight find fix fly follow forget get give grow hear heat help hide hold jump keep kick know laugh ' +
    'learn leave let lift like live look love make meet mix move open paint pass pick play pour ' +
    'practice press protect pull put rain read rest return ride roll save say score see share shout ' +
    'show sit sleep smell smile sound stand start step stop study swim take talk teach tell thank ' +
    'think throw try turn understand use visit wait wake walk want watch win wish work worry write ' +
    'must should could can ought cover dance frighten goes',
  'v.(past)': 'ate began blew bought broke brought built came drank drew fed fell felt flew found gave ' +
    'got grew heard held hid kept knew left lit lost made met ran sang sat saw shook slept sold stood ' +
    'swam took told woke won wore wrote went said gone done became',

  'adj.': 'afraid alone best better big blue bright brown busy calm careful clear closed cold cool dark ' +
    'different early easy every fair favorite first flat fresh friendly full funny glad golden good ' +
    'gray great green happy hard heavy hot hungry interesting kind large last late little lively long ' +
    'loyal middle new nice old others patient pretty proud quick quiet rainy red right sad safe second ' +
    'short shy simple slow small soft sure tall thick tidy tired true warm wet white wide wild windy ' +
    'wonderful yellow young grand beautiful colorful fallen high huge next',

  'adv.': 'ago almost always far fast here never often once only quickly soon still suddenly together ' +
    'too very later outside everywhere sometimes',

  'prep.': 'along around behind through without across near',

  'pron.': 'another everything everyone someone something anything him these which',

  'interj.': 'hello',

  'num.': 'one two three four six eight nine ten forty hundred half'
};

/* Additional vocabulary for the 80-passage corpus. */
const POS_EXTRA = {
  'n.': `
    ability action actions address area attempt bakery band bathroom bee bees bicycle billions
    bottom brain canvas carrot cars case cause century chair championship cheese chess chicks
    childhood classroom clock clocks coach coal colours communities company competition computers
    continent cooperation copper cream creatures cupboard damage darkness decades desk device
    difference dinner direction disease dishes doctor doctors drum ducks dust emissions energy
    engineer engineers experts eye eyes films firefighter fish fisherman flight floor fog football
    forests fountain gas gases gears generation girl glass governments grandfather grandparents
    guitar habit habits harbour harm head heart hectare hero hospital human ice idea ideas identity
    invention inventions inventor island jars journey journeys juice kilometres lamp lamps land
    language letters levels librarian lighthouse loss machine machines map maps mathematics
    mechanic medicine millions minutes mom money musicians mystery nectar needs neighbour
    neighbours newspaper newspapers nose notebook nuts ocean oceans offer oil opportunity owner
    oxygen pages partnership patience pattern pencils percent phone phones photo photos pink pins
    plane planet plastic players pleasures pollen pond populations posters prices prizes problems
    progress puppy quality race radio radios readers recipe recipes region regions relationship
    result reward rhythms roof roots route routes rubbish rules runners sailor scraps screens
    screws ship ships coin coins king bee habit sign signs skill skills slide smoke sofa
    solution sore sort south space species speech sports square stage stairs station stone stones
    storm storms subject submarines success sunlight sweets table tables talent taps tasks
    televisions thought throat ticket tickets toilet tonnes trade train trains transport trouble
    uncle valley victory view violin visitor visitors voice wallet weekend wetlands wire wood
    workshop world kindness technology scientist scientists expert experts plastic
    pesticide answer apple bar beam blackness chord crowd drought festival flash front hope north problem sketch
  `,
  'v.': `
    adjust appear appeared approach belong blame boil breathe choose chose chosen climb climbs
    complain complains contain cost costs crash decide depend depends disappear disappears
    discover drift drive drove explain explains fail glow hang hit hum hurry hurt imagine join
    lean listen listens lose loses measure measures miss misses offer offers pay prepare produce
    produces reach reaches reduce release remain remains remember remind remove repair repeat
    replaces replace rise run runs seem seems see seen sell set sing sings slide solve speak
    speaks spend spread stay stays suffer survive teach taught tick ticks travel travel wear
    wash washes wag taught beat charge chase exist cannot
  `,
  'v.(past)': `chose chosen drove taught thought seen given beaten worn stuck set hit cost spread
    hurt ran sung spoke bent`,
  'adj.': `
    automatic bad black broad cheap deep delicious difficult distant entire expensive famous
    favourite free frozen global hidden important invisible local loud low main narrow natural
    nervous normal perfect popular proper rare ready real rocky single smooth sore steep strange
    strong stronger terrible tiny unusual useful valuable visible whole worn worst worth wrong able
    careless handy lively lonely muddy sunny funny angry greedy healthy icy lazy noisy salty
    sleepy thirsty tidy ugly worthy broken faint handmade medical northern public regional spiral
    sweet wooden
  `,
  'adv.': `
    abroad ahead already aloud anywhere enough even ever inside instead maybe rather today yet less
    well mostly nearly quite seldom twice usually only soon still together often almost always far
    fast here never once quickly suddenly too very later outside everywhere sometimes ago nowhere online
  `,
  'pron.': `
    anyone nobody none several those whatever myself itself others everything everyone someone
    something anything another him these which
  `,
  'num.': `
    fifty fourteen sixty thirty thousand millions hundred half one two three four six eight nine
    ten forty twenty
  `,
  'prep.': `
    beneath beyond toward across near along around behind through without
  `,
  'interj.': `
    goodbye
  `
};

const POS_MAP = (() => {
  const m = new Map();
  [POS_DATA, POS_EXTRA].forEach(src => {
    Object.keys(src).forEach(tag => {
      const shown = tag.indexOf('(') === -1 ? tag : 'v.';
      src[tag].split(/\s+/).filter(Boolean).forEach(w => m.set(w.toLowerCase(), shown));
    });
  });
  return m;
})();

function posOf(word) {
  const w = String(word || '').toLowerCase();
  if (!w) return null;
  if (POS_MAP.has(w)) return POS_MAP.get(w);

  const has = s => POS_MAP.has(s);

  /* adverbs built from adjectives */
  if (w.length > 4 && w.endsWith('ly')) return 'adv.';

  /* comparatives / superlatives */
  if (w.length > 4 && w.endsWith('iest') && has(w.slice(0, -4) + 'y')) return 'adj.';
  if (w.length > 3 && w.endsWith('ier') && has(w.slice(0, -3) + 'y')) return 'adj.';
  if (w.length > 4 && w.endsWith('est')) return 'adj.';
  if (w.length > 3 && w.endsWith('er')) {
    const b = w.slice(0, -2);
    if (has(b)) return POS_MAP.get(b) === 'n.' ? 'n.' : 'adj.';
  }

  /* -ing */
  if (w.length > 4 && w.endsWith('ing')) {
    const dbl = w.slice(0, -4);
    const cands = [w.slice(0, -3), w.slice(0, -3) + 'e'];
    if (dbl.length > 1 && dbl[dbl.length - 1] === dbl[dbl.length - 2]) cands.push(dbl);
    for (const c of cands) if (has(c)) return POS_MAP.get(c);
    return 'v.';
  }

  /* -ed */
  if (w.length > 3 && w.endsWith('ed')) {
    const dbl = w.slice(0, -3);
    const cands = [w.slice(0, -2), w.slice(0, -1)];
    if (w.endsWith('ied')) cands.push(w.slice(0, -3) + 'y');
    if (dbl.length > 1 && dbl[dbl.length - 1] === dbl[dbl.length - 2]) cands.push(dbl.slice(0, -1));
    for (const c of cands) if (has(c)) return POS_MAP.get(c);
    return 'v.';
  }

  /* plural / third-person forms */
  if (w.length > 3 && w.endsWith('ies') && has(w.slice(0, -3) + 'y')) return POS_MAP.get(w.slice(0, -3) + 'y');
  if (w.length > 3 && w.endsWith('es')) {
    if (has(w.slice(0, -2))) return POS_MAP.get(w.slice(0, -2));
    if (has(w.slice(0, -1))) return POS_MAP.get(w.slice(0, -1));
  }
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) {
    if (has(w.slice(0, -1))) return POS_MAP.get(w.slice(0, -1));
  }

  return null;
}
