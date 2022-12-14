const _ = require('lodash');
const Alpaca = require('@alpacahq/alpaca-trade-api');
const SMA = require('technicalindicators').SMA;

const alpaca = new Alpaca({
  keyId: process.env.API_KEY,
  secretKey: process.env.SECRET_KEY,
  paper: true
});

let sma20, sma50;
let lastOrder = 'SELL';

async function initializeAverages() {
  const initialData = await alpaca.getBars(
    '1Min',
    'SPY',
    {
      limit: 50,
      until: new Date()
    }
  );

  const closeValues = _.map(initialData.SPY, (bar) => bar.c);

  sma20 = new SMA({ period: 20, values: closeValues });
  sma50 = new SMA({ period: 50, values: closeValues });

  console.log(`sma20: ${sma20.getResult()}`);
  console.log(`sma50: ${sma50.getResult()}`);
}

initializeAverages();

const client = alpaca.websocket;

client.onConnect(() => {
  client.subscribe(['AM.SPY']);
  setTimeout(() => client.disconnect(), 6000*1000);
});

client.onStockAggMin((subject, data) => {
  const nextValue = JSON.parse(data)[0].c;

  const next20 = sma20.nextValue(nextValue);
  const next50 = sma50.nextValue(nextValue);

  console.log(`next20: ${next20}`);
  console.log(`next50: ${next50}`);

  if (next20 > next50 && lastOrder !== 'BUY') {
    alpaca.createOrder({
      symbol: 'SPY',
      qty: 300,
      side: 'buy',
      type: 'market',
      time_in_force: 'day'
    });

    lastOrder = 'BUY';
    console.log('\nBUY\n');
  } else if (next20 < next50 && lastOrder !== 'SELL') {
    alpaca.createOrder({
      symbol: 'SPY',
      qty: 300,
      side: 'sell',
      type: 'market',
      time_in_force: 'day'
    });

    lastOrder = 'SELL';
    console.log('\nSELL\n');
  }
});

client.connect();