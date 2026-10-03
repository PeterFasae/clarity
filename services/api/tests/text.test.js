import { describe, expect, test, vi } from 'vitest';
import {
  ELLIPSIS,
  LIMITS,
  countCodePoints,
  deriveTitle,
  isWellFormedText,
  sliceCodePoints,
  toWellFormedText,
  truncateCodePoints,
} from '@clarity/core';
import { boundGenerated, enrich } from '../lib/enrich.js';

const EMOJI = '\u{1F600}'; // 1 code point, 2 UTF-16 units, 4 UTF-8 bytes
const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}'; // 7 code points
const LONE_HIGH = '\ud800';
const LONE_LOW = '\udc00';

/**
 * Every limit is counted in Unicode code points and every cut lands on a
 * code-point boundary. JavaScript's own `.length` and `.slice()` work in
 * UTF-16 units, which is how an emoji ends up counted twice and, worse, cut in
 * half: half an emoji is an unpaired surrogate, which is not valid text.
 */
describe('counting characters', () => {
  test.each([
    ['ASCII', 'hello', 5],
    ['an emoji is one', EMOJI, 1],
    ['a precomposed é is one', 'é', 1],
    ['a decomposed é is two', 'é', 2],
    ['a family emoji joined with zero-width joiners is seven', FAMILY, 7],
    ['CRLF is two', '\r\n', 2],
    ['three-byte text', '中文', 2],
    ['an unpaired surrogate counts as one', LONE_HIGH, 1],
    ['nothing', '', 0],
  ])('%s', (_label, text, expected) => {
    expect(countCodePoints(text)).toBe(expected);
  });

  test('is not the same as .length for an emoji', () => {
    expect(EMOJI.length).toBe(2);
    expect(countCodePoints(EMOJI)).toBe(1);
  });
});

describe('well-formed text', () => {
  test.each([
    ['plain text', 'hello', true],
    ['a valid pair', EMOJI, true],
    ['control characters are valid text', 'a\u0000b\u0001\t\r\n\u007f', true],
    ['an unpaired high surrogate', `a${LONE_HIGH}b`, false],
    ['an unpaired low surrogate', `a${LONE_LOW}b`, false],
    ['a low surrogate before a high one', `${LONE_LOW}${LONE_HIGH}`, false],
    ['a high surrogate at the very end', `a${LONE_HIGH}`, false],
  ])('%s', (_label, text, expected) => {
    expect(isWellFormedText(text)).toBe(expected);
  });

  test('toWellFormedText replaces each unpaired surrogate and leaves valid text alone', () => {
    expect(toWellFormedText(`a${LONE_HIGH}b${LONE_LOW}c${EMOJI}`)).toBe(`a�b�c${EMOJI}`);
    expect(toWellFormedText(`ok ${EMOJI}`)).toBe(`ok ${EMOJI}`);
    expect(isWellFormedText(toWellFormedText(`${LONE_LOW}${LONE_HIGH}`))).toBe(true);
  });
});

describe('cutting text', () => {
  test('sliceCodePoints never splits a pair', () => {
    expect(sliceCodePoints(EMOJI.repeat(5), 3)).toBe(EMOJI.repeat(3));
    expect(isWellFormedText(sliceCodePoints(`ab${EMOJI}cd`, 3))).toBe(true);
    expect(sliceCodePoints('abc', 0)).toBe('');
    expect(sliceCodePoints('abc', 10)).toBe('abc');
  });

  test('text that already fits is returned untouched, at exactly the limit', () => {
    const exact = 'a'.repeat(1000);
    expect(truncateCodePoints(exact, 1000)).toBe(exact);
  });

  test('one over the limit keeps 999 code points and then the ellipsis', () => {
    const cut = truncateCodePoints('a'.repeat(1001), 1000);

    expect(countCodePoints(cut)).toBe(1000);
    expect(cut.endsWith(ELLIPSIS)).toBe(true);
    expect(cut.slice(0, -1)).toBe('a'.repeat(999));
  });

  test('with emoji on the boundary the result is whole, within the limit, and well formed', () => {
    for (const filler of ['', 'x']) {
      const cut = truncateCodePoints(filler + EMOJI.repeat(1005), 1000);

      expect(countCodePoints(cut)).toBe(1000);
      expect(cut.endsWith(`${EMOJI}${ELLIPSIS}`)).toBe(true);
      expect(isWellFormedText(cut)).toBe(true);
    }
  });

  test('a cut inside a joined sequence stays well formed (it is code-point safe, not grapheme safe)', () => {
    const cut = truncateCodePoints(FAMILY.repeat(300), 1000);

    expect(countCodePoints(cut)).toBe(1000);
    expect(isWellFormedText(cut)).toBe(true);
  });

  test('a tiny limit still fits the limit', () => {
    expect(countCodePoints(truncateCodePoints('abcdef', 1))).toBe(1);
    expect(truncateCodePoints('abcdef', 2)).toBe(`a${ELLIPSIS}`);
  });
});

