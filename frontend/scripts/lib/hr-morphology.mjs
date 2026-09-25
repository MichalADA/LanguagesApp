/**
 * Minimalna morfologia chorwacka dla kursu A1 (bez zależności, deterministyczna).
 *
 * Z rekordów słownictwa CSV wyprowadza formy potrzebne generatorowi:
 *  - leksykon kategorii ({acc}, {loc}, {pres1}, {pp.self}…) do ram odpowiedzi w dialogach,
 *  - zbiór form danego słowa/lematu (dobór przykładów do kart słów, test „nic przed nauczeniem”),
 *  - pary rodzaju męski ↔ żeński (odpowiedzi o sobie: umoran/umorna, radio/radila).
 * Reguły pokrywają słownictwo kursu; wyjątki są wypisane jawnie. Nadmiar form jest nieszkodliwy
 * (służą do akceptowania i dopasowania), brak formy oznacza tylko węższą akceptację.
 */

const VOWELS = /[aeiou]/g;
const syllables = (w) => (w.match(VOWELS) ?? []).length;
const SOFT_END = /(j|lj|nj|č|ć|dž|đ|š|ž|c)$/;
const low = (s) => s.toLocaleLowerCase("hr");

/* ---------------- Rzeczowniki ---------------- */

/** Rdzeń przypadków zależnych, gdy w mianowniku jest ruchome „a” (pas → psa). */
const FLEETING_NOUN = {
  pas: "ps", otac: "oc", novac: "novc", sastanak: "sastank", stupanj: "stupnj", doručak: "doručk", ručak: "ručk",
  petak: "petk", četvrtak: "četvrtk", utorak: "utork", ponedjeljak: "ponedjeljk", tjedan: "tjedn", polazak: "polask",
  dolazak: "dolask", vjetar: "vjetr", centar: "centr", ugao: "ugl", pijesak: "pijesk",
};
/** Rzeczowniki żywotne rodzaju męskiego: biernik = dopełniacz (brat → brata). */
const ANIMATE = new Set([
  "brat", "otac", "djed", "sin", "muž", "pas", "prijatelj", "susjed", "učitelj", "liječnik", "inženjer", "prodavač",
  "student", "učenik", "konobar", "turist", "putnik", "tata",
]);
/** Rzeczowniki żeńskie zakończone spółgłoską (odmiana na -i). */
const I_STEM = new Set(["obitelj", "noć", "jesen", "pomoć", "riječ", "kći", "ponoć"]);
/** Formy nieregularne (nadpisują reguły). */
const NOUN_OVERRIDES = {
  pas: { pl: ["psi", "pse"] },
  kći: { acc: ["kćer"], gen: ["kćeri"], loc: ["kćeri"], ins: ["kćeri"] },
  dijete: { acc: ["dijete"], gen: ["djeteta"], loc: ["djetetu"], ins: ["djetetom"], pl: ["djeca", "djecu"] },
  djeca: { acc: ["djecu"], gen: ["djece"], loc: ["djeci"], ins: ["djecom"] },
  roditelji: { acc: ["roditelje"], gen: ["roditelja"], loc: ["roditeljima"], ins: ["roditeljima"] },
  prijatelji: { acc: ["prijatelje"], gen: ["prijatelja"], loc: ["prijateljima"], ins: ["prijateljima"] },
  naočale: { acc: ["naočale"], gen: ["naočala"], loc: ["naočalama"], ins: ["naočalama"] },
  poljska: { gen: ["poljske"], loc: ["poljskoj"], acc: ["poljsku"], ins: ["poljskom"] },
  hrvatska: { gen: ["hrvatske"], loc: ["hrvatskoj"], acc: ["hrvatsku"], ins: ["hrvatskom"] },
  vrijeme: { gen: ["vremena"], loc: ["vremenu"], ins: ["vremenom"], acc: ["vrijeme"] },
  more: { ins: ["morem"], loc: ["moru"], gen: ["mora"], acc: ["more"] },
  sunce: { ins: ["suncem"], loc: ["suncu"], gen: ["sunca"], acc: ["sunce"] },
};
const PREPOSITIONS = new Set(["za", "u", "na", "i", "s", "sa", "od", "do", "kod", "iz", "bez", "po", "o"]);

