'use strict';

const ENDPOINT = 'https://randomuser.me/api/?results=24&nat=us,in,gb&seed=opsdash';

const ROLES = [
  'Engineering',
  'Operations',
  'Finance',
  'Sales',
  'Customer Success',
  'People Ops',
];

const NAT_COUNTRY = { US: 'United States', IN: 'India', GB: 'United Kingdom' };

module.exports = {
  id: 'A7',
  name: 'RandomUser — HRIS seam',
  category: 'public',
  sensitive: false,
  ttlSeconds: 86400,
  refresh: true,
  widget: {
    type: 'avatar-grid',
    title: 'People Directory (HRIS seam)',
    question: 'refresh',
    description: 'Sampled headcount across US / IN / GB',
  },

  async fetch(ctx) {
    return ctx.http(ENDPOINT, { parse: 'json', timeoutMs: 10000 });
  },

  normalize(raw) {
    const results = (raw && Array.isArray(raw.results) && raw.results) || [];
    const people = results.map((u, i) => {
      const name = u.name
        ? `${u.name.first || ''} ${u.name.last || ''}`.trim()
        : `Person ${i + 1}`;
      const nat = String(u.nat || '').toUpperCase();
      return {
        name,
        avatar:
          (u.picture && (u.picture.medium || u.picture.thumbnail || u.picture.large)) ||
          '',
        role: ROLES[i % ROLES.length],
        country: NAT_COUNTRY[nat] || u.location?.country || nat || 'Unknown',
      };
    });

    return {
      people,
      metrics: {
        headcount: people.length,
      },
    };
  },

  sample() {
    const first = [
      'Ava', 'Liam', 'Priya', 'Noah', 'Aarav', 'Olivia', 'Ethan', 'Diya',
      'Mia', 'Arjun', 'Sophia', 'Oliver', 'Isha', 'James', 'Ananya', 'Lucas',
      'Riya', 'Henry', 'Kabir', 'Emma', 'Rohan', 'Grace', 'Aditya', 'Chloe',
    ];
    const last = [
      'Patel', 'Smith', 'Sharma', 'Jones', 'Kumar', 'Brown', 'Singh', 'Taylor',
      'Wilson', 'Gupta', 'Davies', 'Reddy', 'Evans', 'Mehta', 'Thomas', 'Nair',
      'Walker', 'Iyer', 'White', 'Rao', 'Hughes', 'Bose', 'Green', 'Das',
    ];
    const nats = ['US', 'IN', 'GB'];
    const results = first.map((f, i) => ({
      name: { first: f, last: last[i % last.length] },
      nat: nats[i % nats.length],
      picture: {
        medium: `https://randomuser.me/api/portraits/med/${
          i % 2 === 0 ? 'women' : 'men'
        }/${(i % 90) + 1}.jpg`,
        thumbnail: `https://randomuser.me/api/portraits/thumb/${
          i % 2 === 0 ? 'women' : 'men'
        }/${(i % 90) + 1}.jpg`,
      },
    }));
    return this.normalize({ results });
  },

};
