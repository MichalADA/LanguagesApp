import type { Mission, MissionWord } from "../../types";
import { branch, build, choice, end, flag, graph, option, say, type } from "../builders";

/**
 * Dubrovnik B1 — pięć misji. Zdania opierają się na materiale lekcji B1: zgłaszanie usterek (moduł 7),
 * strona bierna i kultura (11), podróż promem (6), mowa zależna i argumentowanie (11–12),
 * tryb przypuszczający i rady (3–4, 10, 12). Dłuższe wypowiedzi, więcej rozgałęzień niż w A1/A2.
 * Opcje gracza unikają form zależnych od płci (albo akceptują obie: imao / imala).
 * Treść chorwacka NIE jest jeszcze sprawdzona przez native speakera (story.languageReview).
 *
 * Słownictwo: te same karty FSRS co w lekcjach B1 (i A2 — „curiti”, „propustiti”).
 */

const w = (hr: string, pl: string, itemType: "WORD" | "PHRASE", itemId: string): MissionWord => ({ hr, pl, review: { itemType, itemId } });

/* ------------------------------------------------------------------ */
/* 1. Kvar u apartmanu — gospođa Mara, apartament na Pločach           */
/* ------------------------------------------------------------------ */

const repair: Mission = {
  id: "m1-repair",
  order: 1,
  title: { hr: "Kvar u apartmanu", pl: "Usterka w apartamencie" },
  locationId: "ploce",
  npcId: "mara",
  goal: "Zgłosisz dwie usterki właścicielce, opiszesz je dokładnie i umówisz wizytę fachowca.",
  story: "Pierwszy poranek w Dubrowniku. Widok z okna na stare miasto jest piękny, ale odpływ w łazience jest zatkany, a pod zlewem stoi kałuża. Pani Mara, właścicielka, właśnie wchodzi po schodach.",
  objectives: [
    { text: "Powiedz, że coś jest nie tak", done: { flag: "started-report" } },
    { text: "Zgłoś zatkany odpływ", done: { flag: "reported-drain" } },
    { text: "Zgłoś przeciek", done: { flag: "reported-leak" } },
    { text: "Umów wizytę fachowca", done: { flag: "agreed-time" } },
  ],
  requires: [],
  xp: 50,
  vocabulary: [
    w("prijaviti kvar", "zgłosić usterkę", "PHRASE", "pl-hr:phrase:prijaviti kvar"),
    w("začepljen", "zatkany", "PHRASE", "pl-hr:phrase:začepljen"),
    w("odvod", "odpływ", "WORD", "pl-hr:3669"),
    w("sudoper", "zlew", "WORD", "pl-hr:3700"),
    w("curiti", "cieknąć", "PHRASE", "pl-hr:phrase:curiti"),
    w("prethodni", "poprzedni", "WORD", "pl-hr:1359"),
    w("obavijestiti", "powiadomić / poinformować", "PHRASE", "pl-hr:phrase:obavijestiti"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("view", [
      say("view", "narrator", "Dubrovnik. Apartman u Pločama, s pogledom na stari grad. Ali nešto nije u redu.", "Dubrownik. Apartament na Pločach z widokiem na stare miasto. Ale coś jest nie tak.", "problem"),
      say("problem", "narrator", "Odvod u kupaonici je začepljen, a ispod sudopera curi voda.", "Odpływ w łazience jest zatkany, a spod zlewu cieknie woda.", "hello"),
      say("hello", "mara", "Dobro jutro! Jeste li se dobro naspavali? Je li sve u redu sa stanom?", "Dzień dobry! Wyspał/a się Pan/Pani? Wszystko w porządku z mieszkaniem?", "c-start", { mood: "happy" }),
      choice("c-start", "Powiedz, że niestety nie i że chcesz zgłosić usterki.", [
        option("report", "Nažalost, nije. Moram prijaviti dva kvara.", "Niestety nie. Muszę zgłosić dwie usterki.", "correct", "what", { effects: [flag("started-report")] }),
        option("perfect", "Da, sve je savršeno, hvala!", "Tak, wszystko idealnie, dziękuję!", "wrong", "perfect", {
          explanation: "Przecież odpływ jest zatkany, a woda cieknie! Zgłoś usterki: Nažalost, nije. Moram prijaviti dva kvara.",
        }),
      ]),
      say("perfect", "mara", "Savršeno? Drago mi je! Ali čekajte… zašto je pod u kuhinji mokar?", "Idealnie? Cieszę się! Ale chwileczkę… czemu podłoga w kuchni jest mokra?", "c-start", { mood: "puzzled" }),
      say("what", "mara", "Joj! Recite mi, što se dogodilo?", "Ojej! Proszę powiedzieć, co się stało?", "b-drain", { mood: "puzzled" }),
      build("b-drain", {
        instruction: "Powiedz, że odpływ w łazience jest zatkany.",
        translation: "Odpływ w łazience jest zatkany.",
        tokens: ["Odvod", "u", "kupaonici", "je", "začepljen", "začepljena", "kupaonica"],
        accepted: ["Odvod u kupaonici je začepljen."],
        explanation: "„Odvod” (odpływ) jest rodzaju męskiego → začepljen. Po „u” miejscownik: kupaonica → u kupaonici.",
        practice: "začepljen",
        next: "again",
        onWrong: "drain-what",
      }),
      say("drain-what", "mara", "Polako. Što je s kupaonicom?", "Powoli. Co z łazienką?", "b-drain", { mood: "puzzled" }),
      say("again", "mara", "Opet? Prethodni stanar je imao isti problem. A drugi kvar?", "Znowu? Poprzedni lokator miał ten sam problem. A druga usterka?", "t-leak", { effects: [flag("reported-drain")] }),
      type("t-leak", {
        instruction: "Napisz, że spod zlewu cieknie woda.",
        translation: "Spod zlewu cieknie woda.",
        accepted: ["Ispod sudopera curi voda.", "Voda curi ispod sudopera.", "Curi voda ispod sudopera."],
        hint: "Ispod sudopera …",
        explanation: "„Ispod” wymaga dopełniacza: sudoper → ispod sudopera. Cieknie: curi (od curiti).",
        practice: "sudoper",
        next: "plumber",
      }),
      say("plumber", "mara", "To nije dobro. Zvat ću majstora još danas.", "To niedobrze. Zadzwonię po fachowca jeszcze dziś.", "when", { effects: [flag("reported-leak")] }),
      say("when", "mara", "Biste li mogli biti u apartmanu poslijepodne, kad majstor dođe?", "Czy mógłby Pan / mogłaby Pani być w apartamencie po południu, kiedy przyjdzie fachowiec?", "c-time"),
      choice("c-time", "Umów się z panią Marą na wizytę fachowca.", [
        option("today", "Mogu biti ovdje do tri sata.", "Mogę tu być do trzeciej.", "correct", "two", { effects: [flag("agreed-time")] }),
        option("tomorrow", "Nažalost, poslijepodne nisam tu. Može li majstor doći sutra ujutro?", "Niestety po południu mnie nie ma. Czy fachowiec może przyjść jutro rano?", "correct", "nine", {
          effects: [flag("agreed-time")],
        }),
        option("yesterday", "Majstor je mogao doći jučer.", "Fachowiec mógł przyjść wczoraj.", "wrong", "yesterday", {
          explanation: "„Jučer” (wczoraj) już minęło — umów się na dziś albo na jutro, np.: Mogu biti ovdje do tri sata.",
        }),
      ]),
      say("yesterday", "mara", "Jučer? Ha-ha, to bi bilo lijepo, ali ne ide.", "Wczoraj? Ha-ha, byłoby miło, ale tak się nie da.", "c-time", { mood: "puzzled" }),
      say("two", "mara", "Odlično, majstor dolazi u dva.", "Świetnie, fachowiec przyjdzie o drugiej.", "sorry", { mood: "happy" }),
      say("nine", "mara", "Može i tako. Majstor dolazi sutra u devet.", "Może być i tak. Fachowiec przyjdzie jutro o dziewiątej.", "sorry"),
      say("sorry", "mara", "Oprostite zbog neugodnosti. Ako bude još problema, javite mi odmah.", "Przepraszam za kłopot. Jeśli będą jeszcze problemy, proszę od razu dać znać.", "c-bye"),
      choice("c-bye", "Podziękuj i obiecaj, że dasz znać.", [
        option("thanks", "Hvala Vam! Obavijestit ću Vas ako nešto ne bude u redu.", "Dziękuję! Powiadomię Panią, jeśli coś nie będzie w porządku.", "correct", "enjoy"),
        option("deposit", "Hvala! Onda mi vratite polog.", "Dziękuję! To proszę mi oddać kaucję.", "wrong", "deposit", {
          explanation: "Za wcześnie na zwrot kaucji 🙂 Kaucję (polog) oddaje się po wyprowadzce. Podziękuj: Hvala Vam! Obavijestit ću Vas…",
        }),
      ]),
      say("deposit", "mara", "Polog? Pa tek ste stigli!", "Kaucję? Przecież dopiero Pan/Pani przyjechał/a!", "c-bye", { mood: "puzzled" }),
      say("enjoy", "mara", "Uživajte u Dubrovniku!", "Proszę cieszyć się Dubrownikiem!", "end", { mood: "happy" }),
      end(),
    ]),
  },
  debrief: [
    "Zgłaszasz usterki: Moram prijaviti dva kvara. Odvod u kupaonici je začepljen.",
    "Opisujesz, gdzie jest problem — z dopełniaczem: ispod sudopera curi voda.",
    "Umawiasz termin i obiecujesz kontakt: Obavijestit ću Vas ako nešto ne bude u redu.",
  ],
};

/* ------------------------------------------------------------------ */
/* 2. Šetnja po zidinama — Nikola, mury miejskie                       */
/* ------------------------------------------------------------------ */

const walls: Mission = {
  id: "m2-walls",
  order: 2,
  title: { hr: "Šetnja po zidinama", pl: "Spacer po murach" },
  locationId: "zidine",
  npcId: "nikola",
  goal: "Zrozumiesz przewodnika mówiącego o historii, wyrazisz własne zdanie z porównaniem i zadasz pytanie w stronie biernej.",
  story: "Mury Dubrownika to prawie dwa kilometry kamienia nad morzem. Zapisujesz się na wycieczkę z Nikolą — lokalnym przewodnikiem, który opowiada szybko i z pasją.",
  objectives: [
    { text: "Zrozum historię murów", done: { flag: "learned-history" } },
    { text: "Wyraź opinię o mieście", done: { flag: "gave-opinion" } },
    { text: "Zadaj pytanie przewodnikowi", done: { flag: "asked-question" } },
  ],
  requires: ["m1-repair"],
  xp: 50,
  vocabulary: [
    w("vodič", "przewodnik", "WORD", "pl-hr:970"),
    w("izgraditi", "zbudować", "WORD", "pl-hr:2099"),
    w("stoljeće", "wiek (stulecie)", "WORD", "pl-hr:1018"),
    w("tvrđava", "twierdza", "PHRASE", "pl-hr:phrase:tvrđava"),
    w("izvan sezone", "poza sezonem", "PHRASE", "pl-hr:phrase:izvan sezone"),
    w("mirniji", "spokojniejszy", "PHRASE", "pl-hr:phrase:mirniji"),
    w("snimiti", "nakręcić / nagrać", "PHRASE", "pl-hr:phrase:snimiti"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("walls", [
      say("walls", "narrator", "Gradske zidine. Gotovo dva kilometra kamena oko staroga grada.", "Mury miejskie. Prawie dwa kilometry kamienia wokół starego miasta.", "hello"),
      say("hello", "nikola", "Dobar dan svima! Ja sam Nikola, vaš vodič. Jeste li prvi put u Dubrovniku?", "Dzień dobry wszystkim! Jestem Nikola, wasz przewodnik. Jesteście pierwszy raz w Dubrowniku?", "c-first", { mood: "happy" }),
      choice("c-first", "Odpowiedz, że jesteś tu pierwszy raz.", [
        option("first", "Da, prvi put! Već dugo želim vidjeti zidine.", "Tak, pierwszy raz! Od dawna chcę zobaczyć mury.", "correct", "built"),
        option("time", "Da, prva vrijeme.", "Tak, „pierwszy czas”.", "wrong", "time", {
          explanation: "„Pierwszy raz” to po chorwacku „prvi put”, nie „prva vrijeme” (vrijeme — czas, pogoda).",
        }),
      ]),
      say("time", "nikola", "Prva vrijeme? Mislite — prvi put? Dobro došli!", "„Pierwszy czas”? Chodzi o — pierwszy raz? Witamy!", "c-first", { mood: "puzzled" }),
      say("built", "nikola", "Zidine su izgrađene između dvanaestog i sedamnaestog stoljeća.", "Mury budowano między dwunastym a siedemnastym wiekiem.", "minceta"),
      say("minceta", "nikola", "Najviša točka je tvrđava Minčeta. Odande je pogled najljepši.", "Najwyższym punktem jest twierdza Minčeta. Stamtąd widok jest najpiękniejszy.", "c-history"),
      choice("c-history", "Upewnij się, że dobrze zrozumiałeś, jak stare są mury.", [
        option("old", "Znači, zidine su starije od osamsto godina?", "Czyli mury mają ponad osiemset lat?", "correct", "film", { effects: [flag("learned-history")] }),
        option("new", "Znači, zidine su izgrađene u dvadesetom stoljeću?", "Czyli mury zbudowano w XX wieku?", "wrong", "history-again", {
          explanation: "Nikola mówi o wiekach XII–XVII: „između dvanaestog i sedamnaestog stoljeća”, nie o dwudziestym.",
        }),
      ]),
      say("history-again", "nikola", "Ne, ne — puno, puno starije!", "Nie, nie — dużo, dużo starsze!", "c-history", { mood: "puzzled" }),
      say("film", "nikola", "Znate li da je ovdje snimljeno puno filmova i serija? Zato ljeti dolaze mnogi turisti.", "Czy wiecie, że nakręcono tu mnóstwo filmów i seriali? Dlatego latem przyjeżdża tylu turystów.", "season"),
      say("season", "nikola", "Ali ja mislim da je grad ljepši izvan sezone. Što Vi mislite — zašto?", "Ale ja uważam, że miasto jest piękniejsze poza sezonem. Jak Pan/Pani myśli — dlaczego?", "b-season"),
      build("b-season", {
        instruction: "Powiedz, że poza sezonem miasto jest spokojniejsze i tańsze.",
        translation: "Poza sezonem miasto jest spokojniejsze i tańsze.",
        tokens: ["Izvan", "sezone", "je", "grad", "mirniji", "i", "jeftiniji", "mirno", "sezona"],
        accepted: ["Izvan sezone je grad mirniji i jeftiniji.", "Izvan sezone grad je mirniji i jeftiniji.", "Grad je izvan sezone mirniji i jeftiniji."],
        explanation: "Stopień wyższy: miran → mirniji, jeftin → jeftiniji. „Izvan” wymaga dopełniacza: sezona → izvan sezone.",
        practice: "izvan sezone",
        next: "crowd",
        onWrong: "season-what",
      }),
      say("season-what", "nikola", "Hm? Kakav je grad izvan sezone?", "Hm? Jakie jest miasto poza sezonem?", "b-season", { mood: "puzzled" }),
      say("crowd", "nikola", "Točno! I na Stradunu je manje gužve.", "Dokładnie! I na Stradunie jest mniejszy tłok.", "ask", { mood: "happy", effects: [flag("gave-opinion")] }),
      say("ask", "nikola", "Sad smo kod Minčete. Pitajte me što god želite!", "Jesteśmy przy Minčecie. Pytajcie, o co chcecie!", "t-ask"),
      type("t-ask", {
        instruction: "Zapytaj, kiedy zbudowano twierdzę.",
        translation: "Kiedy zbudowano twierdzę?",
        accepted: ["Kada je izgrađena tvrđava?", "Kad je izgrađena tvrđava?", "Kada je tvrđava izgrađena?", "Kad je tvrđava izgrađena?", "Kada je izgrađena Minčeta?", "Kad je izgrađena Minčeta?"],
        hint: "Kada je izgrađena …?",
        explanation: "Strona bierna: biti + imiesłów bierny — tvrđava je izgrađena (twierdza została zbudowana). Pytanie: Kada je izgrađena tvrđava?",
        practice: "izgraditi",
        next: "answer",
      }),
      say("answer", "nikola", "Dobro pitanje! Izgrađena je u četrnaestom stoljeću, a kasnije je proširena.", "Dobre pytanie! Zbudowano ją w XIV wieku, a później rozbudowano.", "thanks", { effects: [flag("asked-question")] }),
      say("thanks", "nikola", "Hvala svima na pažnji! Kako vam se svidjela tura?", "Dziękuję wszystkim za uwagę! Jak się wam podobała wycieczka?", "c-thanks"),
      choice("c-thanks", "Podziękuj i powiedz, że było ciekawie.", [
        option("great", "Hvala Vama, bilo je stvarno zanimljivo!", "Dziękuję, było naprawdę ciekawie!", "correct", "bye"),
        option("me", "Hvala, bila sam stvarno zanimljiva!", "Dziękuję, byłam naprawdę interesująca!", "wrong", "me", {
          explanation: "„Bila sam zanimljiva” znaczy „byłam interesująca” — o sobie, nie o wycieczce! Powiedz bezosobowo: Bilo je stvarno zanimljivo!",
        }),
      ]),
      say("me", "nikola", "Ha-ha, sigurno jeste! Ali mislite — tura je bila zanimljiva?", "Ha-ha, na pewno! Ale chodzi o to, że wycieczka była ciekawa?", "c-thanks", { mood: "puzzled" }),
      say("bye", "nikola", "Drago mi je! Vidimo se u gradu!", "Cieszę się! Do zobaczenia w mieście!", "end", { mood: "happy" }),
      end(),
    ]),
  },
  debrief: [
    "Rozumiesz stronę bierną: zidine su izgrađene… — mury zostały zbudowane.",
    "Porównujesz: izvan sezone grad je mirniji i jeftiniji.",
    "Pytasz w stronie biernej: Kada je izgrađena tvrđava?",
  ],
};

/* ------------------------------------------------------------------ */
/* 3. Brod za Lopud — Ante, port Gruž                                  */
/* ------------------------------------------------------------------ */

const ferry: Mission = {
  id: "m3-ferry",
  order: 3,
  title: { hr: "Brod za Lopud", pl: "Statek na Lopud" },
  locationId: "gruz",
  npcId: "ante",
  goal: "Kupisz bilet na wyspę, wybierzesz między katamaranem a promem i dowiesz się, jak wrócić na czas.",
  story: "Chcesz spędzić dzień na wyspie Lopud. W porcie Gruž rozkład jest tylko po chorwacku, a pan Ante w kasie mówi szybko — i nie lubi powtarzać.",
  objectives: [
    { text: "Kup bilet", done: { flag: "has-ticket" } },
    { text: "Dowiedz się, skąd i kiedy wsiadasz", done: { flag: "knows-boarding" } },
    { text: "Zapytaj o powrót", done: { flag: "knows-return" } },
  ],
  requires: ["m1-repair"],
  xp: 50,
  vocabulary: [
    w("luka", "port", "WORD", "pl-hr:1173"),
    w("katamaran", "katamaran", "WORD", "pl-hr:4070"),
    w("pristanište", "przystań", "PHRASE", "pl-hr:phrase:pristanište"),
    w("polaziti", "odjeżdżać", "PHRASE", "pl-hr:phrase:polaziti"),
    w("red vožnje", "rozkład jazdy", "PHRASE", "pl-hr:phrase:red vožnje"),
    w("što prije, to bolje", "im wcześniej, tym lepiej", "PHRASE", "pl-hr:phrase:što prije to bolje"),
    w("propustiti", "przegapić / uciec (o pociągu)", "PHRASE", "pl-hr:phrase:propustiti"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("port", [
      say("port", "narrator", "Luka Gruž, rano ujutro. Red vožnje je samo na hrvatskom.", "Port Gruž, wczesnym rankiem. Rozkład jest tylko po chorwacku.", "hello"),
      say("hello", "ante", "Dobro jutro! Kamo putujete?", "Dzień dobry! Dokąd Pan/Pani płynie?", "b-ticket"),
      build("b-ticket", {
        instruction: "Poproś o jeden bilet na Lopud.",
        translation: "Potrzebuję jednego biletu na Lopud.",
        tokens: ["Trebam", "jednu", "kartu", "za", "Lopud", "na", "karta"],
        accepted: ["Trebam jednu kartu za Lopud.", "Trebam kartu za Lopud."],
        explanation: "Bilet DO jakiegoś miejsca: karta za + nazwa — Trebam (jednu) kartu za Lopud. Po „trebam” biernik: karta → kartu.",
        next: "options",
        onWrong: "ticket-what",
      }),
      say("ticket-what", "ante", "Molim? Za koji otok?", "Słucham? Na którą wyspę?", "b-ticket", { mood: "puzzled" }),
      say("options", "ante", "Za Lopud imate katamaran u deset i trajekt u jedanaest i petnaest. Katamaran je brži, ali karta je skuplja.", "Na Lopud ma Pan/Pani katamaran o dziesiątej i prom o jedenastej piętnaście. Katamaran jest szybszy, ale bilet droższy.", "c-boat"),
      choice("c-boat", "Wybierz statek i uzasadnij wybór.", [
        option("cat", "Uzet ću katamaran — što prije, to bolje.", "Wezmę katamaran — im wcześniej, tym lepiej.", "correct", "cat", { effects: [flag("has-ticket"), flag("took-catamaran")] }),
        option("ferry", "Uzet ću trajekt — ne žurim se, a jeftiniji je.", "Wezmę prom — nie spieszę się, a jest tańszy.", "correct", "ferry", { effects: [flag("has-ticket")] }),
        option("slow", "Uzet ću katamaran, jer je sporiji.", "Wezmę katamaran, bo jest wolniejszy.", "wrong", "slow", {
          explanation: "Ante powiedział, że katamaran jest szybszy (brži), a nie wolniejszy (sporiji).",
        }),
      ]),
      say("slow", "ante", "Sporiji? Ne, ne — katamaran je brži!", "Wolniejszy? Nie, nie — katamaran jest szybszy!", "c-boat", { mood: "puzzled" }),
      say("cat", "ante", "Dobar izbor. To je dvanaest eura.", "Dobry wybór. To dwanaście euro.", "boarding"),
      say("ferry", "ante", "Može. Karta za trajekt je šest eura.", "Może być. Bilet na prom kosztuje sześć euro.", "boarding"),
      say("boarding", "ante", "Ukrcaj počinje deset minuta prije polaska, na drugom pristaništu.", "Wejście na pokład zaczyna się dziesięć minut przed odjazdem, na drugiej przystani.", "c-boarding"),
      choice("c-boarding", "Powtórz, gdzie i kiedy wsiadasz.", [
        option("right", "Znači, na drugom pristaništu, deset minuta prije polaska.", "Czyli na drugiej przystani, dziesięć minut przed odjazdem.", "correct", "b-return", {
          effects: [flag("knows-boarding")],
        }),
        option("tenth", "Znači, na desetom pristaništu, dvije minute prije?", "Czyli na dziesiątej przystani, dwie minuty przed?", "wrong", "boarding-again", {
          explanation: "Odwrotnie: „na drugom pristaništu” — na DRUGIEJ przystani, „deset minuta prije polaska” — DZIESIĘĆ minut przed odjazdem.",
        }),
      ]),
      say("boarding-again", "ante", "Ne! Drugo pristanište, deset minuta prije polaska.", "Nie! Druga przystań, dziesięć minut przed odjazdem.", "c-boarding", { mood: "puzzled" }),
      branch("b-return", [{ when: { flag: "took-catamaran" }, next: "careful-cat" }], "careful-ferry"),
      say("careful-cat", "ante", "I pazite na povratak — izvan sezone nema puno brodova.", "I proszę uważać na powrót — poza sezonem nie ma wielu statków.", "t-return"),
      say("careful-ferry", "ante", "I pazite na povratak — trajekt je spor, a izvan sezone nema puno brodova.", "I proszę uważać na powrót — prom jest wolny, a poza sezonem nie ma wielu statków.", "t-return"),
      type("t-return", {
        instruction: "Zapytaj, kiedy odpływa ostatni statek z powrotem.",
        translation: "Kiedy odpływa ostatni statek z powrotem?",
        accepted: [
          "Kada polazi zadnji brod natrag?",
          "Kad polazi zadnji brod natrag?",
          "Kada polazi zadnji brod?",
          "Kad polazi zadnji brod?",
          "U koliko sati polazi zadnji brod?",
          "U koliko sati polazi zadnji brod natrag?",
        ],
        hint: "Kada polazi … brod …?",
        explanation: "Odpływać według rozkładu: polaziti → polazi. Ostatni statek z powrotem: zadnji brod natrag.",
        practice: "polaziti",
        next: "six",
      }),
      say("six", "ante", "U šest navečer. Ako ga propustite, ostajete na otoku do jutra!", "O szóstej wieczorem. Jeśli go Pan/Pani przegapi, zostaje na wyspie do rana!", "c-bye", { effects: [flag("knows-return")] }),
      choice("c-bye", "Zareaguj na ostrzeżenie.", [
        option("thanks", "Hvala na upozorenju! Bit ću na pristaništu na vrijeme.", "Dzięki za ostrzeżenie! Będę na przystani na czas.", "correct", "bye"),
        option("stay", "Odlično, onda ću propustiti brod i ostati na otoku!", "Świetnie, to przegapię statek i zostanę na wyspie!", "neutral", "stay"),
      ]),
      say("stay", "ante", "Ha-ha, i to je opcija! Na Lopudu ima lijepih hotela.", "Ha-ha, to też jakaś opcja! Na Lopudzie są ładne hotele.", "bye", { mood: "happy" }),
      say("bye", "ante", "Sretan put!", "Szczęśliwej podróży!", "end", { mood: "happy" }),
      end(),
    ]),
  },
  debrief: [
    "Kupujesz bilet: Trebam jednu kartu za Lopud.",
    "Uzasadniasz wybór porównaniem: katamaran je brži, trajekt je jeftiniji — što prije, to bolje.",
    "Pytasz o rozkład: Kada polazi zadnji brod natrag? — i nie przegapiasz (ne propustiš) powrotu.",
  ],
};

/* ------------------------------------------------------------------ */
/* 4. Intervju na Stradunu — Jelena, Stradun                           */
/* ------------------------------------------------------------------ */

const interview: Mission = {
  id: "m4-interview",
  order: 4,
  title: { hr: "Intervju na Stradunu", pl: "Wywiad na Stradunie" },
  locationId: "stradun",
  npcId: "jelena",
  goal: "Udzielisz wywiadu: powiesz, skąd jesteś, wyrazisz zdanie z „iako”, skomentujesz cudze słowa w mowie zależnej i dasz radę turystom.",
  story: "Trwa Letni Festiwal Dubrownika. Na Stradunie zatrzymuje Cię dziennikarka lokalnego portalu z mikrofonem. Wywiad po chorwacku — teraz albo nigdy.",
  objectives: [
    { text: "Przedstaw się", done: { flag: "introduced" } },
    { text: "Wyraź opinię o festiwalu", done: { flag: "gave-opinion" } },
    { text: "Skomentuj słowa burmistrza", done: { flag: "understood-mayor" } },
    { text: "Doradź turystom", done: { flag: "interview-done" } },
  ],
  requires: ["m2-walls"],
  xp: 50,
  vocabulary: [
    w("novinar", "dziennikarz", "WORD", "pl-hr:1594"),
    w("festival", "festiwal", "PHRASE", "pl-hr:phrase:festival"),
    w("iako", "chociaż", "WORD", "pl-hr:870"),
    w("izjaviti", "oświadczyć", "PHRASE", "pl-hr:phrase:izjaviti"),
    w("gradonačelnik", "burmistrz", "PHRASE", "pl-hr:phrase:gradonačelnik"),
    w("navodno", "podobno", "WORD", "pl-hr:2336"),
    w("sumnjati", "wątpić / podejrzewać", "WORD", "pl-hr:1731"),
    w("objaviti", "opublikować", "WORD", "pl-hr:1598"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("stradun", [
      say("stradun", "narrator", "Stradun, Dubrovačke ljetne igre. Novinarka s mikrofonom ide ravno prema tebi.", "Stradun, Letni Festiwal w Dubrowniku. Dziennikarka z mikrofonem idzie prosto do ciebie.", "hello"),
      say("hello", "jelena", "Dobra večer! Jelena, s lokalnog portala. Imate li minutu za kratki intervju?", "Dobry wieczór! Jelena, z lokalnego portalu. Ma Pan/Pani minutę na krótki wywiad?", "c-start", { mood: "happy" }),
      choice("c-start", "Zgódź się na wywiad.", [
        option("yes", "Naravno, ali moj hrvatski nije savršen.", "Oczywiście, ale mój chorwacki nie jest idealny.", "correct", "where"),
        option("journalist", "Naravno, ali ja nisam novinar.", "Oczywiście, ale ja nie jestem dziennikarzem.", "wrong", "journalist", {
          explanation: "Jelena nie pyta, czy jesteś dziennikarzem — to ona przeprowadza wywiad. Wystarczy się zgodzić: Naravno!",
        }),
        option("slow", "Možete li govoriti malo sporije?", "Może Pani mówić trochę wolniej?", "neutral", "slower"),
      ]),
      say("journalist", "jelena", "Znam, znam — novinarka sam ja! Samo želim čuti Vaše mišljenje.", "Wiem, wiem — to ja jestem dziennikarką! Chcę tylko usłyszeć Pana/Pani zdanie.", "c-start", { mood: "puzzled" }),
      say("slower", "jelena", "Naravno. Imate li — minutu — za intervju?", "Oczywiście. Ma Pan/Pani — minutę — na wywiad?", "c-start"),
      say("where", "jelena", "Govorite odlično! Odakle ste i što Vas je dovelo u Dubrovnik?", "Mówi Pan/Pani świetnie! Skąd Pan/Pani jest i co sprowadziło Pana/Panią do Dubrownika?", "t-where", { mood: "happy" }),
      type("t-where", {
        instruction: "Powiedz, skąd jesteś i że jesteś tu z powodu festiwalu.",
        translation: "Jestem z Polski. Jestem tu z powodu festiwalu.",
        accepted: ["Ja sam iz Poljske. Ovdje sam zbog festivala.", "Iz Poljske sam. Ovdje sam zbog festivala.", "Iz Poljske sam i ovdje sam zbog festivala."],
        pattern: "^(ja sam )?iz \\p{L}+( sam)?( i)? ovdje sam zbog \\p{L}+( \\p{L}+)?$",
        hint: "Iz … sam. Ovdje sam zbog …",
        explanation: "„Zbog” (z powodu) + dopełniacz: festival → zbog festivala. Kraj po „iz” też w dopełniaczu: iz Poljske.",
        next: "opinion",
      }),
      say("opinion", "jelena", "Lijepo! Kako Vam se sviđa festival?", "Pięknie! Jak się Panu/Pani podoba festiwal?", "c-opinion", { effects: [flag("introduced")] }),
      choice("c-opinion", "Wyraź opinię — ze zdaniem z „iako” (chociaż).", [
        option("price", "Iako je ulaznica skupa, predstava je vrijedila svakog centa.", "Chociaż bilet jest drogi, przedstawienie było warte każdego centa.", "correct", "mayor", {
          effects: [flag("gave-opinion")],
        }),
        option("crowd", "Odličan je, iako je na Stradunu prevelika gužva.", "Jest świetny, chociaż na Stradunie jest zbyt duży tłok.", "correct", "mayor", { effects: [flag("gave-opinion")] }),
        option("same", "Iako je predstava odlična, sviđa mi se.", "Chociaż przedstawienie jest świetne, podoba mi się.", "wrong", "same", {
          explanation: "„Iako” (chociaż) łączy przeciwieństwa: minus, a mimo to plus. Np.: Iako je ulaznica skupa, predstava je vrijedila svakog centa.",
        }),
      ]),
      say("same", "jelena", "Iako je odlična… sviđa Vam se? Mislite — jer je odlična?", "Chociaż jest świetne… podoba się? Chodzi o to, że — bo jest świetne?", "c-opinion", { mood: "puzzled" }),
      say("mayor", "jelena", "Gradonačelnik je jučer izjavio da će sljedeće godine ulaznice biti jeftinije. Vjerujete li mu?", "Burmistrz oświadczył wczoraj, że w przyszłym roku bilety będą tańsze. Wierzy mu Pan/Pani?", "c-mayor"),
      choice("c-mayor", "Skomentuj słowa burmistrza.", [
        option("hope", "Ako je rekao da će biti jeftinije, nadam se da je to istina.", "Jeśli powiedział, że będą tańsze, mam nadzieję, że to prawda.", "correct", "advice", {
          effects: [flag("understood-mayor")],
        }),
        option("doubt", "Iskreno, sumnjam. Navodno to kaže svake godine.", "Szczerze mówiąc, wątpię. Podobno mówi to co roku.", "correct", "advice", { effects: [flag("understood-mayor")] }),
        option("free", "Gradonačelnik je rekao da su ulaznice besplatne?", "Burmistrz powiedział, że bilety są darmowe?", "wrong", "mayor-again", {
          explanation: "Burmistrz powiedział, że bilety BĘDĄ TAŃSZE (da će biti jeftinije), a nie że są darmowe (besplatne).",
        }),
      ]),
      say("mayor-again", "jelena", "Ne, ne — rekao je da će biti jeftinije, ne besplatne.", "Nie, nie — powiedział, że będą tańsze, nie darmowe.", "c-mayor", { mood: "puzzled" }),
      say("advice", "jelena", "I za kraj: što biste poručili turistima koji tek dolaze?", "I na koniec: co przekazał(a)by Pan/Pani turystom, którzy dopiero przyjeżdżają?", "b-advice"),
      build("b-advice", {
        instruction: "Poradź: niech przyjadą poza sezonem, kiedy miasto jest spokojniejsze.",
        translation: "Niech przyjadą poza sezonem, kiedy miasto jest spokojniejsze.",
        tokens: ["Neka", "dođu", "izvan", "sezone", "kad", "je", "grad", "mirniji", "sezona", "dolaze"],
        accepted: ["Neka dođu izvan sezone, kad je grad mirniji."],
        explanation: "„Neka” + czas teraźniejszy to rada albo życzenie wobec innych: Neka dođu… (niech przyjadą). Grad je mirniji — spokojniejszy.",
        next: "published",
        onWrong: "advice-what",
      }),
      say("advice-what", "jelena", "Molim? Kada bi trebali doći?", "Słucham? Kiedy powinni przyjechać?", "b-advice", { mood: "puzzled" }),
      say("published", "jelena", "Odlično, hvala Vam! Intervju će biti objavljen sutra na portalu.", "Świetnie, dziękuję! Wywiad zostanie opublikowany jutro na portalu.", "follow", {
        mood: "happy",
        effects: [flag("interview-done")],
      }),
      say("follow", "jelena", "Pratite nas na društvenim mrežama! Laku noć!", "Proszę nas obserwować w mediach społecznościowych! Dobranoc!", "end"),
      end(),
    ]),
  },
  debrief: [
    "Podajesz powód: Ovdje sam zbog festivala — zbog + dopełniacz.",
    "Wyrażasz zdanie z zastrzeżeniem: Iako je ulaznica skupa, predstava je vrijedila svakog centa.",
    "Rozumiesz mowę zależną: Gradonačelnik je izjavio da će ulaznice biti jeftinije.",
    "Doradzasz innym: Neka dođu izvan sezone.",
  ],
};

/* ------------------------------------------------------------------ */
/* 5. Savjet prijatelju — Nikola, bar na skałach                       */
/* ------------------------------------------------------------------ */

const advice: Mission = {
  id: "m5-advice",
  order: 5,
  title: { hr: "Savjet prijatelju", pl: "Rada dla przyjaciela" },
  locationId: "stijene",
  npcId: "nikola",
  goal: "Wysłuchasz przyjaciela, dopytasz o szczegóły, doradzisz mu w trybie przypuszczającym i opowiesz o własnych planach.",
  story: "Wieczór w barze na skałach pod murami. Nikola, przewodnik, z którym się zaprzyjaźniłeś, jest dziś wyjątkowo cichy. Dostał ofertę pracy w Zagrzebiu — i nie wie, co zrobić.",
  objectives: [
    { text: "Wysłuchaj Nikoli", done: { flag: "listened" } },
    { text: "Daj mu radę", done: { flag: "gave-advice" } },
    { text: "Opowiedz o swoich planach", done: { flag: "shared-plans" } },
  ],
  requires: ["m3-ferry", "m4-interview"],
  xp: 60,
  vocabulary: [
    w("savjet", "rada", "WORD", "pl-hr:455"),
    w("ponuda", "oferta", "WORD", "pl-hr:701"),
    w("prihvatiti", "przyjąć", "WORD", "pl-hr:1627"),
    w("trebao bi", "powinieneś", "PHRASE", "pl-hr:phrase:trebao bi"),
    w("na tvom mjestu", "na twoim miejscu", "PHRASE", "pl-hr:phrase:na tvom mjestu"),
    w("s jedne strane", "z jednej strony", "WORD", "pl-hr:3190"),
    w("s druge strane", "z drugiej strony", "WORD", "pl-hr:3191"),
    w("odluka", "decyzja", "WORD", "pl-hr:464"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("sunset", [
      say("sunset", "narrator", "Bar na stijenama ispod zidina. Sunce zalazi, a Nikola je neobično tih.", "Bar na skałach pod murami. Słońce zachodzi, a Nikola jest niezwykle cichy.", "ask"),
      say("ask", "nikola", "Mogu li te nešto pitati? Trebam savjet.", "Mogę cię o coś zapytać? Potrzebuję rady.", "c-ask"),
      choice("c-ask", "Zachęć Nikolę, żeby opowiedział (jesteście na „ty”).", [
        option("tell", "Naravno, reci. Što se dogodilo?", "Jasne, mów. Co się stało?", "correct", "offer"),
        option("formal", "Naravno, recite. Što se dogodilo?", "Oczywiście, proszę powiedzieć. Co się stało?", "wrong", "formal", {
          explanation: "Z Nikolą jesteście już na „ty” — „recite” brzmi zbyt oficjalnie. Powiedz: Naravno, reci.",
        }),
      ]),
      say("formal", "nikola", "Recite? Pa nismo na turi, ha-ha!", "„Proszę powiedzieć”? Przecież nie jesteśmy na wycieczce, ha-ha!", "c-ask", { mood: "puzzled" }),
      say("offer", "nikola", "Dobio sam ponudu za posao u Zagrebu. Bolja plaća, ali morao bih se preseliti.", "Dostałem ofertę pracy w Zagrzebiu. Lepsza pensja, ale musiałbym się przeprowadzić.", "sides"),
      say("sides", "nikola", "S jedne strane, to je velika prilika. S druge strane, ovdje su mi obitelj, more… sve.", "Z jednej strony to wielka szansa. Z drugiej strony tu jest moja rodzina, morze… wszystko.", "c-follow"),
      choice("c-follow", "Dopytaj o ofertę.", [
        option("like", "Što ti se najviše sviđa u toj ponudi?", "Co ci się najbardziej podoba w tej ofercie?", "correct", "like", { effects: [flag("listened")] }),
        option("remote", "Bi li mogao raditi na daljinu?", "Czy mógłbyś pracować zdalnie?", "correct", "remote", { effects: [flag("listened")] }),
        option("sorry", "Dobio si ponudu? Žao mi je!", "Dostałeś ofertę? Przykro mi!", "wrong", "sorry", {
          explanation: "Oferta pracy to raczej dobra wiadomość — „žao mi je” (przykro mi) nie pasuje. Dopytaj: Što ti se najviše sviđa u toj ponudi?",
        }),
      ]),
      say("sorry", "nikola", "Žao ti je? Pa nije baš loša vijest…", "Przykro ci? No, to nie jest aż tak zła wiadomość…", "c-follow", { mood: "puzzled" }),
      say("like", "nikola", "Posao je zanimljiv, a tim je odličan. Ali Zagreb… zimi je tamo hladno i sivo.", "Praca jest ciekawa, a zespół świetny. Ale Zagrzeb… zimą jest tam zimno i szaro.", "what-do"),
      say("remote", "nikola", "Pitao sam. Mogu dva dana tjedno, ostalo u uredu.", "Pytałem. Mogę dwa dni w tygodniu, resztę w biurze.", "what-do"),
      say("what-do", "nikola", "Što misliš, što bih trebao napraviti?", "Jak myślisz, co powinienem zrobić?", "t-advice"),
      type("t-advice", {
        instruction: "Doradź Nikoli: przyjąć ofertę czy zostać?",
        translation: "Myślę, że powinieneś przyjąć ofertę. / Na twoim miejscu przyjąłbym ofertę.",
        accepted: ["Mislim da bi trebao prihvatiti ponudu.", "Trebao bi prihvatiti ponudu.", "Mislim da bi trebao ostati u Dubrovniku.", "Na tvom mjestu bih prihvatio ponudu."],
        pattern: "^(mislim da bi trebao|trebao bi|na tvom mjestu bih) .+$",
        hint: "Mislim da bi trebao … / Na tvom mjestu bih …",
        explanation: "Rada: (Mislim da) bi trebao + bezokolicznik — powinieneś… Albo: Na tvom mjestu bih prihvatio/prihvatila… (na twoim miejscu…).",
        practice: "trebao bi",
        next: "sense",
      }),
      say("sense", "nikola", "Hm, ima smisla. Iako mi neće biti lako.", "Hm, to ma sens. Chociaż nie będzie mi łatwo.", "decide", { effects: [flag("gave-advice")] }),
      say("decide", "nikola", "Znaš što? Kad donesem odluku, ti ćeš prvi saznati. A što je s tobom? Kakvi su tvoji planovi?", "Wiesz co? Kiedy podejmę decyzję, dowiesz się pierwszy. A co z tobą? Jakie masz plany?", "b-plans"),
      build("b-plans", {
        instruction: "Powiedz, że kiedy będziesz miał(a) więcej czasu, wrócisz do Dubrownika.",
        translation: "Kiedy będę miał(a) więcej czasu, wrócę do Dubrownika.",
        tokens: ["Kad", "budem", "imao", "imala", "više", "vremena", "vratit", "ću", "se", "u", "Dubrovnik", "bude"],
        accepted: ["Kad budem imao više vremena, vratit ću se u Dubrovnik.", "Kad budem imala više vremena, vratit ću se u Dubrovnik."],
        explanation: "Przyszłość w zdaniu z „kad”: kad budem imao / imala (kiedy będę miał / miała), a potem czas przyszły: vratit ću se.",
        next: "cheers",
        onWrong: "plans-what",
      }),
      say("plans-what", "nikola", "Molim? Kada ćeš se vratiti?", "Słucham? Kiedy wrócisz?", "b-plans", { mood: "puzzled" }),
      say("cheers", "nikola", "To je najljepše što sam danas čuo! Živjeli!", "To najpiękniejsze, co dziś usłyszałem! Na zdrowie!", "c-cheers", { mood: "happy", effects: [flag("shared-plans")] }),
      choice("c-cheers", "Wznieś toast.", [
        option("cheers", "Živjeli! Za nove početke!", "Na zdrowie! Za nowe początki!", "correct", "end"),
        option("meal", "Dobar tek!", "Smacznego!", "wrong", "meal", {
          explanation: "„Dobar tek” mówimy przed jedzeniem (smacznego). Przy toaście: Živjeli!",
        }),
      ]),
      say("meal", "nikola", "Dobar tek? Ali mi samo pijemo, ha-ha!", "Smacznego? Ale my tylko pijemy, ha-ha!", "c-cheers", { mood: "puzzled" }),
      end(),
    ]),
  },
  debrief: [
    "Ważysz argumenty: s jedne strane… s druge strane…",
    "Doradzasz: Mislim da bi trebao prihvatiti ponudu. Na tvom mjestu bih…",
    "Mówisz o przyszłości z „kad”: Kad budem imao/imala više vremena, vratit ću se.",
  ],
};

export const DUBROVNIK_MISSIONS: Mission[] = [repair, walls, ferry, interview, advice];
