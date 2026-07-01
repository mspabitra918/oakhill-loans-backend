'use strict';

// High-risk prepaid / BaaS neobank routing numbers. routing_number is the
// PRIMARY KEY, so every entry below is unique — duplicates from the source
// list have been collapsed (the de-dup map keeps the first reason seen).
// Insert is made idempotent with ignoreDuplicates so re-running is safe.
const RAW = [
  // Bancorp Bank
  ['031101279', 'The Bancorp Bank', 'Chime, PayPal Prepaid, Netspend, SoFi'],

  // Pathward / MetaBank
  ['073972181', 'Pathward N.A.', 'Netspend, Current, MoneyLion, Clair'],
  ['073923143', 'Pathward N.A.', 'Cash App, Acorns, Qapital'],

  // Stride Bank
  ['103100195', 'Stride Bank', 'Chime, Cash App, Varo'],

  // Sutton Bank
  ['041215663', 'Sutton Bank', 'Cash App, Robinhood, Monzo'],

  // Lincoln Savings Bank
  ['073905527', 'Lincoln Savings Bank', 'Cash App, Acorns, Qapital'],
  ['073923033', 'Lincoln Savings Bank', 'Cash App, Acorns, Qapital'],
  ['073923114', 'Lincoln Savings Bank', 'Cash App, Acorns, Qapital'],

  // Green Dot Bank
  ['124303120', 'Green Dot Bank', 'Walmart MoneyCard, GoBank, Apple Cash'],
  ['124303269', 'Green Dot Bank', 'Walmart MoneyCard, GoBank, Apple Cash'],
  ['124303162', 'Green Dot Bank', 'Walmart MoneyCard, GoBank, Apple Cash'],
  ['061120000', 'Green Dot Bank', 'Walmart MoneyCard, GoBank, Apple Cash'],
  ['096017418', 'Green Dot Bank', 'Walmart MoneyCard, GoBank, Apple Cash'],
  ['124085024', 'Green Dot Bank', 'Walmart MoneyCard, GoBank, Apple Cash'],
  ['124302529', 'Green Dot Bank', 'Walmart MoneyCard, GoBank, Apple Cash'],
  ['124303214', 'Green Dot Bank', 'Walmart MoneyCard, GoBank, Apple Cash'],

  // WebBank
  ['124384589', 'WebBank', 'Various Fintech Products'],
  ['124085370', 'WebBank', 'Various Fintech Products'],

  // Cross River Bank
  [
    '021214891',
    'Cross River Bank',
    'Coinbase, Affirm, Upstart, Stripe products',
  ],
  [
    '021214273',
    'Cross River Bank',
    'Coinbase, Affirm, Upstart, Stripe products',
  ],
  [
    '021214862',
    'Cross River Bank',
    'Coinbase, Affirm, Upstart, Stripe products',
  ],

  // Choice Financial Group
  [
    '091311229',
    'Choice Financial Group',
    'Mercury, Current, Lili, Various Fintechs',
  ],
  [
    '091302966',
    'Choice Financial Group',
    'Mercury, Current, Lili, Various Fintechs',
  ],
  [
    '091017196',
    'Choice Financial Group',
    'Mercury, Current, Lili, Various Fintechs',
  ],
  [
    '091311232',
    'Choice Financial Group',
    'Mercury, Current, Lili, Various Fintechs',
  ],

  // Republic Bank & Trust Co. (shared 083001314 with a Choice entry in the
  // source list; the routing number is unique so we keep one canonical owner)
  [
    '083001314',
    'Republic Bank & Trust Co.',
    'Tax Refund Advance Cards, Netspend',
  ],

  // Central National Bank & Trust
  ['101101293', 'Central National Bank & Trust', 'Kansas Routing'],
  ['103102591', 'Central National Bank & Trust', 'Oklahoma Routing'],

  // Woodforest National Bank
  ['113008465', 'Woodforest National Bank', 'Texas Routing'],
  ['053112592', 'Woodforest National Bank', 'Second Chance Checking'],
];

module.exports = {
  async up(queryInterface) {
    // Collapse any accidental duplicates by routing_number (PK) — first wins.
    const byRouting = new Map();
    for (const [routing_number, bank_name, reason] of RAW) {
      if (!byRouting.has(routing_number)) {
        byRouting.set(routing_number, { routing_number, bank_name, reason });
      }
    }

    await queryInterface.bulkInsert(
      'banned_routing_numbers',
      Array.from(byRouting.values()),
      { ignoreDuplicates: true },
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('banned_routing_numbers', {}, {});
  },
};
