const { ethers } = require("hardhat")
const {expect} = require("chai")

const tokens = (n)=>{
    return ethers.utils.parseUnits(n.toString(),"ether");
}

describe("Token",()=>{
    let token,accounts,deployer,receiver,exchange;
    beforeEach(async ()=>{
        //get token from blockchain
        const Token = await ethers.getContractFactory("Token");
        token = await Token.deploy("My Token","DAPP",1000000);
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        receiver = accounts[1];
        exchange = accounts[2];
    })

    describe("Deployment",()=>{
        const name="My Token";
        const symbol = "DAPP";
        const decimals = 18;
        const totalSupply = tokens(1000000);

        it("has correct name",async ()=>{
            expect(await token.name()).to.equal(name);
        })
    
        it("has correct symbol",async ()=>{
            expect(await token.symbol()).to.equal(symbol);
        })
    
        it("has correct decimals",async ()=>{
            expect(await token.decimals()).to.equal(decimals);
        })
    
        it("has correct total supply",async ()=>{
            expect(await token.totalSupply()).to.equal(totalSupply);
        })
        it("assigns total supply to deployer",async ()=>{
            expect(await token.balanceOf(deployer.address)).to.equal(totalSupply);
        })
    })

    describe("Sending Tokens",()=>{
        let amount,transaction,result;

        describe('Success',async ()=>{
            beforeEach(async ()=>{
                amount=tokens(100);
                transaction =await token.connect(deployer).transfer(receiver.address,amount);
                result =await transaction.wait();
            })
    
            it('transfer token balances',async ()=>{
                expect(await token.balanceOf(deployer.address)).to.equal(tokens(999900));
                expect(await token.balanceOf(receiver.address)).to.equal(amount);
            })
    
            it('emits a transfer event',()=>{
                const event = result.events[0];
                expect(event.event).to.equal('Transfer');
    
                const arg=event.args;
                expect(arg.from).to.equal(deployer.address);
                expect(arg.to).to.equal(receiver.address);
                expect(arg.value).to.equal(amount);
            })
        })
        
        describe('Failure',async() =>{
            it('rejects insufficient balance',async()=>{
                const invalidAmount = tokens(100000000);
                expect(token.connect(deployer).transfer(receiver.address,invalidAmount)).to.be.reverted;
            })

            it('rejects invalid recipent',async()=>{
                const amount = tokens(100);
                expect(token.connect(deployer).transfer('0x0000000000000000000000000000000000000000',amount)).to.be.reverted;
            })
        })
    })

    describe('Approving Tokens',()=>{
        let amount,transaction,result;

        beforeEach(async ()=>{
            amount=tokens(100);
            transaction =await token.connect(deployer).approve(exchange.address,amount);
            result =await transaction.wait();
        })

        describe('success',()=>{
            it('allocate an allowance for delegated token spending',async ()=>{
                expect(await token.allowance(deployer.address,exchange.address)).to.equal(amount)
            })

            it('emits a approval event',()=>{
                const event = result.events[0];
                expect(event.event).to.equal('Approval');
    
                const arg=event.args;
                expect(arg.owner).to.equal(deployer.address);
                expect(arg.spender).to.equal(exchange.address);
                expect(arg.value).to.equal(amount);
            })
        })
        describe('failure',()=>{
            it('rejects invalid spenders',async()=>{
                const amount = tokens(100);
                await expect(token.connect(deployer).transfer('0x0000000000000000000000000000000000000000',amount)).to.be.reverted;
            })
        })
    })
})