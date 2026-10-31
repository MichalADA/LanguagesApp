import type { Mission, MissionWord } from "../../types";
import { branch, build, choice, end, flag, graph, option, say, type } from "../builders";

/**
 * Split A1 — dziesięć misji. Zdania opierają się na materiale lekcji A1 (moduły 1, 4, 5, 7),
 * żeby gracz używał konstrukcji, które już poznał; nowe zwroty mają tłumaczenie.
 * Treść chorwacka NIE jest jeszcze sprawdzona przez native speakera (story.languageReview).
 *
 * Słownictwo: te same karty FSRS co w lekcjach (WORD pl-hr:<rank> / PHRASE pl-hr:phrase:<tekst>);
 * test sprawdza zgodność z identyfikatorami generatora kursu.
 */

const w = (hr: string, pl: string, itemType: "WORD" | "PHRASE", itemId: string): MissionWord => ({ hr, pl, review: { itemType, itemId } });

/* ------------------------------------------------------------------ */
/* 1. Dobro došli u Split! — Marko, apartament                         */
/* ------------------------------------------------------------------ */

const welcome: Mission = {
  id: "m1-welcome",
  order: 1,
  title: { hr: "Dobro došli u Split!", pl: "Witamy w Splicie!" },
  locationId: "apartman",
  npcId: "marko",
  goal: "Przywitasz się, przedstawisz i powiesz, skąd jesteś — tak, żeby Marko mógł Cię zameldować.",
  story: "Właśnie dotarłeś do Splitu. Marko, właściciel apartamentu, czeka na Ciebie w drzwiach. Zanim dostaniesz pokój, musi wiedzieć, kim jesteś.",
  objectives: [
    { text: "Przywitaj się i przedstaw", done: { flag: "met-marko" } },
    { text: "Powiedz, skąd jesteś", done: { flag: "said-origin" } },
    { text: "Potwierdź rezerwację", done: { flag: "checked-in" } },
  ],
  requires: [],
  xp: 30,
  vocabulary: [
    w("dobar dan", "dzień dobry", "WORD", "pl-hr:406"),
    w("zvati se", "nazywać się", "WORD", "pl-hr:4634"),
    w("drago mi je", "miło mi", "WORD", "pl-hr:1407"),
    w("odakle", "skąd", "WORD", "pl-hr:4884"),
    w("živjeti", "mieszkać / żyć", "WORD", "pl-hr:19"),
    w("rezervacija", "rezerwacja", "WORD", "pl-hr:1939"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("arrive", [
      say("arrive", "narrator", "Split. Sunce, more i apartman u starom gradu.", "Split. Słońce, morze i apartament na starym mieście.", "hello"),
      say("hello", "marko", "Dobar dan! Dobro došli u Split!", "Dzień dobry! Witamy w Splicie!", "c-hello", { mood: "happy" }),
      choice("c-hello", "Odpowiedz na powitanie.", [
        option("hello", "Dobar dan!", "Dzień dobry!", "correct", "intro"),
        option("night", "Laku noć!", "Dobranoc!", "wrong", "night", { explanation: "„Laku noć” mówimy na dobranoc. W ciągu dnia witamy się: Dobar dan!" }),
        option("bye", "Doviđenja!", "Do widzenia!", "wrong", "bye", { explanation: "„Doviđenja” to pożegnanie — a Marko dopiero Cię wita. Odpowiedz: Dobar dan!" }),
      ]),
      say("night", "marko", "Laku noć? Ali sada je dan!", "Dobranoc? Ale teraz jest dzień!", "c-hello", { mood: "puzzled" }),
      say("bye", "marko", "Doviđenja? Ne, ne! Dobro došli!", "Do widzenia? Nie, nie! Witamy!", "c-hello", { mood: "puzzled" }),
      say("intro", "marko", "Ja sam Marko. Kako se zoveš?", "Jestem Marko. Jak masz na imię?", "c-name", { mood: "happy" }),
      choice("c-name", "Przedstaw się.", [
        option("zovem", "Zovem se {name}.", "Nazywam się {name}.", "correct", "nice"),
        option("ja-sam", "Ja sam {name}.", "Jestem {name}.", "correct", "nice"),
        option("se-first", "Se zovem {name}.", "(szyk: „se” na początku)", "wrong", "se-first", {
          explanation: "Krótkie „se” nigdy nie otwiera zdania — stoi na drugim miejscu: Zovem se {name}.",
        }),
        option("slow", "Ne razumijem.", "Nie rozumiem.", "neutral", "slow"),
      ]),
      say("se-first", "marko", "Molim? Ja se zovem Marko. A ti?", "Słucham? Ja nazywam się Marko. A ty?", "c-name", { mood: "puzzled" }),
      say("slow", "marko", "Polako: kako — se — zoveš? Tvoje ime?", "Powoli: jak — masz — na imię? Twoje imię?", "c-name"),
      say("nice", "marko", "Drago mi je! Odakle si?", "Miło mi! Skąd jesteś?", "b-from", { mood: "happy", effects: [flag("met-marko")] }),
      build("b-from", {
        instruction: "Odpowiedz, skąd jesteś.",
        translation: "Jestem z Polski.",
        tokens: ["Ja", "sam", "iz", "Poljske", "Poljska", "je"],
        accepted: ["Ja sam iz Poljske.", "Iz Poljske sam."],
        explanation: "Po „iz” (z) nazwa kraju zmienia końcówkę: Poljska → iz Poljske. Krótkie „sam” stoi na drugim miejscu: Ja sam iz Poljske / Iz Poljske sam.",
        next: "poland",
        onWrong: "from-again",
      }),
      say("from-again", "marko", "Odakle? Iz Hrvatske? Iz Poljske?", "Skąd? Z Chorwacji? Z Polski?", "b-from", { mood: "puzzled" }),
      say("poland", "marko", "Iz Poljske! Super. Imaš rezervaciju?", "Z Polski! Super. Masz rezerwację?", "c-res", { mood: "happy", effects: [flag("said-origin")] }),
      choice("c-res", "Potwierdź rezerwację.", [
        option("yes", "Da, imam rezervaciju.", "Tak, mam rezerwację.", "correct", "where"),
        option("name", "Rezervacija je na ime {name}.", "Rezerwacja jest na nazwisko {name}.", "correct", "where"),
        option("no", "Ne, hvala.", "Nie, dziękuję.", "wrong", "no-res", { explanation: "„Ne, hvala” to „nie, dziękuję” — a przecież masz rezerwację. Powiedz: Da, imam rezervaciju." }),
      ]),
      say("no-res", "marko", "Ne? Ali ovdje je rezervacija na tvoje ime!", "Nie? Ale tu jest rezerwacja na twoje nazwisko!", "c-res", { mood: "puzzled" }),
      say("where", "marko", "Odlično! Još nešto: gdje živiš u Poljskoj?", "Świetnie! Jeszcze jedno: gdzie mieszkasz w Polsce?", "t-live", { mood: "happy" }),
      type("t-live", {
        instruction: "Napisz, w jakim mieście mieszkasz.",
        translation: "Mieszkam w Krakowie (Warszawie, Gdańsku…).",
        accepted: ["Živim u Krakovu.", "Živim u Varšavi.", "Živim u Gdanjsku."],
        pattern: "^(ja )?živim u \\p{L}+$",
        hint: "Živim u … (Krakovu, Varšavi, Gdanjsku…)",
        explanation: "Zacznij od „Živim u…” — mieszkam w… Nazwa miasta zmienia końcówkę: Kraków → u Krakovu, Warszawa → u Varšavi.",
        practice: "živjeti",
        next: "done",
      }),
      say("done", "marko", "Super! Prijava je gotova.", "Super! Zameldowanie gotowe.", "later", { mood: "happy", effects: [flag("checked-in")] }),
      say("later", "marko", "Ključ je kod mene. Vidimo se!", "Klucz jest u mnie. Do zobaczenia!", "end"),
      end(),
    ]),
  },
  debrief: [
    "Witasz się „Dobar dan!”, a „Laku noć!” zostawiasz na wieczór.",
    "Przedstawiasz się: Zovem se … / Ja sam … — „se” i „sam” stoją na drugim miejscu.",
    "Mówisz, skąd jesteś i gdzie mieszkasz: Iz Poljske sam. Živim u Krakovu.",
  ],
};

/* ------------------------------------------------------------------ */
/* 2. Gdje je moj ključ? — Marko, apartament                           */
/* ------------------------------------------------------------------ */

const key: Mission = {
  id: "m2-key",
  order: 2,
  title: { hr: "Gdje je moj ključ?", pl: "Gdzie jest mój klucz?" },
  locationId: "apartman",
  npcId: "marko",
  goal: "Zapytasz o klucz, zrozumiesz numer apartamentu i dowiesz się, gdzie jest łazienka.",
  story: "Zameldowanie gotowe, ale klucz został u Marka. Bez niego nie wejdziesz do apartamentu — a po podróży przydałaby się łazienka.",
  objectives: [
    { text: "Zapytaj o klucz", done: { flag: "has-key" } },
    { text: "Zapamiętaj numer apartamentu", done: { flag: "knows-room" } },
    { text: "Zapytaj, gdzie jest łazienka", done: { flag: "knows-bathroom" } },
  ],
  requires: ["m1-welcome"],
  xp: 30,
  vocabulary: [
    w("gdje", "gdzie", "WORD", "pl-hr:89"),
    w("ključ", "klucz", "WORD", "pl-hr:211"),
    w("apartman", "apartament / kwatera", "WORD", "pl-hr:957"),
    w("broj", "numer", "WORD", "pl-hr:432"),
    w("sedam", "siedem", "WORD", "pl-hr:279"),
    w("kupaonica", "łazienka", "WORD", "pl-hr:205"),
    w("lijevo", "w lewo", "PHRASE", "pl-hr:phrase:lijevo"),
    w("desno", "w prawo", "WORD", "pl-hr:400"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("back", [
      say("back", "narrator", "Apartman. Marko je tu.", "Apartament. Marko jest na miejscu.", "hi"),
      say("hi", "marko", "Bok! Kako si?", "Cześć! Jak się masz?", "c-how", { mood: "happy" }),
      choice("c-how", "Odpowiedz Markowi.", [
        option("good", "Dobro sam, hvala.", "Dobrze, dziękuję.", "correct", "need"),
        option("great", "Odlično sam!", "Świetnie!", "correct", "need"),
        option("hello", "Dobar dan sam.", "(„dzień dobry” zamiast samopoczucia)", "wrong", "how-again", {
          explanation: "„Dobar dan” to powitanie, nie samopoczucie. Na „Kako si?” odpowiadasz: Dobro sam, hvala.",
        }),
      ]),
      say("how-again", "marko", "Ha-ha! Dobar dan i tebi. Ali kako si?", "Ha-ha! Dzień dobry i tobie. Ale jak się masz?", "c-how", { mood: "puzzled" }),
      say("need", "marko", "Super! Što trebaš?", "Super! Czego potrzebujesz?", "b-key", { mood: "happy" }),
      build("b-key", {
        instruction: "Zapytaj, gdzie jest Twój klucz.",
        translation: "Gdzie jest mój klucz?",
        tokens: ["Gdje", "je", "moj", "ključ", "kako", "ključa"],
        accepted: ["Gdje je moj ključ?"],
        explanation: "Pytanie o miejsce zaczyna się od „Gdje je…?” — gdzie jest…? Klucz to „ključ”.",
        practice: "ključ",
        next: "here",
        onWrong: "key-what",
      }),
      say("key-what", "marko", "Molim? Ključ? Gdje je ključ?", "Słucham? Klucz? Gdzie jest klucz?", "b-key", { mood: "puzzled" }),
      say("here", "marko", "Evo! Ovo je ključ od apartmana.", "Proszę! To jest klucz do apartamentu.", "room", { mood: "happy", effects: [flag("has-key")] }),
      say("room", "marko", "Apartman je broj sedam, na drugom katu.", "Apartament ma numer siedem, na drugim piętrze.", "c-room"),
      choice("c-room", "Upewnij się, że dobrze zrozumiałeś numer.", [
        option("seven", "Broj sedam?", "Numer siedem?", "correct", "yes", { effects: [flag("knows-room")] }),
        option("seventeen", "Broj sedamnaest?", "Numer siedemnaście?", "wrong", "room-wrong", { explanation: "„Sedamnaest” to 17. Marko powiedział „sedam” — 7." }),
        option("six", "Broj šest?", "Numer sześć?", "wrong", "room-wrong", { explanation: "„Šest” to 6. Marko powiedział „sedam” — 7." }),
        option("slow", "Ne razumijem.", "Nie rozumiem.", "neutral", "room-slow"),
      ]),
      say("room-wrong", "marko", "Ne, ne: broj sedam. Sedam!", "Nie, nie: numer siedem. Siedem!", "c-room", { mood: "puzzled" }),
      say("room-slow", "marko", "Polako: broj — sedam. Sedam!", "Powoli: numer — siedem. Siedem!", "c-room"),
      say("yes", "marko", "Tako je, sedam! Imaš li pitanje?", "Zgadza się, siedem! Masz jakieś pytanie?", "t-bath", { mood: "happy" }),
      type("t-bath", {
        instruction: "Zapytaj, gdzie jest łazienka.",
        translation: "Gdzie jest łazienka?",
        accepted: ["Gdje je kupaonica?"],
        hint: "Gdje je …?",
        explanation: "Tak samo jak przy kluczu: Gdje je …? Łazienka to „kupaonica”.",
        practice: "kupaonica",
        next: "left",
      }),
      say("left", "marko", "Kupaonica je lijevo.", "Łazienka jest po lewej.", "c-left"),
      choice("c-left", "Powtórz, gdzie jest łazienka, i podziękuj.", [
        option("left", "Lijevo? Hvala!", "Po lewej? Dzięki!", "correct", "bye", { effects: [flag("knows-bathroom")] }),
        option("right", "Desno? Hvala!", "Po prawej? Dzięki!", "wrong", "left-again", { explanation: "„Desno” to w prawo. Marko powiedział „lijevo” — w lewo." }),
      ]),
      say("left-again", "marko", "Ne desno — lijevo!", "Nie w prawo — w lewo!", "c-left", { mood: "puzzled" }),
      say("bye", "marko", "Nema problema. Vidimo se!", "Nie ma sprawy. Do zobaczenia!", "end", { mood: "happy" }),
      end(),
    ]),
  },
  debrief: [
    "Pytasz o miejsce: Gdje je moj ključ? Gdje je kupaonica?",
    "Rozumiesz numer i piętro: broj sedam, na drugom katu.",
    "Rozróżniasz kierunki: lijevo (w lewo) i desno (w prawo).",
  ],
};

/* ------------------------------------------------------------------ */
/* 3. Jednu kavu, molim! — Ana, kawiarnia                              */
/* ------------------------------------------------------------------ */

const coffee: Mission = {
  id: "m3-coffee",
  order: 3,
  title: { hr: "Jednu kavu, molim!", pl: "Jedną kawę, proszę!" },
  locationId: "kafic",
  npcId: "ana",
  goal: "Zamówisz kawę taką, jaką lubisz, i poprosisz o szklankę wody.",
  story: "Pierwszy poranek w Splicie. Kawiarnia przy nabrzeżu pachnie espresso, a za barem uśmiecha się Ana. Czas na kawę — po chorwacku.",
  objectives: [
    { text: "Zamów kawę", done: { flag: "ordered-coffee" } },
    { text: "Powiedz, jaką kawę pijesz", done: { any: [{ flag: "coffee-milk" }, { flag: "coffee-black" }] } },
    { text: "Poproś o szklankę wody", done: { flag: "ordered-water" } },
  ],
  requires: [],
  xp: 40,
  vocabulary: [
    w("kava", "kawa", "WORD", "pl-hr:215"),
    w("čaj", "herbata", "WORD", "pl-hr:216"),
    w("mlijeko", "mleko", "WORD", "pl-hr:214"),
    w("šećer", "cukier", "WORD", "pl-hr:231"),
    w("voda", "woda", "WORD", "pl-hr:212"),
    w("čaša", "szklanka / kieliszek", "WORD", "pl-hr:621"),
    w("molim", "proszę", "WORD", "pl-hr:412"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("cafe", [
      say("cafe", "narrator", "Kafić na rivi. Miriše kava.", "Kawiarnia na nabrzeżu. Pachnie kawą.", "morning"),
      say("morning", "ana", "Dobro jutro!", "Dzień dobry! (rano)", "izvolite", { mood: "happy" }),
      say("izvolite", "ana", "Izvolite.", "Słucham. / Proszę.", "c-order"),
      choice("c-order", "Zamów kawę.", [
        option("jednu", "Jednu kavu, molim.", "Jedną kawę, proszę.", "correct", "milk", { effects: [flag("ordered-coffee")] }),
        option("molim", "Molim jednu kavu.", "Poproszę jedną kawę.", "correct", "milk", { effects: [flag("ordered-coffee")] }),
        option("tea", "Jedan čaj, molim.", "Jedną herbatę, proszę.", "wrong", "tea", { explanation: "„Čaj” to herbata — a miała być kawa. Zobacz, co zrobi Ana…" }),
        option("jedna", "Jedna kava molim.", "(forma podstawowa zamiast „jednu kavu”)", "wrong", "what", {
          explanation: "Zamawiając, mówimy „jednu kavu” — kava zmienia końcówkę, jak po polsku: poproszę kawę.",
        }),
      ]),
      say("tea", "ana", "Jedan čaj, može!", "Jedna herbata, jasne!", "c-fix", { mood: "happy" }),
      choice("c-fix", "Popraw zamówienie — chcesz kawę, nie herbatę.", [
        option("fix", "Oprostite, ne čaj, nego kavu, molim.", "Przepraszam, nie herbatę, tylko kawę, proszę.", "correct", "fixed", { effects: [flag("ordered-coffee")] }),
        option("leave", "Hvala, doviđenja!", "Dziękuję, do widzenia!", "wrong", "wait", { explanation: "Wychodzisz bez kawy! Najpierw popraw zamówienie: Oprostite… kavu, molim." }),
      ]),
      say("wait", "ana", "Čekajte! Što želite? Čaj ili kavu?", "Proszę zaczekać! Co Pan/Pani chce? Herbatę czy kawę?", "c-fix", { mood: "puzzled" }),
      say("fixed", "ana", "Ah, kavu! Nema problema.", "Ach, kawę! Nie ma problemu.", "milk", { mood: "happy" }),
      say("what", "ana", "Molim? Jednu kavu?", "Słucham? Jedną kawę?", "c-order", { mood: "puzzled" }),
      say("milk", "ana", "S mlijekom ili bez?", "Z mlekiem czy bez?", "c-milk"),
      choice(
        "c-milk",
        "Zdecyduj: z mlekiem czy bez?",
        [
          option("with", "S mlijekom, molim.", "Z mlekiem, proszę.", "correct", "sugar", { effects: [flag("coffee-milk")] }),
          option("without", "Bez mlijeka, hvala.", "Bez mleka, dziękuję.", "correct", "sugar", { effects: [flag("coffee-black")] }),
          option("is", "Mlijeko je kava.", "Mleko jest kawą.", "wrong", "milk-again", { explanation: "To znaczy „Mleko jest kawą”. Odpowiedz: S mlijekom, molim albo Bez mlijeka, hvala." }),
        ],
      ),
      say("milk-again", "ana", "Ha-ha! S mlijekom ili bez mlijeka?", "Ha-ha! Z mlekiem czy bez mleka?", "c-milk", { mood: "puzzled" }),
      say("sugar", "ana", "A šećer?", "A cukier?", "b-sugar"),
      build("b-sugar", {
        instruction: "Powiedz, że bez cukru.",
        translation: "Bez cukru, proszę.",
        tokens: ["Bez", "šećera", "molim", "šećer", "s"],
        accepted: ["Bez šećera, molim."],
        explanation: "Po „bez” słowo zmienia końcówkę, jak po polsku: šećer → bez šećera (bez cukru).",
        practice: "šećer",
        next: "serve",
        onWrong: "sugar-what",
      }),
      say("sugar-what", "ana", "Molim? Šećer — da ili ne?", "Słucham? Cukier — tak czy nie?", "b-sugar", { mood: "puzzled" }),
      branch("serve", [{ when: { flag: "coffee-milk" }, next: "serve-milk" }], "serve-black"),
      say("serve-milk", "ana", "Izvolite: bijela kava bez šećera.", "Proszę: kawa z mlekiem bez cukru.", "more", { mood: "happy" }),
      say("serve-black", "ana", "Izvolite: kava bez šećera.", "Proszę: kawa bez cukru.", "more", { mood: "happy" }),
      say("more", "ana", "Još nešto?", "Coś jeszcze?", "t-water"),
      type("t-water", {
        instruction: "Poproś jeszcze o szklankę wody.",
        translation: "Szklankę wody, proszę.",
        accepted: ["Čašu vode, molim.", "Mogu li dobiti čašu vode?", "Mogu li dobiti vodu?", "Čašu vode, molim vas.", "Jednu vodu, molim.", "Vodu, molim."],
        hint: "Čašu …, molim.",
        explanation: "Szklanka wody to „čaša vode”. Prosząc, mówimy: Čašu vode, molim — tak jak „poproszę szklankę”.",
        practice: "voda",
        next: "water",
      }),
      say("water", "ana", "Naravno! Izvolite.", "Oczywiście! Proszę.", "end", { mood: "happy", effects: [flag("ordered-water")] }),
      end(),
    ]),
  },
  debrief: [
    "Zamawiasz: Jednu kavu, molim. — „kava” zmienia się w „kavu”.",
    "Mówisz, jak pijesz kawę: s mlijekom / bez mlijeka, bez šećera.",
    "Prosisz o coś jeszcze: Čašu vode, molim. / Mogu li dobiti vodu?",
  ],
};

/* ------------------------------------------------------------------ */
/* 4. Koliko košta? — Ana, kawiarnia                                   */
/* ------------------------------------------------------------------ */

const price: Mission = {
  id: "m4-price",
  order: 4,
  title: { hr: "Koliko košta?", pl: "Ile to kosztuje?" },
  locationId: "kafic",
  npcId: "ana",
  goal: "Poprosisz o rachunek, zapytasz o cenę, zrozumiesz kwotę i zapłacisz kartą albo gotówką.",
  story: "Kawa wypita, czas płacić. Ana podlicza zamówienie — uważaj na liczby, euro i centy.",
  objectives: [
    { text: "Poproś o rachunek i zapytaj o cenę", done: { flag: "asked-price" } },
    { text: "Zrozum kwotę", done: { flag: "knows-price" } },
    { text: "Zapłać i pożegnaj się", done: { flag: "paid" } },
  ],
  requires: ["m3-coffee"],
  xp: 40,
  vocabulary: [
    w("račun", "rachunek", "WORD", "pl-hr:241"),
    w("koliko", "ile", "WORD", "pl-hr:93"),
    w("koštati", "kosztować", "WORD", "pl-hr:506"),
    w("dva", "dwa", "WORD", "pl-hr:274"),
    w("euro", "euro", "WORD", "pl-hr:2593"),
    w("kartica", "karta płatnicza", "WORD", "pl-hr:242"),
    w("doviđenja", "do widzenia", "PHRASE", "pl-hr:phrase:doviđenja"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("time", [
      say("time", "narrator", "Vrijeme je za plaćanje.", "Czas zapłacić.", "c-bill"),
      choice("c-bill", "Poproś o rachunek.", [
        option("bill", "Račun, molim.", "Rachunek, proszę.", "correct", "sure"),
        option("tek", "Dobar tek!", "Smacznego!", "wrong", "bill-what", { explanation: "„Dobar tek” to „smacznego”. O rachunek prosimy: Račun, molim." }),
        option("night", "Laku noć!", "Dobranoc!", "wrong", "bill-what", { explanation: "„Laku noć” to „dobranoc”. O rachunek prosimy: Račun, molim." }),
      ]),
      say("bill-what", "ana", "Molim?", "Słucham?", "c-bill", { mood: "puzzled" }),
      say("sure", "ana", "Naravno.", "Oczywiście.", "t-price"),
      type("t-price", {
        instruction: "Zapytaj, ile kosztuje kawa.",
        translation: "Ile kosztuje kawa?",
        accepted: ["Koliko košta kava?", "Koliko košta?", "Koliko je to?", "Koliko ovo košta?", "Koliko košta ovo?", "Koliko je kava?"],
        hint: "Koliko …?",
        explanation: "O cenę pytamy: Koliko košta …? — ile kosztuje…? Krócej: Koliko je to?",
        practice: "koštati",
        next: "price",
      }),
      say("price", "ana", "Kava je dva eura i pedeset centi. Voda je besplatna.", "Kawa kosztuje dwa euro pięćdziesiąt centów. Woda jest za darmo.", "c-price", { effects: [flag("asked-price")] }),
      choice("c-price", "Powtórz kwotę, żeby się upewnić.", [
        option("ok", "Dva eura i pedeset centi?", "Dwa euro pięćdziesiąt?", "correct", "method", { effects: [flag("knows-price")] }),
        option("twelve", "Dvanaest eura i pedeset centi?", "Dwanaście euro pięćdziesiąt?", "wrong", "price-again", { explanation: "„Dvanaest” to 12. Ana powiedziała „dva” — 2." }),
        option("fifteen", "Dva eura i petnaest centi?", "Dwa euro piętnaście?", "wrong", "price-again", { explanation: "„Petnaest” to 15, a „pedeset” — 50." }),
      ]),
      say("price-again", "ana", "Ne — dva eura i pedeset centi.", "Nie — dwa euro pięćdziesiąt centów.", "c-price", { mood: "puzzled" }),
      choice(
        "method",
        "Jak chcesz zapłacić?",
        [
          option("card", "", "Kartą — zapytam, czy można.", "neutral", "b-card"),
          option("cash", "", "Gotówką — podam banknot.", "neutral", "c-cash"),
        ],
        { graded: false },
      ),
      build("b-card", {
        instruction: "Zapytaj, czy możesz zapłacić kartą.",
        translation: "Czy mogę zapłacić kartą?",
        tokens: ["Mogu", "li", "platiti", "karticom", "kartica", "gotovinom"],
        accepted: ["Mogu li platiti karticom?"],
        explanation: "„Czy mogę…?” to „Mogu li…?”. Kartą = karticom (jak po polsku: płacę kartą).",
        practice: "kartica",
        next: "card-ok",
        onWrong: "card-what",
      }),
      say("card-what", "ana", "Molim? Karticom ili gotovinom?", "Słucham? Kartą czy gotówką?", "b-card", { mood: "puzzled" }),
      say("card-ok", "ana", "Naravno! Izvolite.", "Oczywiście! Proszę.", "t-bye", { mood: "happy" }),
      choice("c-cash", "Podaj Anie pieniądze.", [
        option("five", "Evo, pet eura.", "Proszę, pięć euro.", "correct", "change"),
        option("fifty", "Evo, pedeset eura.", "Proszę, pięćdziesiąt euro.", "wrong", "too-much", { explanation: "„Pedeset” to 50 — o wiele za dużo! Pięć euro to „pet eura”." }),
      ]),
      say("too-much", "ana", "Pedeset? To je puno!", "Pięćdziesiąt? To dużo!", "c-cash", { mood: "puzzled" }),
      say("change", "ana", "Hvala! Evo, dva eura i pedeset centi.", "Dziękuję! Proszę, dwa euro pięćdziesiąt reszty.", "c-change", { mood: "happy" }),
      choice("c-change", "Sprawdź resztę.", [
        option("right", "Dva eura i pedeset centi. Hvala!", "Dwa euro pięćdziesiąt. Dziękuję!", "correct", "t-bye"),
        option("wrong", "Pedeset centi? Hvala!", "Pięćdziesiąt centów? Dziękuję!", "wrong", "change-again", { explanation: "Z 5 € przy rachunku 2,50 € reszta to 2,50 € — dva eura i pedeset centi." }),
      ]),
      say("change-again", "ana", "Ne, ne — dva eura i pedeset centi!", "Nie, nie — dwa euro pięćdziesiąt!", "c-change", { mood: "puzzled" }),
      type("t-bye", {
        instruction: "Podziękuj i pożegnaj się.",
        translation: "Dziękuję, do widzenia!",
        accepted: ["Hvala, doviđenja!", "Hvala lijepa, doviđenja!", "Doviđenja, hvala!", "Hvala, doviđenja i ugodan dan!"],
        hint: "Hvala, …!",
        explanation: "Dziękujemy „Hvala”, żegnamy się „Doviđenja” — razem: Hvala, doviđenja!",
        practice: "doviđenja",
        next: "bye",
      }),
      say("bye", "ana", "Doviđenja! Vidimo se sutra!", "Do widzenia! Do zobaczenia jutro!", "end", { mood: "happy", effects: [flag("paid")] }),
      end(),
    ]),
  },
  debrief: [
    "Prosisz o rachunek: Račun, molim. Pytasz o cenę: Koliko košta kava?",
    "Rozumiesz kwoty: dva eura i pedeset centi (2,50 €), pet eura (5 €).",
    "Pytasz o płatność: Mogu li platiti karticom? — i żegnasz się: Hvala, doviđenja!",
  ],
};

/* ------------------------------------------------------------------ */
/* 5. Idem u trgovinu — Ivana, sklep                                   */
/* ------------------------------------------------------------------ */

const shop: Mission = {
  id: "m5-shop",
  order: 5,
  title: { hr: "Idem u trgovinu", pl: "Idę do sklepu" },
  locationId: "trgovina",
  npcId: "ivana",
  goal: "Kupisz chleb, mleko i wodę: zapytasz, czy są, powiesz, czego potrzebujesz, i zapłacisz.",
  story: "W apartamencie pusta lodówka. Mały sklep za rogiem prowadzi Ivana. Na liście: chleb, mleko i woda.",
  objectives: [
    { text: "Zapytaj, czy jest chleb", done: { flag: "asked-bread" } },
    { text: "Kup mleko i wodę", done: { flag: "got-milk-water" } },
    { text: "Zapłać", done: { flag: "shopping-done" } },
  ],
  requires: ["m2-key"],
  xp: 40,
  vocabulary: [
    w("trgovina", "sklep", "WORD", "pl-hr:237"),
    w("kruh", "chleb", "WORD", "pl-hr:213"),
    w("Imate li…?", "Czy ma Pan / Pani…?", "PHRASE", "pl-hr:phrase:imate li"),
    w("trebati", "potrzebować / musieć", "WORD", "pl-hr:332"),
    w("mlijeko", "mleko", "WORD", "pl-hr:214"),
    w("voda", "woda", "WORD", "pl-hr:212"),
    w("pet", "pięć", "WORD", "pl-hr:277"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("near", [
      say("near", "narrator", "Trgovina je blizu apartmana.", "Sklep jest blisko apartamentu.", "hi"),
      say("hi", "ivana", "Dobar dan! Izvolite.", "Dzień dobry! Słucham.", "c-bread", { mood: "happy" }),
      choice("c-bread", "Zapytaj, czy jest chleb.", [
        option("have", "Imate li kruh?", "Czy ma Pani chleb?", "correct", "bread", { effects: [flag("asked-bread")] }),
        option("i-have", "Imam kruh.", "Mam chleb.", "wrong", "puzzled", { explanation: "„Imam kruh” to „mam chleb”. Pytamy: Imate li kruh? — czy ma Pani chleb?" }),
        option("like", "Volim kruh.", "Lubię chleb.", "wrong", "puzzled", { explanation: "„Volim kruh” to „lubię chleb”. Pytamy: Imate li kruh?" }),
      ]),
      say("puzzled", "ivana", "Aha… A što trebate?", "Aha… A czego Pan/Pani potrzebuje?", "c-bread", { mood: "puzzled" }),
      say("bread", "ivana", "Imamo! Svjež kruh je ovdje.", "Mamy! Świeży chleb jest tutaj.", "else", { mood: "happy" }),
      say("else", "ivana", "Što još trebate?", "Czego jeszcze Pan/Pani potrzebuje?", "b-need"),
      build("b-need", {
        instruction: "Powiedz, że potrzebujesz mleka i wody.",
        translation: "Potrzebuję mleka i wody.",
        tokens: ["Trebam", "mlijeko", "i", "vodu", "voda", "imam"],
        accepted: ["Trebam mlijeko i vodu.", "Trebam vodu i mlijeko."],
        explanation: "Trebam = potrzebuję. Po nim „voda” zmienia końcówkę: Trebam vodu (jak po polsku: potrzebuję wodę).",
        practice: "trebati",
        next: "there",
        onWrong: "need-what",
      }),
      say("need-what", "ivana", "Molim? Mlijeko? Vodu?", "Słucham? Mleko? Wodę?", "b-need", { mood: "puzzled" }),
      say("there", "ivana", "Mlijeko je ovdje, a voda je tamo.", "Mleko jest tutaj, a woda tam.", "more", { effects: [flag("got-milk-water")] }),
      say("more", "ivana", "Još nešto?", "Coś jeszcze?", "t-done"),
      type("t-done", {
        instruction: "Powiedz, że to wszystko.",
        translation: "To wszystko, dziękuję.",
        accepted: ["To je sve.", "To je sve, hvala.", "Hvala, to je sve.", "Ne, hvala, to je sve.", "Ne, hvala."],
        hint: "To je …",
        explanation: "„To wszystko” to „To je sve.” Możesz dodać „hvala”.",
        next: "bag",
      }),
      say("bag", "ivana", "Trebate li vrećicu?", "Potrzebuje Pan/Pani torebki?", "c-bag"),
      choice(
        "c-bag",
        "Zdecyduj: torebka tak czy nie?",
        [
          option("yes", "Da, molim.", "Tak, poproszę.", "neutral", "total-bag", { effects: [flag("has-bag")] }),
          option("no", "Ne, hvala.", "Nie, dziękuję.", "neutral", "total"),
        ],
        { graded: false },
      ),
      say("total-bag", "ivana", "To je pet eura i deset centi.", "To będzie pięć euro i dziesięć centów.", "c-pay-bag"),
      say("total", "ivana", "To je pet eura.", "To będzie pięć euro.", "c-pay"),
      choice("c-pay-bag", "Zapłać dokładnie tyle, ile mówi Ivana.", [
        option("ok", "Izvolite, pet eura i deset centi.", "Proszę, pięć euro i dziesięć centów.", "correct", "thanks"),
        option("ten", "Izvolite, deset eura i pet centi.", "Proszę, dziesięć euro i pięć centów.", "wrong", "pay-again-bag", { explanation: "Odwrotnie: „pet eura i deset centi” to 5,10 €." }),
      ]),
      choice("c-pay", "Zapłać dokładnie tyle, ile mówi Ivana.", [
        option("ok", "Izvolite, pet eura.", "Proszę, pięć euro.", "correct", "thanks"),
        option("fifteen", "Izvolite, petnaest eura.", "Proszę, piętnaście euro.", "wrong", "pay-again", { explanation: "„Petnaest” to 15. Ivana powiedziała „pet” — 5." }),
      ]),
      say("pay-again-bag", "ivana", "Ne — pet eura i deset centi.", "Nie — pięć euro i dziesięć centów.", "c-pay-bag", { mood: "puzzled" }),
      say("pay-again", "ivana", "Ne — samo pet eura.", "Nie — tylko pięć euro.", "c-pay", { mood: "puzzled" }),
      say("thanks", "ivana", "Hvala! Doviđenja i ugodan dan!", "Dziękuję! Do widzenia i miłego dnia!", "end", { mood: "happy", effects: [flag("shopping-done")] }),
      end(),
    ]),
  },
  debrief: [
    "Pytasz, czy coś jest: Imate li kruh?",
    "Mówisz, czego potrzebujesz: Trebam mlijeko i vodu.",
    "Kończysz zakupy: To je sve. — i płacisz dokładną kwotę: pet eura.",
  ],
};

/* ------------------------------------------------------------------ */
/* 6. Burek za doručak — Josip, piekarnia                              */
/* ------------------------------------------------------------------ */

const bakery: Mission = {
  id: "m6-bakery",
  order: 6,
  title: { hr: "Burek za doručak", pl: "Burek na śniadanie" },
  locationId: "pekara",
  npcId: "josip",
  goal: "Przywitasz się o poranku, zamówisz burek z serem, chleb i kawałek ciasta — i zapłacisz.",
  story: "Rano w Splicie wszyscy idą do piekarni. Josip piecze tu od trzydziestu lat i zna każdego klienta. Ty jesteś nowy — czas na pierwszy burek.",
  objectives: [
    { text: "Przywitaj się i zamów burek", done: { flag: "ordered-burek" } },
    { text: "Kup chleb", done: { flag: "got-bread" } },
    { text: "Kup ciasto i zapłać", done: { flag: "paid-bakery" } },
  ],
  requires: ["m2-key"],
  xp: 40,
  vocabulary: [
    w("pekara", "piekarnia", "WORD", "pl-hr:541"),
    w("Dobro jutro!", "Dzień dobry! (rano)", "PHRASE", "pl-hr:phrase:dobro jutro"),
    w("kruh", "chleb", "WORD", "pl-hr:213"),
    w("sir", "ser", "WORD", "pl-hr:233"),
    w("kolač", "ciasto", "WORD", "pl-hr:619"),
    w("šest", "sześć", "WORD", "pl-hr:278"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("smell", [
      say("smell", "narrator", "Pekara. Miriše kruh i burek.", "Piekarnia. Pachnie chlebem i burkiem.", "morning"),
      say("morning", "josip", "Dobro jutro!", "Dzień dobry! (rano)", "c-greet", { mood: "happy" }),
      choice("c-greet", "Odpowiedz na powitanie.", [
        option("jutro", "Dobro jutro!", "Dzień dobry! (rano)", "correct", "what"),
        option("vecer", "Dobra večer!", "Dobry wieczór!", "wrong", "not-evening", { explanation: "„Dobra večer” mówimy wieczorem — a jest rano. Rano witamy się: Dobro jutro!" }),
        option("noc", "Laku noć!", "Dobranoc!", "wrong", "not-evening", { explanation: "„Laku noć” to „dobranoc”. Rano odpowiadasz: Dobro jutro!" }),
      ]),
      say("not-evening", "josip", "Večer? Ne, ne — sada je jutro!", "Wieczór? Nie, nie — teraz jest ranek!", "c-greet", { mood: "puzzled" }),
      say("what", "josip", "Izvolite, što želite?", "Proszę, co podać?", "b-order"),
      build("b-order", {
        instruction: "Zamów burek z serem.",
        translation: "Jeden burek z serem, proszę.",
        tokens: ["Jedan", "burek", "sa", "sirom", "molim", "sir", "s"],
        accepted: ["Jedan burek sa sirom, molim."],
        explanation: "„Z serem” to „sa sirom” — po „s/sa” (z) słowo zmienia końcówkę: sir → sa sirom. Przed słowem na „s-” mówimy „sa”, nie „s”.",
        practice: "sir",
        next: "burek",
        onWrong: "order-what",
      }),
      say("order-what", "josip", "Molim? Burek sa sirom? Ili kruh?", "Słucham? Burek z serem? Czy chleb?", "b-order", { mood: "puzzled" }),
      say("burek", "josip", "Burek sa sirom, evo. Još nešto?", "Burek z serem, proszę bardzo. Coś jeszcze?", "c-bread", { mood: "happy", effects: [flag("ordered-burek")] }),
      choice("c-bread", "Poproś jeszcze o chleb.", [
        option("bread", "I jedan kruh, molim.", "I jeden chleb, proszę.", "correct", "fresh", { effects: [flag("got-bread")] }),
        option("have", "Imam kruh.", "Mam chleb.", "wrong", "have-bread", { explanation: "„Imam kruh” to „mam chleb”. Prosisz o chleb: I jedan kruh, molim." }),
        option("slow", "Ne razumijem.", "Nie rozumiem.", "neutral", "bread-slow"),
      ]),
      say("have-bread", "josip", "Imate kruh? Onda vam ne treba moj!", "Ma Pan/Pani chleb? To mój nie jest potrzebny!", "c-bread", { mood: "puzzled" }),
      say("bread-slow", "josip", "Polako: još — nešto? Kruh? Kolač?", "Powoli: coś — jeszcze? Chleb? Ciasto?", "c-bread"),
      say("fresh", "josip", "Svjež kruh, iz pećnice! Imamo i kolač od višanja.", "Świeży chleb, prosto z pieca! Mamy też ciasto z wiśniami.", "t-cake", { mood: "happy" }),
      type("t-cake", {
        instruction: "Poproś o kawałek ciasta.",
        translation: "Kawałek ciasta, proszę.",
        accepted: ["Komad kolača, molim.", "Jedan komad kolača, molim.", "Mogu li dobiti komad kolača?", "Komad kolača, molim vas."],
        hint: "Komad …, molim.",
        explanation: "Kawałek to „komad”. Po nim słowo zmienia końcówkę, jak po polsku: kolač → komad kolača (kawałek ciasta).",
        practice: "kolač",
        next: "total",
      }),
      say("total", "josip", "Burek, kruh i kolač — to je šest eura.", "Burek, chleb i ciasto — razem sześć euro.", "c-pay"),
      choice("c-pay", "Zapłać dokładnie tyle, ile mówi Josip.", [
        option("six", "Izvolite, šest eura.", "Proszę, sześć euro.", "correct", "thanks"),
        option("seven", "Izvolite, sedam eura.", "Proszę, siedem euro.", "wrong", "pay-again", { explanation: "„Sedam” to 7. Josip powiedział „šest” — 6." }),
        option("sixteen", "Izvolite, šesnaest eura.", "Proszę, szesnaście euro.", "wrong", "pay-again", { explanation: "„Šesnaest” to 16 — za dużo! Josip powiedział „šest” — 6." }),
      ]),
      say("pay-again", "josip", "Ne, ne — šest eura. Šest!", "Nie, nie — sześć euro. Sześć!", "c-pay", { mood: "puzzled" }),
      say("thanks", "josip", "Hvala! Dobar tek i ugodan dan!", "Dziękuję! Smacznego i miłego dnia!", "end", { mood: "happy", effects: [flag("paid-bakery")] }),
      end(),
    ]),
  },
  debrief: [
    "Rano witasz się: Dobro jutro! — „Dobra večer” zostawiasz na wieczór.",
    "Zamawiasz z dodatkiem: burek sa sirom (z serem) — po „s/sa” końcówka się zmienia.",
    "Prosisz o kawałek: komad kolača — i płacisz dokładną kwotę: šest eura.",
  ],
};

/* ------------------------------------------------------------------ */
/* 7. Na tržnici — Mare, targ                                          */
/* ------------------------------------------------------------------ */

const market: Mission = {
  id: "m7-market",
  order: 7,
  title: { hr: "Na tržnici", pl: "Na targu" },
  locationId: "trznica",
  npcId: "mare",
  goal: "Kupisz kilogram jabłek, zrozumiesz cenę, potargujesz się i zapytasz o warzywa.",
  story: "Na targu przy murach pałacu Dioklecjana sprzedaje pani Mare. Ma najlepsze owoce w Splicie — i lubi, kiedy klient się targuje.",
  objectives: [
    { text: "Poproś o kilogram jabłek", done: { flag: "bought-apples" } },
    { text: "Potarguj się", done: { flag: "haggled" } },
    { text: "Zapytaj o warzywa", done: { flag: "asked-veg" } },
  ],
  requires: ["m5-shop"],
  xp: 40,
  vocabulary: [
    w("tržnica", "targ", "WORD", "pl-hr:238"),
    w("voće", "owoce", "WORD", "pl-hr:226"),
    w("jabuka", "jabłko", "WORD", "pl-hr:227"),
    w("kilogram", "kilogram", "WORD", "pl-hr:756"),
    w("skupo", "drogo", "WORD", "pl-hr:1306"),
    w("povrće", "warzywa", "WORD", "pl-hr:225"),
    w("Hvala lijepa!", "Dziękuję bardzo!", "PHRASE", "pl-hr:phrase:hvala lijepa"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("busy", [
      say("busy", "narrator", "Tržnica. Voće, povrće i puno ljudi.", "Targ. Owoce, warzywa i mnóstwo ludzi.", "hi"),
      say("hi", "mare", "Dobar dan! Lijepe jabuke, svježe voće!", "Dzień dobry! Piękne jabłka, świeże owoce!", "c-want", { mood: "happy" }),
      choice("c-want", "Poproś o kilogram jabłek.", [
        option("kilo", "Kilogram jabuka, molim.", "Kilogram jabłek, proszę.", "correct", "apples", { effects: [flag("bought-apples")] }),
        option("want", "Želim kilogram jabuka.", "Chcę kilogram jabłek.", "correct", "apples", { effects: [flag("bought-apples")] }),
        option("am", "Ja sam jabuka.", "Jestem jabłkiem.", "wrong", "am-apple", { explanation: "„Ja sam jabuka” to „jestem jabłkiem”! Prosisz: Kilogram jabuka, molim." }),
      ]),
      say("am-apple", "mare", "Vi ste jabuka? Ha-ha! Koliko jabuka trebate?", "Pan/Pani jest jabłkiem? Ha-ha! Ile jabłek potrzeba?", "c-want", { mood: "puzzled" }),
      say("apples", "mare", "Kilogram jabuka. To je tri eura.", "Kilogram jabłek. To trzy euro.", "c-price"),
      choice("c-price", "Upewnij się, ile kosztują jabłka.", [
        option("three", "Tri eura?", "Trzy euro?", "correct", "yes"),
        option("thirteen", "Trinaest eura?", "Trzynaście euro?", "wrong", "price-again", { explanation: "„Trinaest” to 13. Mare powiedziała „tri” — 3." }),
        option("thirty", "Trideset eura?", "Trzydzieści euro?", "wrong", "price-again", { explanation: "„Trideset” to 30. Mare powiedziała „tri” — 3." }),
      ]),
      say("price-again", "mare", "Ne — tri eura. Tri!", "Nie — trzy euro. Trzy!", "c-price", { mood: "puzzled" }),
      say("yes", "mare", "Tako je, tri eura.", "Zgadza się, trzy euro.", "b-haggle"),
      build("b-haggle", {
        instruction: "Potarguj się: powiedz, że to trochę drogo.",
        translation: "To trochę drogo.",
        tokens: ["To", "je", "malo", "skupo", "jeftino", "sam"],
        accepted: ["To je malo skupo."],
        explanation: "Drogo to „skupo”, tanio — „jeftino”. Trochę to „malo”: To je malo skupo.",
        practice: "skupo",
        next: "deal",
        onWrong: "haggle-what",
      }),
      say("haggle-what", "mare", "Molim? Skupo ili jeftino?", "Słucham? Drogo czy tanio?", "b-haggle", { mood: "puzzled" }),
      say("deal", "mare", "Skupo? Dobro, za vas — dva eura i pedeset centi!", "Drogo? Dobrze, dla Pana/Pani — dwa euro pięćdziesiąt!", "more", { mood: "happy", effects: [flag("haggled")] }),
      say("more", "mare", "Trebate još nešto?", "Potrzeba czegoś jeszcze?", "t-veg"),
      type("t-veg", {
        instruction: "Powiedz, że potrzebujesz też warzyw.",
        translation: "Potrzebuję też warzyw.",
        accepted: ["Trebam i povrće.", "Trebam povrće.", "Trebam još povrće.", "I povrće, molim.", "Imate li povrće?", "Trebam i povrće, molim."],
        hint: "Trebam i …",
        explanation: "Potrzebuję to „trebam”, warzywa — „povrće” (jedno słowo, jak „jedzenie”): Trebam i povrće.",
        practice: "povrće",
        next: "veg",
      }),
      say("veg", "mare", "Povrće je tamo, kod mog sina Ante.", "Warzywa są tam, u mojego syna Ante.", "c-thanks", { effects: [flag("asked-veg")] }),
      choice("c-thanks", "Podziękuj pani Mare.", [
        option("thanks", "Hvala lijepa!", "Dziękuję bardzo!", "correct", "bye"),
        option("problem", "Nema problema!", "Nie ma sprawy!", "wrong", "thanks-what", { explanation: "„Nema problema” odpowiada się na podziękowanie. To Ty dziękujesz: Hvala lijepa!" }),
        option("tek", "Dobar tek!", "Smacznego!", "wrong", "thanks-what", { explanation: "„Dobar tek” to „smacznego”. Dziękujesz: Hvala lijepa!" }),
      ]),
      say("thanks-what", "mare", "Molim?", "Słucham?", "c-thanks", { mood: "puzzled" }),
      say("bye", "mare", "Nema na čemu! Doviđenja!", "Nie ma za co! Do widzenia!", "end", { mood: "happy" }),
      end(),
    ]),
  },
  debrief: [
    "Kupujesz na wagę: Kilogram jabuka, molim. — po „kilogram” mówimy „jabuka”.",
    "Rozróżniasz liczby: tri (3), trinaest (13), trideset (30) — i targujesz się: To je malo skupo.",
    "Mówisz, czego jeszcze potrzebujesz: Trebam i povrće. — i dziękujesz: Hvala lijepa!",
  ],
};

/* ------------------------------------------------------------------ */
/* 8. Dan na plaži — Toni, plaża                                       */
/* ------------------------------------------------------------------ */

const beach: Mission = {
  id: "m8-beach",
  order: 8,
  title: { hr: "Dan na plaži", pl: "Dzień na plaży" },
  locationId: "plaza",
  npcId: "toni",
  goal: "Wynajmiesz leżak i parasol, zapłacisz, zapytasz o temperaturę morza i powiesz, że idziesz się kąpać.",
  story: "Bačvice — miejska plaża Splitu, z piaskiem i płytką wodą. Leżaki wynajmuje Toni, student, który latem pracuje na plaży.",
  objectives: [
    { text: "Wynajmij leżak", done: { flag: "rented-sunbed" } },
    { text: "Zapytaj, czy morze jest ciepłe", done: { flag: "asked-sea" } },
    { text: "Idź się kąpać", done: { flag: "swimming" } },
  ],
  requires: ["m4-price"],
  xp: 40,
  vocabulary: [
    w("plaža", "plaża", "WORD", "pl-hr:264"),
    w("sunce", "słońce", "WORD", "pl-hr:271"),
    w("suncobran", "parasol plażowy", "PHRASE", "pl-hr:phrase:suncobran"),
    w("more", "morze", "WORD", "pl-hr:265"),
    w("kupati se", "kąpać się", "WORD", "pl-hr:1167"),
    w("deset", "dziesięć", "WORD", "pl-hr:282"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("beach", [
      say("beach", "narrator", "Plaža Bačvice. Sunce, pijesak i more.", "Plaża Bačvice. Słońce, piasek i morze.", "hi"),
      say("hi", "toni", "Bok! Trebaš ležaljku?", "Cześć! Potrzebujesz leżaka?", "c-sunbed", { mood: "happy" }),
      choice("c-sunbed", "Weź jeden leżak.", [
        option("yes", "Da, jednu ležaljku, molim.", "Tak, jeden leżak, proszę.", "correct", "umbrella", { effects: [flag("rented-sunbed")] }),
        option("form", "Da, jedna ležaljka molim.", "(forma podstawowa zamiast „jednu ležaljku”)", "wrong", "sunbed-what", {
          explanation: "Prosząc, mówimy „jednu ležaljku” — ležaljka zmienia końcówkę, tak jak „jednu kavu”.",
        }),
        option("slow", "Ne razumijem.", "Nie rozumiem.", "neutral", "sunbed-slow"),
      ]),
      say("sunbed-what", "toni", "Molim? Jednu ležaljku?", "Słucham? Jeden leżak?", "c-sunbed", { mood: "puzzled" }),
      say("sunbed-slow", "toni", "Ležaljka — za sunčanje, ovdje. Trebaš?", "Leżak — do opalania, tutaj. Potrzebujesz?", "c-sunbed"),
      say("umbrella", "toni", "Može! A suncobran? Sunce je jako.", "Jasne! A parasol? Słońce mocno grzeje.", "b-umbrella"),
      build("b-umbrella", {
        instruction: "Powiedz, że parasol też poprosisz.",
        translation: "Tak, i parasol, proszę.",
        tokens: ["Da", "i", "suncobran", "molim", "ne", "suncobrana"],
        accepted: ["Da, i suncobran, molim."],
        explanation: "Parasol plażowy to „suncobran” (od „sunce” — słońce). Tak, parasol też: Da, i suncobran, molim.",
        practice: "suncobran",
        next: "price",
        onWrong: "umbrella-what",
      }),
      say("umbrella-what", "toni", "Suncobran — da ili ne?", "Parasol — tak czy nie?", "b-umbrella", { mood: "puzzled" }),
      say("price", "toni", "Ležaljka i suncobran — deset eura za cijeli dan.", "Leżak i parasol — dziesięć euro za cały dzień.", "c-price"),
      choice("c-price", "Zapłać dokładnie tyle, ile mówi Toni.", [
        option("ten", "Deset eura? Izvolite.", "Dziesięć euro? Proszę.", "correct", "number"),
        option("twenty", "Dvadeset eura? Izvolite.", "Dwadzieścia euro? Proszę.", "wrong", "price-again", { explanation: "„Dvadeset” to 20. Toni powiedział „deset” — 10." }),
        option("two", "Dva eura? Izvolite.", "Dwa euro? Proszę.", "wrong", "price-again", { explanation: "„Dva” to 2 — za mało! Toni powiedział „deset” — 10." }),
      ]),
      say("price-again", "toni", "Ne, ne — deset eura!", "Nie, nie — dziesięć euro!", "c-price", { mood: "puzzled" }),
      say("number", "toni", "Hvala! Ležaljka broj pet je tvoja. Imaš li pitanje?", "Dzięki! Leżak numer pięć jest twój. Masz jakieś pytanie?", "t-sea", { mood: "happy" }),
      type("t-sea", {
        instruction: "Zapytaj, czy morze jest ciepłe.",
        translation: "Czy morze jest ciepłe?",
        accepted: ["Je li more toplo?", "Je li more hladno?", "Je li toplo more?", "Je li voda topla?", "Je li more toplo danas?"],
        hint: "Je li more …?",
        explanation: "Pytanie „tak/nie” zaczyna się od „Je li…?”. Morze to „more”, ciepłe — „toplo”: Je li more toplo?",
        practice: "more",
        next: "warm",
      }),
      say("warm", "toni", "More je toplo — dvadeset i četiri stupnja!", "Morze jest ciepłe — dwadzieścia cztery stopnie!", "c-swim", { mood: "happy", effects: [flag("asked-sea")] }),
      choice("c-swim", "Powiedz, że idziesz się kąpać.", [
        option("swim", "Idem se kupati!", "Idę się kąpać!", "correct", "enjoy", { effects: [flag("swimming")] }),
        option("buy", "Idem kupiti!", "Idę kupić!", "wrong", "buy-what", { explanation: "Pułapka: „kupiti” to „kupić”! Kąpać się to „kupati se”: Idem se kupati!" }),
        option("shower", "Idem se tuširati!", "Idę wziąć prysznic!", "wrong", "shower-what", { explanation: "„Tuširati se” to brać prysznic. W morzu się kąpiemy: Idem se kupati!" }),
      ]),
      say("buy-what", "toni", "Kupiti? Ha-ha, more je besplatno!", "Kupić? Ha-ha, morze jest za darmo!", "c-swim", { mood: "puzzled" }),
      say("shower-what", "toni", "Tuš je tamo… ali more je bolje!", "Prysznic jest tam… ale morze jest lepsze!", "c-swim", { mood: "puzzled" }),
      say("enjoy", "toni", "Uživaj! Vidimo se!", "Baw się dobrze! Do zobaczenia!", "end", { mood: "happy" }),
      end(),
    ]),
  },
  debrief: [
    "Wynajmujesz: jednu ležaljku i suncobran — ležaljka zmienia końcówkę jak „jednu kavu”.",
    "Pytasz „tak/nie”: Je li more toplo?",
    "Uważasz na fałszywego przyjaciela: kupati se (kąpać się) ≠ kupiti (kupić).",
  ],
};

/* ------------------------------------------------------------------ */
/* 9. Trajektom na Brač — Petra, port                                  */
/* ------------------------------------------------------------------ */

const ferry: Mission = {
  id: "m9-ferry",
  order: 9,
  title: { hr: "Trajektom na Brač", pl: "Promem na Brač" },
  locationId: "luka",
  npcId: "petra",
  goal: "Powiesz, dokąd płyniesz, kupisz bilet powrotny, zrozumiesz cenę i godzinę odpływu.",
  story: "Z portu w Splicie promy płyną na wyspy. Chcesz zobaczyć Brač i słynną plażę Zlatni rat. W kasie siedzi Petra.",
  objectives: [
    { text: "Powiedz, dokąd płyniesz", done: { flag: "destination" } },
    { text: "Kup bilet powrotny", done: { flag: "bought-ticket" } },
    { text: "Dowiedz się, o której odpływa prom", done: { flag: "knows-departure" } },
  ],
  requires: ["m8-beach"],
  xp: 40,
  vocabulary: [
    w("trajekt", "prom", "WORD", "pl-hr:489"),
    w("otok", "wyspa", "WORD", "pl-hr:488"),
    w("karta", "bilet / karta", "WORD", "pl-hr:262"),
    w("povratna karta", "bilet powrotny", "WORD", "pl-hr:1256"),
    w("polazak", "odjazd / odpłynięcie", "WORD", "pl-hr:1668"),
    w("jedanaest", "jedenaście", "WORD", "pl-hr:1224"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("port", [
      say("port", "narrator", "Luka. Trajekti voze na otoke.", "Port. Promy płyną na wyspy.", "hi"),
      say("hi", "petra", "Dobar dan! Kamo putujete?", "Dzień dobry! Dokąd Pan/Pani jedzie?", "c-where", { mood: "happy" }),
      choice("c-where", "Powiedz, że płyniesz na Brač.", [
        option("na", "Na Brač, molim.", "Na Brač, proszę.", "correct", "kind", { effects: [flag("destination")] }),
        option("iz", "Iz Brača, molim.", "Z Bracza, proszę.", "wrong", "where-what", { explanation: "„Iz” znaczy „z”. Na wyspę jedziemy „na”: Na Brač, molim." }),
        option("u", "U Brač, molim.", "(„u” zamiast „na”)", "wrong", "where-what", { explanation: "Do miasta mówimy „u” (u Zagreb), ale na wyspę — „na”: na Brač, na Hvar." }),
      ]),
      say("where-what", "petra", "Molim? Na koji otok?", "Słucham? Na którą wyspę?", "c-where", { mood: "puzzled" }),
      say("kind", "petra", "Na Brač. Kartu u jednom smjeru ili povratnu?", "Na Brač. Bilet w jedną stronę czy powrotny?", "b-return"),
      build("b-return", {
        instruction: "Poproś o bilet powrotny.",
        translation: "Jeden bilet powrotny, proszę.",
        tokens: ["Jednu", "povratnu", "kartu", "molim", "karta", "povratna"],
        accepted: ["Jednu povratnu kartu, molim."],
        explanation: "Bilet to „karta”, powrotny — „povratna”. Kiedy prosisz, oba słowa zmieniają końcówkę: jednu povratnu kartu.",
        practice: "povratna karta",
        next: "price",
        onWrong: "return-what",
      }),
      say("return-what", "petra", "Molim? Povratnu ili u jednom smjeru?", "Słucham? Powrotny czy w jedną stronę?", "b-return", { mood: "puzzled" }),
      say("price", "petra", "Povratna karta za Brač je dvanaest eura.", "Bilet powrotny na Brač kosztuje dwanaście euro.", "c-price"),
      choice("c-price", "Upewnij się, ile kosztuje bilet.", [
        option("twelve", "Dvanaest eura?", "Dwanaście euro?", "correct", "ticket"),
        option("twenty", "Dvadeset eura?", "Dwadzieścia euro?", "wrong", "price-again", { explanation: "„Dvadeset” to 20. Petra powiedziała „dvanaest” — 12." }),
        option("two", "Dva eura?", "Dwa euro?", "wrong", "price-again", { explanation: "„Dva” to 2, a „dvanaest” — 12." }),
      ]),
      say("price-again", "petra", "Ne — dvanaest eura.", "Nie — dwanaście euro.", "c-price", { mood: "puzzled" }),
      say("ticket", "petra", "Tako je. Izvolite, vaša karta.", "Zgadza się. Proszę, Pana/Pani bilet.", "t-when", { mood: "happy", effects: [flag("bought-ticket")] }),
      type("t-when", {
        instruction: "Zapytaj, kiedy odpływa prom.",
        translation: "Kiedy jest odjazd?",
        accepted: ["Kada je polazak?", "U koliko sati je polazak?", "Kada polazi trajekt?", "U koliko sati polazi trajekt?", "Kada ide trajekt?", "U koliko sati ide trajekt?"],
        hint: "Kada je …?",
        explanation: "Odjazd to „polazak”. Pytasz: Kada je polazak? albo: U koliko sati polazi trajekt?",
        practice: "polazak",
        next: "time",
      }),
      say("time", "petra", "Polazak je u jedanaest sati. Trajekt je tamo, lijevo.", "Odpływa o jedenastej. Prom jest tam, po lewej.", "c-time"),
      choice("c-time", "Upewnij się, o której odpływa prom.", [
        option("eleven", "U jedanaest?", "O jedenastej?", "correct", "bye", { effects: [flag("knows-departure")] }),
        option("twelve", "U dvanaest?", "O dwunastej?", "wrong", "time-again", { explanation: "„Dvanaest” to 12, a „jedanaest” — 11." }),
        option("seven", "U sedam?", "O siódmej?", "wrong", "time-again", { explanation: "„Sedam” to 7. Petra powiedziała „jedanaest” — 11." }),
      ]),
      say("time-again", "petra", "Ne, u jedanaest. Jedanaest!", "Nie, o jedenastej. Jedenaście!", "c-time", { mood: "puzzled" }),
      say("bye", "petra", "Tako je. Sretan put!", "Zgadza się. Szczęśliwej podróży!", "end", { mood: "happy" }),
      end(),
    ]),
  },
  debrief: [
    "Na wyspę płyniesz „na”: Na Brač, na Hvar — do miasta jedziesz „u”: u Zagreb.",
    "Kupujesz bilet: jednu povratnu kartu (powrotny) albo kartu u jednom smjeru (w jedną stronę).",
    "Pytasz o odjazd: Kada je polazak? — i rozróżniasz jedanaest (11) i dvanaest (12).",
  ],
};

/* ------------------------------------------------------------------ */
/* 10. Autobus za Zagreb — Davor, dworzec                              */
/* ------------------------------------------------------------------ */

const station: Mission = {
  id: "m10-station",
  order: 10,
  title: { hr: "Autobus za Zagreb", pl: "Autobus do Zagrzebia" },
  locationId: "kolodvor",
  npcId: "davor",
  goal: "Zapytasz o autobus do Zagrzebia, zrozumiesz godzinę i stanowisko, dowiesz się, gdzie kupić bilet, i podziękujesz za pomoc.",
  story: "Czas ruszyć dalej — do Zagrzebia. Na dworcu autobusowym przy porcie w okienku informacji siedzi Davor. Wie wszystko o każdym autobusie.",
  objectives: [
    { text: "Zapytaj o autobus do Zagrzebia", done: { flag: "asked-bus" } },
    { text: "Zrozum stanowisko i opóźnienie", done: { all: [{ flag: "knows-platform" }, { flag: "knows-delay" }] } },
    { text: "Podziękuj za pomoc", done: { flag: "thanked" } },
  ],
  requires: ["m9-ferry"],
  xp: 50,
  vocabulary: [
    w("kolodvor", "dworzec", "WORD", "pl-hr:260"),
    w("autobus", "autobus", "WORD", "pl-hr:258"),
    w("peron", "peron / stanowisko", "WORD", "pl-hr:564"),
    w("karta", "bilet / karta", "WORD", "pl-hr:262"),
    w("kasniti", "spóźniać się", "WORD", "pl-hr:692"),
    w("minuta", "minuta", "WORD", "pl-hr:174"),
    w("Hvala na pomoći!", "Dziękuję za pomoc!", "PHRASE", "pl-hr:phrase:hvala na pomoći"),
  ],
  dialogue: {
    kind: "scripted",
    graph: graph("station", [
      say("station", "narrator", "Autobusni kolodvor. Autobusi za cijelu Hrvatsku.", "Dworzec autobusowy. Autobusy do całej Chorwacji.", "hi"),
      say("hi", "davor", "Dobar dan! Kako vam mogu pomoći?", "Dzień dobry! Jak mogę pomóc?", "c-ask", { mood: "happy" }),
      choice("c-ask", "Zapytaj, kiedy jedzie autobus do Zagrzebia.", [
        option("when", "Oprostite, kada ide autobus za Zagreb?", "Przepraszam, kiedy jedzie autobus do Zagrzebia?", "correct", "bus", { effects: [flag("asked-bus")] }),
        option("where", "Oprostite, gdje je Zagreb?", "Przepraszam, gdzie jest Zagrzeb?", "wrong", "far", { explanation: "To pytanie „gdzie jest Zagrzeb?”. Pytasz o autobus: Kada ide autobus za Zagreb?" }),
        option("have", "Imam autobus za Zagreb.", "Mam autobus do Zagrzebia.", "wrong", "have-bus", { explanation: "„Imam” to „mam”. Pytasz: Kada ide autobus za Zagreb?" }),
      ]),
      say("far", "davor", "Zagreb? Daleko, na sjeveru! Ali što trebate?", "Zagrzeb? Daleko, na północy! Ale czego Pan/Pani potrzebuje?", "c-ask", { mood: "puzzled" }),
      say("have-bus", "davor", "Imate autobus? Ha-ha, ja nemam!", "Ma Pan/Pani autobus? Ha-ha, ja nie mam!", "c-ask", { mood: "puzzled" }),
      say("bus", "davor", "Autobus za Zagreb ide u devet i trideset, s perona tri.", "Autobus do Zagrzebia odjeżdża o dziewiątej trzydzieści, ze stanowiska trzeciego.", "c-peron"),
      choice("c-peron", "Upewnij się, z którego stanowiska.", [
        option("three", "S perona tri?", "Ze stanowiska trzy?", "correct", "right", { effects: [flag("knows-platform")] }),
        option("thirteen", "S perona trinaest?", "Ze stanowiska trzynaście?", "wrong", "peron-again", { explanation: "„Trinaest” to 13. Davor powiedział „tri” — 3." }),
        option("two", "S perona dva?", "Ze stanowiska dwa?", "wrong", "peron-again", { explanation: "„Dva” to 2. Davor powiedział „tri” — 3." }),
      ]),
      say("peron-again", "davor", "Ne — peron tri. Tri!", "Nie — stanowisko trzy. Trzy!", "c-peron", { mood: "puzzled" }),
      say("right", "davor", "Tako je, peron tri.", "Zgadza się, stanowisko trzy.", "b-ticket"),
      build("b-ticket", {
        instruction: "Zapytaj, gdzie możesz kupić bilet.",
        translation: "Gdzie mogę kupić bilet?",
        tokens: ["Gdje", "mogu", "kupiti", "kartu", "karta", "kupim"],
        accepted: ["Gdje mogu kupiti kartu?"],
        explanation: "„Gdzie mogę…?” to „Gdje mogu…?”. Po „kupiti” bilet zmienia końcówkę: karta → kupiti kartu.",
        practice: "karta",
        next: "late",
        onWrong: "ticket-what",
      }),
      say("ticket-what", "davor", "Molim? Karta? Gdje?", "Słucham? Bilet? Gdzie?", "b-ticket", { mood: "puzzled" }),
      say("late", "davor", "Ovdje, kod mene. Ali pazite: autobus danas kasni deset minuta.", "Tutaj, u mnie. Ale uwaga: autobus ma dziś dziesięć minut opóźnienia.", "c-late"),
      choice("c-late", "Upewnij się, jakie jest opóźnienie.", [
        option("minutes", "Kasni deset minuta?", "Spóźnia się dziesięć minut?", "correct", "only", { effects: [flag("knows-delay")] }),
        option("hours", "Kasni deset sati?", "Spóźnia się dziesięć godzin?", "wrong", "late-again", { explanation: "„Sati” to godziny! Davor powiedział „deset minuta” — 10 minut." }),
      ]),
      say("late-again", "davor", "Ne, ne — samo deset minuta!", "Nie, nie — tylko dziesięć minut!", "c-late", { mood: "puzzled" }),
      say("only", "davor", "Da, samo deset minuta.", "Tak, tylko dziesięć minut.", "t-thanks"),
      type("t-thanks", {
        instruction: "Podziękuj za pomoc.",
        translation: "Dziękuję za pomoc!",
        accepted: ["Hvala na pomoći!", "Hvala vam na pomoći!", "Hvala lijepa na pomoći!", "Hvala na pomoći, doviđenja!"],
        hint: "Hvala na …",
        explanation: "Dziękując za coś, mówimy „Hvala na…” — za pomoc: Hvala na pomoći!",
        next: "bye",
      }),
      say("bye", "davor", "Nema na čemu. Sretan put!", "Nie ma za co. Szczęśliwej podróży!", "end", { mood: "happy", effects: [flag("thanked")] }),
      end(),
    ]),
  },
  debrief: [
    "Pytasz o połączenie: Kada ide autobus za Zagreb?",
    "Rozumiesz godzinę i stanowisko: u devet i trideset, s perona tri — i opóźnienie: kasni deset minuta.",
    "Pytasz, gdzie coś kupić: Gdje mogu kupiti kartu? — i dziękujesz: Hvala na pomoći!",
  ],
};

export const SPLIT_MISSIONS: Mission[] = [welcome, key, coffee, price, shop, bakery, market, beach, ferry, station];
