import type { Mission, MissionWord } from "../../types";
import { branch, build, choice, end, flag, graph, option, say, type } from "../builders";

/**
 * Zagreb A2 — pięć misji. Zdania opierają się na materiale lekcji A2 (moduły 1–6): czas przeszły,
 * plany i zaproszenia, zdrowie, praca, zakupy, mieszkanie. Rozmowy z obcymi są na „Vi”, z kolegą na „ti”.
 * Opcje gracza unikają form zależnych od płci (albo akceptują obie: gledao / gledala).
 * Treść chorwacka NIE jest jeszcze sprawdzona przez native speakera (story.languageReview).
 *
 * Słownictwo: te same karty FSRS co w lekcjach A2 (WORD pl-hr:<rank> / PHRASE pl-hr:phrase:<tekst>).
 */

const w = (hr: string, pl: string, itemType: "WORD" | "PHRASE", itemId: string): MissionWord => ({ hr, pl, review: { itemType, itemId } });

/* ------------------------------------------------------------------ */
/* 1. Stan na Trešnjevci — Luka, mieszkanie                            */
/* ------------------------------------------------------------------ */

const flat: Mission = {
  id: "m1-flat",
  order: 1,
  title: { hr: "Stan na Trešnjevci", pl: "Mieszkanie na Trešnjevce" },
  locationId: "stan",
  npcId: "luka",
  goal: "Obejrzysz mieszkanie i dowiesz się wszystkiego o czynszu, opłatach i kaucji — tak, żeby móc się wprowadzić.",
  story: "Przeprowadzasz się do Zagrzebia. Luka wynajmuje umeblowane mieszkanie na Trešnjevce. Ogłoszenie wyglądało dobrze, ale zanim cokolwiek podpiszesz, musisz wiedzieć, ile to naprawdę kosztuje.",
  objectives: [
    { text: "Zapytaj o czynsz", done: { flag: "asked-rent" } },
    { text: "Dowiedz się, czy opłaty są wliczone", done: { flag: "knows-bills" } },
    { text: "Zrozum, ile wynosi kaucja", done: { flag: "knows-deposit" } },
    { text: "Umów się na wprowadzenie", done: { flag: "agreed-move" } },
  ],
  requires: [],
  xp: 40,
  vocabulary: [
    w("stanarina", "czynsz", "PHRASE", "pl-hr:phrase:stanarina"),
    w("režije", "opłaty (media)", "WORD", "pl-hr:1643"),
    w("polog", "kaucja", "WORD", "pl-hr:1647"),
    w("uključen", "wliczony", "WORD", "pl-hr:1645"),
    w("useliti se", "wprowadzić się", "WORD", "pl-hr:4706"),
    w("namješten", "umeblowany", "WORD", "pl-hr:4753"),
    w("dnevni boravak", "salon / pokój dzienny", "WORD", "pl-hr:3603"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("arrive", [
      say("arrive", "narrator", "Zagreb. Prvi dan u glavnom gradu — i prvi pogled na stan.", "Zagrzeb. Pierwszy dzień w stolicy — i pierwsze oglądanie mieszkania.", "hello"),
      say("hello", "luka", "Dobar dan! Vi ste sigurno zbog oglasa za stan?", "Dzień dobry! Pan/Pani na pewno w sprawie ogłoszenia o mieszkanie?", "c-hello", { mood: "happy" }),
      choice("c-hello", "Potwierdź, że przychodzisz w sprawie ogłoszenia.", [
        option("ad", "Da, zbog oglasa sam. Čuli smo se jučer.", "Tak, jestem w sprawie ogłoszenia. Rozmawialiśmy wczoraj.", "correct", "inside"),
        option("i-am-ad", "Da, ja sam oglas.", "Tak, jestem ogłoszeniem.", "wrong", "i-am-ad", {
          explanation: "„Ja sam oglas” znaczy „jestem ogłoszeniem”. W sprawie czegoś: zbog + dopełniacz — Zbog oglasa sam.",
        }),
        option("repeat", "Možete li ponoviti, molim Vas?", "Może Pan powtórzyć?", "neutral", "repeat"),
      ]),
      say("i-am-ad", "luka", "Vi ste oglas? Ha-ha! Mislite — zbog oglasa ste?", "Pan/Pani jest ogłoszeniem? Ha-ha! Chodzi o to, że w sprawie ogłoszenia?", "c-hello", { mood: "puzzled" }),
      say("repeat", "luka", "Polako: jeste li Vi tu zbog oglasa? Zbog stana?", "Powoli: czy jest Pan/Pani tu w sprawie ogłoszenia? W sprawie mieszkania?", "c-hello"),
      say("inside", "luka", "Odlično! Uđite slobodno. Ovo je dnevni boravak, a tamo je spavaća soba.", "Świetnie! Proszę śmiało wejść. To jest salon, a tam sypialnia.", "furnished", { mood: "happy" }),
      say("furnished", "luka", "Stan je namješten i ima terasu. Što Vas zanima?", "Mieszkanie jest umeblowane i ma taras. Co Pana/Panią interesuje?", "b-rent"),
      build("b-rent", {
        instruction: "Zapytaj, ile wynosi czynsz.",
        translation: "Ile wynosi czynsz?",
        tokens: ["Kolika", "je", "stanarina", "stanodavac", "gdje"],
        accepted: ["Kolika je stanarina?"],
        explanation: "Pytasz o wysokość czynszu: Kolika je stanarina? „Kolika”, bo „stanarina” jest rodzaju żeńskiego.",
        practice: "stanarina",
        next: "rent",
        onWrong: "rent-what",
      }),
      say("rent-what", "luka", "Molim? Pitate za cijenu?", "Słucham? Pyta Pan/Pani o cenę?", "b-rent", { mood: "puzzled" }),
      say("rent", "luka", "Stanarina je petsto eura mjesečno.", "Czynsz wynosi pięćset euro miesięcznie.", "c-bills", { effects: [flag("asked-rent")] }),
      choice("c-bills", "Zapytaj, czy opłaty (prąd, woda…) są wliczone w czynsz.", [
        option("included", "Jesu li režije uključene?", "Czy opłaty są wliczone?", "correct", "bills"),
        option("free", "Jesu li režije besplatne?", "Czy opłaty są darmowe?", "wrong", "free", {
          explanation: "„Besplatne” znaczy „darmowe”. Pytasz, czy opłaty są wliczone w czynsz: Jesu li režije uključene?",
        }),
        option("what", "Oprostite, što su režije?", "Przepraszam, co to są „režije”?", "neutral", "what-bills"),
      ]),
      say("free", "luka", "Besplatne? Ha-ha, nažalost nisu!", "Darmowe? Ha-ha, niestety nie!", "c-bills", { mood: "puzzled" }),
      say("what-bills", "luka", "Režije su struja, voda, grijanje i internet.", "„Režije” to prąd, woda, ogrzewanie i internet.", "c-bills"),
      say("bills", "luka", "Nisu. Režije su otprilike osamdeset eura: struja, voda i grijanje. Internet je uključen.", "Nie. Opłaty to mniej więcej osiemdziesiąt euro: prąd, woda i ogrzewanie. Internet jest wliczony.", "deposit", {
        effects: [flag("knows-bills")],
      }),
      say("deposit", "luka", "Tražim i polog u visini jedne stanarine.", "Chcę też kaucję w wysokości jednego czynszu.", "c-deposit"),
      choice("c-deposit", "Upewnij się, ile wynosi kaucja.", [
        option("500", "Znači, polog je petsto eura?", "Czyli kaucja to pięćset euro?", "correct", "move", { effects: [flag("knows-deposit")] }),
        option("80", "Znači, polog je osamdeset eura?", "Czyli kaucja to osiemdziesiąt euro?", "wrong", "deposit-again", {
          explanation: "80 euro to opłaty (režije). Kaucja (polog) jest „u visini jedne stanarine” — w wysokości jednego czynszu, czyli 500 euro.",
        }),
        option("none", "Znači, nema pologa?", "Czyli nie ma kaucji?", "wrong", "deposit-again", {
          explanation: "Luka mówi „Tražim polog” — chce kaucji, w wysokości jednego czynszu (500 euro).",
        }),
      ]),
      say("deposit-again", "luka", "Ne, ne — polog je kao jedna stanarina. Petsto eura.", "Nie, nie — kaucja jest jak jeden czynsz. Pięćset euro.", "c-deposit", { mood: "puzzled" }),
      say("move", "luka", "Tako je. Kada se želite useliti?", "Zgadza się. Kiedy chce się Pan/Pani wprowadzić?", "t-move", { mood: "happy" }),
      type("t-move", {
        instruction: "Napisz, kiedy możesz się wprowadzić.",
        translation: "Mogę się wprowadzić w poniedziałek (jutro, w sobotę…).",
        accepted: ["Mogu se useliti u ponedjeljak.", "Mogu se useliti sutra.", "Mogu se useliti u subotu."],
        pattern: "^mogu se useliti .+$",
        hint: "Mogu se useliti … (sutra, u ponedjeljak, u subotu…)",
        explanation: "Zacznij od „Mogu se useliti…” — mogę się wprowadzić… Dzień tygodnia z „u”: u ponedjeljak, u subotu.",
        practice: "useliti se",
        next: "deal",
      }),
      say("deal", "luka", "Može! Onda se vidimo tada i potpisujemo ugovor.", "Może być! To widzimy się wtedy i podpisujemy umowę.", "bye", { mood: "happy", effects: [flag("agreed-move")] }),
      say("bye", "luka", "Evo moj broj telefona. Javite se ako imate pitanja!", "Oto mój numer telefonu. Proszę dać znać, jeśli pojawią się pytania!", "end"),
      end(),
    ]),
  },
  debrief: [
    "Pytasz o koszty: Kolika je stanarina? Jesu li režije uključene?",
    "Rozumiesz warunki najmu: polog u visini jedne stanarine — kaucja równa czynszowi.",
    "Umawiasz termin: Mogu se useliti u ponedjeljak.",
  ],
};

/* ------------------------------------------------------------------ */
/* 2. Razgovor za posao — Petra, biuro                                 */
/* ------------------------------------------------------------------ */

const interview: Mission = {
  id: "m2-interview",
  order: 2,
  title: { hr: "Razgovor za posao", pl: "Rozmowa o pracę" },
  locationId: "ured",
  npcId: "petra",
  goal: "Przejdziesz rozmowę o pracę na „Vi”: przedstawisz się, opowiesz o doświadczeniu i zapytasz o warunki.",
  story: "Wysłałeś zgłoszenie na ogłoszenie agencji marketingowej w centrum. Petra z działu kadr zaprosiła Cię na rozmowę. To Twoja pierwsza rozmowa o pracę po chorwacku.",
  objectives: [
    { text: "Przedstaw się i powiedz, czym się zajmujesz", done: { flag: "introduced" } },
    { text: "Opowiedz o doświadczeniu", done: { flag: "told-experience" } },
    { text: "Zrozum warunki pracy", done: { flag: "knows-conditions" } },
    { text: "Zapytaj o pensję", done: { flag: "asked-salary" } },
  ],
  requires: ["m1-flat"],
  xp: 40,
  vocabulary: [
    w("baviti se", "zajmować się", "WORD", "pl-hr:2163"),
    w("iskustvo", "doświadczenie", "WORD", "pl-hr:522"),
    w("plaća", "pensja", "PHRASE", "pl-hr:phrase:plaća"),
    w("na daljinu", "zdalnie", "PHRASE", "pl-hr:phrase:na daljinu"),
    w("puno radno vrijeme", "pełny etat", "WORD", "pl-hr:1353"),
    w("životopis", "CV / życiorys", "PHRASE", "pl-hr:phrase:životopis"),
    w("poslati", "wysłać", "WORD", "pl-hr:360"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("office", [
      say("office", "narrator", "Ured u centru grada. Petra vodi razgovore za posao.", "Biuro w centrum miasta. Petra prowadzi rozmowy o pracę.", "hello"),
      say("hello", "petra", "Dobar dan, izvolite sjesti. Hvala što ste došli.", "Dzień dobry, proszę usiąść. Dziękuję, że Pan/Pani przyszedł/przyszła.", "c-hello", { mood: "happy" }),
      choice("c-hello", "Przywitaj się uprzejmie.", [
        option("formal", "Dobar dan. Hvala Vama na pozivu.", "Dzień dobry. Dziękuję za zaproszenie.", "correct", "intro"),
        option("bok", "Bok, Petra! Kako si?", "Cześć, Petra! Jak się masz?", "wrong", "too-casual", {
          explanation: "Na rozmowie o pracę mówimy na „Vi”: Dobar dan, hvala Vama na pozivu. „Bok” i „kako si” zostaw dla znajomych.",
        }),
      ]),
      say("too-casual", "petra", "Ovaj… dobro, hvala. Ali ovo je ipak razgovor za posao.", "Yyy… dobrze, dziękuję. Ale to jednak rozmowa o pracę.", "c-hello", { mood: "puzzled" }),
      say("intro", "petra", "Predstavite se ukratko. Čime se bavite?", "Proszę się krótko przedstawić. Czym się Pan/Pani zajmuje?", "b-job"),
      build("b-job", {
        instruction: "Powiedz, że zajmujesz się marketingiem.",
        translation: "Zajmuję się marketingiem.",
        tokens: ["Bavim", "se", "marketingom", "marketing", "sam"],
        accepted: ["Bavim se marketingom."],
        explanation: "Baviti se + narzędnik: Bavim se marketingom (zajmuję się marketingiem). Krótkie „se” stoi na drugim miejscu.",
        practice: "baviti se",
        next: "experience",
        onWrong: "job-what",
      }),
      say("job-what", "petra", "Oprostite, čime se bavite?", "Przepraszam, czym się Pan/Pani zajmuje?", "b-job", { mood: "puzzled" }),
      say("experience", "petra", "Zanimljivo! Koliko iskustva imate?", "Ciekawe! Ile ma Pan/Pani doświadczenia?", "c-experience", { mood: "happy", effects: [flag("introduced")] }),
      choice("c-experience", "Opowiedz o swoim doświadczeniu.", [
        option("three", "Imam tri godine iskustva.", "Mam trzy lata doświadczenia.", "correct", "conditions", { effects: [flag("told-experience")] }),
        option("five", "Radim u marketingu već pet godina.", "Pracuję w marketingu już pięć lat.", "correct", "conditions", { effects: [flag("told-experience")] }),
        option("age", "Imam tri godine.", "Mam trzy lata.", "wrong", "age", {
          explanation: "„Imam tri godine” znaczy „mam trzy lata” — w sensie wieku! Dodaj, czego: Imam tri godine iskustva.",
        }),
      ]),
      say("age", "petra", "Tri godine? Ha-ha, izgledate malo starije!", "Trzy lata? Ha-ha, wygląda Pan/Pani na trochę starszego/starszą!", "c-experience", { mood: "puzzled" }),
      say("conditions", "petra", "Odlično. Posao je na puno radno vrijeme, ali dva dana tjedno možete raditi na daljinu.", "Świetnie. Praca jest na pełny etat, ale dwa dni w tygodniu może Pan/Pani pracować zdalnie.", "c-remote"),
      choice("c-remote", "Upewnij się, ile dni możesz pracować zdalnie.", [
        option("two", "Dva dana tjedno od kuće? To je super.", "Dwa dni w tygodniu z domu? To super.", "correct", "questions", { effects: [flag("knows-conditions")] }),
        option("every", "Svaki dan na daljinu? Super!", "Codziennie zdalnie? Super!", "wrong", "remote-again", {
          explanation: "Petra powiedziała „dva dana tjedno” — dwa dni w tygodniu, nie codziennie (svaki dan).",
        }),
      ]),
      say("remote-again", "petra", "Ne svaki dan — dva dana tjedno.", "Nie codziennie — dwa dni w tygodniu.", "c-remote", { mood: "puzzled" }),
      say("questions", "petra", "Imate li Vi neko pitanje za nas?", "Czy ma Pan/Pani jakieś pytanie do nas?", "t-salary"),
      type("t-salary", {
        instruction: "Zapytaj, jaka jest pensja.",
        translation: "Jaka jest pensja?",
        accepted: ["Kolika je plaća?", "Kolika je početna plaća?"],
        hint: "Kolika je …?",
        explanation: "Tak samo jak przy czynszu: Kolika je plaća? (plaća — pensja, rodzaj żeński → kolika).",
        practice: "plaća",
        next: "salary",
      }),
      say("salary", "petra", "Početna plaća je tisuću i petsto eura neto.", "Pensja początkowa to tysiąc pięćset euro netto.", "cv", { effects: [flag("asked-salary")] }),
      say("cv", "petra", "Javit ćemo Vam se do petka. Pošaljite nam još i životopis e-mailom.", "Odezwiemy się do piątku. Proszę nam jeszcze przesłać CV mailem.", "c-bye"),
      choice("c-bye", "Pożegnaj się.", [
        option("formal", "Naravno, poslat ću ga danas. Hvala i doviđenja!", "Oczywiście, wyślę je dziś. Dziękuję i do widzenia!", "correct", "bye"),
        option("casual", "Čujemo se, bok!", "Zdzwonimy się, cześć!", "wrong", "casual-bye", {
          explanation: "„Čujemo se, bok!” brzmi zbyt luźno na rozmowie o pracę. Pożegnaj się: Hvala i doviđenja!",
        }),
      ]),
      say("casual-bye", "petra", "Bok? Ha-ha… Pa dobro.", "Cześć? Ha-ha… No dobrze.", "c-bye", { mood: "puzzled" }),
      say("bye", "petra", "Doviđenja i sretno!", "Do widzenia i powodzenia!", "end", { mood: "happy" }),
      end(),
    ]),
  },
  debrief: [
    "Na rozmowie o pracę mówisz na „Vi”: Hvala Vama na pozivu. Doviđenja!",
    "Mówisz, czym się zajmujesz: Bavim se marketingom — baviti se + narzędnik.",
    "Doświadczenie to „godine iskustva” — samo „imam tri godine” to Twój wiek!",
  ],
};

/* ------------------------------------------------------------------ */
/* 3. U ljekarni — Sanja, apteka                                       */
/* ------------------------------------------------------------------ */

const pharmacy: Mission = {
  id: "m3-pharmacy",
  order: 3,
  title: { hr: "U ljekarni", pl: "W aptece" },
  locationId: "ljekarna",
  npcId: "sanja",
  goal: "Opiszesz objawy, zrozumiesz dawkowanie leku i poprosisz o coś jeszcze.",
  story: "Zagrzebska jesień dała Ci się we znaki: od rana boli Cię gardło, a jutro masz pierwszy dzień w pracy. Apteka na rogu jest już otwarta.",
  objectives: [
    { text: "Powiedz, co Cię boli", done: { flag: "said-pain" } },
    { text: "Opisz objawy", done: { flag: "symptoms" } },
    { text: "Zrozum dawkowanie", done: { flag: "dosage" } },
    { text: "Kup wszystko, czego potrzebujesz", done: { flag: "bought" } },
  ],
  requires: ["m1-flat"],
  xp: 40,
  vocabulary: [
    w("boljeti", "boleć", "WORD", "pl-hr:918"),
    w("grlo", "gardło", "WORD", "pl-hr:919"),
    w("kašljati", "kaszleć", "PHRASE", "pl-hr:phrase:kašljati"),
    w("tableta", "tabletka", "WORD", "pl-hr:1686"),
    w("sirup", "syrop", "PHRASE", "pl-hr:phrase:sirup"),
    w("dvaput", "dwa razy", "WORD", "pl-hr:4860"),
    w("dnevno", "dziennie", "WORD", "pl-hr:1689"),
    w("flaster", "plaster", "WORD", "pl-hr:1685"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("street", [
      say("street", "narrator", "Ljekarna na uglu. Jutros te boli grlo.", "Apteka na rogu. Od rana boli cię gardło.", "hello"),
      say("hello", "sanja", "Dobro jutro! Izvolite, kako Vam mogu pomoći?", "Dzień dobry! Słucham, jak mogę pomóc?", "b-pain"),
      build("b-pain", {
        instruction: "Powiedz, że boli Cię gardło.",
        translation: "Boli mnie gardło.",
        tokens: ["Boli", "me", "grlo", "glava", "mi", "je"],
        accepted: ["Boli me grlo."],
        explanation: "Mówimy „Boli me…” + to, co boli: Boli me grlo (boli mnie gardło). „Me”, nie „mi”.",
        practice: "boljeti",
        next: "fever",
        onWrong: "pain-what",
      }),
      say("pain-what", "sanja", "Što Vas boli? Glava? Grlo?", "Co Pana/Panią boli? Głowa? Gardło?", "b-pain", { mood: "puzzled" }),
      say("fever", "sanja", "Imate li temperaturu? Kašljete li?", "Ma Pan/Pani gorączkę? Kaszle Pan/Pani?", "c-symptoms", { effects: [flag("said-pain")] }),
      choice("c-symptoms", "Odpowiedz: nie masz gorączki, ale trochę kaszlesz.", [
        option("cough", "Nemam temperaturu, ali malo kašljem.", "Nie mam gorączki, ale trochę kaszlę.", "correct", "medicine", { effects: [flag("symptoms")] }),
        option("noun", "Nemam temperaturu, ali malo kašalj.", "Nie mam gorączki, ale trochę kaszel.", "wrong", "symptoms-again", {
          explanation: "„Kašalj” to rzeczownik (kaszel). Potrzebny czasownik: kašljati → (ja) kašljem.",
        }),
        option("slow", "Polako, molim Vas. Ne razumijem.", "Wolniej, proszę. Nie rozumiem.", "neutral", "symptoms-slow"),
      ]),
      say("symptoms-again", "sanja", "Kašalj? Znači — kašljete?", "Kaszel? Czyli — kaszle Pan/Pani?", "c-symptoms", { mood: "puzzled" }),
      say("symptoms-slow", "sanja", "Imate li temperaturu? I kašljete li — ovako: khm, khm?", "Ma Pan/Pani gorączkę? I czy Pan/Pani kaszle — o tak: khm, khm?", "c-symptoms"),
      say("medicine", "sanja", "Onda Vam preporučujem ove tablete za grlo i sirup protiv kašlja.", "To polecam te tabletki na gardło i syrop na kaszel.", "dose"),
      say("dose", "sanja", "Tablete uzimajte dvaput dnevno, nakon jela.", "Tabletki proszę brać dwa razy dziennie, po jedzeniu.", "c-dose"),
      choice("c-dose", "Powtórz, jak brać tabletki.", [
        option("right", "Dvaput dnevno, nakon jela. Hvala!", "Dwa razy dziennie, po jedzeniu. Dziękuję!", "correct", "allergy", { effects: [flag("dosage")] }),
        option("week", "Dvaput tjedno, prije jela?", "Dwa razy w tygodniu, przed jedzeniem?", "wrong", "dose-again", {
          explanation: "„Dvaput dnevno” to dwa razy DZIENNIE (tjedno — tygodniowo), a „nakon jela” — PO jedzeniu (prije — przed).",
        }),
        option("once", "Jednom dnevno, prije jela?", "Raz dziennie, przed jedzeniem?", "wrong", "dose-again", {
          explanation: "„Dvaput” to dwa razy (jednom — raz), a „nakon jela” — po jedzeniu.",
        }),
      ]),
      say("dose-again", "sanja", "Ne — dvaput dnevno, nakon jela.", "Nie — dwa razy dziennie, po jedzeniu.", "c-dose", { mood: "puzzled" }),
      say("allergy", "sanja", "Jeste li alergični na neki lijek?", "Czy jest Pan/Pani uczulony/a na jakiś lek?", "c-allergy"),
      choice("c-allergy", "Odpowiedz na pytanie o alergię.", [
        option("none", "Ne, nemam nikakvih alergija.", "Nie, nie mam żadnych alergii.", "correct", "more"),
        option("penicillin", "Da, na penicilin.", "Tak, na penicylinę.", "correct", "penicillin"),
        option("pain", "Da, boli me.", "Tak, boli mnie.", "wrong", "allergy-again", {
          explanation: "Sanja pyta o alergię, nie o ból. Odpowiedz np.: Ne, nemam nikakvih alergija.",
        }),
      ]),
      say("allergy-again", "sanja", "Pitam za alergije — na lijekove.", "Pytam o alergie — na leki.", "c-allergy", { mood: "puzzled" }),
      say("penicillin", "sanja", "Dobro da ste rekli. U ovim tabletama nema penicilina.", "Dobrze, że Pan/Pani powiedział/a. W tych tabletkach nie ma penicyliny.", "more"),
      say("more", "sanja", "U redu. Još nešto?", "W porządku. Coś jeszcze?", "t-plaster"),
      type("t-plaster", {
        instruction: "Poproś jeszcze o plaster.",
        translation: "Potrzebuję jeszcze plastra.",
        accepted: ["Trebam i flaster.", "Trebam još flaster.", "Trebam flaster.", "Imate li flaster?", "Trebam još i flaster."],
        hint: "Trebam … / Imate li …?",
        explanation: "Prośba: Trebam flaster (potrzebuję plastra) albo pytanie: Imate li flaster?",
        practice: "flaster",
        next: "pay",
      }),
      say("pay", "sanja", "Naravno, izvolite. Sve skupa je dvanaest eura.", "Oczywiście, proszę. Razem dwanaście euro.", "get-well", { effects: [flag("bought")] }),
      say("get-well", "sanja", "Brzo ozdravite!", "Szybkiego powrotu do zdrowia!", "end", { mood: "happy" }),
      end(),
    ]),
  },
  debrief: [
    "Mówisz, co boli: Boli me grlo. Boli me glava.",
    "Opisujesz objawy czasownikiem: kašljem (kaszlę), a nie rzeczownikiem „kašalj”.",
    "Rozumiesz dawkowanie: dvaput dnevno, nakon jela — dwa razy dziennie, po jedzeniu.",
  ],
};

/* ------------------------------------------------------------------ */
/* 4. Jakna za zimu — Maja, sklep z ubraniami na Ilicy                 */
/* ------------------------------------------------------------------ */

const jacket: Mission = {
  id: "m4-jacket",
  order: 4,
  title: { hr: "Jakna za zimu", pl: "Kurtka na zimę" },
  locationId: "ilica",
  npcId: "maja",
  goal: "Kupisz kurtkę: powiesz, czego szukasz, który kolor Ci się podoba, jaki masz rozmiar — i dobijesz targu przy rabacie.",
  story: "Zima w Zagrzebiu jest dużo zimniejsza niż nad morzem, a Ty masz tylko lekką kurtkę. Na Ilicy trwa wyprzedaż.",
  objectives: [
    { text: "Powiedz, czego szukasz", done: { flag: "asked-jacket" } },
    { text: "Wybierz kolor", done: { any: [{ flag: "chose-blue" }, { flag: "chose-black" }] } },
    { text: "Podaj rozmiar i oceń przymiarkę", done: { flag: "needs-bigger" } },
    { text: "Kup kurtkę w promocji", done: { flag: "bought-jacket" } },
  ],
  requires: ["m2-interview"],
  xp: 40,
  vocabulary: [
    w("jakna", "kurtka", "WORD", "pl-hr:551"),
    w("sviđati se", "podobać się", "WORD", "pl-hr:554"),
    w("veličina", "rozmiar", "WORD", "pl-hr:552"),
    w("uzak", "wąski / obcisły", "WORD", "pl-hr:1569"),
    w("veći", "większy", "WORD", "pl-hr:894"),
    w("popust", "zniżka / rabat", "WORD", "pl-hr:556"),
    w("jeftiniji", "tańszy", "PHRASE", "pl-hr:phrase:jeftiniji"),
    w("plav", "niebieski", "WORD", "pl-hr:387"),
    w("crn", "czarny", "WORD", "pl-hr:384"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("street", [
      say("street", "narrator", "Ilica, najduža ulica u Zagrebu. Zima je ovdje hladnija nego na moru.", "Ilica, najdłuższa ulica Zagrzebia. Zima jest tu zimniejsza niż nad morzem.", "hello"),
      say("hello", "maja", "Bok! Mogu li Vam pomoći?", "Cześć! Mogę w czymś pomóc?", "b-jacket", { mood: "happy" }),
      build("b-jacket", {
        instruction: "Powiedz, że szukasz zimowej kurtki.",
        translation: "Szukam zimowej kurtki.",
        tokens: ["Tražim", "zimsku", "jaknu", "jakna", "zimska", "je"],
        accepted: ["Tražim zimsku jaknu."],
        explanation: "Po „tražim” (szukam) rzeczownik w bierniku: jakna → jaknu, zimska → zimsku.",
        practice: "jakna",
        next: "two",
        onWrong: "jacket-what",
      }),
      say("jacket-what", "maja", "Jaknu? Hlače? Što tražite?", "Kurtkę? Spodnie? Czego Pan/Pani szuka?", "b-jacket", { mood: "puzzled" }),
      say("two", "maja", "Imamo ove dvije: crnu i plavu. Koja Vam se sviđa?", "Mamy te dwie: czarną i niebieską. Która się Panu/Pani podoba?", "c-color", { effects: [flag("asked-jacket")] }),
      choice("c-color", "Powiedz, która kurtka Ci się podoba.", [
        option("blue", "Sviđa mi se plava.", "Podoba mi się niebieska.", "correct", "size", { effects: [flag("chose-blue")] }),
        option("black", "Sviđa mi se crna.", "Podoba mi się czarna.", "correct", "size", { effects: [flag("chose-black")] }),
        option("me", "Sviđam se plava.", "(„podobam się” zamiast „podoba mi się”)", "wrong", "color-again", {
          explanation: "Mówimy „Sviđa mi se…” — dosłownie „podoba mi się”. Czasownik zgadza się z tym, co się podoba: Sviđa mi se plava.",
        }),
      ]),
      say("color-again", "maja", "Molim? Vi se sviđate? Ha-ha. Koja jakna?", "Słucham? Pan/Pani się podoba? Ha-ha. Która kurtka?", "c-color", { mood: "puzzled" }),
      say("size", "maja", "Koja je Vaša veličina?", "Jaki jest Pana/Pani rozmiar?", "t-size"),
      type("t-size", {
        instruction: "Podaj swój rozmiar.",
        translation: "Mój rozmiar to M (S, L…).",
        accepted: ["Moja veličina je M.", "Moja veličina je L.", "Moja veličina je S.", "Nosim M."],
        pattern: "^(moja veličina je|nosim) (xs|s|m|l|xl|xxl|\\d+)$",
        hint: "Moja veličina je … (S, M, L…)",
        explanation: "Rozmiar podajesz tak: Moja veličina je M — albo krócej: Nosim M (noszę M).",
        practice: "veličina",
        next: "cabin",
      }),
      say("cabin", "maja", "Izvolite, kabina za presvlačenje je tamo.", "Proszę, przymierzalnia jest tam.", "try"),
      say("try", "narrator", "Probaš jaknu. Rukavi su prekratki, a jakna je tijesna.", "Przymierzasz kurtkę. Rękawy są za krótkie, a kurtka jest ciasna.", "fit"),
      say("fit", "maja", "Kako Vam stoji?", "Jak leży?", "c-fit"),
      choice("c-fit", "Powiedz, że kurtka jest za ciasna, i poproś o inny rozmiar.", [
        option("bigger", "Malo je uska. Imate li veću?", "Jest trochę ciasna. Ma Pani większą?", "correct", "b-color", { effects: [flag("needs-bigger")] }),
        option("smaller", "Malo je uska. Imate li manju?", "Jest trochę ciasna. Ma Pani mniejszą?", "wrong", "fit-again", {
          explanation: "Kurtka jest za ciasna (uska) — potrzebujesz większej: veću. „Manju” to mniejszą.",
        }),
        option("perfect", "Stoji mi savršeno!", "Leży idealnie!", "wrong", "fit-again", {
          explanation: "Rękawy są za krótkie, a kurtka ciasna — nie leży idealnie. Poproś o większy rozmiar: Imate li veću?",
        }),
      ]),
      say("fit-again", "maja", "Hm, sigurno? Rukavi su Vam prekratki.", "Hm, na pewno? Rękawy są za krótkie.", "c-fit", { mood: "puzzled" }),
      branch("b-color", [{ when: { flag: "chose-black" }, next: "bigger-black" }], "bigger-blue"),
      say("bigger-blue", "maja", "Evo veće plave. Ova je malo skuplja, ali danas je na popustu.", "Oto większa niebieska. Ta jest trochę droższa, ale dziś jest w promocji.", "price"),
      say("bigger-black", "maja", "Evo veće crne. Ova je malo skuplja, ali danas je na popustu.", "Oto większa czarna. Ta jest trochę droższa, ale dziś jest w promocji.", "price"),
      say("price", "maja", "Koštala je sto eura, a sada je osamdeset.", "Kosztowała sto euro, a teraz osiemdziesiąt.", "c-buy"),
      choice("c-buy", "Zdecyduj, czy ją bierzesz.", [
        option("take", "Osamdeset eura? To je jeftinije nego u drugoj trgovini. Uzet ću je!", "Osiemdziesiąt euro? To taniej niż w innym sklepie. Wezmę ją!", "correct", "paid", {
          effects: [flag("bought-jacket")],
        }),
        option("hundred", "Sto eura? To je preskupo.", "Sto euro? To za drogo.", "wrong", "price-again", {
          explanation: "Cena po zniżce to „osamdeset” — 80 euro. „Koštala je sto eura” — tyle kosztowała wcześniej.",
        }),
        option("looking", "Hvala, samo gledam.", "Dziękuję, tylko się rozglądam.", "neutral", "looking"),
      ]),
      say("price-again", "maja", "Ne, ne — sada je samo osamdeset eura!", "Nie, nie — teraz tylko osiemdziesiąt euro!", "c-buy", { mood: "puzzled" }),
      say("looking", "maja", "U redu, ali popust vrijedi samo danas!", "W porządku, ale zniżka obowiązuje tylko dziś!", "c-buy"),
      say("paid", "maja", "Odličan izbor! Platite na blagajni.", "Świetny wybór! Proszę zapłacić przy kasie.", "end", { mood: "happy" }),
      end(),
    ]),
  },
  debrief: [
    "Mówisz, czego szukasz — w bierniku: Tražim zimsku jaknu.",
    "Mówisz, co Ci się podoba: Sviđa mi se plava (dosłownie: podoba mi się).",
    "Porównujesz: uska → treba veća; jeftinije nego u drugoj trgovini.",
  ],
};

/* ------------------------------------------------------------------ */
/* 5. Kako ti je prošao vikend? — Dario, kawiarnia na Tkalčićevej      */
/* ------------------------------------------------------------------ */

const weekend: Mission = {
  id: "m5-weekend",
  order: 5,
  title: { hr: "Kako ti je prošao vikend?", pl: "Jak ci minął weekend?" },
  locationId: "tkalca",
  npcId: "dario",
  goal: "Opowiesz koledze o weekendzie w czasie przeszłym, przyjmiesz zaproszenie i umówisz się na spotkanie.",
  story: "Poniedziałek. Przed pracą wpadasz na kawę z Dariem z nowego zespołu. W Zagrzebiu kawa to rytuał — i najlepsza okazja, żeby się poznać.",
  objectives: [
    { text: "Opowiedz o sobocie", done: { flag: "told-weekend" } },
    { text: "Opowiedz o niedzieli", done: { flag: "told-sunday" } },
    { text: "Odpowiedz na zaproszenie", done: { flag: "invite-answered" } },
    { text: "Potwierdź spotkanie", done: { flag: "agreed-meet" } },
  ],
  requires: ["m2-interview"],
  xp: 40,
  vocabulary: [
    w("izložba", "wystawa", "WORD", "pl-hr:746"),
    w("ulaznica", "bilet wstępu", "WORD", "pl-hr:1848"),
    w("obveza", "obowiązek", "WORD", "pl-hr:989"),
    w("dogovoriti se", "umówić się", "WORD", "pl-hr:695"),
    w("Vidimo se tamo!", "Do zobaczenia na miejscu!", "PHRASE", "pl-hr:phrase:vidimo se tamo"),
    w("cijeli", "cały", "PHRASE", "pl-hr:phrase:cijeli"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("street", [
      say("street", "narrator", "Ponedjeljak ujutro, Tkalčićeva ulica. Kolega Dario te čeka na kavi prije posla.", "Poniedziałek rano, ulica Tkalčićeva. Kolega Dario czeka na ciebie na kawie przed pracą.", "hello"),
      say("hello", "dario", "Bok! Kako ti je prošao vikend?", "Cześć! Jak ci minął weekend?", "c-saturday", { mood: "happy" }),
      choice("c-saturday", "Opowiedz, co robiliście w sobotę.", [
        option("jarun", "Super! U subotu smo bili na Jarunu.", "Super! W sobotę byliśmy na Jarunie.", "correct", "parents", { effects: [flag("told-weekend")] }),
        option("present", "Super! U subotu idem na Jarun.", "Super! W sobotę idę na Jarun.", "wrong", "present", {
          explanation: "Dario pyta o miniony weekend — potrzebny czas przeszły: U subotu smo bili na Jarunu (byliśmy). „Idem” to czas teraźniejszy.",
        }),
        option("infinitive", "Super! U subotu smo biti na Jarunu.", "(bezokolicznik zamiast czasu przeszłego)", "wrong", "infinitive", {
          explanation: "„Biti” to bezokolicznik. Czas przeszły: smo + imiesłów → smo bili.",
        }),
      ]),
      say("present", "dario", "Ideš? Ali subota je već bila!", "Idziesz? Ale sobota już była!", "c-saturday", { mood: "puzzled" }),
      say("infinitive", "dario", "Smo biti? Misliš — bili smo?", "„Smo biti”? Chodzi ci o — byliśmy?", "c-saturday", { mood: "puzzled" }),
      say("parents", "dario", "Jarun? Lijepo! Ja sam bio kod roditelja u Varaždinu. A u nedjelju?", "Jarun? Ładnie! Ja byłem u rodziców w Varaždinie. A w niedzielę?", "b-sunday", { mood: "happy" }),
      build("b-sunday", {
        instruction: "Powiedz, że w niedzielę cały dzień oglądałeś / oglądałaś filmy.",
        translation: "W niedzielę cały dzień oglądałem/oglądałam filmy.",
        tokens: ["U", "nedjelju", "sam", "cijeli", "dan", "gledao", "gledala", "filmove", "gledati"],
        accepted: ["U nedjelju sam cijeli dan gledao filmove.", "U nedjelju sam cijeli dan gledala filmove."],
        explanation: "Czas przeszły: sam + imiesłów — gledao (mężczyzna) / gledala (kobieta). „Sam” stoi na drugim miejscu: U nedjelju sam…",
        practice: "cijeli",
        next: "rest",
        onWrong: "sunday-what",
      }),
      say("sunday-what", "dario", "Molim? Što je bilo u nedjelju?", "Słucham? Co było w niedzielę?", "b-sunday", { mood: "puzzled" }),
      say("rest", "dario", "Pametno — prije novog tjedna treba se odmoriti.", "Mądrze — przed nowym tygodniem trzeba odpocząć.", "invite", { effects: [flag("told-sunday")] }),
      say("invite", "dario", "Slušaj, u petak se otvara izložba u Muzeju suvremene umjetnosti. Imam dvije ulaznice. Ideš sa mnom?", "Słuchaj, w piątek otwiera się wystawa w Muzeum Sztuki Współczesnej. Mam dwa bilety. Idziesz ze mną?", "c-invite"),
      choice("c-invite", "Odpowiedz na zaproszenie.", [
        option("yes", "Može! U koliko sati počinje?", "Chętnie! O której się zaczyna?", "correct", "time", { effects: [flag("invite-answered")] }),
        option("busy", "Nažalost, u petak ne mogu. Imam obvezu.", "Niestety w piątek nie mogę. Mam zobowiązanie.", "correct", "busy", { effects: [flag("invite-answered")] }),
        option("yesterday", "Može, ali jučer.", "Może być, ale wczoraj.", "wrong", "yesterday", {
          explanation: "Wczoraj (jučer) już minęło 🙂 Dario zaprasza na piątek. Odpowiedz np.: Može! U koliko sati počinje?",
        }),
      ]),
      say("yesterday", "dario", "Jučer? Izložba je tek u petak!", "Wczoraj? Wystawa jest dopiero w piątek!", "c-invite", { mood: "puzzled" }),
      say("time", "dario", "U sedam navečer. Nađemo se ispred muzeja u pola sedam?", "O siódmej wieczorem. Spotkajmy się przed muzeum o wpół do siódmej?", "t-confirm", { mood: "happy" }),
      say("busy", "dario", "Šteta! Izložba traje cijeli mjesec. Idemo sljedeći petak? Nađemo se ispred muzeja u pola sedam?", "Szkoda! Wystawa trwa cały miesiąc. Idziemy w następny piątek? Spotkajmy się przed muzeum o wpół do siódmej?", "t-confirm"),
      type("t-confirm", {
        instruction: "Potwierdź spotkanie: do zobaczenia na miejscu!",
        translation: "Do zobaczenia na miejscu!",
        accepted: ["Vidimo se tamo!", "Dogovoreno, vidimo se tamo!", "Može, vidimo se tamo!", "Super, vidimo se tamo!"],
        hint: "Vidimo se …!",
        explanation: "Potwierdzasz spotkanie: Vidimo se tamo! (do zobaczenia na miejscu). Można dodać: Dogovoreno! (umowa stoi).",
        next: "late",
      }),
      say("late", "dario", "Dogovoreno! Idemo, kasnimo na posao!", "Umowa stoi! Chodźmy, spóźnimy się do pracy!", "end", { mood: "happy", effects: [flag("agreed-meet")] }),
      end(),
    ]),
  },
  debrief: [
    "Opowiadasz o przeszłości: U subotu smo bili na Jarunu. U nedjelju sam gledao/gledala filmove.",
    "Odpowiadasz na zaproszenie: Može! albo Nažalost, ne mogu — imam obvezu.",
    "Umawiasz się: Nađemo se ispred muzeja… — Dogovoreno, vidimo se tamo!",
  ],
};

export const ZAGREB_MISSIONS: Mission[] = [flat, interview, pharmacy, jacket, weekend];
