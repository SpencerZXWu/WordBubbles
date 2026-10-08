/* ============================================================
   WordBubbles — word bank for the Super Mind hint.
   Common English words, roughly grouped by letter-count below
   for easier maintenance. The engine re-groups them by real
   length at runtime, so any grouping slip is harmless.
   ============================================================ */
const WORDBANK_RAW = `
cat dog sun run red big top hat cup map box bed key ice sea sky car bus pen bag oil eye ear arm leg
egg fox cow pig bee ant owl bat net pot jar van toy joy day way man boy gap job lab mix tax win yes
yet zip hut mud fog log ram rat bug fan gym lip pin tip web wet dry hot mad sad old new low raw oak

book tree door hand food rain wind fire lake road city town bird fish farm milk cake rice star moon king
gold help jump walk talk play read sing swim blue warm cold soft hard fast open shut near year week time
name game home love hope idea dark lamp note word line page sock shoe coat ball doll kite boat ship plan
list mind turn stop move push pull rest real safe same trip path gift girl news park rail sand seat self
side skin soap soil song sort spot stay step tail tale team test text thin true tune type unit user view
vote wait wake wall want wash wave wear well west wide wife wild wine wing wire wise wish wood wool word
work yard zero zone desk drum film gate hero hole iron item joke leaf meal nail noon noun oven pear poem

apple water house light night music river plant grass bread green happy smile table chair clock cloud
storm ocean beach horse sheep mouse tiger heart dream story paper phone radio money train plane sugar
honey fruit juice glass plate spoon knife towel brush shirt skirt dress scarf glove brain voice sound
pride trust value power speed start break watch teach learn write speak think count climb dance laugh
carry catch clean drive enjoy fight serve order price young small large early heavy quiet quick round

orange garden mother father sister friend people animal summer winter spring autumn school minute moment
flower island forest desert valley rabbit monkey turtle donkey pencil letter number circle square silver
golden gentle bright silent strong yellow purple belief future memory travel danger nature doctor farmer
singer writer artist driver planet engine action advice answer author battle better beyond bottle branch
bridge butter button camera candle career custom damage decide defeat degree demand design detail device

morning evening weather holiday teacher student machine station journey picture kitchen bedroom chicken
country village present problem science history english chapter hundred ability absence academy account
achieve address advance airline ancient another arrange article assume attempt attract average balance
barrier battery believe beneath benefit between bicycle brother cabinet captain carrier caution century
certain chamber channel charity charter checked circuit classes classic climate clothes collect college

mountain birthday elephant together tomorrow question sentence daughter exercise hospital computer
football homework notebook absolute abstract accident activity actually addition adequate adjacent
admitted advanced advocate aircraft alliance although announce anything anywhere apparent appeared
approval argument assembly attached attitude audience backbone barriers baseball bathroom becoming
beginning believe benefit besides beverage boundary bracket breaking brilliant brothers building

afternoon breakfast wonderful beautiful important expensive education chocolate vegetable excellent
difficult dangerous everybody celebrate different airplane advantage adventure affection agreement
ambitious anonymous apartment apparatus apparent appointed architect arguments arriving assistant
associate attribute authentic authority available awareness balancing basically biography brilliant

everything impossible themselves background experience understand government technology television
university information environment development performance opportunity comfortable traditional
difference population management particular individual collection successful directions accounting
activities additional advantages advertising agreements agriculture alternative anniversary appearance
`;

const WORDBANK = WORDBANK_RAW.split(/\s+/).filter(Boolean);
