import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const RiskGraph = ({ mode, strike, premium, currentPrice, entryPrice }) => {
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  const formatCurrency = (v) => {
    if (v === null || v === undefined || Number.isNaN(v)) return '-';
    return currency.format(v);
  };
  // Generate 20 data points for the graph
  const data = [];
  const startPrice = Math.floor(currentPrice * 0.7);
  const endPrice = Math.ceil(currentPrice * 1.3);
  const step = (endPrice - startPrice) / 20;

  for (let i = 0; i <= 20; i++) {
    const p = startPrice + (i * step);
    let profit = 0;

    if (mode === 'CSP') {
      profit = p >= strike ? premium : (premium - (strike - p));
    } else {
      // Simplification: assuming entry price is current market price
      profit = p <= strike ? (premium + (p - currentPrice)) : (premium + (strike - currentPrice));
    }

    // Store `pnl` as dollars PER CONTRACT (per-share profit * 100)
    data.push({
      price: Math.round(p),
      pnl: Number((profit * 100).toFixed(2))
    });
  }

  return (
    <div className="h-64 w-full bg-slate-900/30 p-4 rounded-3xl border border-slate-800">
      <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">P&L at Expiration</h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="price" stroke="#64748b" fontSize={10} tickFormatter={(val) => formatCurrency(val)} />
          <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => formatCurrency(val)} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
            labelStyle={{ color: '#94a3b8' }}
            labelFormatter={(label) => `Price: ${formatCurrency(label)}`}
            formatter={(value, name, props) => {
              const num = Number(value);
              const sign = num > 0 ? '+' : '';
              const perContractPremium = premium * 100;
              const perContractCapital = (entryPrice || currentPrice) * 100;
              const pctPremium = perContractPremium > 0 ? (num / perContractPremium) * 100 : 0;
              const pctCapital = perContractCapital > 0 ? (num / perContractCapital) * 100 : 0;
              const pctLabel = `(${pctPremium.toFixed(1)}% prem, ${pctCapital.toFixed(2)}% cap)`;
              return [`${sign}${formatCurrency(num)} ${pctLabel}`, 'P&L / contract'];
            }}
          />
          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
          <ReferenceLine x={currentPrice} stroke="#3b82f6" label={{ position: 'top', value: 'Live', fill: '#3b82f6', fontSize: 10 }} />
          <Line type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RiskGraph;