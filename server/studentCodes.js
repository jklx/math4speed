const crypto = require('crypto');

// Fixed pool: science, music, literature, art, exploration and civil courage.
// See studentCodePersonalities.md before extending it.
const PERSONALITIES = Object.freeze([
  // Science and mathematics
  'MarieCurie', 'AlbertEinstein', 'WilhelmRöntgen', 'AdaLovelace', 'EmmyNoether', 'LiseMeitner',
  'SophieGermain', 'MaryAnning', 'RosalindFranklin', 'KatherineJohnson',
  'IsaacNewton', 'GalileoGalilei', 'JohannesKepler', 'NikolausKopernikus', 'MichaelFaraday',
  'JamesMaxwell', 'AndreAmpere', 'GeorgOhm', 'AlessandroVolta', 'HeinrichHertz',
  'MaxPlanck', 'NielsBohr', 'MaxBorn', 'PierreCurie', 'HenriBecquerel',
  'LouisPasteur', 'AlexanderFleming', 'CharlesDarwin', 'GregorMendel', 'CarlGauß',
  'LeonhardEuler', 'CarlJacobi', 'AugustMöbius', 'DavidHilbert', 'BernhardRiemann',
  'AlanTuring', 'GraceHopper', 'HedyLamarr', 'HedwigKohn', 'CarolineHerschel',
  // Composers
  'JohannSebastianBach', 'WolfgangAmadeusMozart', 'LudwigVanBeethoven', 'ClaraSchumann', 'RobertSchumann',
  'FelixMendelssohn', 'FannyHensel', 'FranzSchubert', 'JosephHaydn', 'AntonioVivaldi',
  'GeorgFriedrichHändel', 'GeorgPhilippTelemann', 'FredericChopin', 'EdvardGrieg', 'AntoninDvorak',
  'BedrichSmetana', 'CamilleSaintSaens', 'MauriceRavel', 'ErikSatie', 'GioachinoRossini',
  // Literature
  'AstridLindgren', 'MichaelEnde', 'ErichKästner', 'NellySachs', 'JohannWolfgangGoethe',
  'FriedrichSchiller', 'GottholdLessing', 'TheodorFontane', 'TheodorStorm', 'AnnetteVonDrosteHülshoff',
  'HansChristianAndersen', 'JulesVerne', 'VictorHugo', 'JaneAusten', 'BeatrixPotter',
  'SelmaLagerlöf', 'ToveJansson', 'OtfriedPreußler', 'JudithKerr', 'JamesKrüss',
  // Art
  'LeonardoDaVinci', 'AlbrechtDürer', 'CasparDavidFriedrich', 'ClaudeMonet', 'VincentVanGogh',
  'PaulCezanne', 'AugustMacke', 'FranzMarc', 'GabrieleMünter', 'PaulaModersohnBecker',
  // Accessibility, civil rights and civil courage
  'LouisBraille', 'RosaParks', 'SophieScholl', 'HansScholl', 'AnneFrank',
  'BerthaVonSuttner', 'MartinLutherKing', 'HarrietTubman', 'IrenaSendler', 'ElisabethSelbert',
  // Natural history, exploration and spaceflight
  'AlexanderVonHumboldt', 'MariaSibyllaMerian', 'GeorgForster', 'AlfredWegener',
  'FridtjofNansen', 'RoaldAmundsen', 'NeilArmstrong', 'SallyRide'
]);

function validateStudentCodeStyle(style = 'animals') {
  if (style !== 'animals' && style !== 'personalities') {
    throw new Error('Bitte Tiere oder bekannte Persönlichkeiten für die Schülerkennungen auswählen.');
  }
  return style;
}

const ADJECTIVES = [
  'alter', 'aufmerksamer', 'bunter', 'blauer', 'brauner', 'breiter', 'cooler', 'dunkler',
  'edler', 'eifriger', 'feiner', 'flinker', 'fleißiger', 'froher', 'fröhlicher', 'freundlicher',
  'furchtloser', 'geduldiger', 'gelber', 'genauer', 'goldener', 'grüner', 'großer', 'guter',
  'heller', 'hübscher', 'junger', 'klarer', 'kleiner', 'kluger', 'kräftiger', 'leiser',
  'lustiger', 'mutiger', 'neuer', 'netter', 'neugieriger', 'rascher', 'roter', 'ruhiger',
  'sanfter', 'scharfer', 'schneller', 'schlauer', 'schöner', 'schwarzer', 'silberner', 'starker',
  'stiller', 'stolzer', 'tapferer', 'toller', 'treuer', 'wacher', 'warmer', 'weißer',
  'weiter', 'wilder', 'wunderbarer', 'zäher', 'zarter', 'zufriedener', 'zuverlässiger', 'abenteuerlicher',
  'behutsamer', 'beweglicher', 'blitzschneller', 'braver', 'cleverer', 'drolliger', 'entspannter', 'farbiger',
  'fantastischer', 'fester', 'funkelnder', 'friedlicher', 'geheimnisvoller', 'geschickter', 'glänzender', 'heiterer',
  'hilfsbereiter', 'himmelblauer', 'humorvoller', 'kühner', 'langer', 'lebendiger', 'liebenswerter', 'lockerer',
  'majestätischer', 'munterer', 'nachtblauer', 'orangefarbener', 'pfiffiger', 'prächtiger', 'quirliger', 'reifer',
  'schimmernder', 'sorgfältiger', 'sonniger', 'sportlicher', 'strahlender', 'stürmischer', 'süßer', 'unerschrockener',
  'verspielter', 'violetter', 'vorsichtiger', 'wagemutiger', 'wieselflinker', 'windiger', 'zauberhafter', 'zielstrebiger',
  'zierlicher', 'zimtfarbener', 'zukunftsfreudiger', 'aufgeweckter', 'ausdauernder', 'berühmter', 'charmanter', 'dynamischer',
  'eleganter', 'frischer', 'gediegener', 'gemütlicher', 'hellwacher', 'kunterbunter', 'souveräner', 'spritziger'
];

