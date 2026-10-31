/**
 * Zadania gramatyczne do gier z kategorii „Gramatyka”. Trzy rodzaje:
 *  - gap    — wpisz brakującą formę (podpowiedź w nawiasie),
 *  - choice — wybierz formę (np. aspekt dokonany / niedokonany),
 *  - order  — ułóż zdanie z kafelków (szyk krótkich słówek).
 * Każdy zestaw ma ściągę (cheatsheets.ts) o tym samym temacie.
 * Treść chorwacka NIE jest jeszcze sprawdzona przez native speakera.
 */

interface Base {
  id: string;
  /** Tłumaczenie całego zdania. */
  pl: string;
  explanation: string;
  /** Krótka etykieta tematu, np. „akuzativ”. */
  tag?: string;
}

export interface GapItem extends Base {
  kind: "gap";
  /** Zdanie z luką „___”. */
  prompt: string;
  hint: string;
  answers: string[];
}

export interface ChoiceItem extends Base {
  kind: "choice";
  prompt: string;
  options: string[];
  answer: number;
}

export interface OrderItem extends Base {
  kind: "order";
  tokens: string[];
  answers: string[];
}

export type DrillItem = GapItem | ChoiceItem | OrderItem;

export interface DrillTopic {
  id: string;
  /** Id ściągi z cheatsheets.ts. */
  sheet: string;
  items: DrillItem[];
}

const gap = (id: string, prompt: string, hint: string, answers: string[], pl: string, tag: string, explanation: string): GapItem => ({ kind: "gap", id, prompt, hint, answers, pl, tag, explanation });
const pick = (id: string, prompt: string, options: string[], answer: number, pl: string, explanation: string, tag?: string): ChoiceItem => ({ kind: "choice", id, prompt, options, answer, pl, explanation, tag });
const order = (id: string, tokens: string[], answers: string[], pl: string, explanation: string): OrderItem => ({ kind: "order", id, tokens, answers, pl, explanation });

