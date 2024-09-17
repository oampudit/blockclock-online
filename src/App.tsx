import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faChartLine } from '@fortawesome/free-solid-svg-icons';

// Register the required ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = {
  BLOCK_HEIGHT: 'https://blockchain.info/q/getblockcount',
  BTC_PRICE: 'https://api.coindesk.com/v1/bpi/currentprice.json',
};

const HALVING_INTERVAL = 210000;

const formatNumber = (number: number, options: Intl.NumberFormatOptions = {}) => {
  return new Intl.NumberFormat('en-US', options).format(number);
};

const App: React.FC = () => {
  const [blockHeight, setBlockHeight] = useState<number>(0);
  const [halvingProgress, setHalvingProgress] = useState<number>(0);
  const [halvingTime, setHalvingTime] = useState<Date>(new Date());
  const [localTime, setLocalTime] = useState<string>(new Date().toLocaleTimeString());
  const [currency, setCurrency] = useState<string>('USD');
  const [btcPriceInCurrency, setBtcPriceInCurrency] = useState<number>(0);
  const [theme, setTheme] = useState<string>('dark');
  const [historicalPrices, setHistoricalPrices] = useState<any[]>([]);
  const [showChartOnMobile, setShowChartOnMobile] = useState<boolean>(false);

  const calculateHalvingProgress = (currentBlockHeight: number): number => {
    const blocksSinceLastHalving = currentBlockHeight % HALVING_INTERVAL;
    return (blocksSinceLastHalving / HALVING_INTERVAL) * 100;
  };

  const calculateHalvingTime = (currentBlockHeight: number): Date => {
    const blocksUntilHalving = HALVING_INTERVAL - (currentBlockHeight % HALVING_INTERVAL);
    const secondsUntilHalving = blocksUntilHalving * 10 * 60;
    const currentTime = new Date();
    return new Date(currentTime.getTime() + secondsUntilHalving * 1000);
  };

  const updateLocalTime = () => {
    const now = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setLocalTime(
      `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} (${timeZone})`
    );
  };

  const fetchData = useCallback(async () => {
    try {
      const blockHeightResponse = await axios.get(API_URL.BLOCK_HEIGHT);
      const currentBlockHeight = parseInt(blockHeightResponse.data, 10);
      setBlockHeight(currentBlockHeight);

      const btcPriceResponse = await axios.get(API_URL.BTC_PRICE);
      const currentBtcPrice = btcPriceResponse.data.bpi[currency].rate_float;
      setBtcPriceInCurrency(currentBtcPrice);

      const halvingProgress = calculateHalvingProgress(currentBlockHeight);
      setHalvingProgress(halvingProgress);
      const nextHalvingTime = calculateHalvingTime(currentBlockHeight);
      setHalvingTime(nextHalvingTime);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [currency]);

  const fetchHistoricalData = useCallback(async () => {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart', {
        params: {
          vs_currency: currency.toLowerCase(),
          days: '30',
          interval: 'daily',
        },
      });

      const prices = response.data.prices.map((entry: any) => ({
        date: new Date(entry[0]).toLocaleDateString(),
        price: entry[1].toFixed(2),
      }));

      setHistoricalPrices(prices);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  }, [currency]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.className = newTheme + '-theme';
  };

  const toggleChartVisibilityOnMobile = () => {
    setShowChartOnMobile(!showChartOnMobile);
  };

  useEffect(() => {
    fetchData();
    fetchHistoricalData();
    const interval = setInterval(fetchData, 60000);
    const timeInterval = setInterval(updateLocalTime, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [fetchData, fetchHistoricalData]);

  const data = {
    labels: historicalPrices.map((entry) => entry.date),
    datasets: [
      {
        label: `BTC Price (${currency})`,
        data: historicalPrices.map((entry) => entry.price),
        borderColor: 'rgba(255, 153, 0, 1)',
        fill: false,
      },
    ],
  };

  return (
    <div className="blockclock">
      <header className="blockclock-header">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/200px-Bitcoin.svg.png" alt="Bitcoin logo" />
        <h1>Bitcoin Clock</h1>
        <button onClick={toggleTheme} className="theme-switch-button">
          {theme === 'dark' ? (
            <FontAwesomeIcon icon={faSun} size="2x" color="#FFC107" />
          ) : (
            <FontAwesomeIcon icon={faMoon} size="2x" color="#333" />
          )}
        </button>
      </header>

      <div className="blockclock-display">
        <div className="blockclock-display-row">
          <div className="blockclock-display-cell-big">{blockHeight.toLocaleString()}</div>
          <div className="blockclock-display-cell-small">Blocks</div>
        </div>

        <div className="blockclock-display-row">
          <div className="blockclock-display-cell">
            <label htmlFor="currency">Select Currency: </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {['USD', 'EUR', 'GBP'].map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="blockclock-display-row">
          <div className="blockclock-display-cell">
            <span className="blockclock-display-label">BTC/{currency} Price:</span> {formatNumber(btcPriceInCurrency, { style: 'currency', currency })}
          </div>
        </div>

        <div className="blockclock-display-row">
          <div className="blockclock-display-cell">
            <span className="blockclock-display-label">Sats per 1 {currency}:</span> {formatNumber(Math.floor(100000000 / btcPriceInCurrency))}
          </div>
        </div>

        <div className="blockclock-display-row">
          <div className="blockclock-display-cell">
            <span className="blockclock-display-label">Local Time:</span> {localTime}
          </div>
        </div>

        <div className="blockclock-display-row">
          <div className="blockclock-display-cell" style={{ width: '100%' }}>
            <span className="blockclock-display-label">Next Halving Progress:</span>
            <div className="progress-bar">
              <span className="progress-text">{halvingProgress.toFixed(2)} %</span>
              <div className="progress" style={{ width: `${halvingProgress}%` }}>
              </div>
            </div>
          </div>
        </div>


        <div className="blockclock-display-row">
          <div className="blockclock-display-cell">
            <span className="blockclock-display-label">Next Halving (Estimate):</span> {halvingTime.toLocaleString()}
          </div>
        </div>

        {/* Toggle Button for Mobile */}
        <button className="toggle-chart-button mobile-only" onClick={toggleChartVisibilityOnMobile}>
          <FontAwesomeIcon icon={faChartLine} size="lg" />
        </button>

        {/* Always show chart on larger screens, toggle visibility on mobile */}
        <div className={`chart-container ${showChartOnMobile ? '' : 'mobile-hidden'}`}>
          <h2>Bitcoin Price History (Last 30 days)</h2>
          <Line data={data} />
        </div>
      </div>
    </div>
  );
};

export default App;