function nounForms(word) {
  const w = low(word);
  const out = { nom: [w], acc: [], gen: [], loc: [], ins: [], pl: [] };
  const o = NOUN_OVERRIDES[w];
  if (w.endsWith("a") && !I_STEM.has(w)) {
    const s = w.slice(0, -1);
    const locStem = s.replace(/k$/, "c").replace(/g$/, "z");
    Object.assign(out, { acc: [s + "u"], gen: [s + "e"], loc: [locStem + "i"], ins: [s + "om"], pl: [s + "e"] });
  } else if (/[oe]$/.test(w)) {
    const s = w.slice(0, -1);
    Object.assign(out, { acc: [w], gen: [s + "a"], loc: [s + "u"], ins: [s + (w.endsWith("e") && SOFT_END.test(s) ? "em" : "om")], pl: [s + "a"] });
  } else if (I_STEM.has(w)) {
    Object.assign(out, { acc: [w], gen: [w + "i"], loc: [w + "i"], ins: [w + "i"], pl: [w + "i"] });
  } else if (w.endsWith("i")) {
    const s = w + "j"; // taksi → taksija, hobi → hobija
    Object.assign(out, { acc: [w], gen: [s + "a"], loc: [s + "u"], ins: [s + "em"], pl: [s + "i"] });
  } else {
    const s = FLEETING_NOUN[w] ?? w;
    const gen = s + "a";
    const mono = syllables(w) === 1;
    const plural = mono ? [w + (SOFT_END.test(w) ? "evi" : "ovi"), w + (SOFT_END.test(w) ? "eve" : "ove")] : [s + "i", s + "e"];
    Object.assign(out, { acc: [ANIMATE.has(w) ? gen : w], gen: [gen], loc: [s + "u"], ins: [s + (SOFT_END.test(s) ? "em" : "om")], pl: plural });
  }
  if (o) for (const [k, v] of Object.entries(o)) out[k] = v;
  return out;
}

/** Wyrażenie rzeczownikowe (bijela kava, krema za sunčanje): odmienia słowa przed pierwszym przyimkiem. */
function phraseAcc(phrase) {
  const words = low(phrase).split(/\s+/);
  const cut = words.findIndex((x, i) => i > 0 && PREPOSITIONS.has(x));
  const head = cut < 0 ? words : words.slice(0, cut);
  const tail = cut < 0 ? [] : words.slice(cut);
  const last = head.length - 1;
  const accHead = head.map((x, i) => (x.endsWith("a") ? x.slice(0, -1) + "u" : i === last ? nounForms(x).acc[0] : x));
  return [...accHead, ...tail].join(" ");
}

/* ---------------- Czasowniki ---------------- */

const PRES_OVERRIDES = {
  jesti: ["jedem"], piti: ["pijem"], ići: ["idem"], plesati: ["plešem"], trčati: ["trčim"], ustati: ["ustajem", "ustanem"],
  razumjeti: ["razumijem"], prijeći: ["prijeđem"], stići: ["stignem", "stižem"], pronaći: ["pronađem"], naći: ["nađem"],
  pokazati: ["pokažem"], opisati: ["opišem"], napisati: ["napišem"], sastati: ["sastanem"], zvati: ["zovem"],
  odabrati: ["odaberem"], poznati: ["poznajem", "poznam"], htjeti: ["hoću"], moći: ["mogu"], spavati: ["spavam"],
  kupati: ["kupam"], doći: ["dođem"], trebati: ["trebam"], preporučiti: ["preporučim", "preporučujem"],
};
const PP_OVERRIDES = {
  jesti: ["jeo", "jela", "jeli"], ići: ["išao", "išla", "išli"], naći: ["našao", "našla", "našli"], pronaći: ["pronašao", "pronašla", "pronašli"],
  prijeći: ["prešao", "prešla", "prešli"], stići: ["stigao", "stigla", "stigli"], moći: ["mogao", "mogla", "mogli"],
  htjeti: ["htio", "htjela", "htjeli"], biti: ["bio", "bila", "bili"], doći: ["došao", "došla", "došli"],
};

function present1(inf) {
  if (PRES_OVERRIDES[inf]) return PRES_OVERRIDES[inf];
  if (inf.endsWith("ovati")) return [inf.slice(0, -5) + "ujem"];
  if (inf.endsWith("nuti")) return [inf.slice(0, -4) + "nem"];
  if (inf.endsWith("jeti")) return [inf.slice(0, -4) + "im"];
  if (inf.endsWith("ati")) return [inf.slice(0, -3) + "am"];
  if (inf.endsWith("iti")) return [inf.slice(0, -3) + "im"];
  return [];
}

/** Tryb rozkazujący z formy 1 os.: skrenem → skreni/skrenite, idem → idi/idite, čitam → čitaj/čitajte, pijem → pij/pijte. */
function imperative(first) {
  if (first.endsWith("am")) { const b = first.slice(0, -1); return [b + "j", b + "jte"]; }
  if (first.endsWith("jem")) { const b = first.slice(0, -2); return [b, b + "te"]; }
  if (first.endsWith("im") || first.endsWith("em")) { const b = first.slice(0, -2); return [b + "i", b + "ite"]; }
  return [];
}