const PADEZI: DrillItem[] = [
  gap("u-skolu", "Idem u ___.", "škola", ["školu"], "Idę do szkoły.", "akuzativ", "Dokąd? → u + biernik: škola → u školu."),
  gap("u-skoli", "Ja sam u ___.", "škola", ["školi"], "Jestem w szkole.", "lokativ", "Gdzie? → u + miejscownik: škola → u školi."),
  gap("iz-poljske", "Dolazim iz ___.", "Poljska", ["Poljske"], "Pochodzę z Polski.", "genitiv", "„Iz” (z) łączy się z dopełniaczem: Poljska → iz Poljske."),
  gap("s-mlijekom", "Kava s ___, molim.", "mlijeko", ["mlijekom"], "Kawa z mlekiem, proszę.", "instrumental", "„S” (z) + narzędnik: mlijeko → s mlijekom."),
  gap("bez-secera", "Bez ___, hvala.", "šećer", ["šećera"], "Bez cukru, dziękuję.", "genitiv", "„Bez” + dopełniacz: šećer → bez šećera."),
  gap("u-zagrebu", "Živim u ___.", "Zagreb", ["Zagrebu"], "Mieszkam w Zagrzebiu.", "lokativ", "Gdzie? → u + miejscownik: Zagreb → u Zagrebu."),
  gap("u-zagreb", "Sutra putujem u ___.", "Zagreb", ["Zagreb"], "Jutro jadę do Zagrzebia.", "akuzativ", "Dokąd? → u + biernik; rodzaj męski nieżywotny się nie zmienia: u Zagreb."),
  gap("na-plazu", "Idemo na ___.", "plaža", ["plažu"], "Idziemy na plażę.", "akuzativ", "Dokąd? → na + biernik: plaža → na plažu."),
  gap("na-plazi", "Cijeli dan smo bili na ___.", "plaža", ["plaži"], "Cały dzień byliśmy na plaży.", "lokativ", "Gdzie? → na + miejscownik: plaža → na plaži."),
  gap("sestri", "Dajem poklon ___.", "sestra", ["sestri"], "Daję prezent siostrze.", "dativ", "Komu? → celownik: sestra → sestri."),
  gap("bratu", "Pišem pismo ___.", "brat", ["bratu"], "Piszę list do brata.", "dativ", "Komu? → celownik: brat → bratu."),
  gap("brata", "Vidim ___ na ulici.", "brat", ["brata"], "Widzę brata na ulicy.", "akuzativ", "Kogo? → biernik; rodzaj męski żywotny ma końcówkę -a: brata."),
  gap("cokoladu", "Volim ___.", "čokolada", ["čokoladu"], "Lubię czekoladę.", "akuzativ", "Co? → biernik: čokolada → čokoladu."),
  gap("vremena", "Nemam ___.", "vrijeme", ["vremena"], "Nie mam czasu.", "genitiv", "Po „nemam” dopełniacz; vrijeme ma nieregularny temat: vremena."),
  gap("autobusom", "Idem na posao ___.", "autobus", ["autobusom"], "Jeżdżę do pracy autobusem.", "instrumental", "Środek transportu: sam narzędnik, bez przyimka: autobusom."),
  gap("karticom", "Mogu li platiti ___?", "kartica", ["karticom"], "Czy mogę zapłacić kartą?", "instrumental", "Czym? → narzędnik: kartica → karticom."),
  gap("prijateljem", "Razgovaram s ___.", "prijatelj", ["prijateljem"], "Rozmawiam z przyjacielem.", "instrumental", "„S” + narzędnik; po spółgłosce miękkiej -em: prijateljem."),
  gap("o-filmu", "Pričamo o ___.", "film", ["filmu"], "Rozmawiamy o filmie.", "lokativ", "„O” + miejscownik: film → o filmu."),
  gap("jabuka", "Kilogram ___, molim.", "jabuke", ["jabuka"], "Kilogram jabłek, proszę.", "genitiv", "Ilość + dopełniacz liczby mnogiej: jabuke → kilogram jabuka."),
  gap("dva-brata", "Imam dva ___.", "brat", ["brata"], "Mam dwóch braci.", "po 2, 3, 4", "Po dva, tri, četiri rzeczownik męski ma końcówkę -a: dva brata."),
  gap("pet-eura", "To je pet ___.", "euro", ["eura"], "To pięć euro.", "genitiv", "Od pięciu w górę dopełniacz liczby mnogiej: pet eura."),
  gap("ivane", "___, dođi ovamo!", "Ivan", ["Ivane"], "Ivanie, chodź tutaj!", "vokativ", "Wołacz imion męskich na spółgłoskę: -e: Ivane!"),
  gap("centra", "Stan je blizu ___.", "centar", ["centra"], "Mieszkanie jest blisko centrum.", "genitiv", "„Blizu” + dopełniacz; ruchome „a” znika: centar → centra."),
  gap("na-stolu", "Knjiga je na ___.", "stol", ["stolu"], "Książka jest na stole.", "lokativ", "Gdzie? → na + miejscownik: na stolu."),
  gap("na-stol", "Stavi knjigu na ___.", "stol", ["stol"], "Połóż książkę na stół.", "akuzativ", "Dokąd? → na + biernik: na stol."),
  gap("ispred-kina", "Čekam te ispred ___.", "kino", ["kina"], "Czekam na ciebie przed kinem.", "genitiv", "„Ispred” (przed) + dopełniacz — inaczej niż po polsku: ispred kina."),
  gap("kod-lijecnika", "Danas idem kod ___.", "liječnik", ["liječnika"], "Dziś idę do lekarza.", "genitiv", "Do osoby → „kod” + dopełniacz: kod liječnika."),
  gap("baki", "Pomažem ___.", "baka", ["baki"], "Pomagam babci.", "dativ", "„Pomagati” + celownik: baka → baki."),
  gap("vlakom", "Putujemo ___.", "vlak", ["vlakom"], "Podróżujemy pociągiem.", "instrumental", "Środek transportu: narzędnik bez przyimka: vlakom."),
  gap("mamu", "Stalno mislim na ___.", "mama", ["mamu"], "Ciągle myślę o mamie.", "akuzativ", "„Misliti na” + biernik (inaczej niż polskie „o mamie”): na mamu."),
];

