// tornApiHelpers.js
import axios from 'axios';

export const getFactionInfo = async (id, apiKey) => {
  const url = `https://api.torn.com/v2/faction/${id}?selections=basic&key=${apiKey}`;
  const res = await axios.get(url);
  return res.data.basic;
};

export const getFactionMembers = async (id, apiKey) => {
  const url = id
    ? `https://api.torn.com/v2/faction/${id}?selections=members&key=${apiKey}`
    : `https://api.torn.com/v2/faction/?selections=members&key=${apiKey}`;
  const res = await axios.get(url);
  return Object.values(res.data.members);
};

export const getCurrentStats = async (userId, apiKey, debug = false) => {
  const url = `https://api.torn.com/v2/user/${userId}?cat=all&selections=personalstats&key=${apiKey}`;
  const res = await axios.get(url);
  if (debug) console.log(res.data);
  return flattenStats(res.data.personalstats);
};

export const getHistoricalStats = async (userId, timestamp, apiKey, debug = false) => {
  const statKeys = [
    'moneymugged', 'respectforfaction', 'alcoholused', 'energydrinkused',
    'xantaken', 'networth', 'timeplayed', 'awards', 'refills'
  ];
  const url = `https://api.torn.com/v2/user/${userId}/personalstats?stat=${statKeys.join(',')}&timestamp=${timestamp}&key=${apiKey}`;
  const res = await axios.get(url);
  if (debug) console.log(res.data);
  return flattenHistoricalStats(res.data.personalstats);
};

export const flattenStats = (stats) => ({
  moneymugged: stats?.attacking?.networth?.money_mugged || 0,
  respectforfaction: stats?.attacking?.faction?.respect || 0,
  alcoholused: stats?.items?.used?.alcohol || 0,
  energydrinkused: stats?.items?.used?.energy_drinks || 0,
  xantaken: stats?.drugs?.xanax || 0,
  networth: stats?.networth?.total || 0,
  timeplayed: stats?.other?.activity?.time || 0,
  awards: stats?.other?.awards || 0,
  refills: stats?.other?.refills?.energy || 0
});

export const flattenHistoricalStats = (historicalArray) => {
  const statKeys = [
    'moneymugged', 'respectforfaction', 'alcoholused', 'energydrinkused',
    'xantaken', 'networth', 'timeplayed', 'awards', 'refills'
  ];
  const stats = {};
  for (const entry of historicalArray) {
    if (entry.name && typeof entry.value !== 'undefined') {
      stats[entry.name] = entry.value;
    }
  }
  statKeys.forEach(key => {
    if (typeof stats[key] === 'undefined') stats[key] = 0;
  });
  return stats;
};

export const compareStats = (current, past, statKeys) => {
  const delta = {};
  for (const key of statKeys) {
    delta[key] = (current[key] || 0) - (past[key] || 0);
  }
  return delta;
};
