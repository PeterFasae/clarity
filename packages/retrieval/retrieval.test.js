import { describe, expect, test } from 'vitest';
import { extractActions, search, splitSentences, summarise, tokenise } from './index.js';

describe('splitSentences', () => {
  test('a soft line break does not end a sentence', () => {
    const wrapped = 'The orders panel waits for its own request to come back\nbefore it asks for details.';
    expect(splitSentences(wrapped)).toEqual([
      'The orders panel waits for its own request to come back before it asks for details.',
    ]);
  });

  test('a blank line separates paragraphs', () => {
    expect(splitSentences('First para.\n\nSecond para.')).toEqual(['First para.', 'Second para.']);
  });

  test('splits on sentence punctuation', () => {
    expect(splitSentences('One. Two! Three?')).toEqual(['One.', 'Two!', 'Three?']);
  });
});

describe('tokenise', () => {
  test('drops stop words and short words', () => {
    expect(tokenise('the cat is on a mat')).toEqual(['cat', 'mat']);
  });

  test('folds simple plurals onto the same term', () => {
    expect(tokenise('meetings')).toEqual(tokenise('meeting'));
  });
});

describe('summarise', () => {
  test('returns the note unchanged when it is already short', () => {
    const note = 'Ring the dentist.';
    expect(summarise(note)).toBe(note);
  });

  test('keeps sentences in their original order', () => {
    const note = [
      'The billing migration is blocked on the schema review.',
      'Weather was nice.',
      'Schema review needs sign-off from the billing team before the migration.',
    ].join(' ');

    const result = summarise(note, { maxSentences: 2 });
    expect(result.indexOf('billing migration')).toBeLessThan(result.indexOf('Schema review needs'));
  });

  test('prefers sentences carrying the note’s own vocabulary', () => {
    const note = [
      'Deployment failed because the migration lock was still held.',
      'I had a sandwich.',
      'The migration lock is released when the deployment job exits.',
    ].join(' ');

    expect(summarise(note, { maxSentences: 2 })).not.toContain('sandwich');
  });

  test('cannot introduce words that were not in the note', () => {
    const note = 'Alpha beta gamma. Delta epsilon zeta. Eta theta iota.';
    const summary = summarise(note, { maxSentences: 1 });
    expect(note).toContain(summary);
  });
});

describe('extractActions', () => {
  test.each([
    ['- [ ] chase the invoice', 'chase the invoice'],
    ['TODO: book the room', 'book the room'],
    ['Action: send the deck', 'send the deck'],
    ['I need to call the bank', 'call the bank'],
    ['We should fix the flaky test', 'fix the flaky test'],
    ['Remember to email Dani', 'email Dani'],
    ['Chase the supplier about the delay', 'the supplier about the delay'],
  ])('picks up %j', (line, expected) => {
    expect(extractActions(line)).toEqual([expected]);
  });

  test('ignores lines that are not actions', () => {
    expect(extractActions('The meeting was on Tuesday.\nIt rained.')).toEqual([]);
  });

  test('deduplicates repeated actions', () => {
    expect(extractActions('TODO: book the room\ntodo: Book the room')).toEqual(['book the room']);
  });

  test('strips trailing punctuation', () => {
    expect(extractActions('TODO: book the room.')).toEqual(['book the room']);
  });
});

describe('search', () => {
  const notes = [
    { id: '1', title: 'Billing migration', body: 'The invoice schema needs a review before we migrate.' },
    { id: '2', title: 'Dentist', body: 'Ring the dentist about the appointment on Tuesday.' },
    { id: '3', title: 'Standup notes', body: 'Discussed the invoice schema and the migration plan.' },
  ];

  test('finds notes by what they were about', () => {
    const hits = search('schema migration', notes);
    expect(hits.map((hit) => hit.note.id)).toEqual(expect.arrayContaining(['1', '3']));
    expect(hits.map((hit) => hit.note.id)).not.toContain('2');
  });

  test('ranks the closer note first', () => {
    const hits = search('dentist appointment', notes);
    expect(hits[0].note.id).toBe('2');
  });

  test('matches the title as well as the body', () => {
    expect(search('standup', notes)[0].note.id).toBe('3');
  });

  test('returns nothing for an empty query', () => {
    expect(search('   ', notes)).toEqual([]);
  });

  test('returns nothing when no term is shared', () => {
    expect(search('kayaking volcano', notes)).toEqual([]);
  });

  test('weights down a term that appears in every note', () => {
    const everywhere = [
      { id: 'a', title: 'Note', body: 'project alpha update' },
      { id: 'b', title: 'Note', body: 'project beta update' },
      { id: 'c', title: 'Note', body: 'project gamma update' },
    ];
    // "project" is in all three and so should not decide the ranking; "beta"
    // is in one and should.
    expect(search('project beta', everywhere)[0].note.id).toBe('b');
  });
});
