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
  const [optionsData, setOptionsData] = useState([]); // Store all options for selected expiration
  const [selectedOption, setSelectedOption] = useState(null); // Currently selected option details
  const [allOptionsData, setAllOptionsData] = useState(null); // Store complete API response for switching
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
      
      // Handle different possible response structures
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
      
      const optionData = result.options?.[0] || result;
      
      // Store complete option data for both puts and calls
      setAllOptionsData(optionData);
      
      // Extract expiration dates
      const expirations = result.expirationDates || [];
      const expDates = expirations.map(timestamp => {
        const date = new Date(timestamp * 1000);
        const daysToExp = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
        return { timestamp, date, daysToExp };
      });
      
      setExpirationDates(expDates);
      
      // Set default expiration (closest to 7 days)
      const defaultExp = expDates.find(exp => exp.daysToExp >= 7) || expDates[0];
      if (defaultExp) {
        setSelectedExpiration(defaultExp.timestamp);
        setDays(defaultExp.daysToExp);
      }
      
      // Extract complete options data for puts or calls
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
      
      // Find strike closest to current price
      const closestStrike = strikes.reduce((prev, curr) => 
        Math.abs(curr - price) < Math.abs(prev - price) ? curr : prev
      , strikes[0]);
      
      // Find and set the option details for closest strike
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
    
    // Extract options for current mode
    const options = mode === 'CSP' 
      ? allOptionsData.puts || []
      : allOptionsData.calls || [];
    
    const strikes = options.map(opt => opt.strike).sort((a, b) => a - b);
    
    setStrikeOptions(strikes);
    setOptionsData(options);
    
    // Keep current strike if it exists in new mode, otherwise find closest
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

  const currentPrice = data?.optionChain?.result[0]?.quote?.regularMarketPrice || 0;
  const contracts = Math.floor(cash / (strike * 100));
  const totalPremium = contracts * premium * 100;
  const annualizedROI = ((premium / strike) * (365 / days) * 100).toFixed(1);
  const safetyBuffer = (((strike - currentPrice) / currentPrice) * 100).toFixed(1);
  const discountPercent = (((currentPrice - strike) / currentPrice) * 100).toFixed(1);
  
  // Calculate confidence percentage (0-100) based on safety buffer
  const calculateConfidencePercentage = () => {
    const buffer = Math.abs(parseFloat(safetyBuffer));
    if (buffer >= 50) return 10; // Very risky
    if (buffer >= 40) return 25; // High risk
    if (buffer >= 30) return 45; // Moderate-high risk
    if (buffer >= 20) return 60; // Moderate risk
    if (buffer >= 10) return 75; // Low-moderate risk
    if (buffer >= 5) return 85;  // Low risk
    return 95; // Very low risk (near ATM)
  };
  
  const confidencePercentage = calculateConfidencePercentage();
  
  // Snap strike to $5/$10 intervals
  const snapStrike = (value) => {
    const num = parseFloat(value);
    if (num < 100) return Math.round(num / 5) * 5;
    return Math.round(num / 10) * 10;
  };

  // Snap capital to round numbers
  const snapCapital = (value) => {
    const num = parseFloat(value);
    if (num < 5000) return Math.round(num / 100) * 100;
    return Math.round(num / 500) * 500;
  };

  // Calculate confidence score based on risk/reward
  const calculateConfidence = () => {
    const buffer = parseFloat(safetyBuffer);
    const roi = parseFloat(annualizedROI);
    
    // For CSP: negative buffer means strike below current price (SAFER)
    // For CC: positive buffer means strike above current price (SAFER)
    const effectiveBuffer = mode === 'CSP' ? -buffer : buffer;
    
    if (effectiveBuffer < -40) return 'AVOID';      // Strike way too far ITM
    if (effectiveBuffer < -15) return 'RISKY';      // Strike too far ITM
    if (effectiveBuffer < -5) return 'MODERATE';    // Slightly ITM or very close
    if (effectiveBuffer >= 15 && roi > 30) return 'EXCELLENT'; // Great buffer + good ROI
    if (effectiveBuffer >= 10) return 'GOOD';       // Good safety margin
    return 'MODERATE';                               // Small safety margin
  };

  const confidence = calculateConfidence();

  // Calculate additional key metrics
  const breakEven = mode === 'CSP' 
    ? (strike - premium).toFixed(2)
    : (strike + premium).toFixed(2);
  
  const maxProfit = (totalPremium).toFixed(0);
  const maxLoss = mode === 'CSP'
    ? ((strike * contracts * 100) - totalPremium).toFixed(0)
    : 'Unlimited';
  
  const returnOnRisk = mode === 'CSP'
    ? ((totalPremium / (strike * contracts * 100)) * 100).toFixed(2)
    : ((totalPremium / (currentPrice * contracts * 100)) * 100).toFixed(2);

  const probabilityITM = selectedOption?.inTheMoney ? 
    (mode === 'CSP' ? (strike > currentPrice ? '~50%+' : '<50%') : (strike < currentPrice ? '~50%+' : '<50%'))
    : 'N/A';

  return (
    <div className="min-h-screen bg-black text-slate-100 p-6 font-sans">
      {/* Header with Current Price */}
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
        {/* Left side: Symbol input aligned with sidebar */}
        <div className="lg:col-span-4">
          <label htmlFor="ticker-input" className="sr-only">Stock Symbol</label>
          <input 
            id="ticker-input"
            type="text"
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 uppercase w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Symbol" 
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && fetchMarketData(e.target.value.toUpperCase())}
            aria-label="Enter stock ticker symbol"
            aria-describedby="ticker-hint"
            autoComplete="off"
            maxLength={10}
          />
          <span id="ticker-hint" className="sr-only">Press Enter to search</span>
        </div>

        {/* Right side: Tabs aligned with chart */}
        <div className="lg:col-span-8">
          <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 w-full max-w-md" role="tablist" aria-label="Options strategy selector">
            <button 
              role="tab"
              aria-selected={mode === 'CSP'}
              aria-controls="strategy-panel"
              onClick={() => setMode('CSP')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  setMode(mode === 'CSP' ? 'CC' : 'CSP');
                }
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                mode === 'CSP' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Cash Secured Put
            </button>
            
            <button 
              role="tab"
              aria-selected={mode === 'CC'}
              aria-controls="strategy-panel"
              onClick={() => setMode('CC')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  setMode(mode === 'CSP' ? 'CC' : 'CSP');
                }
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                mode === 'CC' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Covered Call
            </button>
          </div>
        </div>
      </div>

      <main id="strategy-panel" role="tabpanel" aria-labelledby="strategy-tabs" className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <h3 className="text-lg font-bold mb-6">Parameters</h3>
          
          <div className="space-y-5">
            <div>
              <label className="text-xs text-slate-500 block mb-2">Available Capital: ${cash.toLocaleString()}</label>
              <input 
                type="range"
                min={1000}
                max={1000000}
                step={100}
                value={cash}
                onChange={(e) => setCash(snapCapital(e.target.value))}
                className="w-full mb-2"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-2">Ticker</label>
              <input 
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onBlur={(e) => fetchMarketData(e.target.value.toUpperCase())}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 w-full uppercase text-slate-100"
              />
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
                {expirationDates.length > 0 ? expirationDates.map(exp => (
                  <option key={exp.timestamp} value={exp.timestamp}>
                    {exp.date.toLocaleDateString()} ({exp.daysToExp} days)
                  </option>
                )) : <option value="">{days} days</option>}
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
                  if (option) {
                    setPremium((option.bid + option.ask) / 2);
                  }
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 w-full text-slate-100"
              >
                {strikeOptions.length > 0 ? strikeOptions.map(s => (
                  <option key={s} value={s}>${s}</option>
                )) : <option value={strike}>${strike}</option>}
              </select>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-2xl font-bold">{Math.abs(parseFloat(safetyBuffer)).toFixed(1)}%</div>
                <div className="group relative">
                  <span className="text-xs text-slate-500 cursor-help border-b border-dotted border-slate-500">
                    Safety Buffer
                  </span>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                    <div className="text-xs text-slate-300 leading-relaxed">
                      {parseFloat(safetyBuffer) < 0 
                        ? `Strike is ${Math.abs(parseFloat(safetyBuffer)).toFixed(1)}% below current price ($${currentPrice.toFixed(2)}). Stock can drop this much before assignment.`
                        : parseFloat(safetyBuffer) > 0
                        ? `⚠️ Strike is ${Math.abs(parseFloat(safetyBuffer)).toFixed(1)}% above current price ($${currentPrice.toFixed(2)}). High risk - already in the money!`
                        : `Strike equals current price ($${currentPrice.toFixed(2)}). At-the-money option.`
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className={`text-4xl font-black mb-2 ${
              confidence === 'AVOID' ? 'text-red-500' :
              confidence === 'RISKY' ? 'text-orange-500' :
              confidence === 'MODERATE' ? 'text-yellow-500' :
              confidence === 'EXCELLENT' ? 'text-emerald-500' : 'text-green-500'
            }`}>{confidence}</div>
            <div className="text-xs text-slate-500 mb-6">Confidence Score based on Risk/Reward ratio</div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Premium (Mid)</span>
                <span className="text-emerald-400 font-bold">${premium.toFixed(2)}</span>
              </div>
              {selectedOption && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Bid/Ask</span>
                  <span className="text-slate-400">${selectedOption.bid?.toFixed(2)} / ${selectedOption.ask?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Break-Even</span>
                <span className="text-purple-400 font-bold">${breakEven}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Annualized ROI</span>
                <span className="text-blue-400 font-bold">{annualizedROI}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Return on Risk</span>
                <span className="text-cyan-400 font-bold">{returnOnRisk}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Max Profit</span>
                <span className="text-green-400 font-bold">${maxProfit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Contracts</span>
                <span className="text-slate-300 font-bold">{contracts}</span>
              </div>
              {selectedOption && (
                <>
                  <div className="flex justify-between text-xs pt-2 border-t border-slate-800">
                    <span className="text-slate-500">Volume</span>
                    <span className="text-slate-400">{selectedOption.volume || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Open Interest</span>
                    <span className="text-slate-400">{selectedOption.openInterest || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Implied Vol</span>
                    <span className="text-slate-400">{(selectedOption.impliedVolatility * 100).toFixed(1)}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-800 rounded-xl border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">💡 Key Insight:</div>
            <div className="text-xs leading-relaxed">
              {mode === 'CSP' 
                ? `If assigned, you'll buy ${ticker} at $${breakEven} (${discountPercent}% ${parseFloat(discountPercent) > 0 ? 'discount' : 'premium'} to current price). Your cost basis includes the ${premium.toFixed(2)} premium collected.`
                : `If called away, you'll sell ${ticker} at $${breakEven} effective price. Max gain is capped at ${maxProfit}.`
              }
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <RiskGraph mode={mode} strike={strike} premium={premium} currentPrice={currentPrice} />
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 text-center">
             <div className={`text-5xl font-black ${
               confidencePercentage >= 80 ? 'text-green-400' :
               confidencePercentage >= 60 ? 'text-yellow-400' :
               confidencePercentage >= 40 ? 'text-orange-400' : 'text-red-400'
             }`}>{confidencePercentage}%</div>
             <div className="text-xs uppercase tracking-tighter text-slate-500 mt-2">Safety Confidence Score</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;