/** Pełny czas teraźniejszy z formy 1 os. (radim → radiš, radi, radimo, radite, rade). */
function presentParadigm(first) {
  if (first === "hoću") return ["hoću", "hoćeš", "hoće", "hoćemo", "hoćete", "hoće"];
  if (first === "mogu") return ["mogu", "možeš", "može", "možemo", "možete", "mogu"];
  const b = first.slice(0, -1);
  if (first.endsWith("am")) return [first, b + "š", b, b + "mo", b + "te", b + "ju"];
  if (first.endsWith("im")) return [first, b + "š", b, b + "mo", b + "te", first.slice(0, -2) + "e"];
  if (first.endsWith("em")) return [first, b + "š", b, b + "mo", b + "te", first.endsWith("jem") ? first.slice(0, -2) + "u" : first.slice(0, -2) + "u"];
  return [first];
}

function participles(inf) {
  if (PP_OVERRIDES[inf]) return PP_OVERRIDES[inf];
  if (inf.endsWith("jeti")) { const s = inf.slice(0, -4); return [s + "io", s + "jela", s + "jeli"]; }
  const m = inf.match(/^(.*)([aiu])ti$/);
  if (!m) return [];
  const [, s, v] = m;
  return [s + v + "o", s + v + "la", s + v + "li"];
}

/** Rozdziela czasownik zwrotny: „odmarati se” → ["odmarati", true]. */
const splitReflexive = (verb) => (verb.endsWith(" se") ? [verb.slice(0, -3), true] : [verb, false]);
/** Oba szyki klityki: „se odmaram” (po pierwszym słowie zdania) i „odmaram se”. */
const withSe = (form, reflexive) => (reflexive ? [`${form} se`, `se ${form}`] : [form]);

function verbForms(verb) {
  const [inf, refl] = splitReflexive(low(verb));
  const firsts = present1(inf);
  const pres = firsts.flatMap(presentParadigm);
  const pp = participles(inf);
  const trunc = inf.endsWith("ti") ? [inf.slice(0, -1)] : [];
  return {
    inf: withSe(inf, refl),
    inft: trunc.flatMap((x) => withSe(x, refl)),
    pres1: firsts.flatMap((x) => withSe(x, refl)),
    pres: pres.flatMap((x) => withSe(x, refl)),
    ppSelf: pp.slice(0, 2).flatMap((x) => withSe(x, refl)),
    pp: pp.flatMap((x) => withSe(x, refl)),
    bare: [inf, ...firsts, ...pres, ...pp, ...trunc, ...firsts.flatMap(imperative)],
  };
}

/* ---------------- Przymiotniki ---------------- */

const ADJ_OVERRIDES = {
  sladak: ["slatka", "slatko"], nizak: ["niska", "nisko"], veseo: ["vesela", "veselo"], kiseo: ["kisela", "kiselo"],
  gorak: ["gorka", "gorko"], dobar: ["dobra", "dobro"], vruć: ["vruća", "vruće"], topao: ["topla", "toplo"],
};
const FLEETING_ADJ = new Set([
  "umoran", "sretan", "simpatičan", "gladan", "žedan", "slobodan", "pametan", "zgodan", "tužan", "ukusan", "hladan",
  "miran", "zabavan", "dosadan",
]);

function adjForms(masc) {
  const m = low(masc);
  let f;
  let n;
  if (ADJ_OVERRIDES[m]) [f, n] = ADJ_OVERRIDES[m];
  else if (FLEETING_ADJ.has(m)) { f = m.slice(0, -2) + "na"; n = m.slice(0, -2) + "no"; }
  else if (m.endsWith("i")) { f = m.slice(0, -1) + "a"; n = m.slice(0, -1) + (SOFT_END.test(m.slice(0, -1)) ? "e" : "o"); }
  else { f = m + "a"; n = m + (SOFT_END.test(m) ? "e" : "o"); }
  return { m, f, n, accF: f.slice(0, -1) + "u" };
}

/* ---------------- Zaimki i drobne słowa ---------------- */

