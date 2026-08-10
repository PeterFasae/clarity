import { extractActions, summarise } from '../shared/retrieval.js';

const raw = [
  {
    id: '1',
    title: 'Billing migration kickoff',
    body: `Sat down with the billing team about moving invoices off the legacy schema.

The blocker is the reference format. Old rows use a free-text reference and the new
schema wants INV-nnnn, so about four hundred rows need normalising before the cutover.

I need to write the backfill script.
TODO: get sign-off from the billing team on the reference format
We should run the migration against a copy first.`,
  },
  {
    id: '2',
    title: 'Why the dashboard felt slow',
    body: `Profiled the customer dashboard this afternoon. The waterfall is the problem, not
the rendering.

Each panel fetches on mount, and the orders panel waits for its own request to come back
before it asks for account details, so the two waits add up instead of overlapping.
/metrics is requested twice because two panels want it and neither knows about the other.

Action: try a shared query layer on one panel as a proof
Remember to take the before numbers so there is something to compare against.`,
  },
  {
    id: '3',
    title: 'Reading notes: state machines',
    body: `Finished the chapter on modelling state transitions explicitly.

The argument that stuck: if an invalid sequence is merely discouraged rather than
impossible, it will happen. Making the transition table the only way to move between
states means the compiler is doing the checking.

This is the same idea as putting constraints in the database instead of trusting every
caller to remember.`,
  },
  {
    id: '4',
    title: 'Dentist',
    body: `Ring the dentist about the appointment on Tuesday. They close at half four.`,
  },
  {
    id: '5',
    title: 'Standup, Thursday',
    body: `Discussed the invoice schema and the migration plan. Nothing blocked.

Dani is picking up the reference normalisation. I said I would look at the backfill
script once the format is agreed.

TODO: chase the schema review`,
  },
];

export const seedNotes = raw.map((note, index) => ({
  ...note,
  summary: summarise(note.body),
  actions: extractActions(note.body),
  createdAt: new Date(Date.now() - (raw.length - index) * 86_400_000).toISOString(),
  updatedAt: new Date(Date.now() - (raw.length - index) * 3_600_000).toISOString(),
}));
