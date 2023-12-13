const { ethers } = require("hardhat");
const config = require('../src/config.json')

const tokens = (n)=>{
    return ethers.utils.parseUnits(n.toString(),"ether");
}

const wait = (seconds) => {
  const milliseconds = seconds * 1000
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function main() {
    //fetch accounts from wallet
    const accounts = await ethers.getSigners();

    const {chainId} = await ethers.provider.getNetwork();
    console.log('using chainId : ',chainId);

    const DApp = await ethers.getContractAt('Token',config[chainId].DApp.address);
    console.log(`Dapp token fetched : ${DApp.address}\n`)

    const mETH = await ethers.getContractAt('Token',config[chainId].mETH.address);
    console.log(`mETH token fetched : ${mETH.address}\n`)

    const mDAI = await ethers.getContractAt('Token',config[chainId].mDAI.address);
    console.log(`mDAI token fetched : ${mDAI.address}\n`)

    const exchange = await ethers.getContractAt('Exchange',config[chainId].exchange.address);
    console.log(`Exchange fetched : ${exchange.address}\n`)

    const sender = accounts[0];
    const receiver = accounts[1];
    const amount = tokens(10000);

    let transaction,result;
    transaction = await mETH.connect(sender).transfer(receiver.address,amount);
    console.log(`Transfer ${amount} from ${sender.address} to ${receiver.address}\n`);

    const user1 = accounts[0];
    const user2 = accounts[1];
    // amount = tokens(10000);

    //user1 approve 10000 dapp token
    transaction = await DApp.connect(user1).approve(exchange.address,amount)
    await transaction.wait()
    console.log(`Approved ${amount} token from ${user1.address}\n`);
    
    //user1 deposits 10000 dapp tokens
    transaction = await exchange.connect(user1).depositToken(DApp.address,amount);
    await transaction.wait()
    console.log(`Deposited ${amount} token from ${user1.address}\n`); 

    //user2 approve 10000 mETH token
    transaction = await mETH.connect(user2).approve(exchange.address,amount)
    await transaction.wait()
    console.log(`Approved ${amount} token from ${user2.address}\n`);
    
    //user2 deposits 10000 mETH tokens
    transaction = await exchange.connect(user2).depositToken(mETH.address,amount);
    await transaction.wait()
    console.log(`Deposited ${amount} token from ${user2.address}\n`); 

    /////////////////////////////////////////////////
    //seed cancel order

    //user1 make order to get tokens
    let orderId;
    transaction = await exchange.connect(user1).makeOrder(mETH.address,tokens(100),DApp.address,tokens(5));
    result = await transaction.wait()
    console.log(`Made order from ${user1.address}\n`);
    
    //user1 cancel order
    orderId = result.events[0].args.id;
    transaction = await exchange.connect(user1).cancelOrder(orderId);
    result = await transaction.wait()
    console.log(`Cancelled order from ${user1.address}\n`);

    //wait 1 second
    await wait(1);

    /////////////////////////////////////////////////////////////
    // Seed Filled Orders

    // User 1 makes order
    transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(100), DApp.address, tokens(10))
    result = await transaction.wait()
    console.log(`Made order from ${user1.address}`)

    // User 2 fills order
    orderId = result.events[0].args.id
    transaction = await exchange.connect(user2).fillOrder(orderId)
    result = await transaction.wait()
    console.log(`Filled order from ${user1.address}\n`)

    // Wait 1 second
    await wait(1)

    // User 1 makes another order
    transaction = await exchange.makeOrder(mETH.address, tokens(50), DApp.address, tokens(15))
    result = await transaction.wait()
    console.log(`Made order from ${user1.address}`)

    // User 2 fills another order
    orderId = result.events[0].args.id
    transaction = await exchange.connect(user2).fillOrder(orderId)
    result = await transaction.wait()
    console.log(`Filled order from ${user1.address}\n`)

    // Wait 1 second
    await wait(1)

    // User 1 makes final order
    transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(200), DApp.address, tokens(20))
    result = await transaction.wait()
    console.log(`Made order from ${user1.address}`)

    // User 2 fills final order
    orderId = result.events[0].args.id
    transaction = await exchange.connect(user2).fillOrder(orderId)
    result = await transaction.wait()
    console.log(`Filled order from ${user1.address}\n`)

    // Wait 1 second
    await wait(1)

    /////////////////////////////////////////////////////////////
    // Seed Open Orders
    //

    // User 1 makes 10 orders
    for(let i = 1; i <= 10; i++) {
        transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(10 * i), DApp.address, tokens(10))
        result = await transaction.wait()

        console.log(`Made order from ${user1.address}`)

        // Wait 1 second
        await wait(1)
    }

    // User 2 makes 10 orders
    for (let i = 1; i <= 10; i++) {
        transaction = await exchange.connect(user2).makeOrder(DApp.address, tokens(10), mETH.address, tokens(10 * i))
        result = await transaction.wait()

        console.log(`Made order from ${user2.address}`)

        // Wait 1 second
        await wait(1)
    }
}
  
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
console.error(error);
process.exitCode = 1;
});
  