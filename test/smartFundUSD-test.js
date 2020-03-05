import { BN, fromWei, toWei } from 'web3-utils'

import ether from './helpers/ether'
import EVMRevert from './helpers/EVMRevert'
import { duration } from './helpers/duration'
import latestTime from './helpers/latestTime'
import advanceTimeAndBlock from './helpers/advanceTimeAndBlock'
const BigNumber = BN

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const SmartFundUSD = artifacts.require('./core/funds/SmartFundUSD.sol')
const Token = artifacts.require('./tokens/Token')
const ExchangePortalMock = artifacts.require('./portalsMock/ExchangePortalMock')
let ETH_TOKEN_ADDRESS, xxxERC, DAI, exchangePortal, smartFundUSD

contract('SmartFundUSD', function([userOne, userTwo, userThree]) {
  async function deployContracts(successFee=1000, platformFee=0){
    ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

    // Deploy xxx Token
    xxxERC = await Token.new(
      "xxxERC20",
      "xxx",
      18,
      "1000000000000000000000000"
    )

    // Deploy DAI Token
    DAI = await Token.new(
      "DAI Stable Coin",
      "DAI",
      18,
      "1000000000000000000000000"
    )

    // Deploy exchangePortal
    exchangePortal = await ExchangePortalMock.new(1, 1, DAI.address)


    // Deploy USD fund
    smartFundUSD = await SmartFundUSD.new(
      '0x0000000000000000000000000000000000000000', // address _owner,
      'TEST USD FUND',                              // string _name,
      successFee,                                   // uint256 _successFee,
      platformFee,                                  // uint256 _platformFee,
      '0x0000000000000000000000000000000000000000', // address _platformAddress,
      exchangePortal.address,                       // address _exchangePortalAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedExchangesAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedPoolsAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedStabels
      '0x0000000000000000000000000000000000000000', // address _poolPortalAddress,
      DAI.address,                                  // address_stableCoinAddress
      '0x0000000000000000000000000000000000000000'  // address _cEther
    )
  }

  beforeEach(async function() {
    await deployContracts()
  })

  describe('INIT USD SmartFund', function() {
    it('Correct init xxx token', async function() {
      const name = await xxxERC.name()
      const totalSupply = await xxxERC.totalSupply()
      assert.equal(name, "xxxERC20")
      assert.equal(totalSupply, "1000000000000000000000000")
    })

    it('Correct init DAI token', async function() {
      const name = await DAI.name()
      const totalSupply = await DAI.totalSupply()

      assert.equal(name, "DAI Stable Coin")
      assert.equal(totalSupply, "1000000000000000000000000")
    })

    it('Correct init usd smart fund', async function() {
      const name = await smartFundUSD.name()
      const totalShares = await smartFundUSD.totalShares()
      const portal = await smartFundUSD.exchangePortal()
      const stableCoinAddress = await smartFundUSD.stableCoinAddress()

      assert.equal(stableCoinAddress, DAI.address)
      assert.equal(exchangePortal.address, portal)
      assert.equal('TEST USD FUND', name)
      assert.equal(0, totalShares)
    })
  })

  describe('Deposit', function() {
    it('should not be able to deposit 0 USD', async function() {
      await DAI.approve(smartFundUSD.address, 100, { from: userOne })
      await smartFundUSD.deposit(0, { from: userOne })
      .should.be.rejectedWith(EVMRevert)
    })

    it('should be able to deposit positive amount of USD', async function() {
      await DAI.approve(smartFundUSD.address, 100, { from: userOne })
      await smartFundUSD.deposit(100, { from: userOne })
      assert.equal(await smartFundUSD.addressToShares(userOne), toWei(String(1)))
      assert.equal(await smartFundUSD.calculateFundValue(), 100)
    })

    it('should accurately calculate empty fund value', async function() {
      // Ether is initial token, USD is second
      assert.equal((await smartFundUSD.getAllTokenAddresses()).length, 2)
      assert.equal(await smartFundUSD.calculateFundValue(), 0)
    })
  })


  describe('Profit', function() {
    it('Fund manager should be able to withdraw after investor withdraws', async function() {
        // give exchange portal contract some money
        await xxxERC.transfer(exchangePortal.address, toWei(String(50)))
        await DAI.transfer(exchangePortal.address, toWei(String(50)))
        await exchangePortal.pay({ from: userOne, value: toWei(String(3))})

        // deposit in fund
        await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userOne })
        await smartFundUSD.deposit(toWei(String(1)), { from: userOne })

        assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(1)))

        await smartFundUSD.trade(
          DAI.address,
          toWei(String(1)),
          xxxERC.address,
          0,
          [],
          "0x",
          {
            from: userOne
          }
        )

        assert.equal((await smartFundUSD.getAllTokenAddresses()).length, 3)

        assert.equal(await DAI.balanceOf(smartFundUSD.address), 0)

        // 1 token is now worth 2 DAI
        await exchangePortal.setRatio(1, 2)

        assert.equal(await smartFundUSD.calculateFundValue(), toWei(String(2)))

        // should receive 200 'DAI' (wei)
        await smartFundUSD.trade(
          xxxERC.address,
          toWei(String(1)),
          DAI.address,
          0,
          [],
          "0x",
          {
            from: userOne,
          }
        )

        assert.equal((await smartFundUSD.getAllTokenAddresses()).length, 3)

        assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(2)))

        const totalWeiDeposited = await smartFundUSD.totalWeiDeposited()
        assert.equal(fromWei(totalWeiDeposited), 1)

        // user1 now withdraws 190 DAI, 90 of which are profit
        await smartFundUSD.withdraw(0, { from: userOne })

        const totalWeiWithdrawn = await smartFundUSD.totalWeiWithdrawn()
        assert.equal(fromWei(totalWeiWithdrawn), 1.9)


        const fB = await DAI.balanceOf(smartFundUSD.address)
        assert.equal(fromWei(fB), 0.1)

        assert.equal(await smartFundUSD.calculateFundValue(), toWei(String(0.1)))

        const {
          fundManagerRemainingCut,
          fundValue,
          fundManagerTotalCut,
        } =
        await smartFundUSD.calculateFundManagerCut()

        assert.equal(fundValue, toWei(String(0.1)))
        assert.equal(fundManagerRemainingCut, toWei(String(0.1)))
        assert.equal(fundManagerTotalCut, toWei(String(0.1)))

          // // FM now withdraws their profit
        await smartFundUSD.fundManagerWithdraw({ from: userOne })
        // Manager, can get his 10%, and remains 0.0001996 it's  platform commision
        assert.equal(await DAI.balanceOf(smartFundUSD.address), 0)
      })

   it('Should properly calculate profit after another user made profit and withdrew', async function() {
        // give exchange portal contract some money
        await xxxERC.transfer(exchangePortal.address, toWei(String(50)))
        await DAI.transfer(exchangePortal.address, toWei(String(50)))
        await exchangePortal.pay({ from: userOne, value: toWei(String(5)) })
        // deposit in fund
        await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userOne })
        await smartFundUSD.deposit(toWei(String(1)), { from: userOne })

        assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(1)))

        await smartFundUSD.trade(
          DAI.address,
          toWei(String(1)),
          xxxERC.address,
          0,
          [],
          "0x",
          {
            from: userOne,
          }
        )

        assert.equal(await DAI.balanceOf(smartFundUSD.address), 0)

        // 1 token is now worth 2 ether
        await exchangePortal.setRatio(1, 2)

        assert.equal(await smartFundUSD.calculateFundValue(), toWei(String(2)))

        // should receive 200 'ether' (wei)
        await smartFundUSD.trade(
          xxxERC.address,
          toWei(String(1)),
          DAI.address,
          0,
          [],
          "0x",
          {
            from: userOne,
          }
        )

        assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(2)))

        // user1 now withdraws 190 ether, 90 of which are profit
        await smartFundUSD.withdraw(0, { from: userOne })

        assert.equal(await smartFundUSD.calculateFundValue(), toWei(String(0.1)))

        // FM now withdraws their profit
        await smartFundUSD.fundManagerWithdraw({ from: userOne })
        assert.equal(await DAI.balanceOf(smartFundUSD.address), 0)

        // provide user2 with some DAI
        await DAI.transfer(userTwo, toWei(String(1)), { from: userOne })
        // now user2 deposits into the fund
        await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userTwo })
        await smartFundUSD.deposit(toWei(String(1)), { from: userTwo })

        // 1 token is now worth 1 ether
        await exchangePortal.setRatio(1, 1)

        await smartFundUSD.trade(
          DAI.address,
          toWei(String(1)),
          xxxERC.address,
          0,
          [],
          "0x",
          {
            from: userOne,
          }
        )

        // 1 token is now worth 2 ether
        await exchangePortal.setRatio(1, 2)

        // should receive 200 'ether' (wei)
        await smartFundUSD.trade(
          xxxERC.address,
          toWei(String(1)),
          DAI.address,
          0,
          [],
          "0x",
          {
            from: userOne,
          }
        )

        const {
          fundManagerRemainingCut,
          fundValue,
          fundManagerTotalCut,
        } = await smartFundUSD.calculateFundManagerCut()

        assert.equal(fundValue, toWei(String(2)))
        // 'remains cut should be 0.1 eth'
        assert.equal(
          fundManagerRemainingCut,
          toWei(String(0.1))
        )
        // 'total cut should be 0.2 eth'
        assert.equal(
          fundManagerTotalCut,
          toWei(String(0.2))
        )
     })
  })


  describe('Withdraw', function() {
   it('should be able to withdraw all deposited funds', async function() {
      let totalShares = await smartFundUSD.totalShares()
      assert.equal(totalShares, 0)

      await DAI.approve(smartFundUSD.address, 100, { from: userOne })
      await smartFundUSD.deposit(100, { from: userOne })

      assert.equal(await DAI.balanceOf(smartFundUSD.address), 100)

      totalShares = await smartFundUSD.totalShares()
      assert.equal(totalShares, toWei(String(1)))

      await smartFundUSD.withdraw(0, { from: userOne })
      assert.equal(await DAI.balanceOf(smartFundUSD.address), 0)
    })

    it('should be able to withdraw percentage of deposited funds', async function() {
      let totalShares

      totalShares = await smartFundUSD.totalShares()
      assert.equal(totalShares, 0)

      await DAI.approve(smartFundUSD.address, 100, { from: userOne })
      await smartFundUSD.deposit(100, { from: userOne })

      totalShares = await smartFundUSD.totalShares()

      await smartFundUSD.withdraw(5000, { from: userOne }) // 50.00%

      assert.equal(await smartFundUSD.totalShares(), totalShares / 2)
    })

    it('should be able to withdraw deposited funds with multiple users', async function() {
      // send some DAI from userOne to userTwo
      await DAI.transfer(userTwo, 100, { from: userOne })

      // deposit
      await DAI.approve(smartFundUSD.address, 100, { from: userOne })
      await smartFundUSD.deposit(100, { from: userOne })

      assert.equal(await smartFundUSD.calculateFundValue(), 100)

      await DAI.approve(smartFundUSD.address, 100, { from: userTwo })
      await smartFundUSD.deposit(100, { from: userTwo })

      assert.equal(await smartFundUSD.calculateFundValue(), 200)

      // withdraw
      let sfBalance
      sfBalance = await DAI.balanceOf(smartFundUSD.address)
      assert.equal(sfBalance, 200)

      await smartFundUSD.withdraw(0, { from: userOne })
      sfBalance = await DAI.balanceOf(smartFundUSD.address)

      assert.equal(sfBalance, 100)

      await smartFundUSD.withdraw(0, { from: userTwo })
      sfBalance = await DAI.balanceOf(smartFundUSD.address)
      assert.equal(sfBalance, 0)
    })
  })

  describe('Fund Manager', function() {
    it('should calculate fund manager and platform cut when no profits', async function() {
      await deployContracts(1500, 1000)
      const {
        fundManagerRemainingCut,
        fundValue,
        fundManagerTotalCut,
      } = await smartFundUSD.calculateFundManagerCut()

      assert.equal(fundManagerRemainingCut, 0)
      assert.equal(fundValue, 0)
      assert.equal(fundManagerTotalCut, 0)
    })

    const fundManagerTest = async (expectedFundManagerCut = 15, self) => {
      // deposit
      await DAI.approve(smartFundUSD.address, 100, { from: userOne })
      await smartFundUSD.deposit(100, { from: userOne })
      // send XXX to exchange
      await xxxERC.transfer(exchangePortal.address, 200, { from: userOne })

      // Trade 100 DAI for 100 XXX
      await smartFundUSD.trade(DAI.address, 100, xxxERC.address, 0, [], "0x", {
        from: userOne,
      })

      // increase price of bat. Ratio of 1/2 means 1 dai = 1/2 xxx
      await exchangePortal.setRatio(1, 2)

      // check profit and cuts are corrects
      const {
        fundManagerRemainingCut,
        fundValue,
        fundManagerTotalCut,
      } = await smartFundUSD.calculateFundManagerCut()

      assert.equal(fundValue, 200)
      assert.equal(fundManagerRemainingCut.toNumber(), expectedFundManagerCut)
      assert.equal(fundManagerTotalCut.toNumber(), expectedFundManagerCut)
    }

    it('should calculate fund manager and platform cut correctly', async function() {
      await deployContracts(1500, 0)
      await fundManagerTest()
    })

    it('should calculate fund manager and platform cut correctly when not set', async function() {
      await deployContracts(0, 0)
      await fundManagerTest(0)
    })

    it('should calculate fund manager and platform cut correctly when no platform fee', async function() {
      await deployContracts(1500,0)
      await fundManagerTest(15)
    })

    it('should calculate fund manager and platform cut correctly when no success fee', async function() {
      await deployContracts(0,1000)
      await fundManagerTest(0)
    })

    it('should be able to withdraw fund manager profits', async function() {
      await deployContracts(2000,0)
      await fundManagerTest(20)

      await smartFundUSD.fundManagerWithdraw({ from: userOne })

      const {
        fundManagerRemainingCut,
        fundValue,
        fundManagerTotalCut,
      } = await smartFundUSD.calculateFundManagerCut()

      assert.equal(fundValue, 180)
      assert.equal(fundManagerRemainingCut, 0)
      assert.equal(fundManagerTotalCut, 20)
    })
  })

  describe('Fund Manager profit cut with deposit/withdraw scenarios', function() {
    it('should accurately calculate shares when the manager makes a profit', async function() {
      // deploy smartFund with 10% success fee
      await deployContracts(1000, 0)
      const fee = await smartFundUSD.successFee()
      assert.equal(fee, 1000)

      // give exchange portal contract some money
      await xxxERC.transfer(exchangePortal.address, toWei(String(10)))

      // deposit in fund
      await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(1)), { from: userOne })

      await smartFundUSD.trade(
        DAI.address,
        toWei(String(1)),
        xxxERC.address,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      // 1 token is now worth 2 ether, the fund managers cut is now 0.1 ether
      await exchangePortal.setRatio(1, 2)

      // send some DAI to user2
      DAI.transfer(userTwo, toWei(String(1)))
      // deposit from user 2
      await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userTwo })
      await smartFundUSD.deposit(toWei(String(1)), { from: userTwo })

      await exchangePortal.setRatio(1, 2)

      await smartFundUSD.trade(
        DAI.address,
        toWei(String(1)),
        xxxERC.address,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      await smartFundUSD.fundManagerWithdraw()

      await smartFundUSD.withdraw(0, { from: userTwo })

      const xxxUserTwo = await xxxERC.balanceOf(userTwo)

      assert.equal(fromWei(xxxUserTwo), 0.5)
    })

    it('should accurately calculate shares when FM makes a loss then breaks even', async function() {
      // deploy smartFund with 10% success fee
      await deployContracts(1000, 0)
      // give exchange portal contract some money
      await xxxERC.transfer(exchangePortal.address, toWei(String(10)))
      await exchangePortal.pay({ from: userThree, value: toWei(String(3))})
      await DAI.transfer(exchangePortal.address, toWei(String(10)))
      // deposit in fund
      // send some DAI to user2
      DAI.transfer(userTwo, toWei(String(100)))
      await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userTwo })
      await smartFundUSD.deposit(toWei(String(1)), { from: userTwo })

      await smartFundUSD.trade(
        DAI.address,
        toWei(String(1)),
        xxxERC.address,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      // 1 token is now worth 1/2 ether, the fund lost half its value
      await exchangePortal.setRatio(2, 1)

      // send some DAI to user3
      DAI.transfer(userThree, toWei(String(100)))
      // user3 deposits, should have 2/3 of shares now
      await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userThree })
      await smartFundUSD.deposit(toWei(String(1)), { from: userThree })

      assert.equal(await smartFundUSD.addressToShares.call(userTwo), toWei(String(1)))
      assert.equal(await smartFundUSD.addressToShares.call(userThree), toWei(String(2)))

      // 1 token is now worth 2 ether, funds value is 3 ether
      await exchangePortal.setRatio(1, 2)

      await smartFundUSD.trade(
        xxxERC.address,
        toWei(String(1)),
        DAI.address,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      assert.equal(
        await DAI.balanceOf(smartFundUSD.address),
        toWei(String(3))
      )

      assert.equal(await smartFundUSD.calculateAddressProfit(userTwo), 0)
      assert.equal(await smartFundUSD.calculateAddressProfit(userThree), toWei(String(1)))
    })
  })


  // END
})
