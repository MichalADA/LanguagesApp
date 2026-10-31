/**
 * Ściągi gramatyczne (chorwacki dla Polaków) — tabele, reguły i przykłady, powiązane z modułami kursu
 * i z grą, w której temat się ćwiczy. Treść chorwacka NIE jest jeszcze sprawdzona przez native speakera.
 */

export interface CheatTable {
  caption?: string;
  head: string[];
  rows: string[][];
}

export interface CheatSheet {
  id: string;
  title: string;
  level: "A1" | "A1–A2" | "A2" | "A2–B1" | "B1";
  /** Gdzie temat pojawia się w kursie. */
  course: string;
  /** To samo co `course`, ale do liczenia: moduły kursu (per poziom), w których temat się pojawia. */
  modules: Partial<Record<"A1" | "A2" | "B1", number[]>>;
  intro: string;
  tables: CheatTable[];
  rules: string[];
  examples: { hr: string; pl: string }[];
  /** Pułapki typowe dla Polaków. */
  traps?: string[];
  /** Id gry z rejestru, w której temat się ćwiczy. */
  practice?: string;
}

export const CHEATSHEETS: CheatSheet[] = [
  {
    id: "prezent",
    title: "Czas teraźniejszy",
    level: "A1",
    course: "A1 · moduły 1–3",
    modules: { A1: [1, 2, 3] },
    intro: "Czasowniki dzielą się na trzy grupy według końcówki w 1. osobie: -am, -em, -im. Końcówki osób są prawie takie same — różni się tylko samogłoska.",
    tables: [
      {
        caption: "Trzy grupy odmiany",
        head: ["", "-am (čitati)", "-em (pisati)", "-im (govoriti)"],
        rows: [
          ["ja", "čitam", "pišem", "govorim"],
          ["ti", "čitaš", "pišeš", "govoriš"],
          ["on / ona / ono", "čita", "piše", "govori"],
          ["mi", "čitamo", "pišemo", "govorimo"],
          ["vi", "čitate", "pišete", "govorite"],
          ["oni / one / ona", "čitaju", "pišu", "govore"],
        ],
      },
      {
        caption: "Biti (być) i htjeti (chcieć) — formy krótkie, długie i przeczenie",
        head: ["", "biti", "przeczenie", "htjeti", "przeczenie"],
        rows: [
          ["ja", "sam / jesam", "nisam", "hoću / ću", "neću"],
          ["ti", "si / jesi", "nisi", "hoćeš / ćeš", "nećeš"],
          ["on", "je / jest", "nije", "hoće / će", "neće"],
          ["mi", "smo / jesmo", "nismo", "hoćemo / ćemo", "nećemo"],
          ["vi", "ste / jeste", "niste", "hoćete / ćete", "nećete"],
          ["oni", "su / jesu", "nisu", "hoće / će", "neće"],
        ],
      },
    ],
    rules: [
      "Trzecia osoba liczby mnogiej zdradza grupę: -aju (čitaju), -u (pišu), -e (govore).",
      "Krótkie formy „biti” (sam, si, je…) nie mogą stać na początku zdania — długie (jesam, jesi…) służą do pytań i nacisku: Jesi li umoran? — Jesam.",
      "Przeczenie „ne” piszemy osobno (ne znam), ale nisam, nemam i neću to jedno słowo.",
    ],
    examples: [
      { hr: "Ja sam iz Poljske.", pl: "Jestem z Polski." },
      { hr: "Govoriš li hrvatski?", pl: "Mówisz po chorwacku?" },
      { hr: "Nemam vremena.", pl: "Nie mam czasu." },
    ],
    traps: ["„Ja jesam student” brzmi jak nacisk („ja naprawdę jestem studentem”). Zwykle: Ja sam student."],
    practice: "odmiana",
  },
  {
    id: "padezi",
    title: "Przypadki",
    level: "A1–A2",
    course: "A1 · moduły 4–5, A2 · moduły 5–7",
    modules: { A1: [4, 5], A2: [5, 6, 7] },
    intro: "Chorwacki ma siedem przypadków — tyle samo co polski i działają bardzo podobnie. Największa różnica: lokativ i dativ mają w liczbie pojedynczej tę samą końcówkę.",
    tables: [
      {
        caption: "Liczba pojedyncza: grad (m), kuća (ž), selo (n)",
        head: ["Przypadek", "Pytanie", "Kiedy", "m", "ž", "n"],
        rows: [
          ["nominativ", "tko? što?", "podmiot", "grad", "kuća", "selo"],
          ["genitiv", "koga? čega?", "bez, iz, od, do, kod; ilość; nema", "grada", "kuće", "sela"],
          ["dativ", "komu? čemu?", "dawać, pomagać; prema", "gradu", "kući", "selu"],
          ["akuzativ", "koga? što?", "dopełnienie; u / na + dokąd?", "grad (żywotne: brata)", "kuću", "selo"],
          ["vokativ", "—", "wołanie", "grade! (Ivane!)", "kućo! (Ana!)", "selo!"],
          ["lokativ", "o kome? o čemu?", "u / na + gdzie?; o, po, pri", "gradu", "kući", "selu"],
          ["instrumental", "s kim? čime?", "s / sa; środek (autobusom)", "gradom", "kućom", "selom"],
        ],
      },
      {
        caption: "Ten sam przyimek, inny przypadek",
        head: ["Pytanie", "Przypadek", "Przykład"],
        rows: [
          ["kamo? (dokąd?)", "u / na + akuzativ", "Idem u školu. Idem na plažu."],
          ["gdje? (gdzie?)", "u / na + lokativ", "Ja sam u školi. Ja sam na plaži."],
          ["odakle? (skąd?)", "iz / s + genitiv", "Dolazim iz škole. Dolazim s plaže."],
        ],
      },
    ],
    rules: [
      "Po liczebnikach 2, 3, 4 rzeczownik ma końcówkę -a / -e (dva grada, tri kuće), od 5 — dopełniacz liczby mnogiej (pet gradova, pet kuća).",
      "„S / sa” (z) łączy się z narzędnikiem: kava s mlijekom, s prijateljem. „Sa” przed s-, z-, š-, ž- i przed mnom: sa sirom, sa mnom.",
      "Środek transportu i płatności to sam narzędnik bez przyimka: idem autobusom, plaćam karticom.",
    ],
    examples: [
      { hr: "Kilogram jabuka, molim.", pl: "Kilogram jabłek, proszę." },
      { hr: "Dajem poklon sestri.", pl: "Daję prezent siostrze." },
      { hr: "Živim u Krakovu.", pl: "Mieszkam w Krakowie." },
    ],
    traps: [
      "Polskie „w Krakowie” i „do Krakowa” to po chorwacku u Krakovu (gdzie?) i u Krakov (dokąd?) — ten sam przyimek „u”.",
      "Na wyspę jedziemy „na”: na Brač, na Hvar — a do miasta „u”: u Zagreb.",
    ],
    practice: "padezi",
  },
  {
    id: "enklitike",
    title: "Szyk krótkich słówek (enklityki)",
    level: "A1–A2",
    course: "A1 · moduł 1, A2 · moduł 1",
    modules: { A1: [1], A2: [1] },
    intro: "Krótkie, nieakcentowane słówka (sam, si, se, mi, ga, je, ću…) stoją zawsze na drugim miejscu w zdaniu — po pierwszym wyrazie albo po pierwszej grupie wyrazów. Gdy jest ich kilka, idą w stałej kolejności.",
    tables: [
      {
        caption: "Kolejność na drugim miejscu",
        head: ["1", "2", "3", "4", "5", "6"],
        rows: [
          ["li", "biti / htjeti (sam, si, smo, ste, su, ću, ćeš…)", "celownik (mi, ti, mu, joj, nam, vam, im)", "biernik (me, te, ga, je, nas, vas, ih)", "se", "je (biti, 3. os.)"],
        ],
      },
    ],
    rules: [
      "Enklityka nigdy nie otwiera zdania: Zovem se Marko — nie „Se zovem Marko”.",
      "„Je” (jest) idzie na sam koniec grupy: On mu ga je dao — ale: Ja sam mu ga dao.",
      "Wyjątek: w czasie przeszłym „se” i „je” nie stoją obok siebie — zostaje samo „se”: On se smijao (nie „se je smijao”).",
      "Pierwszym „miejscem” może być cała grupa wyrazów: Moj brat se zove Ivan.",
    ],
    examples: [
      { hr: "Sviđa mi se.", pl: "Podoba mi się." },
      { hr: "Jesi li ga vidio?", pl: "Widziałeś go?" },
      { hr: "Dat ću ti ga sutra.", pl: "Dam ci go jutro." },
    ],
    traps: ["Po polsku „się” może stać prawie wszędzie. Po chorwacku „se” ma jedno miejsce — drugie."],
    practice: "enklitike",
  },
  {
    id: "perfekt",
    title: "Czas przeszły (perfekt)",
    level: "A2",
    course: "A1 · moduł 8, A2 · moduł 1",
    modules: { A1: [8], A2: [1] },
    intro: "Czas przeszły = krótka forma „biti” + imiesłów na -l (radio, radila…). Imiesłów zgadza się z rodzajem i liczbą osoby, jak polskie „robił / robiła”.",
    tables: [
      {
        caption: "raditi (pracować)",
        head: ["", "mężczyzna", "kobieta"],
        rows: [
          ["ja", "radio sam", "radila sam"],
          ["ti", "radio si", "radila si"],
          ["on / ona / ono", "on je radio", "ona je radila (ono je radilo)"],
          ["mi", "radili smo", "radile smo"],
          ["vi", "radili ste", "radile ste"],
          ["oni / one / ona", "oni su radili", "one su radile (ona su radila)"],
        ],
      },
      {
        caption: "Nieregularne imiesłowy",
        head: ["bezokolicznik", "on", "ona"],
        rows: [
          ["biti", "bio", "bila"],
          ["ići", "išao", "išla"],
          ["doći", "došao", "došla"],
          ["moći", "mogao", "mogla"],
          ["reći", "rekao", "rekla"],
          ["jesti", "jeo", "jela"],
          ["vidjeti", "vidio", "vidjela"],
          ["htjeti", "htio", "htjela"],
        ],
      },
    ],
    rules: [
      "Gdy zdanie zaczyna się od imiesłowu, „sam” idzie za nim: Radio sam. Z zaimkiem: Ja sam radio.",
      "Przeczenie: nisam, nisi, nije… + imiesłów: Nisam radio.",
      "Pytanie: Jesi li radio? / Je li Ana došla?",
      "Bezokolicznik na -jeti traci „je” w rodzaju męskim: vidjeti → vidio, ale vidjela.",
    ],
    examples: [
      { hr: "Jučer smo bili u kinu.", pl: "Wczoraj byliśmy w kinie." },
      { hr: "Nisam imala vremena.", pl: "Nie miałam czasu." },
      { hr: "Gdje si bio?", pl: "Gdzie byłeś?" },
    ],
    practice: "vremena",
  },
  {
    id: "futur",
    title: "Czas przyszły",
    level: "A1–A2",
    course: "A1 · moduł 8, A2 · moduł 2, B1 · moduł 3",
    modules: { A1: [8], A2: [2], B1: [3] },
    intro: "Czas przyszły (futur I) = krótka forma „htjeti” (ću, ćeš, će…) + bezokolicznik. Gdy bezokolicznik stoi na początku, traci końcowe -i i zlewa się z „ću” w wymowie.",
    tables: [
      {
        caption: "raditi (pracować)",
        head: ["", "z zaimkiem", "bez zaimka", "przeczenie"],
        rows: [
          ["ja", "ja ću raditi", "radit ću", "neću raditi"],
          ["ti", "ti ćeš raditi", "radit ćeš", "nećeš raditi"],
          ["on", "on će raditi", "radit će", "neće raditi"],
          ["mi", "mi ćemo raditi", "radit ćemo", "nećemo raditi"],
          ["vi", "vi ćete raditi", "radit ćete", "nećete raditi"],
          ["oni", "oni će raditi", "radit će", "neće raditi"],
        ],
      },
    ],
    rules: [
      "Bezokoliczniki na -ći nie tracą niczego: Ići ću. Doći ćemo.",
      "Pytanie: Hoćeš li doći? — Hoću. / Neću.",
      "W zdaniach z „ako” (jeśli) i „kad” (kiedy) o przyszłości używa się futur II: Ako bude lijepo vrijeme, ići ćemo na izlet.",
    ],
    examples: [
      { hr: "Sutra ću ti javiti.", pl: "Jutro dam ci znać." },
      { hr: "Vidjet ćemo se u subotu.", pl: "Zobaczymy się w sobotę." },
      { hr: "Ako mi bude trebao taksi, nazvat ću vas.", pl: "Jeśli będę potrzebować taksówki, zadzwonię do Pana." },
    ],
    practice: "vremena",
  },
  {
    id: "vid",
    title: "Aspekt: dokonany i niedokonany",
    level: "B1",
    course: "B1 · moduły 1–2",
    modules: { B1: [1, 2] },
    intro: "Jak w polskim, większość czasowników ma parę: niedokonany (proces, nawyk) i dokonany (jednorazowa czynność z rezultatem). Pary tworzy się zwykle przedrostkiem albo zmianą tematu.",
    tables: [
      {
        caption: "Częste pary",
        head: ["niedokonany", "dokonany", "po polsku"],
        rows: [
          ["pisati", "napisati", "pisać / napisać"],
          ["čitati", "pročitati", "czytać / przeczytać"],
          ["piti", "popiti", "pić / wypić"],
          ["jesti", "pojesti", "jeść / zjeść"],
          ["učiti", "naučiti", "uczyć się / nauczyć się"],
          ["zvati", "nazvati", "dzwonić / zadzwonić"],
          ["kupovati", "kupiti", "kupować / kupić"],
          ["davati", "dati", "dawać / dać"],
          ["dolaziti", "doći", "przychodzić / przyjść"],
          ["raditi", "napraviti", "robić / zrobić"],
        ],
      },
    ],
    rules: [
      "Niedokonany: czynność trwa, powtarza się albo liczy się sam proces — svaki dan, često, dok…",
      "Dokonany: czynność jednorazowa, zakończona, z rezultatem — napokon, već, do kraja.",
      "W czasie teraźniejszym czasownik dokonany nie stoi sam; pojawia się po „da”, „ako”, „kad”: Želim da pročitaš ovo. Ako dođeš, zovi me.",
    ],
    examples: [
      { hr: "Svako jutro pijem kavu.", pl: "Co rano piję kawę." },
      { hr: "Popio sam kavu i otišao.", pl: "Wypiłem kawę i wyszedłem." },
      { hr: "Čitala sam knjigu cijelu večer, ali je nisam pročitala.", pl: "Czytałam książkę cały wieczór, ale jej nie przeczytałam." },
    ],
    practice: "vid",
  },
  {
    id: "kondicional",
    title: "Tryb warunkowy",
    level: "A2–B1",
    course: "A2 · moduł 2, B1 · moduły 3–4",
    modules: { A2: [2], B1: [3, 4] },
    intro: "Tryb warunkowy = bih, bi, bi, bismo, biste, bi + imiesłów na -l. Służy do życzeń, grzecznych próśb i sytuacji hipotetycznych — jak polskie „-bym”.",
    tables: [
      {
        caption: "voljeti (chcieć, lubić) — „chciałbym / chciałabym”",
        head: ["", "mężczyzna", "kobieta"],
        rows: [
          ["ja", "volio bih", "voljela bih"],
          ["ti", "volio bi", "voljela bi"],
          ["on / ona", "volio bi", "voljela bi"],
          ["mi", "voljeli bismo", "voljele bismo"],
          ["vi", "voljeli biste", "voljele biste"],
          ["oni / one", "voljeli bi", "voljele bi"],
        ],
      },
    ],
    rules: [
      "Grzeczna prośba: Biste li mi mogli pomoći? — Czy mógłby Pan / mogłaby Pani mi pomóc?",
      "Hipoteza: Kad bih imao vremena, putovao bih. — Gdybym miał czas, podróżowałbym.",
      "Bezosobowo, bez rodzaju: Bilo bi super. Bilo bi dobro da… Kako bi bilo da…?",
    ],
    examples: [
      { hr: "Voljela bih kavu.", pl: "Chciałabym kawę." },
      { hr: "Na tvom mjestu bih to prihvatio.", pl: "Na twoim miejscu przyjąłbym to." },
      { hr: "Kako bi bilo da se nađemo u devet?", pl: "Może spotkamy się o dziewiątej?" },
    ],
    practice: "vremena",
  },
  {
    id: "komparacija",
    title: "Stopniowanie przymiotników",
    level: "A2",
    course: "A2 · moduły 3 i 5, B1 · moduł 5",
    modules: { A2: [3, 5], B1: [5] },
    intro: "Stopień wyższy tworzy się końcówką -iji, -ji albo -ši; przy -ji spółgłoska często się zmienia. Najwyższy to „naj-” + stopień wyższy.",
    tables: [
      {
        caption: "Wzory i wyjątki",
        head: ["stopień równy", "wyższy", "najwyższy", "uwagi"],
        rows: [
          ["nov", "noviji", "najnoviji", "-iji"],
          ["jeftin", "jeftiniji", "najjeftiniji", "-iji"],
          ["mlad", "mlađi", "najmlađi", "d + j → đ"],
          ["skup", "skuplji", "najskuplji", "p + j → plj"],
          ["lijep", "ljepši", "najljepši", "-ši, ije → je"],
          ["lak", "lakši", "najlakši", "-ši"],
          ["dobar", "bolji", "najbolji", "nieregularny"],
          ["loš", "gori", "najgori", "nieregularny"],
          ["velik", "veći", "najveći", "nieregularny"],
          ["mali", "manji", "najmanji", "nieregularny"],
        ],
      },
    ],
    rules: [
      "„Niż” to „nego” + mianownik albo „od” + dopełniacz: Split je manji nego Zagreb = Split je manji od Zagreba.",
      "Przysłówki: bolje, gore, više, manje, lakše, teže — Ovdje je ljepše.",
      "„Što… to…” = „im… tym…”: Što prije, to bolje.",
    ],
    examples: [
      { hr: "Lokrum je bliži i jeftiniji.", pl: "Lokrum jest bliżej i taniej." },
      { hr: "Ova jakna je šira i udobnija.", pl: "Ta kurtka jest szersza i wygodniejsza." },
      { hr: "To je najbolji kolač na svijetu!", pl: "To najlepsze ciasto na świecie!" },
    ],
    practice: "komparacija",
  },
];
