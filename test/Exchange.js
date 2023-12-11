const { ethers } = require("hardhat")
const {expect} = require("chai")

const tokens = (n)=>{
    return ethers.utils.parseUnits(n.toString(),"ether");
}

describe("Exchange",()=>{
    let deployer,feeAccount,exchange,token1,user1,token2,user2;
    const feePercent = 10;

    beforeEach(async ()=>{
        const Exchange = await ethers.getContractFactory("Exchange");
        const Token = await ethers.getContractFactory("Token");

        token1 = await Token.deploy("My Token","DAPP","1000000");
        token2 = await Token.deploy("Mock Dai","mDai","1000000");

        accounts = await ethers.getSigners();
        deployer = accounts[0];
        feeAccount = accounts[1];
        user1 = accounts[2];
        user2 = accounts[3];

        let transaction = await token1.connect(deployer).transfer(user1.address,tokens(100));
        await transaction.wait()
        
        exchange = await Exchange.deploy(feeAccount.address,feePercent);

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

            it('emits a depositing event',()=>{
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

    describe('Withdraw tokens',()=>{
        let transaction,result;
        let amount = tokens(10);
        
        describe('success',()=>{
            beforeEach(async ()=>{
                // deposite before withdraw
                //approve token
                transaction =await token1.connect(user1).approve(exchange.address,amount);
                result =await transaction.wait();
    
                //deposite token
                transaction = await exchange.connect(user1).depositToken(token1.address,amount);
                result = await transaction.wait();

                //withdraw tokens
                transaction = await exchange.connect(user1).withdrawToken(token1.address,amount);
                result = await transaction.wait();
            })

            it('withdraw token funds',async()=>{
                expect(await token1.balanceOf(exchange.address)).to.equal(0);
                expect(await exchange.tokens(token1.address,user1.address)).to.equal(0);
                expect(await exchange.balanceOf(token1.address,user1.address)).to.equal(0);
            })

            it('emits a withdrawing event',()=>{
                const event = result.events[1];
                
                expect(event.event).to.equal('Withdraw');
    
                const arg=event.args;
                expect(arg.token).to.equal(token1.address);
                expect(arg.user).to.equal(user1.address);
                expect(arg.amount).to.equal(amount);
                expect(arg.balance).to.equal(0);
            })
        })

        describe('failure',()=>{
            it('fails for insufficient balance',async()=>{
                // withdraw without depositing
                await expect(exchange.connect(user1).depositToken(token1.address,amount)).to.be.reverted;
            })
        })
    })

    describe('Checking Balances',()=>{
        let transaction,result;
        let amount = tokens(1);
        
        beforeEach(async ()=>{
            //approve token
            transaction =await token1.connect(user1).approve(exchange.address,amount);
            result =await transaction.wait();

            //deposite token
            transaction = await exchange.connect(user1).depositToken(token1.address,amount);
            result = await transaction.wait();
        })

        it('returns user balance',async()=>{
            expect(await exchange.balanceOf(token1.address,user1.address)).to.equal(amount);
        }) 
    })

    describe('Making orders',async()=>{
        let transaction,result;
        let amount = tokens(1);

        describe('success',async()=>{
            beforeEach(async()=>{
                //deposite token before making order

                //approve token
                transaction =await token1.connect(user1).approve(exchange.address,amount);
                result =await transaction.wait();
    
                //deposite token
                transaction = await exchange.connect(user1).depositToken(token1.address,amount);
                result = await transaction.wait();

                //make order
                transaction = await exchange.connect(user1).makeOrder(token2.address,amount,token1.address,amount);
                result = await transaction.wait()
            })
            it('tracks the newly created order',async()=>{
                expect(await exchange.orderCount()).to.equal(1);
            })
            it('emits an Order event', async () => {
                const event = result.events[0]
                expect(event.event).to.equal('Order')
        
                const args = event.args
                expect(args.id).to.equal(1)
                expect(args.user).to.equal(user1.address)
                expect(args.tokenGet).to.equal(token2.address)
                expect(args.amountGet).to.equal(tokens(1))
                expect(args.tokenGive).to.equal(token1.address)
                expect(args.amountGive).to.equal(tokens(1))
                expect(args.timestamp).to.at.least(1)
            })
        })

        describe('failure',async()=>{
            it('Rejects with no balance', async () => {
                await expect(exchange.connect(user1).makeOrder(token2.address, tokens(1), token1.address, tokens(1))).to.be.reverted
            })
        })
    })

    describe('Order action',async()=>{
        let transaction,result;
        let amount = tokens(1);

        beforeEach(async()=>{
            //deposite token before making order

            //approve token
            transaction =await token1.connect(user1).approve(exchange.address,amount);
            result =await transaction.wait();

            //deposite token
            transaction = await exchange.connect(user1).depositToken(token1.address,amount);
            result = await transaction.wait();

            //make order
            transaction = await exchange.connect(user1).makeOrder(token2.address,amount,token1.address,amount);
            result = await transaction.wait()
        })
        describe('Cancelling order',async()=>{
            describe('Success',async()=>{
                beforeEach(async()=>{
                    transaction=await exchange.connect(user1).cancelOrder(1);
                    result = await transaction.wait();  
                })
                it('updates cancel order',async()=>{
                    expect(await exchange.orderCancelled(1)).to.equal(true);
                })
                it('emits an cancel event', async () => {
                    const event = result.events[0]
                    expect(event.event).to.equal('Cancel')
            
                    const args = event.args
                    expect(args.id).to.equal(1)
                    expect(args.user).to.equal(user1.address)
                    expect(args.tokenGet).to.equal(token2.address)
                    expect(args.amountGet).to.equal(tokens(1))
                    expect(args.tokenGive).to.equal(token1.address)
                    expect(args.amountGive).to.equal(tokens(1))
                    expect(args.timestamp).to.at.least(1)
                })
            })
            describe('Failure',async()=>{
                it('rejects invalid order id',async ()=>{
                    let invalidOrderId = 10000;
                    await expect(exchange.connect(user1).cancelOrder(invalidOrderId)).to.be.reverted;
                })
                it('rejects unauthorize cancelation',async()=>{
                    await expect(exchange.connect(user2).cancelOrder(1)).to.be.reverted;
                })
            })
        })
    })
})