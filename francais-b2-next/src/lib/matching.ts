/**
 * Fuzzy answer matching — 比较用户答案与期望答案，支持多级容差。
 *
 * 只依赖标准 API (String.normalize, RegExp)，不需要外部包。
 */

// 句末标点
const TRAILING_PUNCT = /[.!?]+$/;

// 内部多余空格
const MULTI_SPACE = /\s+/g;

/** 去掉首尾空格，压缩内部多余空格。 */
function normalizeWhitespace(text: string): string {
  return text.trim().replace(MULTI_SPACE, " ");
}

/** 去掉句末标点。 */
function stripTrailingPunct(text: string): string {
  return text.replace(TRAILING_PUNCT, "").trimEnd();
}

/** NFD 分解后去掉所有组合用变音符号（Unicode category Mn）。 */
function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

  // 用动态规划计算 LCS 长度（空间优化：只保留两行）
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
    // 交换行
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  const lcsLength = prev[lenB];
  return (2 * lcsLength) / (lenA + lenB);
}

/**
 * 比较用户答案和期望答案。
 *
 * 返回 [is_correct, feedback_hint]。
 * feedback_hint 在不完全正确时给出提示，完全正确时为空字符串。
 *
 * 匹配规则（按优先级）：
 * 1. 完全匹配
 * 2. casefold 后匹配（大小写不算错）
 * 3. 标准化空格 + casefold 后匹配
 * 4. 去掉句末标点后匹配
 * 5. 去掉口音后匹配 → 提示检查重音
 * 6. 相似度 >= 0.85 → 提示检查拼写
 * 7. 其他 → 无提示
 */
export function matchAnswer(userAnswer: string, expected: string): [boolean, string] {
  // 1. 完全匹配
  if (userAnswer === expected) {
    return [true, ""];
  }

  // 2. casefold 匹配
  const userCf = userAnswer.toLowerCase();
  const expectedCf = expected.toLowerCase();
  if (userCf === expectedCf) {
    return [true, ""];
  }

  // 3. 标准化空格 + casefold
  const userNorm = normalizeWhitespace(userAnswer).toLowerCase();
  const expectedNorm = normalizeWhitespace(expected).toLowerCase();
  if (userNorm === expectedNorm) {
    return [true, ""];
  }

  // 4. 去掉句末标点后匹配
  const userNoPunct = stripTrailingPunct(userNorm);
  const expectedNoPunct = stripTrailingPunct(expectedNorm);
  if (userNoPunct === expectedNoPunct) {
    return [true, ""];
  }

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
