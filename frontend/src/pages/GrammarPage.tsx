import { Link } from "react-router-dom";
import { useT } from "@/i18n";
import { GAMES, findGame } from "@/games/registry";
import { CHEATSHEETS, type CheatSheet } from "@/grammar/cheatsheets";

/**
 * /gramatyka — ćwiczenia gramatyczne (gry z kategorii „grammar”) i ściągi: tabele, reguły, przykłady
 * i pułapki dla Polaków, z odnośnikiem do modułów kursu i do gry, w której temat się ćwiczy.
 */
export function GrammarPage() {
  const t = useT();
  const drills = GAMES.filter((g) => g.category === "grammar" && g.status === "active");

  return (
    <div className="page grammar-page">
      <header className="page-head">
        <h1>{t("grammar.title")}</h1>
        <p className="lede">{t("grammar.subtitle")}</p>
      </header>

      <section aria-labelledby="grammar-drills">
        <h2 id="grammar-drills" className="step-label">{t("grammar.drills")}</h2>
        <ul className="games-list">
          {drills.map((g) => (
            <li key={g.id}>
              <Link to={`/gry/${g.id}`} className="games-row">
                <span className="games-row-name">{t(g.nameKey)}</span>
                <span className="games-row-desc">{t(g.descriptionKey)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="grammar-sheets">
        <h2 id="grammar-sheets" className="step-label">{t("grammar.sheets")}</h2>
        <div className="grammar-sheets">
          {CHEATSHEETS.map((sheet) => (
            <Sheet key={sheet.id} sheet={sheet} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Sheet({ sheet }: { sheet: CheatSheet }) {
  const t = useT();
  const practice = sheet.practice ? findGame(sheet.practice) : undefined;
  return (
    <details className="grammar-sheet" id={sheet.id}>
      <summary>
        <span className="grammar-sheet-title">{sheet.title}</span>
        <span className="grammar-sheet-meta">{sheet.course}</span>
      </summary>
      <div className="grammar-sheet-body">
        <p>{sheet.intro}</p>
        {sheet.tables.map((table, i) => (
          <div key={i} className="grammar-table-wrap">
            <table className="grammar-table">
              {table.caption && <caption>{table.caption}</caption>}
              <thead>
                <tr>{table.head.map((h, j) => <th key={j} scope="col">{h}</th>)}</tr>
              </thead>
              <tbody>
                {table.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (c === 0 ? <th key={c} scope="row">{cell}</th> : <td key={c} lang="hr">{cell}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <ul className="grammar-rules">
          {sheet.rules.map((rule, i) => <li key={i}>{rule}</li>)}
        </ul>
        <ul className="grammar-examples">
          {sheet.examples.map((ex) => (
            <li key={ex.hr}>
              <strong lang="hr">{ex.hr}</strong>
              <span className="muted">{ex.pl}</span>
            </li>
          ))}
        </ul>
        {sheet.traps?.length ? (
          <div className="grammar-traps">
            <span className="eyebrow">{t("grammar.traps")}</span>
            <ul>{sheet.traps.map((trap, i) => <li key={i}>{trap}</li>)}</ul>
          </div>
        ) : null}
        {practice?.status === "active" && (
          <Link to={`/gry/${practice.id}`} className="text-link">{t("grammar.practice", { game: t(practice.nameKey) })} →</Link>
        )}
      </div>
    </details>
  );
}
