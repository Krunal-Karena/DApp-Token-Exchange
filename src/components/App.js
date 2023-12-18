import { useEffect } from 'react';
import config from '../config.json';
import { useDispatch } from 'react-redux'
import { loadProvider,loadNetwork,loadAccount,loadTokens,loadExchange } from '../store/interaction';

function App() {

  const dispatch = useDispatch()

  const loadBlockchainData = async () => {
    
    // connect ethers to blockchain
    const provider = loadProvider(dispatch)

    //fetch current network chainid (e.g. hardhat 31337)
    const chainId = await loadNetwork(provider,dispatch);
    
    //fetch current account & balance
    await loadAccount(provider,dispatch)

    //load Token smart contract
    const DApp = config[chainId].DApp
    const mETH = config[chainId].mETH
    await loadTokens(provider,[DApp.address,mETH.address],dispatch)

    //load exchange smart contract
    const exchangeConfig = config[chainId].exchange
    await loadExchange(provider,exchangeConfig.address,dispatch)
}

  useEffect(()=>{
    loadBlockchainData()
  })

  return (
    <div>

      {/* Navbar */}

      <main className='exchange grid'>
        <section className='exchange__section--left grid'>

          {/* Markets */}

          {/* Balance */}

          {/* Order */}

        </section>
        <section className='exchange__section--right grid'>

          {/* PriceChart */}

          {/* Transactions */}

          {/* Trades */}

          {/* OrderBook */}

        </section>
      </main>

      {/* Alert */}

    </div>
  );
}

export default App;