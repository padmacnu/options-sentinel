import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Custom hook for fetching and managing options data
 * Encapsulates all API logic and state management
 */
export const useOptionsData = (initialTicker = 'TSLA', initialMode = 'CSP') => {
  const [ticker, setTicker] = useState(initialTicker);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(initialMode);
  const [strikeOptions, setStrikeOptions] = useState([]);
  const [expirationDates, setExpirationDates] = useState([]);
  const [selectedExpiration, setSelectedExpiration] = useState(null);
  const [optionsData, setOptionsData] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [allOptionsData, setAllOptionsData] = useState(null);
  const [strike, setStrike] = useState(200);
  const [premium, setPremium] = useState(4.50);
  const [days, setDays] = useState(7);

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
      
      const optionData = result.options?.[0] || result;
      setAllOptionsData(optionData);
      
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

  return {
    ticker,
    setTicker,
    data,
    loading,
    error,
    setError,
    mode,
    setMode,
    strike,
    setStrike,
    premium,
    setPremium,
    days,
    setDays,
    strikeOptions,
    expirationDates,
    selectedExpiration,
    setSelectedExpiration,
    optionsData,
    selectedOption,
    setSelectedOption,
    fetchMarketData,
    currentPrice: data?.optionChain?.result[0]?.quote?.regularMarketPrice || 0
  };
};