const ENKLITIKE: DrillItem[] = [
  order("zovem-se", ["se", "Marko", "Zovem"], ["Zovem se Marko."], "Nazywam się Marko.", "„Se” nie otwiera zdania — stoi na drugim miejscu: Zovem se Marko."),
  order("ja-se", ["se", "zovem", "Ja", "Ana"], ["Ja se zovem Ana."], "Mam na imię Ana.", "Gdy zaczynasz od „ja”, „se” idzie zaraz po nim: Ja se zovem Ana."),
  order("svida", ["mi", "Sviđa", "se"], ["Sviđa mi se."], "Podoba mi się.", "Kolejność enklityk: celownik (mi) przed „se”: Sviđa mi se."),
  order("jesi-li", ["li", "umoran", "Jesi"], ["Jesi li umoran?"], "Jesteś zmęczony?", "„Li” idzie zaraz po pierwszym słowie pytania: Jesi li…?"),
  order("ja-sam", ["sam", "iz", "Ja", "Poljske"], ["Ja sam iz Poljske."], "Jestem z Polski.", "„Sam” na drugim miejscu: Ja sam iz Poljske."),
  order("vidim-ga", ["ga", "Sutra", "vidim"], ["Sutra ga vidim."], "Jutro go widzę.", "Pierwsze słowo „Sutra”, potem enklityka „ga”: Sutra ga vidim."),
  order("dao-sam", ["mu", "ga", "Dao", "sam"], ["Dao sam mu ga."], "Dałem mu go.", "Kolejność: biti (sam) → celownik (mu) → biernik (ga)."),
  order("on-je", ["je", "On", "ga", "mu", "dao"], ["On mu ga je dao."], "On mu go dał.", "„Je” (jest) zawsze na końcu grupy enklityk: mu ga je."),
  order("javit-cu", ["ću", "ti", "Sutra", "javiti"], ["Sutra ću ti javiti."], "Jutro dam ci znać.", "„Ću” (biti/htjeti) przed celownikiem „ti”: Sutra ću ti javiti."),
  order("brat-se", ["se", "brat", "Ivan", "zove", "Moj"], ["Moj brat se zove Ivan."], "Mój brat ma na imię Ivan.", "Pierwszym miejscem może być cała grupa: „Moj brat” — dopiero po niej „se”."),
  order("kako-se", ["se", "Kako", "zoveš"], ["Kako se zoveš?"], "Jak masz na imię?", "Po słowie pytającym „kako” od razu „se”: Kako se zoveš?"),
  order("nisam-ga", ["ga", "vidio", "Nisam"], ["Nisam ga vidio."], "Nie widziałem go.", "„Nisam” to pierwsze słowo; „ga” zaraz po nim: Nisam ga vidio."),
  order("hoces-li", ["doći", "li", "Hoćeš"], ["Hoćeš li doći?"], "Przyjdziesz?", "Pytanie z „li”: Hoćeš li doći?"),
  order("ne-svida", ["mi", "se", "Ne", "sviđa"], ["Ne sviđa mi se."], "Nie podoba mi się.", "„Ne” + czasownik tworzą pierwsze miejsce, potem „mi se”: Ne sviđa mi se."),
  order("bili-smo", ["smo", "u", "Bili", "kinu"], ["Bili smo u kinu."], "Byliśmy w kinie.", "Gdy zdanie zaczyna się od imiesłowu, „smo” idzie zaraz po nim: Bili smo…"),
  order("ana-mi-je", ["je", "Ana", "rekla", "mi"], ["Ana mi je rekla."], "Ana mi powiedziała.", "Celownik „mi” przed „je”, bo „je” jest zawsze ostatnie: Ana mi je rekla."),
  order("vidimo-se", ["se", "sutra", "Vidimo"], ["Vidimo se sutra."], "Do zobaczenia jutro.", "„Se” zaraz po pierwszym słowie: Vidimo se sutra."),
  order("pomogao", ["joj", "sam", "Pomogao"], ["Pomogao sam joj."], "Pomogłem jej.", "„Sam” (biti) przed celownikiem „joj”: Pomogao sam joj."),
  order("gdje-ste", ["ste", "bili", "Gdje"], ["Gdje ste bili?"], "Gdzie byliście?", "Po słowie pytającym od razu enklityka: Gdje ste bili?"),
  order("dat-cu", ["ti", "ga", "Dat", "ću"], ["Dat ću ti ga."], "Dam ci go.", "Kolejność: ću → ti (celownik) → ga (biernik)."),
];

