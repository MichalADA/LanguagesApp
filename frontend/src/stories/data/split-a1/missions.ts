import type { Mission, MissionWord } from "../../types";
import { branch, build, choice, end, flag, graph, option, say, type } from "../builders";

/**
 * Split A1 — pięć misji. Zdania opierają się na materiale lekcji A1 (moduły 1, 4, 5, 7),
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
      say("nice", "marko", "Drago mi je, {name}! Odakle si?", "Miło mi, {name}! Skąd jesteś?", "b-from", { mood: "happy", effects: [flag("met-marko")] }),
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
      say("no-res", "marko", "Ne? Ali ovdje je rezervacija za {name}!", "Nie? Ale tu jest rezerwacja dla {name}!", "c-res", { mood: "puzzled" }),
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
      say("hi", "marko", "Bok, {name}! Kako si?", "Cześć, {name}! Jak się masz?", "c-how", { mood: "happy" }),
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

export const SPLIT_MISSIONS: Mission[] = [welcome, key, coffee, price, shop];
