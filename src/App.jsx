import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RiskGraph from './RiskGraph';

const App = () => {
  const [ticker, setTicker] = useState('TSLA');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cash, setCash] = useState(50000);
  const [strike, setStrike] = useState(200);
  const [premium, setPremium] = useState(4.50);
  const [days, setDays] = useState(7);
  const [mode, setMode] = useState('CSP'); // 'CSP' or 'CC'
  const [strikeOptions, setStrikeOptions] = useState([]);
  const [expirationDates, setExpirationDates] = useState([]);
  const [selectedExpiration, setSelectedExpiration] = useState(null);
  const [optionsData, setOptionsData] = useState([]); 
  const [selectedOption, setSelectedOption] = useState(null); 
  const [entryPrice, setEntryPrice] = useState(0); 
  const [allOptionsData, setAllOptionsData] = useState(null); 
  const [showDetails, setShowDetails] = useState(false); 
  const [showSafetyBuffer, setShowSafetyBuffer] = useState(false); 
  const [error, setError] = useState(null);

  // Fetch Live Data from Yahoo Finance via RapidAPI
  const fetchMarketData = async (symbol) => {
    if (!symbol || symbol.trim() === '') return;
    
    setLoading(true);
    setError(null);
    
    const requestConfig = {
      method: 'GET',
      url: 'https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-options',
      params: { 
        symbol: symbol,
        lang: 'en-US',
        region: 'US'
      },
      headers: {
        'X-RapidAPI-Key': import.meta.env.VITE_RAPID_API_KEY,
        'X-RapidAPI-Host': 'yahoo-finance-real-time1.p.rapidapi.com'
      }
    };

    try {
      const response = await axios.request(requestConfig);
      
      const result = response.data.optionChain?.result?.[0] || 
                     response.data.result?.[0] ||
                     response.data;
      
      if (!result) {
        throw new Error('Invalid API response structure');
      }
      
      const price = result.quote?.regularMarketPrice || 
                    result.regularMarketPrice ||
                    result.currentPrice ||
                    0;
      
      if (price === 0) {
        throw new Error('Unable to fetch current price for ' + symbol);
      }
      
      // FIX: Force update the entry price whenever a new ticker is fetched
      setEntryPrice(price);
      
      const optionData = result.options?.[0] || result;
      setAllOptionsData(optionData);
      
      // Extract expiration dates
      const expirations = result.expirationDates || [];
      const expDates = expirations.map(timestamp => {
        const date = new Date(timestamp * 1000);
        const daysToExp = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
        return { timestamp, date, daysToExp };
      });
      
      setExpirationDates(expDates);
      
      const defaultExp = expDates.find(exp => exp.daysToExp >= 7) || expDates[0];
      if (defaultExp) {
        setSelectedExpiration(defaultExp.timestamp);
        setDays(defaultExp.daysToExp);
      }
      
      const options = mode === 'CSP' 
        ? optionData.puts || []
        : optionData.calls || [];
      
      if (options.length === 0) {
        throw new Error('No options data available for ' + symbol);
      }
      
      const strikes = options.map(opt => opt.strike).sort((a, b) => a - b);
      
      setStrikeOptions(strikes);
      setOptionsData(options);
      setData(response.data);
      
      const closestStrike = strikes.reduce((prev, curr) => 
        Math.abs(curr - price) < Math.abs(prev - price) ? curr : prev
      , strikes[0]);
      
      const closestOption = options.find(opt => opt.strike === closestStrike);
      setStrike(closestStrike || price);
      setSelectedOption(closestOption);
      if (closestOption) {
        setPremium((closestOption.bid + closestOption.ask) / 2);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch market data';
      setError(errorMessage);
      console.error("API Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchMarketData(ticker); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle mode switching without re-fetching API
  useEffect(() => {
    if (!allOptionsData) return;
    
    const options = mode === 'CSP' 
      ? allOptionsData.puts || []
      : allOptionsData.calls || [];
    
    const strikes = options.map(opt => opt.strike).sort((a, b) => a - b);
    
    setStrikeOptions(strikes);
    setOptionsData(options);
    
    const currentStrikeExists = options.find(opt => opt.strike === strike);
    if (currentStrikeExists) {
      setSelectedOption(currentStrikeExists);
      setPremium((currentStrikeExists.bid + currentStrikeExists.ask) / 2);
    } else {
      const currentPrice = data?.optionChain?.result?.[0]?.quote?.regularMarketPrice || 0;
      const closestStrike = strikes.reduce((prev, curr) => 
        Math.abs(curr - currentPrice) < Math.abs(prev - currentPrice) ? curr : prev
      , strikes[0]);
      
      const closestOption = options.find(opt => opt.strike === closestStrike);
      setStrike(closestStrike);
      setSelectedOption(closestOption);
      if (closestOption) {
        setPremium((closestOption.bid + closestOption.ask) / 2);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, allOptionsData]);

  // Derived Values
  const currentPrice = data?.optionChain?.result[0]?.quote?.regularMarketPrice || 0;
  const contracts = Math.floor(cash / (strike * 100));
  const totalPremium = contracts * premium * 100;
  const annualizedROI = ((premium / strike) * (365 / days) * 100).toFixed(1);
  const safetyBuffer = (((strike - currentPrice) / currentPrice) * 100).toFixed(1);
  const discountPercent = (((currentPrice - strike) / currentPrice) * 100).toFixed(1);
  const weeklyROI = ((premium / strike) * (7 / days) * 100);
  const monthlyROI = ((premium / strike) * (30 / days) * 100);
  
  const calculateConfidencePercentage = () => {
    const buffer = Math.abs(parseFloat(safetyBuffer));
    if (buffer >= 50) return 10; 
    if (buffer >= 40) return 25; 
    if (buffer >= 30) return 45; 
    if (buffer >= 20) return 60; 
    if (buffer >= 10) return 75; 
    if (buffer >= 5) return 85;  
    return 95; 
  };
  
  const confidencePercentage = calculateConfidencePercentage();
  
  const snapCapital = (value) => {
    const num = parseFloat(value);
    if (num < 5000) return Math.round(num / 100) * 100;
    return Math.round(num / 500) * 500;
  };

  const calculateConfidence = () => {
    const buffer = parseFloat(safetyBuffer);
    const roi = parseFloat(annualizedROI);
    const effectiveBuffer = mode === 'CSP' ? -buffer : buffer;
    
    if (effectiveBuffer < -40) return 'AVOID';
    if (effectiveBuffer < -15) return 'RISKY';
    if (effectiveBuffer < -5) return 'MODERATE';
    if (effectiveBuffer >= 15 && roi > 30) return 'EXCELLENT';
    if (effectiveBuffer >= 10) return 'GOOD';
    return 'MODERATE';
  };

  const confidence = calculateConfidence();

  const breakEven = mode === 'CSP' ? (strike - premium) : (entryPrice - premium);
  const maxProfit = mode === 'CSP' ? totalPremium : ((Math.max(0, strike - entryPrice) * contracts * 100) + totalPremium);
  const returnOnRisk = mode === 'CSP' ? ((totalPremium / (strike * contracts * 100)) * 100) : ((totalPremium / (entryPrice * contracts * 100)) * 100);

  return (
    <div className="min-h-screen bg-black text-slate-100 p-6 font-sans">
      <header className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-black">OPTION<span className="text-blue-500">SENTINEL</span></h1>
            <p className="text-xs text-slate-500 mt-1">Advanced Options Analysis for Smart Traders</p>
          </div>
          <div className="text-right" role="status" aria-live="polite">
            <div className="text-xs text-slate-500" id="price-label">CURRENT PRICE</div>
            {loading ? (
              <div className="h-10 w-32 bg-slate-800 rounded-lg animate-pulse" aria-label="Loading price"></div>
            ) : (
              <div className="text-3xl font-bold text-blue-400" aria-labelledby="price-label">${currentPrice.toFixed(2)}</div>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 mb-4" role="alert" aria-live="assertive">
            <p className="text-sm text-red-400">⚠️ {error}</p>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        <div className="lg:col-span-12">
          <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 w-full max-w-md" role="tablist">
            <button 
              onClick={() => setMode('CSP')}
              className={`cursor-pointer flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${mode === 'CSP' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
            >
              Cash Secured Put
            </button>
            <button 
              onClick={() => setMode('CC')}
              className={`cursor-pointer flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${mode === 'CC' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
            >
              Covered Call
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <h3 className="text-lg font-bold mb-6">Parameters</h3>
          
          <div className="space-y-5">
            <div>
              <label className="text-xs text-slate-500 block mb-2">Available Capital: ${cash.toLocaleString()}</label>
              <input 
                type="range" min={1000} max={1000000} step={100} value={cash}
                onChange={(e) => setCash(snapCapital(e.target.value))}
                className="w-full mb-2"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-2">Ticker & Entry Price</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input 
                    type="text" value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && fetchMarketData(ticker)}
                    onBlur={(e) => fetchMarketData(e.target.value.toUpperCase())}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 w-full uppercase text-slate-100"
                  />
                  <button onClick={() => fetchMarketData(ticker)} className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">🔍</button>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 flex items-center">
                  ${entryPrice.toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-2">Expiration Date</label>
              <select 
                value={selectedExpiration || ''}
                onChange={(e) => {
                  const timestamp = parseInt(e.target.value);
                  setSelectedExpiration(timestamp);
                  const exp = expirationDates.find(exp => exp.timestamp === timestamp);
                  if (exp) setDays(exp.daysToExp);
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 w-full text-slate-100"
              >
                {expirationDates.map(exp => (
                  <option key={exp.timestamp} value={exp.timestamp}>
                    {exp.date.toLocaleDateString()} ({exp.daysToExp} days)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-2">Strike Price</label>
              <select 
                value={strike}
                onChange={(e) => {
                  const newStrike = parseFloat(e.target.value);
                  setStrike(newStrike);
                  const option = optionsData.find(opt => opt.strike === newStrike);
                  setSelectedOption(option);
                  if (option) setPremium((option.bid + option.ask) / 2);
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 w-full text-slate-100"
              >
                {strikeOptions.map(s => <option key={s} value={s}>${s}</option>)}
              </select>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-2xl font-bold">{Math.abs(parseFloat(safetyBuffer)).toFixed(1)}%</div>
                <button onClick={() => setShowSafetyBuffer(!showSafetyBuffer)} className="cursor-pointer text-xs text-slate-500 border-b border-dotted border-slate-500">Safety Buffer</button>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className={`text-4xl font-black mb-2 ${confidence === 'AVOID' ? 'text-red-500' : confidence === 'RISKY' ? 'text-orange-500' : confidence === 'MODERATE' ? 'text-yellow-500' : 'text-green-500'}`}>
              {confidence}
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Premium (Mid)</span><span className="text-emerald-400 font-bold">${premium.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Break-Even</span><span className="text-purple-400 font-bold">${breakEven.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Weekly ROI</span><span className="text-blue-400 font-bold">{weeklyROI.toFixed(2)}%</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Return on Risk</span><span className="text-cyan-400 font-bold">{Number(returnOnRisk).toFixed(2)}%</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Max Profit</span><span className="text-green-400 font-bold">${Number(maxProfit).toLocaleString(undefined, {maximumFractionDigits:2})}</span></div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{mode === 'CC' ? 'No. of Contracts (Stock)' : 'Contracts'}</span>
                <span className="text-slate-300 font-bold">{contracts} {mode === 'CC' ? `(${contracts * 100} shares @ $${entryPrice.toFixed(2)})` : ''}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <RiskGraph mode={mode} strike={strike} premium={premium} currentPrice={currentPrice} />
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 text-center">
             <div className={`text-5xl font-black ${confidencePercentage >= 80 ? 'text-green-400' : 'text-red-400'}`}>{confidencePercentage}%</div>
             <div className="text-xs uppercase text-slate-500 mt-2">Safety Confidence Score</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;