const VID: DrillItem[] = [
  pick("pijem", "Svako jutro ___ kavu.", ["pijem", "popijem"], 0, "Każdego ranka piję kawę.", "Nawyk (svako jutro) → niedokonany: pijem.", "nawyk"),
  pick("popio", "___ sam kavu i otišao na posao.", ["Pio", "Popio"], 1, "Wypiłem kawę i poszedłem do pracy.", "Jednorazowo i do końca, potem kolejna czynność → dokonany: popio.", "rezultat"),
  pick("citala", "Cijelu večer sam ___ knjigu.", ["čitala", "pročitala"], 0, "Cały wieczór czytałam książkę.", "Proces, który trwał (cijelu večer) → niedokonany: čitala.", "proces"),
  pick("procitao", "Napokon sam ___ knjigu do kraja!", ["čitao", "pročitao"], 1, "W końcu przeczytałem książkę do końca!", "Rezultat (napokon, do kraja) → dokonany: pročitao.", "rezultat"),
  pick("napisati", "Moram ___ izvještaj danas do pet sati.", ["pisati", "napisati"], 1, "Muszę napisać raport dziś do piątej.", "Liczy się skończony rezultat do terminu → dokonany: napisati.", "rezultat"),
  pick("zovem", "Često ___ mamu.", ["zovem", "nazovem"], 0, "Często dzwonię do mamy.", "Powtarzalność (često) → niedokonany: zovem.", "nawyk"),
  pick("nazvat", "___ ću te čim stignem.", ["Zvat", "Nazvat"], 1, "Zadzwonię do ciebie, jak tylko dojadę.", "Jednorazowa czynność w przyszłości → dokonany: nazvat ću.", "rezultat"),
  pick("dolaze", "Djeca ___ svaki dan u školu u osam.", ["dolaze", "dođu"], 0, "Dzieci przychodzą codziennie do szkoły o ósmej.", "Codzienność → niedokonany: dolaze.", "nawyk"),
  pick("dodes", "Ako ___ sutra, zovi me.", ["dolaziš", "dođeš"], 1, "Jeśli przyjdziesz jutro, zadzwoń.", "Po „ako” o przyszłości → dokonany w czasie teraźniejszym: dođeš.", "ako / kad"),
  pick("kupujem", "Svake subote ___ voće na tržnici.", ["kupujem", "kupim"], 0, "W każdą sobotę kupuję owoce na targu.", "Nawyk (svake subote) → niedokonany: kupujem.", "nawyk"),
  pick("kupio", "Jučer sam ___ novu jaknu.", ["kupovao", "kupio"], 1, "Wczoraj kupiłem nową kurtkę.", "Jednorazowo, z rezultatem → dokonany: kupio.", "rezultat"),
  pick("jela", "Dok sam ___ večeru, zazvonio je telefon.", ["jela", "pojela"], 0, "Kiedy jadłam kolację, zadzwonił telefon.", "„Dok” (podczas gdy) — czynność w trakcie → niedokonany: jela.", "proces"),
  pick("procitas", "Želim da ___ ovaj članak.", ["čitaš", "pročitaš"], 1, "Chcę, żebyś przeczytał ten artykuł.", "Po „da” o całej czynności → dokonany: pročitaš.", "da"),
  pick("ucim", "Već dvije godine ___ hrvatski.", ["učim", "naučim"], 0, "Od dwóch lat uczę się chorwackiego.", "Czynność trwa (već dvije godine) → niedokonany: učim.", "proces"),
  pick("naucio", "Za jedan dan sam ___ sve riječi.", ["učio", "naučio"], 1, "W jeden dzień nauczyłem się wszystkich słów.", "„Za jedan dan” — w jakim czasie osiągnięto rezultat → dokonany: naučio.", "rezultat"),
  pick("dajem", "Uvijek mu ___ dobre savjete.", ["dajem", "dam"], 0, "Zawsze daję mu dobre rady.", "Nawyk (uvijek) → niedokonany: dajem.", "nawyk"),
  pick("daj", "Molim te, ___ mi sol.", ["davaj", "daj"], 1, "Proszę, podaj mi sól.", "Jednorazowa prośba → tryb rozkazujący od dokonanego: daj.", "rezultat"),
  pick("kuham", "Ne mogu sada razgovarati, ___ ručak.", ["kuham", "skuham"], 0, "Nie mogę teraz rozmawiać, gotuję obiad.", "Właśnie teraz, w trakcie → niedokonany: kuham.", "proces"),
  pick("skuhala", "Ručak je gotov — ___ sam ga za pola sata.", ["kuhala", "skuhala"], 1, "Obiad gotowy — ugotowałam go w pół godziny.", "Rezultat (gotov, za pola sata) → dokonany: skuhala.", "rezultat"),
  pick("zavrsim", "Kad ___ posao, idem kući.", ["završavam", "završim"], 1, "Kiedy skończę pracę, idę do domu.", "Po „kad” o przyszłym, zakończonym zdarzeniu → dokonany: završim.", "ako / kad"),
];