const PRONOUN_FORMS = {
  moj: ["moj", "moja", "moje", "moji", "moju", "mog", "mojeg", "mojoj", "mojim"],
  tvoj: ["tvoj", "tvoja", "tvoje", "tvoji", "tvoju", "tvog", "tvojeg", "tvojoj", "tvojim"],
  ovaj: ["ovaj", "ova", "ovo", "ovu", "ovog", "ovoj", "ovim", "ovi", "ove"],
  koji: ["koji", "koja", "koje", "koju", "kojeg", "kojoj"],
  kakav: ["kakav", "kakva", "kakvo", "kakvu"],
  ja: ["ja", "me", "mene", "meni", "mnom"],
  ti: ["ti", "te", "tebe", "tebi", "tobom"],
  on: ["on", "njega", "ga", "njemu", "mu", "njim"],
  ona: ["ona", "nju", "je", "njoj", "joj", "njom"],
  tko: ["tko", "koga", "kome", "kim"],
  nešto: ["nešto", "nečega"],
};
/** Liczebnik „jeden” odmienia się jak przymiotnik: jedna kava → jednu kavu. */
const NUMERAL_FORMS = { jedan: ["jedan", "jedna", "jedno", "jednu", "jednog", "jednoga", "jednoj", "jednom", "jednim"], dva: ["dva", "dvije"] };

/* ---------------- Leksykon ---------------- */

const unique = (list) => [...new Set(list.filter(Boolean))];
const isVerbPhrase = (text) => /(ti|ći)$/.test(low(text).split(/\s+/)[0]);

/**
 * Formy jednego rekordu słownictwa (hr_text + lemma). Zwraca kategorie i płaski zbiór `all`.
 * Wyrażenia wielowyrazowe dostają formy dla całej frazy (i dla czasownika na początku).
 */
export function recordForms(record) {
  const text = low(record.hr_text).replace(/[.!?…]/g, "").trim();
  const lemma = low(record.lemma || record.hr_text).replace(/[.!?…]/g, "").trim();
  const pos = record.part_of_speech;
  const cat = { acc: [], loc: [], ins: [], nom: [], inf: [], inft: [], pres1: [], pres: [], ppSelf: [], pp: [], adjM: [], adjF: [], pred: [], all: [text, lemma] };
  const addNoun = (w) => {
    const f = nounForms(w);
    cat.nom.push(f.nom[0], ...f.pl.slice(0, 1));
    cat.acc.push(...f.acc, ...f.pl.slice(-1));
    cat.loc.push(...f.loc);
    cat.ins.push(...f.ins);
    cat.all.push(...Object.values(f).flat());
  };
  const addVerb = (v) => {
    const f = verbForms(v);
    for (const k of ["inf", "inft", "pres1", "pres", "ppSelf", "pp"]) cat[k].push(...f[k]);
    cat.all.push(...f.bare);
  };
  const addAdj = (w) => {
    const f = adjForms(w);
    cat.adjM.push(f.m);
    cat.adjF.push(f.f);
    cat.pred.push(f.n);
    cat.all.push(f.m, f.f, f.n, f.accF);
  };
  switch (pos) {
    case "noun":
    case "proper_noun":
      addNoun(text);
      if (lemma !== text) addNoun(lemma);
      break;
    case "verb":
      addVerb(text);
      break;
    case "verb_form": {
      // bio/bila/radio… mają w CSV lemat = sama forma; czasownik „biti” (sam, si…) to klityki — nie generujemy go.
      if (lemma !== text && lemma !== "biti") addVerb(lemma);
      cat.all.push(text);
      cat.ppSelf.push(text);
      cat.pp.push(text);
      break;
    }
    case "adjective":
      if (/[oe]$/.test(text) && text !== lemma) { cat.pred.push(text); addAdj(lemma); }
      // sunčano, oblačno, toplo — forma orzecznikowa; veseo, kiseo (-eo) to zwykłe przymiotniki męskie
      else if (/o$/.test(text) && !/[ae]o$/.test(text) && text === lemma) { cat.pred.push(text); cat.all.push(text); }
      else addAdj(text);
      if (lemma !== text && !/[oe]$/.test(text)) addAdj(lemma);
      break;
    case "adverb":
      cat.pred.push(text);
      break;
    case "auxiliary":
      // ću/ćeš/će… — przy lemacie htjeti znane są też formy pełne (hoću, hoćeš) i imiesłów (htio/htjela).
      if (lemma === "htjeti") addVerb("htjeti");
      break;
    case "pronoun":
      cat.all.push(...(PRONOUN_FORMS[text] ?? [text]));
      break;
    case "numeral":
      cat.all.push(...(NUMERAL_FORMS[text] ?? [text]));
      break;
    case "phrase":
      if (isVerbPhrase(text)) {
        const [verb, ...rest] = text.split(/\s+/);
        const f = verbForms(verb);
        const tail = rest.length ? ` ${rest.join(" ")}` : "";
        cat.inf.push(verb + tail);
        cat.pres1.push(...f.pres1.map((x) => x + tail));
        cat.all.push(...f.bare);
      } else if (text.includes(" ")) {
        cat.nom.push(text);
        cat.acc.push(phraseAcc(text));
      }
      break;
    default:
      break;
  }
  for (const k of Object.keys(cat)) cat[k] = unique(cat[k]);
  return cat;
}

