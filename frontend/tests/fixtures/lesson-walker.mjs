/**
 * Przechodzi lekcję w LessonPlayer jak użytkownik — wspólne dla testów A1 i A2.
 *
 * answers: "right" — odpowiada poprawnie (pierwszy akceptowany wariant, poprawna opcja),
 *          "wrong" — odpowiada źle („x”, pierwsza błędna opcja, odwrócona kolejność słów).
 * Zwraca liczbę wywołań onComplete i stan podsumowania; renderer zostaje odmontowany.
 */
const words = (text) => text.toLocaleLowerCase('hr').replace(/[.,!?;:„”"…]/g, ' ').split(/\s+/).filter(Boolean);
const norm = (text) => words(text).join(' ');

/** Montuje player; `drive` prowadzi go dalej (także po „Zacznij od początku” albo w rundzie błędów). */
export async function mountLesson({ React, Renderer, act, LessonPlayer, t, content, storageKey = `test.${content.lessonId}.${Math.random()}`, alreadyCompleted = false }) {
  const state = { completed: 0 };
  let renderer;
  const element = React.createElement(LessonPlayer, {
    content,
    header: { position: 'A', title: 'T', meta: 'M', closeTo: '/m' },
    nextHref: null,
    moduleHref: '/m',
    storageKey,
    alreadyCompleted,
    onComplete: () => { state.completed++; },
  });
  await act(async () => { renderer = Renderer.create(element); });
  const root = () => renderer.root;
  const byClass = (type, cls) => root().findAll((n) => n.type === type && typeof n.props.className === 'string' && n.props.className.split(' ').includes(cls));
  const text = (node) => (typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '');
  const click = async (node) => act(async () => node.props.onClick());
  const buttonWith = (label) => root().findAll((n) => n.type === 'button' && text(n).startsWith(label))[0];
  const currentStep = () => root().findAll((n) => n.props?.step && typeof n.props.onNext === 'function' && typeof n.type === 'function')[0]?.props.step;
  const ctx = { state, renderer, root, byClass, text, click, buttonWith, currentStep, act, t, content, unmount: () => act(() => renderer.unmount()) };
  ctx.drive = (answers, options) => drive(ctx, answers, options);
  return ctx;
}

/** Odpowiada do podsumowania (albo do końca rundy błędów, która wraca do podsumowania). `stopAfter` — liczba kliknięć. */
export async function drive(ctx, answers = 'right', { stopAfter = Infinity } = {}) {
  const { root, byClass, text, click, act, t, content } = ctx;
  const footer = () => root().findAll((n) => n.type === 'button' && typeof n.props.className === 'string' && n.props.className.includes('btn-lg') && !byClass('div', 'step-summary').length)[0];
  const type = async (input, value) => act(async () => input.props.onChange({ target: { value } }));
  const right = answers === 'right';

  for (let guard = 0; guard < 600 && guard < stopAfter; guard++) {
    if (byClass('div', 'step-summary').length) break;
    const exercise = root().findAll((n) => n.props?.step && typeof n.props.onNext === 'function' && typeof n.type === 'function')[0];
    const step = exercise?.props.step;
    const action = footer();
    const answered = byClass('div', 'feedback').length > 0;
    const input = root().findAll((n) => (n.type === 'input' || n.type === 'textarea') && !n.props.disabled && !n.props.readOnly)[0];

    if (step && !answered) {
      if (step.type === 'choice') {
        const choices = byClass('button', 'choice');
        const index = right ? step.correctIndex : (step.correctIndex + 1) % choices.length;
        await click(choices[index]);
        continue;
      }
      if (step.type === 'reading' || step.type === 'listening') {
        const prompt = text(byClass('p', 'question-prompt')[0]);
        const question = step.questions.find((q) => q.prompt === prompt);
        const choices = byClass('button', 'choice');
        await click(choices[right ? question.correctIndex : (question.correctIndex + 1) % choices.length]);
        continue;
      }
      if (step.type === 'order' && !byClass('div', 'order-built')[0]?.props.className.includes('hit')) {
        const bank = () => byClass('button', 'order-token').filter((n) => !n.props.className.includes('placed') && !n.props.disabled);
        const placed = byClass('button', 'placed').length;
        if (placed < step.tokens.length) {
          const target = right ? words(step.accepted[0]) : [...words(step.accepted[0])].reverse();
          const want = target[placed];
          const token = bank().find((n) => norm(text(n)) === want) ?? bank()[0];
          await click(token);
          continue;
        }
      }
      if ((step.type === 'translate' || step.type === 'gap') && input && !input.props.value) {
        await type(input, right ? step.accepted[0] : 'x');
        continue;
      }
      if (step.type === 'dialog' && input && !input.props.value) {
        const prompt = text(root().findAll((n) => n.type === 'div' && n.props.className === 'dialog-reply')[0]?.findAll((n) => n.type === 'span')[0]);
        const turn = step.turns.find((item) => item.kind === 'reply' && item.prompt === prompt);
        await type(input, right ? turn.accepted[0] ?? turn.suggestion : 'x');
        continue;
      }
    }
    if (input && !input.props.value && step?.type === 'free') {
      await type(input, 'Ja sam Ana.');
      continue;
    }
    if (action && !action.props.disabled) { await click(action); continue; }
    const skip = byClass('button', 'btn-ghost').find((n) => n.props.children === t('curriculum.player.skip'));
    if (skip) { await click(skip); continue; }
    throw new Error(`Player utknął w ${content.lessonId} (${step?.type ?? '?'}:${step?.id ?? '?'})`);
  }
  const atSummary = byClass('div', 'step-summary').length === 1;
  if (!atSummary && stopAfter === Infinity) throw new Error(`${content.lessonId}: nie doszedł do podsumowania`);
  const retryLabel = t('curriculum.player.retryMistakes', { n: 0 }).replace(/\s*\(0\)$/, '');
  const mistakes = atSummary && Boolean(ctx.buttonWith(retryLabel));
  return { atSummary, mistakes, completed: ctx.state.completed, isTestResult: byClass('div', 'test-result').length === 1 };
}

/** Montuje, przechodzi do podsumowania i odmontowuje. */
export async function walkLesson(options) {
  const ctx = await mountLesson(options);
  const result = await ctx.drive(options.answers ?? 'right');
  ctx.unmount();
  return result;
}