const KOMPARACIJA: DrillItem[] = [
  gap("veci", "Zagreb je ___ od Splita.", "velik", ["veći"], "Zagrzeb jest większy od Splitu.", "nieregularny", "velik → veći (nieregularny)."),
  gap("manji", "Split je ___ nego Zagreb.", "mali", ["manji"], "Split jest mniejszy niż Zagrzeb.", "nieregularny", "mali → manji (nieregularny)."),
  gap("skuplji", "Ovaj hotel je ___ od onoga.", "skup", ["skuplji"], "Ten hotel jest droższy od tamtego.", "-ji", "skup → skuplji: p + j → plj."),
  gap("bolji", "Film je ___ od knjige.", "dobar", ["bolji"], "Film jest lepszy od książki.", "nieregularny", "dobar → bolji (nieregularny)."),
  gap("gore", "Danas je vrijeme ___ nego jučer.", "loše", ["gore", "lošije"], "Dziś pogoda jest gorsza niż wczoraj.", "nieregularny", "loš → gori; rodzaj nijaki (vrijeme): gore."),
  gap("najbolji", "To je ___ kolač na svijetu!", "dobar, najwyższy", ["najbolji"], "To najlepsze ciasto na świecie!", "naj-", "Najwyższy = naj- + wyższy: najbolji."),
  gap("blizi", "Lokrum je ___ od Elafita.", "blizak", ["bliži"], "Lokrum jest bliżej niż Elafity.", "-ji", "blizak → bliži: z + j → ž."),
  gap("noviji", "Ovaj stan je ___ od staroga.", "nov", ["noviji"], "To mieszkanie jest nowsze od starego.", "-iji", "nov → noviji (-iji)."),
  gap("stariji", "Moj brat je ___ od mene.", "star", ["stariji"], "Mój brat jest starszy ode mnie.", "-iji", "star → stariji (-iji)."),
  gap("topliji", "Jadran je ___ od Baltika.", "topao", ["topliji"], "Adriatyk jest cieplejszy od Bałtyku.", "-iji", "topao → topliji (temat topl-)."),
  gap("umorniji", "Marko je danas ___ nego jučer.", "umoran", ["umorniji"], "Marko jest dziś bardziej zmęczony niż wczoraj.", "-iji", "umoran → umorniji (ruchome „a” znika)."),
  gap("najduza", "Ilica je ___ ulica u Zagrebu.", "dug, najwyższy, ż", ["najduža"], "Ilica to najdłuższa ulica w Zagrzebiu.", "naj-", "dug → duži → najduža (rodzaj żeński)."),
  gap("laksi", "Ovaj ispit je ___ od prošlog.", "lak", ["lakši"], "Ten egzamin jest łatwiejszy od poprzedniego.", "-ši", "lak → lakši (-ši)."),
  gap("tezi", "Drugi zadatak je ___ od prvog.", "težak", ["teži"], "Drugie zadanie jest trudniejsze od pierwszego.", "-ji", "težak → teži."),
  gap("sporije", "Govorite ___, molim vas.", "sporo", ["sporije"], "Proszę mówić wolniej.", "przysłówek", "Przysłówek: sporo → sporije."),
  gap("ljepse", "Ovdje je ___ nego u gradu.", "lijepo", ["ljepše"], "Tutaj jest piękniej niż w mieście.", "przysłówek", "lijepo → ljepše (ije → je, -še)."),
  gap("jeftiniji", "Ovaj kafić je ___ od onoga na trgu.", "jeftin", ["jeftiniji"], "Ta kawiarnia jest tańsza od tej na placu.", "-iji", "jeftin → jeftiniji (-iji)."),
  gap("najvisi", "Tko je ___ u razredu?", "visok, najwyższy", ["najviši"], "Kto jest najwyższy w klasie?", "naj-", "visok → viši → najviši."),
  gap("skuplja", "Kava je ovdje ___ nego u Splitu.", "skup, ż", ["skuplja"], "Kawa jest tu droższa niż w Splicie.", "-ji", "skup → skuplji; kava jest rodzaju żeńskiego: skuplja."),
  gap("mladi", "Moja sestra je ___ od mene.", "mlad, ż", ["mlađa"], "Moja siostra jest młodsza ode mnie.", "-ji", "mlad → mlađi (d + j → đ); rodzaj żeński: mlađa."),
];