describe('deriveTitle counts code points and keeps the title rule', () => {
  test('the rule itself is unchanged: first non-empty line, leading # removed, capped at 60', () => {
    expect(deriveTitle('\n\n  # Supervision notes\nbody')).toBe('Supervision notes');
    expect(deriveTitle('   \n  ')).toBe('Untitled');
    expect(deriveTitle('a'.repeat(80))).toBe('a'.repeat(60));
  });

  test('an emoji on the boundary is kept whole', () => {
    const title = deriveTitle(`${'a'.repeat(59)}${EMOJI}zzz`);

    expect(countCodePoints(title)).toBe(60);
    expect(title.endsWith(EMOJI)).toBe(true);
    expect(isWellFormedText(title)).toBe(true);
  });

  test('sixty-one emoji give sixty, not thirty broken ones', () => {
    const title = deriveTitle(EMOJI.repeat(61));

    expect(title).toBe(EMOJI.repeat(60));
    expect(isWellFormedText(title)).toBe(true);
  });

  test('a first line of only #s and spaces is Untitled', () => {
    expect(deriveTitle('###   ')).toBe('Untitled');
  });
});

describe('generated fields are bounded before they are saved', () => {
  const note = {
    noteId: 'n',
    userId: 'u',
    title: 't',
    content: `  The user's words, untouched.${EMOJI}  \n`,
    summary: '',
    actions: [],
    summarySource: 'local',
    tags: [],
    pinned: false,
    archived: false,
    reminders: [],
    createdAt: '2026-10-03T09:00:00.000Z',
    updatedAt: '2026-10-03T09:00:00.000Z',
  };

  const hostileEngine = {
    name: 'llm',
    analyse: async () => ({
      summary: `start${LONE_HIGH}${EMOJI.repeat(5000)}`,
      actions: Array.from({ length: 500 }, (_, index) => `do ${index} ${LONE_LOW}${EMOJI.repeat(1000)}`),
      tags: [],
    }),
  };

  test('an engine that returns far too much is cut to the limits, on code-point boundaries', async () => {
    const result = await enrich(note, hostileEngine);

    expect(countCodePoints(result.summary)).toBe(LIMITS.summary);
    expect(result.summary.endsWith(ELLIPSIS)).toBe(true);
    expect(result.actions).toHaveLength(LIMITS.actions);
    for (const action of result.actions) {
      expect(countCodePoints(action)).toBe(LIMITS.action);
      expect(action.endsWith(ELLIPSIS)).toBe(true);
    }
  });

  test('an unpaired surrogate in generated text cannot reach the store', async () => {
    const result = await enrich(note, hostileEngine);

    expect(isWellFormedText(result.summary)).toBe(true);
    expect(result.actions.every(isWellFormedText)).toBe(true);
    expect(result.summary).toContain('�');
  });

  test('the content is not touched', async () => {
    const result = await enrich(note, hostileEngine);

    expect(result.content).toBe(note.content);
  });

  test('values that already fit pass through unchanged', () => {
    const fitting = { summary: 'Short.', actions: ['email Sam', 'book the lab'] };

    expect(boundGenerated(fitting)).toEqual(fitting);
  });

  test('exactly at the limits nothing is cut; one over is', () => {
    const atLimit = {
      summary: 'a'.repeat(LIMITS.summary),
      actions: Array.from({ length: LIMITS.actions }, () => 'b'.repeat(LIMITS.action)),
    };
    expect(boundGenerated(atLimit)).toEqual(atLimit);

    const over = boundGenerated({
      summary: 'a'.repeat(LIMITS.summary + 1),
      actions: [...atLimit.actions, 'one more'],
    });
    expect(countCodePoints(over.summary)).toBe(LIMITS.summary);
    expect(over.summary.endsWith(ELLIPSIS)).toBe(true);
    expect(over.actions).toHaveLength(LIMITS.actions);
  });

  test('the local fallback is bounded too when the chosen engine fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = { name: 'llm', analyse: async () => Promise.reject(new Error('timeout')) };
    const content = Array.from({ length: 80 }, (_, index) => `todo item ${index}`).join('\n');

    const result = await enrich({ ...note, content }, failing);

    expect(result.summarySource).toBe('local');
    expect(result.actions).toHaveLength(LIMITS.actions);
    warn.mockRestore();
  });
});
