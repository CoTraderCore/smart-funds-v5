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
const PoolPortalMock = artifacts.require('./portalsMock/PoolPortalMock')
const CoTraderDAOWalletMock = artifacts.require('./CoTraderDAOWalletMock')
const CToken = artifacts.require('./compoundMock/CTokenMock')
const CEther = artifacts.require('./compoundMock/CEtherMock')
const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

let xxxERC, DAI, exchangePortal, smartFundUSD, cToken, cEther, BNT, DAIUNI, DAIBNT, poolPortal, COT_DAO_WALLET, yyyERC

contract('SmartFundUSD', function([userOne, userTwo, userThree]) {
  async function deployContracts(successFee=1000, platformFee=0){
    COT_DAO_WALLET = await CoTraderDAOWalletMock.new()

    // Deploy xxx Token
    xxxERC = await Token.new(
      "xxxERC20",
      "xxx",
      18,
      "1000000000000000000000000"
    )

    // Deploy yyy Token
    yyyERC = await Token.new(
      "yyyERC20",
      "yyy",
      18,
      toWei(String(100000000))
    )

    // Deploy BNT Token
    BNT = await Token.new(
      "Bancor Newtork Token",
      "BNT",
      18,
      toWei(String(100000000))
    )

    // Deploy DAIBNT Token
    DAIBNT = await Token.new(
      "DAI Bancor",
      "DAIBNT",
      18,
      toWei(String(100000000))
    )

    // Deploy DAIUNI Token
    DAIUNI = await Token.new(
      "DAI Uniswap",
      "DAIUNI",
      18,
      toWei(String(100000000))
    )

    // Deploy DAI Token
    DAI = await Token.new(
      "DAI Stable Coin",
      "DAI",
      18,
      "1000000000000000000000000"
    )

    cToken = await CToken.new(
      "Compound DAI",
      "CDAI",
      18,
      toWei(String(100000000)),
      DAI.address
    )

    cEther = await CEther.new(
      "Compound Ether",
      "CETH",
      18,
      toWei(String(100000000))
    )

    // Deploy exchangePortal
    exchangePortal = await ExchangePortalMock.new(1, 1, DAI.address)
    // Depoy poolPortal
    poolPortal = await PoolPortalMock.new(BNT.address, DAI.address, DAIBNT.address, DAIUNI.address)

    // Deploy USD fund
    smartFundUSD = await SmartFundUSD.new(
      '0x0000000000000000000000000000000000000000', // address _owner,
      'TEST USD FUND',                              // string _name,
      successFee,                                   // uint256 _successFee,
      platformFee,                                  // uint256 _platformFee,
      COT_DAO_WALLET.address,                       // address _platformAddress,
      exchangePortal.address,                       // address _exchangePortalAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedExchangesAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedPoolsAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedStabels
      poolPortal.address,                           // address _poolPortalAddress,
      DAI.address,                                  // address_stableCoinAddress
      cEther.address                                // address _cEther
    )

    // send all BNT and UNI pools to portal
    DAIBNT.transfer(poolPortal.address, toWei(String(100000000)))
    DAIUNI.transfer(poolPortal.address, toWei(String(100000000)))
  }

  beforeEach(async function() {
    await deployContracts()
  })

  describe('INIT', function() {
    it('Correct init xxx token', async function() {
      const nameX = await xxxERC.name()
      const totalSupplyX = await xxxERC.totalSupply()
      assert.equal(nameX, "xxxERC20")
      assert.equal(totalSupplyX, "1000000000000000000000000")

      const nameY = await yyyERC.name()
      const totalSupplyY = await yyyERC.totalSupply()
      assert.equal(nameY, "yyyERC20")
      assert.equal(totalSupplyY, toWei(String(100000000)))

      const nameDB = await DAIBNT.name()
      const totalSupplyDB = await DAIBNT.totalSupply()
      assert.equal(nameDB, "DAI Bancor")
      assert.equal(totalSupplyDB, toWei(String(100000000)))

      const nameDU = await DAIUNI.name()
      const totalSupplyDU = await DAIUNI.totalSupply()
      assert.equal(nameDU, "DAI Uniswap")
      assert.equal(totalSupplyDU, toWei(String(100000000)))

      const nameD = await DAI.name()
      const totalSupplyD = await DAI.totalSupply()
      assert.equal(nameD, "DAI Stable Coin")
      assert.equal(totalSupplyD, "1000000000000000000000000")


      const nameCT = await cToken.name()
      const totalSupplyCT = await cToken.totalSupply()
      const underlying = await cToken.underlying()

      assert.equal(underlying, DAI.address)
      assert.equal(nameCT, "Compound DAI")
      assert.equal(totalSupplyCT, toWei(String(100000000)))


      const nameCE = await cEther.name()
      const totalSupplyCE = await cEther.totalSupply()
      assert.equal(nameCE, "Compound Ether")
      assert.equal(totalSupplyCE, toWei(String(100000000)))
    })


    it('Correct init pool portal', async function() {
      const DAIUNIBNTAddress = await poolPortal.DAIUNIPoolToken()
      const DAIBNTBNTAddress = await poolPortal.DAIBNTPoolToken()
      const BNTAddress = await poolPortal.BNT()
      const DAIAddress = await poolPortal.DAI()

      assert.equal(DAIUNIBNTAddress, DAIUNI.address)
      assert.equal(DAIBNTBNTAddress, DAIBNT.address)
      assert.equal(BNTAddress, BNT.address)
      assert.equal(DAIAddress, DAI.address)

      assert.equal(await DAIUNI.balanceOf(poolPortal.address), toWei(String(100000000)))
      assert.equal(await DAIBNT.balanceOf(poolPortal.address), toWei(String(100000000)))
    })

    it('Correct init usd smart fund', async function() {
      const name = await smartFundUSD.name()
      const totalShares = await smartFundUSD.totalShares()
      const portalEXCHANGE = await smartFundUSD.exchangePortal()
      const stableCoinAddress = await smartFundUSD.stableCoinAddress()
      const cEthAddress = await smartFundUSD.cEther()
      const portalPOOL = await smartFundUSD.poolPortal()

      assert.equal(exchangePortal.address, portalEXCHANGE)
      assert.equal(stableCoinAddress, DAI.address)
      assert.equal(poolPortal.address, portalPOOL)
      assert.equal('TEST USD FUND', name)
      assert.equal(0, totalShares)
      assert.equal(cEthAddress, cEther.address)
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
    it('should have zero profit before any deposits have been made', async function() {
        assert.equal(await smartFundUSD.calculateAddressProfit(userOne), 0)
        assert.equal(await smartFundUSD.calculateFundProfit(), 0)
    })

    it('should have zero profit before any trades have been made', async function() {
        await DAI.approve(smartFundUSD.address, 100, { from: userOne })
        await smartFundUSD.deposit(100, { from: userOne })
        assert.equal(await smartFundUSD.calculateAddressProfit(userOne), 0)
        assert.equal(await smartFundUSD.calculateFundProfit(), 0)
    })

    it('should accurately calculate profit if price stays stable', async function() {
        // give portal some money
        await xxxERC.transfer(exchangePortal.address, 1000)

        // deposit in fund
        await DAI.approve(smartFundUSD.address, 100, { from: userOne })
        await smartFundUSD.deposit(100, { from: userOne })

        // make a trade with the fund
        await smartFundUSD.trade(DAI.address, 100, xxxERC.address, 0, [], "0x",{
          from: userOne,
        })

        // check that we still haven't made a profit
        assert.equal(await smartFundUSD.calculateAddressProfit(userOne), 0)
        assert.equal(await smartFundUSD.calculateFundProfit(), 0)
    })

    it('should accurately calculate profit upon price rise', async function() {
        // give portal some money
        await xxxERC.transfer(exchangePortal.address, 1000)

        // deposit in fund
        await DAI.approve(smartFundUSD.address, 100, { from: userOne })
        await smartFundUSD.deposit(100, { from: userOne })

        // make a trade with the fund
        await smartFundUSD.trade(DAI.address, 100, xxxERC.address, 0, [], "0x",{
          from: userOne,
        })

        // change the rate (making a profit)
        await exchangePortal.setRatio(1, 2)

        // check that we have made a profit
        assert.equal(await smartFundUSD.calculateAddressProfit(userOne), 100)
        assert.equal(await smartFundUSD.calculateFundProfit(), 100)
    })

    it('should accurately calculate profit upon price fall', async function() {
        // give portal some money
        await xxxERC.transfer(exchangePortal.address, 1000)

        // deposit in fund
        await DAI.approve(smartFundUSD.address, 100, { from: userOne })
        await smartFundUSD.deposit(100, { from: userOne })

        // Trade 100 eth for 100 bat via kyber
        await smartFundUSD.trade(DAI.address, 100, xxxERC.address, 0, [], "0x", {
          from: userOne,
        })

        // change the rate to make a loss (2 tokens is 1 ether)
        await exchangePortal.setRatio(2, 1)

        // check that we made negatove profit
        assert.equal(await smartFundUSD.calculateAddressProfit(userOne), -50)
        assert.equal(await smartFundUSD.calculateFundProfit(), -50)
    })

    it('should accurately calculate profit if price stays stable with multiple trades', async function() {
        // give exchange portal contract some money
        await xxxERC.transfer(exchangePortal.address, 1000)
        await yyyERC.transfer(exchangePortal.address, 1000)

        // deposit in fund
        await DAI.approve(smartFundUSD.address, 100, { from: userOne })
        await smartFundUSD.deposit(100, { from: userOne })

        await smartFundUSD.trade(DAI.address, 50, yyyERC.address, 0, [], "0x", {
          from: userOne,
        })
        await smartFundUSD.trade(DAI.address, 50, xxxERC.address, 0, [], "0x", {
          from: userOne,
        })

        // check that we still haven't made a profit
        assert.equal(await smartFundUSD.calculateFundProfit(), 0)
        assert.equal(await smartFundUSD.calculateAddressProfit(userOne), 0)
    })

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

  describe('COMPOUND', function() {
    it('Correct cToken length', async function() {
      assert.equal(await cEther.balanceOf(smartFundUSD.address), 0)
      // deposit in fund
      await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(1)), { from: userOne })
      // mint DAI Ctoken
      await smartFundUSD.compoundMint(toWei(String(0.5)), cToken.address)
      // mint DAI Ctoken
      await smartFundUSD.compoundMint(toWei(String(0.5)), cToken.address)
      assert.equal(await smartFundUSD.compoundCTokensLength(), 1)
    })

    it('Fund Manager can mint and reedem CEther', async function() {
      assert.equal(await cEther.balanceOf(smartFundUSD.address), 0)

      // send some ETH to exchnage portal
      await exchangePortal.pay({ from: userOne, value: toWei(String(1))})

      // deposit in fund
      await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(1)), { from: userOne })

      // change DAI to ETH
      await smartFundUSD.trade(
        DAI.address,
        toWei(String(1)),
        ETH_TOKEN_ADDRESS,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      // mint
      await smartFundUSD.compoundMint(toWei(String(1)), cEther.address)

      // check balance
      assert.equal(await web3.eth.getBalance(smartFundUSD.address), 0)
      assert.equal(await cEther.balanceOf(smartFundUSD.address), toWei(String(1)))

      // reedem
      await smartFundUSD.compoundRedeemByPercent(100, cEther.address)

      // check balance
      assert.equal(await web3.eth.getBalance(smartFundUSD.address), toWei(String(1)))
      assert.equal(await cEther.balanceOf(smartFundUSD.address), 0)
    })

    it('Fund Manager can mint and reedem cToken', async function() {
      assert.equal(await cToken.balanceOf(smartFundUSD.address), 0)

      // deposit in fund
      await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(1)), { from: userOne })

      // mint DAI Ctoken
      await smartFundUSD.compoundMint(toWei(String(1)), cToken.address)

      assert.equal(await cToken.balanceOf(smartFundUSD.address), toWei(String(1)))

      // reedem
      await smartFundUSD.compoundRedeemByPercent(100, cToken.address)

      // check balance
      assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(1)))
      assert.equal(await cToken.balanceOf(smartFundUSD.address), 0)
    })


    it('Compound assets works correct with ERC20 assests', async function() {
      assert.equal(await cToken.balanceOf(smartFundUSD.address), 0)
      // give exchange portal contract some money
      await xxxERC.transfer(exchangePortal.address, toWei(String(10)))

      // deposit in fund
      await DAI.approve(smartFundUSD.address, toWei(String(3)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(3)), { from: userOne })

      // mint
      await smartFundUSD.compoundMint(toWei(String(1)), cToken.address)
      assert.equal(await cToken.balanceOf(smartFundUSD.address), toWei(String(1)))

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
      assert.equal(await xxxERC.balanceOf(smartFundUSD.address), toWei(String(1)))

      // Total should be the same
      assert.equal(await smartFundUSD.calculateFundValue(), toWei(String(3)))

      // reedem
      await smartFundUSD.compoundRedeemByPercent(100, cToken.address)

      // remove cToken from fund
      await smartFundUSD.removeToken(cToken.address, 2)

      // Total should be the same
      assert.equal(await smartFundUSD.calculateFundValue(), toWei(String(3)))

      // mint
      await smartFundUSD.compoundMint(toWei(String(1)), cToken.address)
      assert.equal(await cToken.balanceOf(smartFundUSD.address), toWei(String(1)))

      // Total should be the same
      assert.equal(await smartFundUSD.calculateFundValue(), toWei(String(3)))

      await smartFundUSD.withdraw(0)

      // check balance
      assert.equal(await web3.eth.getBalance(smartFundUSD.address), 0)
      assert.equal(await smartFundUSD.calculateFundValue(), 0)
      // investor get cToken
      assert.equal(await cToken.balanceOf(userOne), toWei(String(1)))
    })


    it('Calculate fund value and withdraw with Compound assests', async function() {
      // send some ETH to exchnage portal
      await exchangePortal.pay({ from: userOne, value: toWei(String(2))})

      // deposit in fund
      await DAI.approve(smartFundUSD.address, toWei(String(4)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(4)), { from: userOne })


      // get 1 DAI from exchange portal
      await smartFundUSD.trade(
        DAI.address,
        toWei(String(2)),
        ETH_TOKEN_ADDRESS,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )
      // mint 1 cEth
      await smartFundUSD.compoundMint(toWei(String(1)), cEther.address)

      // mint 1 DAI Ctoken
      await smartFundUSD.compoundMint(toWei(String(1)), cToken.address)

      // check asset allocation in fund
      assert.equal(await cEther.balanceOf(smartFundUSD.address), toWei(String(1)))
      assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(1)))
      assert.equal(await cToken.balanceOf(smartFundUSD.address), toWei(String(1)))
      assert.equal(await web3.eth.getBalance(smartFundUSD.address), toWei(String(1)))

      // Assume all assets have a 1 to 1 ratio
      // so in total should be still 4 ETH
      assert.equal(await smartFundUSD.calculateFundValue(), toWei(String(4)))

      const ownerETHBalanceBefore = await web3.eth.getBalance(userOne)
      const ownerDAIBalanceBefore = await DAI.balanceOf(userOne)

      // withdarw
      await smartFundUSD.withdraw(0)

      // check asset allocation in fund after withdraw
      assert.equal(await cEther.balanceOf(smartFundUSD.address), 0)
      assert.equal(await DAI.balanceOf(smartFundUSD.address), 0)
      assert.equal(await cToken.balanceOf(smartFundUSD.address), 0)
      assert.equal(await web3.eth.getBalance(smartFundUSD.address), 0)

      // check fund value
      assert.equal(await smartFundUSD.calculateFundValue(), 0)

      // owner should get CTokens and DAI
      assert.equal(await cEther.balanceOf(userOne), toWei(String(1)))
      assert.equal(await cToken.balanceOf(userOne), toWei(String(1)))

      // owner get DAI and ETH
      assert.isTrue(await DAI.balanceOf(userOne) > ownerDAIBalanceBefore)
      assert.isTrue(await web3.eth.getBalance(userOne) > ownerETHBalanceBefore)
    })

    it('manager can not redeemUnderlying not correct percent', async function() {
      // deposit in fund
      await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(1)), { from: userOne })
      // mint
      await smartFundUSD.compoundMint(toWei(String(1)), cToken.address)

      // reedem with 101%
      await smartFundUSD.compoundRedeemByPercent(101, cToken.address)
      .should.be.rejectedWith(EVMRevert)

      // reedem with 0%
      await smartFundUSD.compoundRedeemByPercent(0, cToken.address)
      .should.be.rejectedWith(EVMRevert)

      // reedem with 100%
      await smartFundUSD.compoundRedeemByPercent(100, cToken.address)
      .should.be.fulfilled
    })


    it('manager can redeemUnderlying different percent', async function() {
      // deposit in fund
      await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(1)), { from: userOne })

      // mint
      await smartFundUSD.compoundMint(toWei(String(1)), cToken.address)

      // reedem with 50%
      await smartFundUSD.compoundRedeemByPercent(50, cToken.address)
      .should.be.fulfilled
      assert.equal(await cToken.balanceOf(smartFundUSD.address), toWei(String(0.5)))

      // reedem with 25%
      await smartFundUSD.compoundRedeemByPercent(25, cToken.address)
      .should.be.fulfilled
      assert.equal(await cToken.balanceOf(smartFundUSD.address), toWei(String(0.375)))

      // reedem with all remains
      await smartFundUSD.compoundRedeemByPercent(100, cToken.address)
      .should.be.fulfilled
      assert.equal(await cToken.balanceOf(smartFundUSD.address), toWei(String(0)))
    })
  })

  describe('UNISWAP and BANCOR pools', function() {
    it('should be able buy/sell Bancor pool', async function() {
      // send some assets to pool portal
      await BNT.transfer(exchangePortal.address, toWei(String(1)))

      await DAI.approve(smartFundUSD.address, toWei(String(2)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(2)), { from: userOne })

      // get 1 BNT from exchange portal
      await smartFundUSD.trade(
        DAI.address,
        toWei(String(1)),
        BNT.address,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      // Check balance before buy pool
      assert.equal(await BNT.balanceOf(smartFundUSD.address), toWei(String(1)))
      assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(1)))
      assert.equal(await DAIBNT.balanceOf(smartFundUSD.address), 0)

      // buy BNT pool
      await smartFundUSD.buyPool(toWei(String(2)), 0, DAIBNT.address)

      // Check balance after buy pool
      assert.equal(await BNT.balanceOf(smartFundUSD.address), 0)
      assert.equal(await DAI.balanceOf(smartFundUSD.address), 0)
      assert.equal(await DAIBNT.balanceOf(smartFundUSD.address), toWei(String(2)))

      // sell pool
      await smartFundUSD.sellPool(toWei(String(2)), 0, DAIBNT.address)

      // Check balance after sell pool
      assert.equal(await BNT.balanceOf(smartFundUSD.address), toWei(String(1)))
      assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(1)))
      assert.equal(await DAIBNT.balanceOf(smartFundUSD.address), 0)

    })

    it('should be able buy/sell Uniswap pool', async function() {
      // Send some ETH to portal
      await exchangePortal.pay({ from: userTwo, value: toWei(String(1)) })

      await DAI.approve(smartFundUSD.address, toWei(String(2)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(2)), { from: userOne })

      // get 1 ETH from exchange portal
      await smartFundUSD.trade(
        DAI.address,
        toWei(String(1)),
        ETH_TOKEN_ADDRESS,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      // Check balance before buy pool
      assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(1)))
      assert.equal(await DAIUNI.balanceOf(smartFundUSD.address), 0)

      // Buy UNI Pool
      await smartFundUSD.buyPool(toWei(String(1)), 1, DAIUNI.address)

      // Check balance after buy pool
      assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(0)))
      assert.equal(await DAIUNI.balanceOf(smartFundUSD.address), toWei(String(2)))
      const fundETHBalanceAfterBuy = await web3.eth.getBalance(smartFundUSD.address)

      // Sell UNI Pool
      await smartFundUSD.sellPool(toWei(String(2)), 1, DAIUNI.address)

      // Check balance after buy pool
      const fundETHBalanceAfterSell = await web3.eth.getBalance(smartFundUSD.address)
      assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(1)))
      assert.equal(await DAIUNI.balanceOf(smartFundUSD.address), toWei(String(0)))

      assert.isTrue(fundETHBalanceAfterSell > fundETHBalanceAfterBuy)
    })

    it('Take into account UNI and BNT pools in fund value', async function() {
      // send some assets to pool portal
      await BNT.transfer(exchangePortal.address, toWei(String(1)))
      await exchangePortal.pay({ from: userTwo, value: toWei(String(1)) })

      await DAI.approve(smartFundUSD.address, toWei(String(4)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(4)), { from: userOne })

      // get 1 ETH from exchange portal
      await smartFundUSD.trade(
        DAI.address,
        toWei(String(1)),
        ETH_TOKEN_ADDRESS,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      // get 1 BNT from exchange portal
      await smartFundUSD.trade(
        DAI.address,
        toWei(String(1)),
        BNT.address,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      // Buy UNI Pool
      await smartFundUSD.buyPool(toWei(String(1)), 1, DAIUNI.address)
      // Buy BNT Pool
      await smartFundUSD.buyPool(toWei(String(2)), 0, DAIBNT.address)

      // Fund get UNI and BNT Pools
      assert.equal(await DAIBNT.balanceOf(smartFundUSD.address), toWei(String(2)))
      assert.equal(await DAIUNI.balanceOf(smartFundUSD.address), toWei(String(2)))

      // Assume that asset prices have not changed, and therefore the value of the fund
      // should be the same as with the first deposit
      assert.equal(await smartFundUSD.calculateFundValue(), toWei(String(4)))
    })

    it('Investor can withdraw UNI and BNT pools', async function() {
      // send some assets to pool portal
      await BNT.transfer(exchangePortal.address, toWei(String(1)))
      await exchangePortal.pay({ from: userTwo, value: toWei(String(1)) })

      await DAI.approve(smartFundUSD.address, toWei(String(4)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(4)), { from: userOne })

      // get 1 ETH from exchange portal
      await smartFundUSD.trade(
        DAI.address,
        toWei(String(1)),
        ETH_TOKEN_ADDRESS,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      // get 1 BNT from exchange portal
      await smartFundUSD.trade(
        DAI.address,
        toWei(String(1)),
        BNT.address,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      // Buy UNI Pool
      await smartFundUSD.buyPool(toWei(String(1)), 1, DAIUNI.address)
      // Buy BNT Pool
      await smartFundUSD.buyPool(toWei(String(2)), 0, DAIBNT.address)

      await smartFundUSD.withdraw(0)

      // investor get his BNT and UNI pools
      assert.equal(await DAIBNT.balanceOf(userOne), toWei(String(2)))
      assert.equal(await DAIUNI.balanceOf(userOne), toWei(String(2)))
    })
  })

  describe('Platform cut', function() {
    it('Platform can get 10% from ETH profit', async function() {
      // deploy smartFund with 10% success fee and platform fee
      await deployContracts(1000, 1000)
      // give exchange portal contract some money
      await exchangePortal.pay({ from: userOne, value: toWei(String(3))})

      // deposit in fund
      await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(1)), { from: userOne })

      assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(1)))

      // 1 DAI now 2 ETH
      await exchangePortal.setRatio(1, 2)

      await smartFundUSD.trade(
        DAI.address,
        toWei(String(1)),
        ETH_TOKEN_ADDRESS,
        0,
        [],
        "0x",
        {
          from: userOne
        }
      )

      // 1 DAI now 1 ETH
      await exchangePortal.setRatio(1, 1)

      assert.equal(await web3.eth.getBalance(smartFundUSD.address), toWei(String(2)))
      assert.equal(await smartFundUSD.calculateFundValue(), toWei(String(2)))

      const totalWeiDeposited = await smartFundUSD.totalWeiDeposited()
      assert.equal(fromWei(totalWeiDeposited), 1)

      // user1 now withdraws 190 ether, 90 of which are profit
      await smartFundUSD.withdraw(0, { from: userOne })

      const totalWeiWithdrawn = await smartFundUSD.totalWeiWithdrawn()
      assert.equal(fromWei(totalWeiWithdrawn), 1.9)

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

      // Platform get 10%
      assert.equal(fromWei(await web3.eth.getBalance(COT_DAO_WALLET.address)), 0.01)

      // Fund transfer all balance
      assert.equal(fromWei(await web3.eth.getBalance(smartFundUSD.address)), 0)
    })

    it('Platform can get 10% from ERC profit', async function() {
      // deploy smartFund with 10% success fee and platform fee
      await deployContracts(1000, 1000)
      // give exchange portal contract some money
      await xxxERC.transfer(exchangePortal.address, toWei(String(50)))
      await exchangePortal.pay({ from: userOne, value: toWei(String(3))})

      // deposit in fund
      await DAI.approve(smartFundUSD.address, toWei(String(1)), { from: userOne })
      await smartFundUSD.deposit(toWei(String(1)), { from: userOne })

      assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(1)))

      // 1 token is now cost 1 DAI
      await exchangePortal.setRatio(1, 1)

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

      assert.equal(await DAI.balanceOf(smartFundUSD.address), 0)

      assert.equal(await smartFundUSD.calculateFundValue(), toWei(String(1)))

      // 1 token is now worth 2 DAI
      await exchangePortal.setRatio(1, 2)

      assert.equal(await smartFundUSD.calculateFundValue(), toWei(String(2)))

      assert.equal(await DAI.balanceOf(smartFundUSD.address), toWei(String(0)))
      assert.equal(await xxxERC.balanceOf(smartFundUSD.address), toWei(String(1)))

      const totalWeiDeposited = await smartFundUSD.totalWeiDeposited()
      assert.equal(fromWei(totalWeiDeposited), 1)

      // user1 now withdraws 190 ether, 90 of which are profit
      await smartFundUSD.withdraw(0, { from: userOne })

      const totalWeiWithdrawn = await smartFundUSD.totalWeiWithdrawn()
      assert.equal(fromWei(totalWeiWithdrawn), 1.9)

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

      // Platform get 10%
      // 0.005 xxx = 0.01 ETH
      assert.equal(fromWei(await xxxERC.balanceOf(COT_DAO_WALLET.address)), 0.005)

      // Fund transfer all balance
      assert.equal(fromWei(await xxxERC.balanceOf(smartFundUSD.address)), 0)
    })
  })

  describe('ERC20 implementation', function() {
    it('should be able to transfer shares to another user', async function() {
      // send some DAI to user two
      DAI.transfer(userTwo, 100)

      await DAI.approve(smartFundUSD.address, 100, { from: userTwo })
      await smartFundUSD.deposit(100, { from: userTwo })

      assert.equal(await smartFundUSD.balanceOf(userTwo), toWei(String(1)))

      await smartFundUSD.transfer(userThree, toWei(String(1)), { from: userTwo })
      assert.equal(await smartFundUSD.balanceOf(userThree), toWei(String(1)))
      assert.equal(await smartFundUSD.balanceOf(userTwo), 0)
    })

    it('should allow a user to withdraw their shares that were transfered to them', async function() {
      // send some DAI to user two
      DAI.transfer(userTwo, 1000)
      await DAI.approve(smartFundUSD.address, 100, { from: userTwo })
      await smartFundUSD.deposit(100, { from: userTwo })
      await smartFundUSD.transfer(userThree, toWei(String(1)), { from: userTwo })
      assert.equal(await smartFundUSD.balanceOf(userThree), toWei(String(1)))
      await smartFundUSD.withdraw(0, { from: userThree })
      assert.equal(await smartFundUSD.balanceOf(userThree), 0)
    })
  })

  describe('Whitelist Investors', function() {
    it('should not allow anyone to deposit when whitelist is empty and set', async function() {
      // send some DAI to user two
      DAI.transfer(userTwo, 1000)

      await smartFundUSD.setWhitelistOnly(true)
      await DAI.approve(smartFundUSD.address, 100, { from: userOne })
      await smartFundUSD.deposit(100, { from: userOne }).should.be.rejectedWith(EVMRevert)
      await DAI.approve(smartFundUSD.address, 100, { from: userTwo })
      await smartFundUSD.deposit(100, { from: userTwo }).should.be.rejectedWith(EVMRevert)
    })


    it('should only allow whitelisted addresses to deposit', async function() {
      // send some DAI to user two
      DAI.transfer(userTwo, 1000)

      await smartFundUSD.setWhitelistOnly(true)
      await smartFundUSD.setWhitelistAddress(userOne, true)

      await DAI.approve(smartFundUSD.address, 100, { from: userOne })
      await smartFundUSD.deposit(100, { from: userOne })

      await DAI.approve(smartFundUSD.address, 100, { from: userTwo })
      await smartFundUSD.deposit(100, { from: userTwo }).should.be.rejectedWith(EVMRevert)

      await smartFundUSD.setWhitelistAddress(userTwo, true)

      await DAI.approve(smartFundUSD.address, 100, { from: userTwo })
      await smartFundUSD.deposit(100, { from: userTwo })

      assert.equal(await smartFundUSD.addressToShares.call(userOne), toWei(String(1)))
      assert.equal(await smartFundUSD.addressToShares.call(userTwo), toWei(String(1)))

      await smartFundUSD.setWhitelistAddress(userOne, false)

      await DAI.approve(smartFundUSD.address, 100, { from: userOne })
      await smartFundUSD.deposit(100, { from: userOne }).should.be.rejectedWith(EVMRevert)

      await smartFundUSD.setWhitelistOnly(false)

      await DAI.approve(smartFundUSD.address, 100, { from: userOne })
      await smartFundUSD.deposit(100, { from: userOne })

      assert.equal(await smartFundUSD.addressToShares.call(userOne), toWei(String(2)))
    })
  })
  // END
})
