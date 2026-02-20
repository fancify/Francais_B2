/**
 * Fuzzy answer matching — 比较用户答案与期望答案，支持多级容差。
 *
 * 只依赖标准 API (String.normalize, RegExp)，不需要外部包。
 */

// 所有句子标点（保留撇号 ' ' ' 和连字符 -，这些在法语中有意义）
const SENTENCE_PUNCT =
  /[.,;:!?¿¡…—–"""«»''()\[\]{}/\\。，、；：！？（）【】「」\u3000]+/g;

// 内部多余空格
const MULTI_SPACE = /\s+/g;

// 法语冠词
const ARTICLE_RE = /^(le|la|l[''']|les|un|une|des|du)\s+/i;

/** 去掉首尾空格，压缩内部多余空格。 */
function normalizeWhitespace(text: string): string {
  return text.trim().replace(MULTI_SPACE, " ");
}

/** 去掉所有句子标点（保留撇号和连字符）。 */
function stripAllPunct(text: string): string {
  return text.replace(SENTENCE_PUNCT, " ").replace(MULTI_SPACE, " ").trim();
}

/** NFD 分解后去掉所有组合用变音符号（Unicode category Mn）。 */
function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** 统一各种撇号为 ASCII '。 */
function normalizeApostrophe(text: string): string {
  return text.replace(/\u2019/g, "'").replace(/\u2018/g, "'").replace(/\u02BC/g, "'");
}

/** 分离开头的法语冠词，返回 [article, rest]。无冠词返回 ["", text]。 */
function splitArticle(text: string): [string, string] {
  const trimmed = text.trim();
  const m = trimmed.match(ARTICLE_RE);
  if (m) {
    const article = m[1];
    const rest = trimmed.slice(m[0].length).trim();
    return [article, rest];
  }
  return ["", trimmed];
}

/** 去掉开头的法语主语代词（仅当匹配指定 person 时）。 */
function stripPronoun(text: string, person: string): string {
  const trimmed = text.trim();
  const personLower = person.trim().toLowerCase();

  const pronounMap: Record<string, string[]> = {
    je: ["je", "j'"],
    tu: ["tu"],
    il: ["il"],
    elle: ["elle"],
    on: ["on"],
    nous: ["nous"],
    vous: ["vous"],
    ils: ["ils"],
    elles: ["elles"],
  };

  const pronouns = pronounMap[personLower] ?? [];
  const textLower = normalizeApostrophe(trimmed.toLowerCase());

  for (const p of pronouns) {
    if (p === "j'" && textLower.startsWith("j'")) {
      const raw = normalizeApostrophe(trimmed);
      return raw.slice(2).trim();
    } else if (textLower.startsWith(p + " ")) {
      return trimmed.slice(p.length).trim();
    }
  }

  return trimmed;
}

/**
 * 计算两个字符串的相似度（模拟 Python difflib.SequenceMatcher.ratio）。
 * 基于最长公共子序列 (LCS) 近似：ratio = 2 * lcs_length / (len(a) + len(b))
 */
function sequenceMatcherRatio(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 && lenB === 0) return 1;
  if (lenA === 0 || lenB === 0) return 0;

  let prev = new Array<number>(lenB + 1).fill(0);
  let curr = new Array<number>(lenB + 1).fill(0);

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  const lcsLength = prev[lenB];
  return (2 * lcsLength) / (lenA + lenB);
}

/**
 * 比较用户答案和期望答案。
 *
 * 匹配规则（按优先级）：
 * 1. 完全匹配
 * 2. casefold 后匹配（大小写不算错）
 * 3. 标准化空格 + casefold 后匹配
 * 4. 去掉所有句子标点后匹配（不仅是句末）
 * 5. 去掉口音后匹配 → 提示检查重音
 * 6. 相似度 >= 0.85 → 提示检查拼写
 * 7. 其他 → 无提示
 */
export function matchAnswer(userAnswer: string, expected: string): [boolean, string] {
  // 先统一撇号（iOS 输入 U+2019，数据用 U+0027）
  const user = normalizeApostrophe(userAnswer);
  const exp = normalizeApostrophe(expected);

  // 1. 完全匹配
  if (user === exp) return [true, ""];

  // 2. casefold 匹配
  const userCf = user.toLowerCase();
  const expectedCf = exp.toLowerCase();
  if (userCf === expectedCf) return [true, ""];

  // 3. 标准化空格 + casefold
  const userNorm = normalizeWhitespace(user).toLowerCase();
  const expectedNorm = normalizeWhitespace(exp).toLowerCase();
  if (userNorm === expectedNorm) return [true, ""];

  // 4. 去掉所有句子标点后匹配
  const userNoPunct = stripAllPunct(userNorm);
  const expectedNoPunct = stripAllPunct(expectedNorm);
  if (userNoPunct === expectedNoPunct) return [true, ""];

  // 5. 去掉口音后匹配
  const userNoAccent = stripAccents(userNoPunct);
  const expectedNoAccent = stripAccents(expectedNoPunct);
  if (userNoAccent === expectedNoAccent) {
    return [false, "Presque ! Vérifiez les accents."];
  }

  // 6. 相似度检测
  const ratio = sequenceMatcherRatio(userNoPunct, expectedNoPunct);
  if (ratio >= 0.85) {
    return [false, "Très proche ! Vérifiez l'orthographe."];
  }

  // 7. 不匹配
  return [false, ""];
}

/**
 * 词汇匹配：支持可选冠词。
 *
 * - expected: 期望的词（不含冠词），如 "gaspillage"
 * - article: 正确的冠词，如 "le"、"la"、"l'"（空表示无冠词）
 * - 用户写冠词且 article 非空 → 验证冠词是否正确
 * - 用户不写冠词 → 只验证拼写
 */
export function matchVocabAnswer(
  userAnswer: string,
  expected: string,
  article: string = "",
): [boolean, string] {
  const [userArticle, userWord] = splitArticle(userAnswer.trim());

  // 如果用户写了冠词，且该词有正确冠词
  if (userArticle && article) {
    const ua = normalizeApostrophe(userArticle.toLowerCase());
    const ea = normalizeApostrophe(article.toLowerCase());
    if (ua !== ea) {
      return [false, `Vérifiez l'article ! (${article} ${expected})`];
    }
  }

  // 验证词本身
  return matchAnswer(userWord, expected);
}

/**
 * 动词变位匹配：允许用户可选地加上主语代词。
 *
 * 例如 expected="protège", person="il"：
 * - "protège" → 正确
 * - "il protège" → 正确（去掉 il 后匹配）
 */
export function matchConjAnswer(
  userAnswer: string,
  expected: string,
  person: string,
): [boolean, string] {
  // 先直接匹配
  const [isCorrect, hint] = matchAnswer(userAnswer.trim(), expected.trim());
  if (isCorrect) return [true, ""];

  // 尝试去掉主语代词后匹配
  const stripped = stripPronoun(userAnswer.trim(), person);
  if (stripped !== userAnswer.trim()) {
    const [isCorrect2, hint2] = matchAnswer(stripped, expected.trim());
    if (isCorrect2) return [true, ""];
    // 如果去掉代词后更接近，用那个 hint
    if (hint2) return [false, hint2];
  }

  return [isCorrect, hint];
}

/**
 * 表达匹配：
 * 1. 直接匹配（7 级容差）
 * 2. 检查期望表达是否包含在用户答案中（用户写了完整句子）
 * 3. 支持多个可接受答案（alternatives 列表）
 */
export function matchExprAnswer(
  userAnswer: string,
  expected: string,
  alternatives?: string[],
): [boolean, string] {
  const allExpected = [expected];
  if (alternatives) allExpected.push(...alternatives);

  const userStripped = userAnswer.trim();

  // 第一轮：直接匹配
  for (const exp of allExpected) {
    const [correct] = matchAnswer(userStripped, exp.trim());
    if (correct) return [true, ""];
  }

  // 第二轮：包含检测（用户写了完整句子，但包含了正确的表达）
  const userNorm = stripAllPunct(normalizeWhitespace(userAnswer).toLowerCase());

  for (const exp of allExpected) {
    const expNorm = stripAllPunct(normalizeWhitespace(exp).toLowerCase());

    if (userNorm.includes(expNorm)) return [true, ""];

    // 去口音后检测包含
    const expNoAccent = stripAccents(expNorm);
    const userNoAccent = stripAccents(userNorm);
    if (userNoAccent.includes(expNoAccent)) {
      return [false, "Presque ! Vérifiez les accents."];
    }
  }

  // 返回主答案的 hint
  const [, hint] = matchAnswer(userStripped, expected.trim());
  return [false, hint];
}
