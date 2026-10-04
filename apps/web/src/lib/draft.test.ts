import { describe, expect, test, vi } from 'vitest';
import { appendDictation, isBlank, restoreAfterFailedSave, saveDraft } from './draft';

/**
 * The rules about words that have not been saved yet. A note's text is the
 * person's own, so none of these may trim, tidy or reshape it; they only decide
 * whether there is anything there, and what to do when saving did not work.
 */
describe('isBlank', () => {
  test.each([
    ['empty', '', true],
    ['spaces', '   ', true],
    ['newlines and tabs', '\n\t \r\n', true],
    ['a word', 'a', false],
    ['a word between spaces', '  a  ', false],
  ])('%s', (_label, text, expected) => {
    expect(isBlank(text)).toBe(expected);
  });

  test('deciding does not change the text', () => {
    const text = '  padded  ';
    isBlank(text);
    expect(text).toBe('  padded  ');
  });
});

describe('restoreAfterFailedSave', () => {
  test('puts the original back exactly, whitespace and all', () => {
    expect(restoreAfterFailedSave('  kept as typed \n', '')).toBe('  kept as typed \n');
  });

  test('keeps what was typed since, in front of it rather than over it', () => {
    expect(restoreAfterFailedSave('first thought', 'second thought')).toBe('first thought\n\nsecond thought');
  });
});

describe('appendDictation', () => {
  test('into an empty box is just the transcript', () => {
    expect(appendDictation('', 'hello there')).toBe('hello there');
  });

  test('adds one space after typed text that does not end in whitespace', () => {
    expect(appendDictation('typed so far', 'and then spoken')).toBe('typed so far and then spoken');
  });

  test('removes nothing the person typed: a trailing newline or space is kept', () => {
    expect(appendDictation('line one.\n\n', 'next')).toBe('line one.\n\nnext');
    expect(appendDictation('trailing ', 'next')).toBe('trailing next');
  });
});

describe('saveDraft', () => {
  const messageFor = (error: unknown) => `could not save: ${(error as Error).message}`;

  test('sends the draft exactly as it is, untrimmed', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const draft = '\n  Leading, trailing and inner   spaces\t\n';

    const outcome = await saveDraft({ draft, saved: 'old', save, messageFor });

    expect(outcome).toEqual({ ok: true, sent: true });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(draft);
  });

  test('does not send a draft that is already what the server has', async () => {
    const save = vi.fn();

    expect(await saveDraft({ draft: 'same', saved: 'same', save, messageFor })).toEqual({ ok: true, sent: false });
    expect(save).not.toHaveBeenCalled();
  });

  test('does not send a blank draft, and does not call clearing the box a save', async () => {
    const save = vi.fn();

    expect(await saveDraft({ draft: '  \n ', saved: 'old', save, messageFor })).toEqual({ ok: true, sent: false });
    expect(save).not.toHaveBeenCalled();
  });

  test.each([
    ['too long (413)', new Error('That is too big to send in one go.')],
    ['refused (422)', new Error('Something is longer than Clarity can keep.')],
    ['the network is down', new Error('Could not reach the server.')],
  ])('a failure is returned as a message, not thrown, so the caller can keep the draft: %s', async (_label, failure) => {
    const save = vi.fn().mockRejectedValue(failure);

    const outcome = await saveDraft({ draft: 'my words', saved: 'old', save, messageFor });

    expect(outcome).toEqual({ ok: false, message: `could not save: ${failure.message}` });
  });

  test('after a failure the same draft can be sent again, and then succeeds', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    const input = { draft: 'my words', saved: 'old', save, messageFor };

    expect((await saveDraft(input)).ok).toBe(false);
    expect(await saveDraft(input)).toEqual({ ok: true, sent: true });
    expect(save).toHaveBeenNthCalledWith(1, 'my words');
    expect(save).toHaveBeenNthCalledWith(2, 'my words');
  });
});
