// Maps country names (in English, French, German) to ISO 3166-1 alpha-2 codes
// for displaying flag images in the schedule and leaderboard views.
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  // Albania
  "albania": "al", "albanie": "al", "albanien": "al",
  // Andorra
  "andorra": "ad", "andorre": "ad",
  // Armenia
  "armenia": "am", "arménie": "am", "armenien": "am",
  // Austria
  "austria": "at", "autriche": "at", "österreich": "at",
  // Azerbaijan
  "azerbaijan": "az", "azerbaïdjan": "az", "aserbaidschan": "az",
  // Belarus
  "belarus": "by", "biélorussie": "by", "weißrussland": "by",
  // Belgium
  "belgium": "be", "belgique": "be", "belgien": "be",
  // Bosnia and Herzegovina
  "bosnia and herzegovina": "ba", "bosnie-herzégovine": "ba", "bosnien-herzegowina": "ba", "bosnien und herzegowina": "ba",
  // Bulgaria
  "bulgaria": "bg", "bulgarie": "bg", "bulgarien": "bg",
  // Croatia
  "croatia": "hr", "croatie": "hr", "kroatien": "hr",
  // Cyprus
  "cyprus": "cy", "chypre": "cy", "zypern": "cy",
  // Czech Republic / Czechia
  "czech republic": "cz", "czechia": "cz", "tchéquie": "cz", "république tchèque": "cz", "tschechien": "cz", "tschechische republik": "cz",
  // Denmark
  "denmark": "dk", "danemark": "dk", "dänemark": "dk",
  // England
  "england": "gb-eng", "angleterre": "gb-eng",
  // Estonia
  "estonia": "ee", "estonie": "ee", "estland": "ee",
  // Faroe Islands
  "faroe islands": "fo", "îles féroé": "fo", "färöer": "fo",
  // Finland
  "finland": "fi", "finlande": "fi", "finnland": "fi",
  // France
  "france": "fr", "frankreich": "fr",
  // Georgia
  "georgia": "ge", "géorgie": "ge", "georgien": "ge",
  // Germany
  "germany": "de", "allemagne": "de", "deutschland": "de",
  // Gibraltar
  "gibraltar": "gi",
  // Greece
  "greece": "gr", "grèce": "gr", "griechenland": "gr",
  // Hungary
  "hungary": "hu", "hongrie": "hu", "ungarn": "hu",
  // Iceland
  "iceland": "is", "islande": "is", "island": "is",
  // Ireland / Republic of Ireland
  "ireland": "ie", "republic of ireland": "ie", "irlande": "ie", "irland": "ie",
  // Israel
  "israel": "il",
  // Italy
  "italy": "it", "italie": "it", "italien": "it",
  // Kazakhstan
  "kazakhstan": "kz", "kasachstan": "kz",
  // Kosovo
  "kosovo": "xk",
  // Latvia
  "latvia": "lv", "lettonie": "lv", "lettland": "lv",
  // Liechtenstein
  "liechtenstein": "li",
  // Lithuania
  "lithuania": "lt", "lituanie": "lt", "litauen": "lt",
  // Luxembourg
  "luxembourg": "lu", "luxemburg": "lu",
  // Malta
  "malta": "mt", "malte": "mt",
  // Moldova
  "moldova": "md", "moldavie": "md", "moldawien": "md",
  // Monaco
  "monaco": "mc",
  // Montenegro
  "montenegro": "me", "monténégro": "me",
  // Netherlands
  "netherlands": "nl", "pays-bas": "nl", "niederlande": "nl", "holland": "nl",
  // North Macedonia
  "north macedonia": "mk", "macédoine du nord": "mk", "nordmazedonien": "mk",
  // Northern Ireland
  "northern ireland": "gb-nir", "irlande du nord": "gb-nir", "nordirland": "gb-nir",
  // Norway
  "norway": "no", "norvège": "no", "norwegen": "no",
  // Poland
  "poland": "pl", "pologne": "pl", "polen": "pl",
  // Portugal
  "portugal": "pt",
  // Romania
  "romania": "ro", "roumanie": "ro", "rumänien": "ro",
  // Russia
  "russia": "ru", "russie": "ru", "russland": "ru",
  // San Marino
  "san marino": "sm", "saint-marin": "sm",
  // Scotland
  "scotland": "gb-sct", "écosse": "gb-sct", "schottland": "gb-sct",
  // Serbia
  "serbia": "rs", "serbie": "rs", "serbien": "rs",
  // Slovakia
  "slovakia": "sk", "slovaquie": "sk", "slowakei": "sk",
  // Slovenia
  "slovenia": "si", "slovénie": "si", "slowenien": "si",
  // Spain
  "spain": "es", "espagne": "es", "spanien": "es",
  // Sweden
  "sweden": "se", "suède": "se", "schweden": "se",
  // Switzerland
  "switzerland": "ch", "suisse": "ch", "schweiz": "ch",
  // Turkey / Türkiye
  "turkey": "tr", "türkiye": "tr", "turquie": "tr", "türkei": "tr",
  // Ukraine
  "ukraine": "ua",
  // Wales
  "wales": "gb-wls", "pays de galles": "gb-wls",

  // ── Non-UEFA teams commonly seen in World Cup ──

  // Argentina
  "argentina": "ar", "argentine": "ar", "argentinien": "ar",
  // Australia
  "australia": "au", "australie": "au", "australien": "au",
  // Brazil
  "brazil": "br", "brésil": "br", "brasilien": "br",
  // Cameroon
  "cameroon": "cm", "cameroun": "cm", "kamerun": "cm",
  // Canada
  "canada": "ca", "kanada": "ca",
  // Chile
  "chile": "cl", "chili": "cl",
  // China
  "china": "cn", "chine": "cn",
  // Colombia
  "colombia": "co", "colombie": "co", "kolumbien": "co",
  // Costa Rica
  "costa rica": "cr",
  // Ecuador
  "ecuador": "ec", "équateur": "ec",
  // Egypt
  "egypt": "eg", "égypte": "eg", "ägypten": "eg",
  // Ghana
  "ghana": "gh",
  // Iran
  "iran": "ir",
  // Ivory Coast / Côte d'Ivoire
  "ivory coast": "ci", "côte d'ivoire": "ci", "elfenbeinküste": "ci",
  // Japan
  "japan": "jp", "japon": "jp",
  // Mexico
  "mexico": "mx", "mexique": "mx", "mexiko": "mx",
  // Morocco
  "morocco": "ma", "maroc": "ma", "marokko": "ma",
  // New Zealand
  "new zealand": "nz", "nouvelle-zélande": "nz", "neuseeland": "nz",
  // Nigeria
  "nigeria": "ng",
  // Panama
  "panama": "pa",
  // Paraguay
  "paraguay": "py",
  // Peru
  "peru": "pe", "pérou": "pe",
  // Qatar
  "qatar": "qa", "katar": "qa",
  // Saudi Arabia
  "saudi arabia": "sa", "arabie saoudite": "sa", "saudi-arabien": "sa",
  // Senegal
  "senegal": "sn", "sénégal": "sn",
  // South Korea
  "south korea": "kr", "corée du sud": "kr", "südkorea": "kr",
  // Tunisia
  "tunisia": "tn", "tunisie": "tn", "tunesien": "tn",
  // United States / USA
  "united states": "us", "usa": "us", "états-unis": "us", "vereinigte staaten": "us",
  // Uruguay
  "uruguay": "uy",
  // Venezuela
  "venezuela": "ve",
};

export function getCountryCode(teamName: string): string | null {
  return COUNTRY_NAME_TO_CODE[teamName.trim().toLowerCase()] ?? null;
}
