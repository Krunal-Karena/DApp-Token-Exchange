const { ethers } = require("hardhat")
const {expect} = require("chai")

const tokens = (n)=>{
    return ethers.utils.parseUnits(n.toString(),"ether");
}

describe("Exchange",()=>{
    let deployer,feeAccount,exchange,token1,user1;
    const feePercent = 10;

    beforeEach(async ()=>{

        accounts = await ethers.getSigners();
        deployer = accounts[0];
        feeAccount = accounts[1];
        user1 = accounts[2];

        //get token from blockchain
        const Exchange = await ethers.getContractFactory("Exchange");
        const Token = await ethers.getContractFactory("Token");

        exchange = await Exchange.deploy(feeAccount.address,feePercent);
        token1 = await Token.deploy("My Token","DAPP","1000000");

        let transaction = await token1.connect(deployer).transfer(user1.address,tokens(100));

    })

    describe("Deployment",()=>{

        it("tracks the fee account",async ()=>{
            expect(await exchange.feeAccount()).to.equal(feeAccount.address);
        })

        it("tracks the fee percent",async ()=>{
            expect(await exchange.feePercent()).to.equal(feePercent);
        })
    })

    describe('Depositing tokens',()=>{
        let transaction,result;
        let amount = tokens(10);
        
        describe('success',()=>{
            beforeEach(async ()=>{
                //approve token
                transaction =await token1.connect(user1).approve(exchange.address,amount);
                result =await transaction.wait();
    
                //deposite token
                transaction = await exchange.connect(user1).depositToken(token1.address,amount);
                result = await transaction.wait();
            })

            it('tracks the token deposite',async()=>{
                expect(await token1.balanceOf(exchange.address)).to.equal(amount);
                expect(await exchange.tokens(token1.address,user1.address)).to.equal(amount);
                expect(await exchange.balanceOf(token1.address,user1.address)).to.equal(amount);
            })

            it('emits a deposite event',()=>{
                const event = result.events[1];
                
                expect(event.event).to.equal('Deposite');
    
                const arg=event.args;
                expect(arg.token).to.equal(token1.address);
                expect(arg.user).to.equal(user1.address);
                expect(arg.amount).to.equal(amount);
                expect(arg.balance).to.equal(amount);
            })
        })

        describe('failure',()=>{
            it('fails when no tokens are approved',async()=>{
                await expect(exchange.connect(user1).depositToken(token1.address,amount)).to.be.reverted;
            })
        })
    })
})