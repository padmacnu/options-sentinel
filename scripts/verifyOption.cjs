const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Read .env and extract VITE_RAPID_API_KEY
const envPath = path.resolve(__dirname, '..', '.env');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const match = env.match(/^VITE_RAPID_API_KEY=(.*)$/m);
const API_KEY = match ? match[1].trim() : null;

if (!API_KEY) {
  console.error('VITE_RAPID_API_KEY not found in .env');
  process.exit(1);
}

const HOST = 'yahoo-finance-real-time1.p.rapidapi.com';

async function fetchOptions(symbol) {
  const requestConfig = {
    method: 'GET',
    url: 'https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-options',
    params: { symbol, lang: 'en-US', region: 'US' },
    headers: {
      'X-RapidAPI-Key': API_KEY,
      'X-RapidAPI-Host': HOST
    },
    timeout: 15000
  };

  const res = await axios.request(requestConfig);
  return res.data;
}

function chooseClosest(strikes, price) {
  if (!strikes || strikes.length === 0) return price;
  return strikes.reduce((prev, curr) => Math.abs(curr - price) < Math.abs(prev - price) ? curr : prev, strikes[0]);
}

function computeMetrics({ mode, strike, premium, currentPrice, days, cash = 50000, entryPrice = null }) {
  const contracts = Math.floor(cash / (strike * 100));
  const totalPremium = contracts * premium * 100;
  const annualizedROI = ((premium / strike) * (365 / days) * 100);
  const safetyBuffer = (((strike - currentPrice) / currentPrice) * 100);

  const breakEven = mode === 'CSP' ? (strike - premium) : ((entryPrice || currentPrice) - premium);

  const maxProfit = mode === 'CSP'
    ? totalPremium
    : ((Math.max(0, strike - (entryPrice || currentPrice)) * contracts * 100) + totalPremium);

  const maxLoss = mode === 'CSP'
    ? ((strike * contracts * 100) - totalPremium)
    : (((entryPrice || currentPrice) * contracts * 100) - totalPremium);

  const returnOnRisk = mode === 'CSP'
    ? ((totalPremium / (strike * contracts * 100)) * 100)
    : ((totalPremium / ((entryPrice || currentPrice) * contracts * 100)) * 100);

  return {
    contracts,
    totalPremium,
    annualizedROI,
    safetyBuffer,
    breakEven,
    maxProfit,
    maxLoss,
    returnOnRisk
  };
}

(async () => {
  try {
    const symbol = process.argv[2] || 'TSLA';
    console.log(`Fetching options for ${symbol}...`);
    const data = await fetchOptions(symbol);

    const result = data.optionChain?.result?.[0] || data.result?.[0] || data;
    const currentPrice = result.quote?.regularMarketPrice || result.regularMarketPrice || result.currentPrice || 0;
    const optionData = result.options?.[0] || result;
    const expirations = (result.expirationDates || []).map(ts => ({ timestamp: ts, date: new Date(ts * 1000) }));
    const daysToExp = expirations.length ? Math.ceil((expirations[0].date - new Date()) / (1000 * 60 * 60 * 24)) : 7;

    const puts = optionData.puts || [];
    const calls = optionData.calls || [];

    const putStrikes = puts.map(p => p.strike).sort((a,b)=>a-b);
    const callStrikes = calls.map(c => c.strike).sort((a,b)=>a-b);

    const chosenPutStrike = chooseClosest(putStrikes, currentPrice);
    const chosenCallStrike = chooseClosest(callStrikes, currentPrice);

    const chosenPut = puts.find(p => p.strike === chosenPutStrike);
    const chosenCall = calls.find(c => c.strike === chosenCallStrike);

    const putPremium = chosenPut ? ((chosenPut.bid + chosenPut.ask) / 2) : 0;
    const callPremium = chosenCall ? ((chosenCall.bid + chosenCall.ask) / 2) : 0;

    console.log('Current Price:', currentPrice);
    console.log('Selected Put Strike:', chosenPutStrike, 'Premium(mid):', putPremium);
    console.log('Selected Call Strike:', chosenCallStrike, 'Premium(mid):', callPremium);

    const cspMetrics = computeMetrics({ mode: 'CSP', strike: chosenPutStrike, premium: putPremium, currentPrice, days: daysToExp });
    const ccMetrics = computeMetrics({ mode: 'CC', strike: chosenCallStrike, premium: callPremium, currentPrice, days: daysToExp, entryPrice: currentPrice });

    console.log('\n=== Cash-Secured Put Metrics ===');
    console.log(cspMetrics);
    console.log('\n=== Covered Call Metrics (entryPrice = currentPrice) ===');
    console.log(ccMetrics);

  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
