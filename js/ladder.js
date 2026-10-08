/* ============================================================
   Word Ladder — walk from one word to another, one letter at a time.

   Change exactly one letter each step and every rung must still be a
   real word:  cat -> cot -> dot -> dog.

   The word bank the rest of the app uses is far too small for this (its
   biggest connected group of four-letter words is only 18 words), so the
   ladder carries its own list of short common words chosen to link up.
   ============================================================ */
const Ladder = (() => {
  const RAW3 = `
    ace act add age ago aid aim air ale all and ant any ape apt arc are ark arm art ash ask ate awe axe
    bad bag ban bar bat bay bed bee beg bet bid big bin bit boa bob bog boo bow box boy bud bug bun bus but buy
    cab cad cam can cap car cat cob cod cog con cop cot cow coy cry cub cue cup cur cut
    dab dad dam day den dew did die dig dim din dip doe dog dot dry dub dud due dug duo dye
    ear eat ebb eel egg ego elf elk elm end era eve ewe eye
    fad fan far fat fax fed fee few fib fig fin fir fit fix flu fly foe fog for fox fry fun fur
    gag gap gas gel gem get gig gin got gum gun gut guy gym
    had hag ham has hat hay hem hen her hew hid him hip his hit hoe hog hop hot how hub hue hug hum hut
    ice icy ilk ill imp ink inn ion ire its ivy
    jab jag jam jar jaw jay jet jig job jog jot joy jug jut
    keg key kid kin kit
    lab lad lag lap law lax lay led leg let lid lie lip lit lob log lot low lug lye
    mad man map mar mat maw may men met mew mid mix mob mod mom mop mow mud mug mum
    nab nag nap nay net new nib nil nip nod nor not now nun nut
    oak oar oat odd ode off oft oil old one orb ore our out owe owl own
    pad pal pan par pat paw pay pea peg pen per pet pew pie pig pin pit ply pod poi pop pot pox pry pub pug pun pup put
    rag ram ran rap rat raw ray red ref rev rib rid rig rim rip rob rod roe rot row rub rue rug rum run rut rye
    sac sad sag sap sat saw sax say sea see set sew she shy sic sin sip sir sit six ski sky sly sob sod son sop sow soy spa spy sty sub sue sum sun sup
    tab tad tag tan tap tar tax tea ten the thy tic tie tin tip toe tog ton too top tot tow toy try tub tug tux two
    ugh urn use
    van vat vet vex via vie vow
    wad wag wan war was wax way web wed wee wok won woo wow wry
    yak yam yap yaw yea yen yes yet yew you
    zag zap zip zoo
  `;
  const RAW4 = `
    able ache acid acre aged ahoy aide ally also alto amid Andy apex arch area army arts atom aunt auto avid away axis
    baby back bade bags bail bait bake bald bale ball balm band bane bang bank bard bare bark barn base bash bask bass bath bats bead beak beam bean bear beat beds beef been beep beer bees beet bell belt bend bent best beta bets bias bide bike bile bill bind bird bite bits bled blew blip blob bloc blot blow blue blur boar boat body boil bold bolt bomb bond bone bony book boom boon boot bore born boss both bout bowl brag bran brat bray bred brew brie brim brow buck buds buff bugs bulb bulk bull bump bunk buns buoy burn burp burr bury bus boy busy buys buzz
    cafe cage cake calf call calm came camp cane cape caps card care carp cars cart case cash cask cast cats cave cede cell cent chap char chat chef chew chic chic chin chip chop chum cite city clad clam clan clap claw clay clip clod clog clot club clue coal coat code coil coin coke cold colt comb come cone cook cool coop cope cops copy cord core cork corn cost cosy cote cows cozy crab crag cram crew crib crop crow crux cube cubs cuff cull cult curb cure curl curt cusp cute cyan
    dabs dado daft dais dale dame damp dare dark darn dart dash data date dawn days daze dead deaf deal dean dear debt deck deed deem deep deer deft defy demo dens dent deny desk dial dice died diet dime dine ding dint dire dirt dish disk dive dock does doff dogs dole doll dolt dome done doom door dope dose dote dots dove down doze drab drag dram draw drew drip drop drum dual duck duct dude duel dues duet duke dull duly dumb dump dune dusk dust duty dyed dyes
    each earl earn ease east easy eats echo edge edit eels eggs egos elks else emit ends envy epic even ever evil exam exes exit
    face fact fade fads fail fair fake fall fame fang fans fare farm fast fate fawn fear feat feed feel fees feet fell felt fend fern feud fief file fill film find fine fins fire firm fish fist fits five flag flak flap flat flaw flax flea fled flee flew flex flip flit flog flop flow flue flux foal foam foes fold folk fond font food fool foot ford fore fork form fort foss foul four fowl foes frog from fuel full fume fund funk furl fury fuse fuss fuzz
    gabs gage gaga gale gall game gang gape gaps garb gate gave gaze gear geek gems gene gent germ gets gift gild gill gilt gird girl gist give glad glee glen glib glob glow glue glum glut gnat gnaw goad goal goat gods goes gold golf gone gong good goof gore gory gosh gout gown grab grad gram gray grew grid grim grin grip grit grow grub gulf gull gulp gums gunk guns gush gust guts guys gyms
    habit? h, hack hail hair hale half hall halo halt hand hang hard hare hark harm harp hart hash hasp hate hats haul have hawk hays haze hazy head heal heap hear heat heck heed heel heft heir held hell helm help hemp hens herb herd here hero hers hewn hick hide high hike hill hilt hind hint hips hire hiss hits hive hoax hobo hock hoed hogs hold hole holy home hone honk hood hoof hook hoop hops horn hose host hots hove howl hubs hued hues huge hugs hulk hull hump hung hunk hunts hurt hush husk huts hymn
    ibex ibis iced ices icky icon idea idle idly idol iffy ills imps inch info inks inky inns into ions iota iris iron item
    jabs jack jade jail jamb jams jars jaunt jaw jazz jeep jeer jell jerk jest jets jilt jive jobs jock jogs john join joke jolt jots joys judo jugs july jump junk jury just jute
    kale keen keep kegs kelp kept keys kick kids kilt kind king kink kiss kite kits kiwi knee knew knit knob knot know
    labs lace lack lacy lade lads lady laid lain lair lake lamb lame lamp land lane lank laps lard lark lash lass last late lath laud lava lawn laws lays laze lazy lead leaf leak lean leap left legs lend lens lent less lest lets levy liar libs lice lick lids lied lien lies life lift like lilt lily limb lime limp line link lint lion lips lisp list live load loaf loam loan lobe lobs lock loft logo logs loin lone long look loom loop loot lord lore lose loss lost lots loud love lows luck luge lull lump lung lure lurk lush lust lute
    made maid mail maim main make male mall malt mane many maps mare mark mars mash mask mass mast mate math mats maul maze mead meal mean meat meek meet meld melt memo mend menu meow mere mesa mesh mess mice mild mile milk mill mime mind mine mini mink mint mire miss mist mite moan moat mock mode mold mole monk mood moon moor moot mope more moss most moth move mown much muck mugs mule mull mums murk muse mush musk must mute mutt myth
    nail name nape navy near neat neck need neon nerd nest nets news newt next nibs nice nick nigh nine nips node nods noel none nook noon norm nose nosy note noun nova nubs nude null numb nuns nuts
    oaks oars oath oats obey oboe odds odes odor offs ogle ogre oils oily oink okay okra olds omen omit once ones only onto onyx ooze opal open opts oral orbs orca ores ours oust ours oval oven over ovum owed owes owls owns oxen
    pace pack pads page paid pail pain pair pale pall palm pals panc pane pang pans pant papa park part pass past pate path pats pave pawn paws pays peak peal pear peas peat peck peek peel peep peer pegs pelt pens pent peon perks perm pert peso pest pets pews pick pied pier pies pigs pike pile pill pine ping pink pins pint pipe pits pity plan play plea pled plod plop plot plow ploy plug plum plus pods poem poet poke pole poll polo pond pony pool poor pope pops pore pork port pose posh post posy pots pour pout pray prep prey prim prod prom prop pros prow pubs puck puff pull pulp puma pump punk puns punt pupa pups pure purr push puts pyre
    quay quip quit quiz
    race rack racy raft rage rags raid rail rain rake ramp rang rank rant rape rapt rare rash rasp rate rats rave rays raze read real ream reap rear redo reds reed reef reek reel refs rein rely rend rent rest ribs rice rich ride rife rift rigs rile rill rims rind ring rink riot ripe rise risk rite road roan roar robe robs rock rode rods roil role roll romp roof rook room root rope rose rosy rote rout rove rows ruby ruck rudd rude rued rugs ruin rule rump rung runs runt ruse rush rusk rust ruts
    sack safe saga sage said sail sake sale salt same sand sane sang sank sash sass save sawn saws says scab scam scan scar seal seam seat sect seed seek seem seen seep seer sees self sell semi send sent sept sets sewn shed shim shin ship shoe shop shot show shun shut sick side sift sigh sign silk sill silo silt sing sink sins sips sire site sits size skew skid skim skin skip skit slab slam slap slat slay sled slew slid slim slip slit slob slog slop slot slow slug slum slur smog smug snag snap snip snob snow snub snug soak soap soar sobs sock soda sofa soft soil sold sole soli solo some song sons soon soot sore sort soul soup sour sown sows spam span spar spat spec sped spew spin spit spot spun spur stab stag star stat stay stem step stew stir stop stow stub stud stun subs such suds sued sues suit sulk sumo sums sung sunk suns sure surf swab swam swan swap swat sway swig swim swum sync
    tabs tack taco tact tags tail take talc tale talk tall tame tamp tang tank tans tape taps tars tart task taut taws teak teal team tear tease tech teem teen tell temp tend tens tent term tern test text than that thaw thee them then they thin this thou thud thug thus tick tics tide tidy tied tier ties tile till tilt time tine tint tiny tips tire toad toes tofu toga togs toil told toll tomb tome tone tons took tool toot tore torn tort toss tote tots tour tout town tows toys tram trap tray tree trek trim trio trip trod trot true tuba tube tubs tuck tuft tuna tune tuns turf turn tusk tutu twig twin twit type typo
    ugly undo unit unto upon urdu urge urns used user uses
    vain vale vane vans vase vast veal veer veil vein vend vent verb very vest veto vets vial vibe vice vids view vile vine visa vise void volt vote vows
    wade wads wage waft wags waif wail wait wake walk wall wand wane want ward ware warm warn warp wars wart wary wash wasp watt wave wavy waxy ways weak wean wear webs weds weed week weep weft weld well welt went wept were west wham what when whet whey whim whip whir whit whiz whoa whom wick wide wife wigs wild will wilt wily wind wine wing wink wins wipe wire wiry wise wish wisp with wits woes woke wolf womb wons wood wool word wore work worm worn wove wrap wren writ
    yaks yams yank yaps yard yarn yawn yeah year yeas yell yelp yoga yoke yolk yond yore your yowl yule
    zany zeal zebra? zed zero zest zinc zips zone zoom zoos
  `;
  const BANKS = {
    3: RAW3.split(/\s+/).map(w => w.trim().toLowerCase()).filter(w => /^[a-z]{3}$/.test(w)),
    4: RAW4.split(/\s+/).map(w => w.trim().toLowerCase()).filter(w => /^[a-z]{4}$/.test(w))
  };
  BANKS[3] = Array.from(new Set(BANKS[3]));
  BANKS[4] = Array.from(new Set(BANKS[4]));

  const LEVELS = [
    { key: 'easy', label: '3 letters', n: 3, minPath: 3, maxPath: 4, base: 80, par: 120,
      desc: 'Short words like cat and dog. Only three or four steps apart.' },
    { key: 'medium', label: '4 letters', n: 4, minPath: 4, maxPath: 5, base: 130, par: 260,
      desc: 'Four-letter words four or five steps apart.' },
    { key: 'hard', label: '4 letters, longer', n: 4, minPath: 5, maxPath: 6, base: 170, par: 380,
      desc: 'Four-letter words five or six steps apart. Think a little ahead.' }
  ];

  const cfgOf = key => LEVELS.filter(l => l.key === key)[0] || LEVELS[0];
  const MIN_RATIO = 0.4, MAX_POINTS = 300, PAR_BONUS = 30;

  const CACHE = {};

  /* Words of one length, wired up wherever two differ by a single letter. */
  function graph(n) {
    if (CACHE[n]) return CACHE[n];
    const words = BANKS[n] || [];
    const adj = new Map();
    words.forEach(w => adj.set(w, []));
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) {
        const a = words[i], b = words[j];
        let d = 0;
        for (let k = 0; k < n; k++) if (a[k] !== b[k]) d++;
        if (d === 1) { adj.get(a).push(b); adj.get(b).push(a); }
      }
    }
    /* keep the biggest connected family — small side groups make dead ends */
    const seen = new Set();
    let best = [];
    words.forEach(w => {
      if (seen.has(w)) return;
      const comp = [];
      const q = [w];
      seen.add(w);
      while (q.length) {
        const cur = q.shift();
        comp.push(cur);
        adj.get(cur).forEach(x => { if (!seen.has(x)) { seen.add(x); q.push(x); } });
      }
      if (comp.length > best.length) best = comp;
    });
    const set = new Set(best);
    const adj2 = new Map();
    best.forEach(w => adj2.set(w, adj.get(w).filter(x => set.has(x))));
    CACHE[n] = { n: n, words: best, adj: adj2, set: set };
    return CACHE[n];
  }

  const isWord = (n, w) => graph(n).set.has(w);

  /* Shortest chain of words from `a` to `b`, inclusive. */
  function pathBetween(n, a, b) {
    const g = graph(n);
    if (!g.set.has(a) || !g.set.has(b)) return null;
    const prev = new Map([[a, null]]);
    const q = [a];
    while (q.length) {
      const cur = q.shift();
      if (cur === b) break;
      g.adj.get(cur).forEach(x => {
        if (prev.has(x)) return;
        prev.set(x, cur);
        q.push(x);
      });
    }
    if (!prev.has(b)) return null;
    const out = [];
    for (let cur = b; cur; cur = prev.get(cur)) out.push(cur);
    return out.reverse();
  }

  function pickPair(n, minPath, maxPath) {
    const g = graph(n);
    for (let attempt = 0; attempt < 60; attempt++) {
      const start = g.words[(Math.random() * g.words.length) | 0];
      /* BFS out from the start until we find a word in the distance window */
      const dist = new Map([[start, 0]]);
      const q = [start];
      const pool = [];
      while (q.length) {
        const cur = q.shift();
        const d = dist.get(cur);
        if (d > maxPath) break;
        if (d >= minPath) pool.push(cur);
        g.adj.get(cur).forEach(x => {
          if (dist.has(x)) return;
          dist.set(x, d + 1);
          q.push(x);
        });
      }
      if (pool.length) {
        const target = pool[(Math.random() * pool.length) | 0];
        const path = pathBetween(n, start, target);
        if (path && path.length - 1 === dist.get(target)) {
          return { start: start, target: target, path: path };
        }
      }
    }
    return null;
  }

  function start(level) {
    const cfg = cfgOf(level);
    let pair = null;
    for (let i = 0; i < 12 && !pair; i++) pair = pickPair(cfg.n, cfg.minPath, cfg.maxPath);
    if (!pair) pair = pickPair(cfg.n, 3, 9);            // last resort
    return {
      level: cfg.key, label: cfg.label, size: cfg.n,
      base: cfg.base, parSec: cfg.par,
      startWord: pair.start, target: pair.target,
      solution: pair.path, par: pair.path.length - 1,
      ladder: [pair.start], hints: 0, rejects: 0,
      status: 'playing', startedAt: Date.now(), elapsedMs: 0
    };
  }

  const current = st => st.ladder[st.ladder.length - 1];

  /* One letter changed, a real word, not already used. Returns a reason code. */
  function check(st, raw) {
    const w = String(raw || '').trim().toLowerCase();
    if (w.length !== st.size) return { ok: false, why: 'length' };
    if (w === current(st)) return { ok: false, why: 'same' };
    if (st.ladder.indexOf(w) >= 0) return { ok: false, why: 'used' };
    let d = 0;
    const cur = current(st);
    for (let i = 0; i < st.size; i++) if (cur[i] !== w[i]) d++;
    if (d !== 1) return { ok: false, why: 'change' };
    if (!isWord(st.size, w)) return { ok: false, why: 'unknown' };
    return { ok: true, word: w };
  }

  function play(st, raw) {
    const r = check(st, raw);
    if (!r.ok) { st.rejects++; return r; }
    st.ladder.push(r.word);
    const done = r.word === st.target;
    if (done) st.status = 'solved';
    return { ok: true, word: r.word, solved: done, steps: st.ladder.length - 1 };
  }

  /* Drop the next word of the shortest chain onto the ladder. */
  function hint(st) {
    if (st.status !== 'playing') return { ok: false };
    const cur = current(st);
    for (let i = 0; i < st.solution.length - 1; i++) {
      if (st.solution[i] !== cur) continue;
      const next = st.solution[i + 1];
      st.ladder.push(next);
      st.hints++;
      const done = next === st.target;
      if (done) st.status = 'solved';
      return { ok: true, word: next, solved: done };
    }
    /* the player has wandered off the ideal chain — walk back to the target */
    const rest = pathBetween(st.size, cur, st.target);
    if (!rest || rest.length < 2) return { ok: false };
    st.ladder.push(rest[1]);
    st.hints++;
    const done = rest[1] === st.target;
    if (done) st.status = 'solved';
    return { ok: true, word: rest[1], solved: done };
  }

  function undo(st) {
    if (st.status !== 'playing' || st.ladder.length < 2) return false;
    st.ladder.pop();
    return true;
  }

  function finish(st) {
    const cfg = cfgOf(st.level);
    const seconds = Math.max(1, Math.round((st.elapsedMs || 0) / 1000));
    const steps = st.ladder.length - 1;
    const solved = st.status === 'solved';
    const ratio = solved ? Math.max(MIN_RATIO, Math.min(1, st.par / Math.max(st.par, steps))) : 0;
    const optimal = solved && steps === st.par;
    return {
      level: st.level, label: st.label, size: st.size,
      solved: solved, seconds: seconds, steps: steps, par: st.par,
      hints: st.hints, rejects: st.rejects, optimal: optimal,
      startWord: st.startWord, target: st.target, ladder: st.ladder.slice(),
      base: cfg.base, parSec: cfg.par,
      points: solved
        ? Math.max(0, Math.min(MAX_POINTS, Math.round(cfg.base * ratio) + (optimal ? PAR_BONUS : 0)))
        : 0
    };
  }

  return {
    LEVELS: LEVELS, cfgOf: cfgOf, start: start, current: current,
    check: check, play: play, hint: hint, undo: undo, finish: finish,
    graph: graph, isWord: isWord, pathBetween: pathBetween,
    banks: BANKS, MAX_POINTS: MAX_POINTS
  };
})();