const VREMENA: DrillItem[] = [
  gap("smo-bili", "Jučer ___ u kinu.", "mi, biti — przeszły", ["smo bili"], "Wczoraj byliśmy w kinie.", "perfekt", "Perfekt: smo + bili (mi → liczba mnoga)."),
  gap("je-pisala", "Ana ___ pismo cijelo jutro.", "pisati — przeszły", ["je pisala"], "Ana pisała list całe rano.", "perfekt", "Ana (ona): je + pisala."),
  gap("je-isao", "Marko ___ kući pješice.", "ići — przeszły", ["je išao"], "Marko szedł do domu pieszo.", "perfekt", "Nieregularny imiesłów: ići → išao."),
  gap("si-bio", "Gdje ___, Ivane?", "ti, biti — przeszły", ["si bio"], "Gdzie byłeś, Ivanie?", "perfekt", "Ty (Ivan, mężczyzna): si + bio."),
  gap("su-dosli", "Gosti ___ na vrijeme.", "doći — przeszły", ["su došli"], "Goście przyszli na czas.", "perfekt", "doći → došao / došli (liczba mnoga): su došli."),
  gap("nije-mogla", "Ana ___ doći.", "moći — przeszły, przeczenie", ["nije mogla"], "Ana nie mogła przyjść.", "perfekt", "Przeczenie: nije + mogla (moći → mogao / mogla)."),
  gap("je-rekao", "Što ___ Marko?", "reći — przeszły", ["je rekao"], "Co powiedział Marko?", "perfekt", "reći → rekao (nieregularny)."),
  gap("smo-jeli", "Mi ___ ribu na Hvaru.", "jesti — przeszły", ["smo jeli"], "Jedliśmy rybę na Hvarze.", "perfekt", "jesti → jeo / jeli: smo jeli."),
  gap("je-vidjela", "Petra ___ more prvi put.", "vidjeti — przeszły", ["je vidjela"], "Petra zobaczyła morze pierwszy raz.", "perfekt", "vidjeti → vidio (m), vidjela (ż)."),
  gap("nije-htio", "Ivan ___ raditi.", "htjeti — przeszły, przeczenie", ["nije htio"], "Ivan nie chciał pracować.", "perfekt", "htjeti → htio (m); przeczenie: nije htio."),
  gap("cu-ici", "Sutra ___ u Split.", "ja, ići — przyszły", ["ću ići"], "Jutro pojadę do Splitu.", "futur", "Futur: ću + bezokolicznik; -ći się nie skraca: ću ići."),
  gap("javit-cu", "___ ti sutra.", "ja, javiti — przyszły, na początku", ["Javit ću"], "Dam ci znać jutro.", "futur", "Bezokolicznik na początku traci -i: javiti → Javit ću."),
  gap("cemo-ostati", "Mi ___ kod kuće.", "ostati — przyszły", ["ćemo ostati"], "Zostaniemy w domu.", "futur", "mi → ćemo + bezokolicznik: ćemo ostati."),
  gap("nece-raditi", "Oni ___ u nedjelju.", "raditi — przyszły, przeczenie", ["neće raditi"], "Oni nie będą pracować w niedzielę.", "futur", "Przeczenie: neće + bezokolicznik."),
  gap("vidjet-cemo", "___ se u subotu!", "mi, vidjeti — przyszły, na początku", ["Vidjet ćemo"], "Zobaczymy się w sobotę!", "futur", "Na początku: vidjeti → Vidjet ćemo."),
  gap("cete-putovati", "Hoćete li sutra ___ vlakom?", "putovati — bezokolicznik", ["putovati"], "Czy jutro pojedziecie pociągiem?", "futur", "W pytaniu „Hoćete li…” bezokolicznik zostaje cały: putovati."),
  gap("volio-bih", "___ kavu, molim. (mówi Marko)", "voljeti — warunkowy", ["Volio bih"], "Chciałbym kawę, proszę.", "kondicional", "Warunkowy: imiesłów + bih; Marko → volio bih."),
  gap("voljela-bih", "___ čaj, molim. (mówi Ana)", "voljeti — warunkowy", ["Voljela bih"], "Chciałabym herbatę, proszę.", "kondicional", "Ana → voljela bih."),
  gap("biste-mogli", "Biste li mi ___ pomoći?", "moći — warunkowy, vi", ["mogli"], "Czy mógłby Pan mi pomóc?", "kondicional", "Grzecznie: Biste li mi mogli…? — imiesłów w liczbie mnogiej: mogli."),
  gap("bi-bilo", "To ___ super!", "biti — warunkowy, bezosobowo", ["bi bilo"], "To byłoby super!", "kondicional", "Bezosobowo: bi + bilo (rodzaj nijaki)."),
];

export const DRILL_TOPICS: DrillTopic[] = [
  { id: "padezi", sheet: "padezi", items: PADEZI },
  { id: "enklitike", sheet: "enklitike", items: ENKLITIKE },
  { id: "vid", sheet: "vid", items: VID },
  { id: "komparacija", sheet: "komparacija", items: KOMPARACIJA },
  { id: "vremena", sheet: "perfekt", items: VREMENA },
];

export const findDrillTopic = (id: string) => DRILL_TOPICS.find((t) => t.id === id);