/** Leksykon całego kursu: kategoria → formy (małe litery). */
export function buildLexicon(records) {
  const lex = {};
  for (const r of records) {
    for (const [k, v] of Object.entries(recordForms(r))) {
      lex[k] ??= new Set();
      for (const x of v) lex[k].add(x);
    }
  }
  return Object.fromEntries(Object.entries(lex).map(([k, v]) => [k, [...v].sort()]));
}

/* ---------------- Sloty w ramach odpowiedzi ---------------- */

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Sloty dostępne w polu `pattern` replik (didactics.json). */
export const SLOTS = {
  acc: (lx) => lx.acc,
  loc: (lx) => lx.loc,
  ins: (lx) => lx.ins,
  inf: (lx) => lx.inf,
  inft: (lx) => lx.inft,
  pres1: (lx) => lx.pres1,
  "pp.self": (lx) => lx.ppSelf,
  "adj.f": (lx) => lx.adjF,
  "adj.m": (lx) => lx.adjM,
  "adj.self": (lx) => [...lx.adjM, ...lx.adjF],
  pred: (lx) => lx.pred,
};

/** Zamienia {slot} na alternatywę form z leksykonu (najdłuższe najpierw). Nieznany slot → błąd. */
export function expandSlots(pattern, lexicon) {
  return pattern.replace(/\{([a-z0-9.]+)\}/g, (whole, name) => {
    const pick = SLOTS[name];
    if (!pick) throw new Error(`Nieznany slot ${whole} we wzorcu ${pattern}`);
    const forms = unique(pick(lexicon)).sort((a, b) => b.length - a.length || a.localeCompare(b));
    return `(?:${forms.map(escape).join("|")})`;
  });
}

/* ---------------- Rodzaj: odpowiedzi o sobie ---------------- */

/** Pary męski ↔ żeński z leksykonu (przymiotniki i imiesłowy) + formuła htio/htjela. */
export function genderPairs(records) {
  const pairs = new Map([["htio", "htjela"], ["htjela", "htio"]]);
  const add = (m, f) => { if (m && f && m !== f) { pairs.set(m, f); pairs.set(f, m); } };
  for (const r of records) {
    const pos = r.part_of_speech;
    const text = low(r.hr_text);
    if (pos === "adjective" && !/[oe]$/.test(text)) { const f = adjForms(text); add(f.m, f.f); }
    if (pos === "verb" || pos === "verb_form") {
      const [inf] = splitReflexive(pos === "verb" ? text : low(r.lemma));
      const pp = participles(inf === text && pos === "verb_form" ? "biti" : inf);
      add(pp[0], pp[1]);
    }
  }
  return pairs;
}

/** „Jučer sam radio.” → „Jučer sam radila.” (zachowuje interpunkcję i wielką literę). */
export function swapGender(sentence, pairs) {
  return sentence.replace(/\p{L}+/gu, (word) => {
    const swap = pairs.get(low(word));
    if (!swap) return word;
    return word[0] === word[0].toLocaleUpperCase("hr") ? swap[0].toLocaleUpperCase("hr") + swap.slice(1) : swap;
  });
}

/** W źródle wzorca zamienia każdą formę z pary na (?:m|f). */
export function genderizePattern(pattern, pairs) {
  return pattern.replace(/\p{L}+/gu, (word, offset, all) => {
    // nie ruszamy nazw slotów {…} ani klas \p{L}
    if (all[offset - 1] === "{" || all[offset - 1] === "\\" || all[offset - 2] === "\\") return word;
    const swap = pairs.get(word);
    return swap ? `(?:${word}|${swap})` : word;
  });
}

/** Klityki: zdanie z nimi nie może dostać wariantu z „Ja” na początku bez zmiany szyku. */
export const CLITICS = new Set(["sam", "si", "je", "smo", "ste", "su", "se", "ću", "ćeš", "će", "ćemo", "ćete", "bih", "li", "mi", "ti", "ga", "joj", "mu"]);
export const tokens = (text) => low(text).replace(/[.,!?;:„”"…«»()]/g, " ").split(/\s+/).filter(Boolean);