const NOUNS = [
  'Adler', 'Albatros', 'Bär', 'Biber', 'Dachs', 'Drache', 'Delfin', 'Elch',
  'Falke', 'Fisch', 'Flamingo', 'Fuchs', 'Gecko', 'Gepard', 'Hase', 'Igel',
  'Käfer', 'Kater', 'Kranich', 'Krokodil', 'Lachs', 'Löwe', 'Luchs', 'Marder',
  'Maulwurf', 'Milan', 'Mond', 'Panda', 'Papagei', 'Pinguin', 'Rabe', 'Reiher',
  'Robbe', 'Schwan', 'Seehund', 'Steinbock', 'Stern', 'Storch', 'Tiger', 'Uhu',
  'Wal', 'Waschbär', 'Wiesel', 'Wolf', 'Yak', 'Zebra', 'Ameisenbär', 'Axolotl',
  'Barsch', 'Bussard', 'Chamäleon', 'Dingo', 'Eisbär', 'Eichhörnchen', 'Eisvogel', 'Elefant',
  'Esel', 'Fasan', 'Fledermaus', 'Frettchen', 'Frosch', 'Giraffe', 'Gorilla', 'Hamster',
  'Hermelin', 'Hirsch', 'Husky', 'Kamel', 'Känguru', 'Kauz', 'Koala', 'Kojote',
  'Kolibri', 'Kormoran', 'Krabbe', 'Lama', 'Leopard', 'Libelle', 'Löffelhund', 'Lori',
  'Mammut', 'Meerkatze', 'Molch', 'Narwal', 'Nashorn', 'Okapi', 'Orang-Utan', 'Orca',
  'Otter', 'Pavian', 'Pelikan', 'Pfau', 'Puma', 'Putzfisch', 'Reh', 'Rentier',
  'Rochen', 'Säbelzahntiger', 'Salamander', 'Seeadler', 'Seepferdchen', 'Skorpion', 'Sperber', 'Tapir',
  'Tukan', 'Wachtel', 'Walross', 'Wanderfalke', 'Waran', 'Widder', 'Wildschwein', 'Ziegenbock',
  'Zitteraal', 'Zobel', 'Zugvogel', 'Zwergpinguin', 'Büffel', 'Dromedar', 'Erdmännchen', 'Feldhase',
  'Berglöwe', 'Blauwal', 'Erdwolf', 'Goldfisch', 'Murmeltier', 'Nebelkrähe', 'Schneeleopard', 'Steinadler'
];

const FEMININE_NOUNS = new Set([
  'Fledermaus', 'Giraffe', 'Krabbe', 'Libelle', 'Meerkatze', 'Nebelkrähe', 'Robbe', 'Wachtel'
]);

const NEUTER_NOUNS = new Set([
  'Chamäleon', 'Dromedar', 'Eichhörnchen', 'Erdmännchen', 'Frettchen', 'Hermelin',
  'Kamel', 'Känguru', 'Krokodil', 'Lama', 'Mammut', 'Murmeltier', 'Nashorn', 'Okapi',
  'Reh', 'Rentier', 'Seepferdchen', 'Walross', 'Wiesel', 'Wildschwein', 'Zebra'
]);

function inflectAdjective(adjective, noun) {
  const stem = adjective.slice(0, -2);
  if (FEMININE_NOUNS.has(noun)) return `${stem}e`;
  if (NEUTER_NOUNS.has(noun)) return `${stem}es`;
  return adjective;
}

function formatStudentCode(adjective, noun, suffix) {
  return `${inflectAdjective(adjective, noun)}${noun}${suffix}`;
}

function createStudentCode(style = 'animals') {
  validateStudentCodeStyle(style);
  if (style === 'personalities') {
    const personality = PERSONALITIES[crypto.randomInt(PERSONALITIES.length)];
    return `${personality}${String(crypto.randomInt(0, 10000)).padStart(4, '0')}`;
  }
  const suffix = String(crypto.randomInt(0, 10));
  const adjective = ADJECTIVES[crypto.randomInt(ADJECTIVES.length)];
  const noun = NOUNS[crypto.randomInt(NOUNS.length)];
  return formatStudentCode(adjective, noun, suffix);
}

function normalizeStudentCode(value) {
  return String(value || '').trim().toLocaleLowerCase('de-DE').replace(/[\s\-‐‑–—]+/g, '');
}

module.exports = { createStudentCode, formatStudentCode, normalizeStudentCode, validateStudentCodeStyle, PERSONALITIES };
