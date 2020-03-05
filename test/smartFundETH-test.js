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

const SmartFundETH = artifacts.require('./core/funds/SmartFundETH.sol')
const Token = artifacts.require('./tokens/Token')
const ExchangePortalMock = artifacts.require('./portalsMock/ExchangePortalMock')
const CToken = artifacts.require('./compoundMock/CTokenMock')
const CEther = artifacts.require('./compoundMock/CEtherMock')

let ETH_TOKEN_ADDRESS, xxxERC, DAI, exchangePortal, smartFundETH, cToken, cEther

contract('SmartFundETH', function([userOne, userTwo, userThree]) {

  async function deployContracts(successFee=1000, platformFee=0){
    ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

    // Deploy xxx Token
    xxxERC = await Token.new(
      "xxxERC20",
      "xxx",
      18,
      toWei(String(100000000))
    )

    // Deploy DAI Token
    DAI = await Token.new(
      "DAI Stable Coin",
      "DAI",
      18,
      toWei(String(100000000))
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

    // Deploy ETH fund
    smartFundETH = await SmartFundETH.new(
      '0x0000000000000000000000000000000000000000', // address _owner,
      'TEST ETH FUND',                              // string _name,
      successFee,                                   // uint256 _successFee,
      platformFee,                                  // uint256 _platformFee,
      '0x0000000000000000000000000000000000000000', // address _platformAddress,
      exchangePortal.address,                       // address _exchangePortalAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedExchangesAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedPoolsAddress,
      '0x0000000000000000000000000000000000000000', // address _poolPortalAddress,
      cEther.address                                // address _cEther
    )
  }

  beforeEach(async function() {
    await deployContracts()
  })

  describe('INIT assets', function() {
    it('Correct init xxx token', async function() {
      const name = await xxxERC.name()
      const totalSupply = await xxxERC.totalSupply()
      assert.equal(name, "xxxERC20")
      assert.equal(totalSupply, toWei(String(100000000)))
    })

    it('Correct init cToken token', async function() {
      const name = await cToken.name()
      const totalSupply = await cToken.totalSupply()
      const underlying = await cToken.underlying()

      assert.equal(underlying, DAI.address)
      assert.equal(name, "Compound DAI")
      assert.equal(totalSupply, toWei(String(100000000)))
    })

    it('Correct init cEther token', async function() {
      const name = await cEther.name()
      const totalSupply = await cEther.totalSupply()
      assert.equal(name, "Compound Ether")
      assert.equal(totalSupply, toWei(String(100000000)))
    })

    it('Correct init eth smart fund', async function() {
      const name = await smartFundETH.name()
      const totalShares = await smartFundETH.totalShares()
      const portal = await smartFundETH.exchangePortal()
      const cEthAddress = await smartFundETH.cEther()

      assert.equal(exchangePortal.address, portal)
      assert.equal('TEST ETH FUND', name)
      assert.equal(0, totalShares)
      assert.equal(cEthAddress, cEther.address)
    })
  })

  describe('Deposit', function() {
    it('should not be able to deposit 0 Ether', async function() {
      await smartFundETH.deposit({ from: userOne, value: 0 })
      .should.be.rejectedWith(EVMRevert)
    })

    it('should be able to deposit positive amount of Ether', async function() {
      await smartFundETH.deposit({ from: userOne, value: 100 })
      assert.equal(await smartFundETH.addressToShares(userOne), toWei(String(1)))
      assert.equal(await smartFundETH.calculateFundValue(), 100)
    })

    it('should accurately calculate empty fund value', async function() {
      assert.equal((await smartFundETH.getAllTokenAddresses()).length, 1) // Ether is initial token
      assert.equal(await smartFundETH.calculateFundValue(), 0)
    })
  })

  describe('Profit', function() {
    it('Fund manager should be able to withdraw after investor withdraws', async function() {
        // give exchange portal contract some money
        await xxxERC.transfer(exchangePortal.address, toWei(String(50)))
        await exchangePortal.pay({ from: userOne, value: toWei(String(3))})
        // deposit in fund
        await smartFundETH.deposit({ from: userOne, value: toWei(String(1)) })

        assert.equal(await web3.eth.getBalance(smartFundETH.address), toWei(String(1)))

        await smartFundETH.trade(
          ETH_TOKEN_ADDRESS,
          toWei(String(1)),
          xxxERC.address,
          0,
          [],
          "0x",
          {
            from: userOne
          }
        )

        assert.equal(await web3.eth.getBalance(smartFundETH.address), 0)

        // 1 token is now worth 2 ether
        await exchangePortal.setRatio(1, 2)

        assert.equal(await smartFundETH.calculateFundValue(), toWei(String(2)))

        // should receive 200 'ether' (wei)
        await smartFundETH.trade(
          xxxERC.address,
          toWei(String(1)),
          ETH_TOKEN_ADDRESS,
          0,
          [],
          "0x",
          {
            from: userOne,
          }
        )

        assert.equal(await web3.eth.getBalance(smartFundETH.address), toWei(String(2)))

        const totalWeiDeposited = await smartFundETH.totalWeiDeposited()
        assert.equal(fromWei(totalWeiDeposited), 1)

        // user1 now withdraws 190 ether, 90 of which are profit
        await smartFundETH.withdraw(0, { from: userOne })

        const totalWeiWithdrawn = await smartFundETH.totalWeiWithdrawn()
        assert.equal(fromWei(totalWeiWithdrawn), 1.9)

        assert.equal(await smartFundETH.calculateFundValue(), toWei(String(0.1)))

        const {
          fundManagerRemainingCut,
          fundValue,
          fundManagerTotalCut,
        } =
        await smartFundETH.calculateFundManagerCut()

        assert.equal(fundValue, toWei(String(0.1)))
        assert.equal(fundManagerRemainingCut, toWei(String(0.1)))
        assert.equal(fundManagerTotalCut, toWei(String(0.1)))

          // // FM now withdraws their profit
        await smartFundETH.fundManagerWithdraw({ from: userOne })
        // Manager, can get his 10%, and remains 0.0001996 it's  platform commision
        assert.equal(await web3.eth.getBalance(smartFundETH.address), 0)
      })

   it('Should properly calculate profit after another user made profit and withdrew', async function() {
        // give exchange portal contract some money
        await xxxERC.transfer(exchangePortal.address, toWei(String(50)))
        await exchangePortal.pay({ from: userOne, value: toWei(String(5)) })
        // deposit in fund
        await smartFundETH.deposit({ from: userOne, value: toWei(String(1)) })

        assert.equal(await web3.eth.getBalance(smartFundETH.address), toWei(String(1)))

        await smartFundETH.trade(
          ETH_TOKEN_ADDRESS,
          toWei(String(1)),
          xxxERC.address,
          0,
          [],
          "0x",
          {
            from: userOne,
          }
        )

        assert.equal(await web3.eth.getBalance(smartFundETH.address), 0)

        // 1 token is now worth 2 ether
        await exchangePortal.setRatio(1, 2)

        assert.equal(await smartFundETH.calculateFundValue(), toWei(String(2)))

        // should receive 200 'ether' (wei)
        await smartFundETH.trade(
          xxxERC.address,
          toWei(String(1)),
          ETH_TOKEN_ADDRESS,
          0,
          [],
          "0x",
          {
            from: userOne,
          }
        )

        assert.equal(await web3.eth.getBalance(smartFundETH.address), toWei(String(2)))

        // user1 now withdraws 190 ether, 90 of which are profit
        await smartFundETH.withdraw(0, { from: userOne })

        assert.equal(await smartFundETH.calculateFundValue(), toWei(String(0.1)))

        // FM now withdraws their profit
        await smartFundETH.fundManagerWithdraw({ from: userOne })
        assert.equal(await web3.eth.getBalance(smartFundETH.address), 0)

        // now user2 deposits into the fund
        await smartFundETH.deposit({ from: userTwo, value: toWei(String(1)) })

        // 1 token is now worth 1 ether
        await exchangePortal.setRatio(1, 1)

        await smartFundETH.trade(
          ETH_TOKEN_ADDRESS,
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
        await smartFundETH.trade(
          xxxERC.address,
          toWei(String(1)),
          ETH_TOKEN_ADDRESS,
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
        } = await smartFundETH.calculateFundManagerCut()

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
      const totalShares = await smartFundETH.totalShares()
      assert.equal(totalShares, 0)

      await smartFundETH.deposit({ from: userOne, value: 100 })
      assert.equal(await web3.eth.getBalance(smartFundETH.address), 100)
      await smartFundETH.withdraw(0, { from: userOne })
      assert.equal(await web3.eth.getBalance(smartFundETH.address), 0)
    })

    it('should be able to withdraw percentage of deposited funds', async function() {
      let totalShares

      totalShares = await smartFundETH.totalShares()
      assert.equal(totalShares, 0)

      await smartFundETH.deposit({ from: userOne, value: 100 })

      totalShares = await smartFundETH.totalShares()

      await smartFundETH.withdraw(5000, { from: userOne }) // 50.00%

      assert.equal(await smartFundETH.totalShares(), totalShares / 2)
    })

    it('should be able to withdraw deposited funds with multiple users', async function() {
      // deposit
      await smartFundETH.deposit({ from: userOne, value: 100 })

      assert.equal(await smartFundETH.calculateFundValue(), 100)
      await smartFundETH.deposit({ from: userTwo, value: 100 })
      assert.equal(await smartFundETH.calculateFundValue(), 200)

      // withdraw
      let sfBalance
      sfBalance = await web3.eth.getBalance(smartFundETH.address)
      assert.equal(sfBalance, 200)

      await smartFundETH.withdraw(0, { from: userOne })
      sfBalance = await web3.eth.getBalance(smartFundETH.address)

      assert.equal(sfBalance, 100)

      await smartFundETH.withdraw(0, { from: userTwo })
      sfBalance = await web3.eth.getBalance(smartFundETH.address)
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
      } = await smartFundETH.calculateFundManagerCut()

      assert.equal(fundManagerRemainingCut, 0)
      assert.equal(fundValue, 0)
      assert.equal(fundManagerTotalCut, 0)
    })

    const fundManagerTest = async (expectedFundManagerCut = 15, self) => {
      // deposit
      await smartFundETH.deposit({ from: userOne, value: 100 })
      // send xxx to exchange
      await xxxERC.transfer(exchangePortal.address, 200, { from: userOne })

      // Trade 100 ether for 100 xxx
      await smartFundETH.trade(ETH_TOKEN_ADDRESS, 100, xxxERC.address, 0, [], "0x", {
        from: userOne,
      })

      // increase price of xxx. Ratio of 1/2 means 1 eth = 1/2 xxx
      await exchangePortal.setRatio(1, 2)

      // check profit and cuts are corrects
      const {
        fundManagerRemainingCut,
        fundValue,
        fundManagerTotalCut,
      } = await smartFundETH.calculateFundManagerCut()

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

      await smartFundETH.fundManagerWithdraw({ from: userOne })

      const {
        fundManagerRemainingCut,
        fundValue,
        fundManagerTotalCut,
      } = await smartFundETH.calculateFundManagerCut()

      assert.equal(fundValue, 180)
      assert.equal(fundManagerRemainingCut, 0)
      assert.equal(fundManagerTotalCut, 20)
    })
  })


  describe('Fund Manager profit cut with deposit/withdraw scenarios', function() {
    it('should accurately calculate shares when the manager makes a profit', async function() {
      // deploy smartFund with 10% success fee
      await deployContracts(1000, 0)
      const fee = await smartFundETH.successFee()
      assert.equal(fee, 1000)


      // give exchange portal contract some money
      await xxxERC.transfer(exchangePortal.address, toWei(String(10)))

      // deposit in fund
      await smartFundETH.deposit({ from: userOne, value: toWei(String(1)) })

      await smartFundETH.trade(
        ETH_TOKEN_ADDRESS,
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

      await smartFundETH.deposit({ from: userTwo, value: toWei(String(1)) })

      await smartFundETH.trade(
        ETH_TOKEN_ADDRESS,
        toWei(String(1)),
        xxxERC.address,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      await smartFundETH.fundManagerWithdraw()

      await smartFundETH.withdraw(0, { from: userTwo })

      const xxxUserTwo = await xxxERC.balanceOf(userTwo)

      assert.equal(fromWei(xxxUserTwo), 0.5)
    })

    it('should accurately calculate shares when FM makes a loss then breaks even', async function() {
      // deploy smartFund with 10% success fee
      await deployContracts(1000, 0)
      // give exchange portal contract some money
      await xxxERC.transfer(exchangePortal.address, toWei(String(10)))
      await exchangePortal.pay({ from: userThree, value: toWei(String(3))})

      // deposit in fund
      await smartFundETH.deposit({ from: userTwo, value: toWei(String(1)) })

      await smartFundETH.trade(
        ETH_TOKEN_ADDRESS,
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

      // user3 deposits, should have 2/3 of shares now
      await smartFundETH.deposit({ from: userThree, value: toWei(String(1)) })

      assert.equal(await smartFundETH.addressToShares.call(userTwo), toWei(String(1)))
      assert.equal(await smartFundETH.addressToShares.call(userThree), toWei(String(2)))

      // 1 token is now worth 2 ether, funds value is 3 ether
      await exchangePortal.setRatio(1, 2)

      await smartFundETH.trade(
        xxxERC.address,
        toWei(String(1)),
        ETH_TOKEN_ADDRESS,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )

      assert.equal(
        await web3.eth.getBalance(smartFundETH.address),
        toWei(String(3))
      )

      assert.equal(await smartFundETH.calculateAddressProfit(userTwo), 0)
      assert.equal(await smartFundETH.calculateAddressProfit(userThree), toWei(String(1)))
    })
  })

  describe('COMPOUND', function() {
    it('Fund Manager can mint and reedem CEther', async function() {
      assert.equal(await cEther.balanceOf(smartFundETH.address), 0)

      // deposit in fund
      await smartFundETH.deposit({ from: userOne, value: toWei(String(1)) })
      // mint
      await smartFundETH.compoundMint(toWei(String(1)), cEther.address)

      // check balance
      assert.equal(await web3.eth.getBalance(smartFundETH.address), 0)
      assert.equal(await cEther.balanceOf(smartFundETH.address), toWei(String(1)))

      // reedem
      await smartFundETH.compoundRedeemByPercent(100, cEther.address)

      // check balance
      assert.equal(await web3.eth.getBalance(smartFundETH.address), toWei(String(1)))
      assert.equal(await cEther.balanceOf(smartFundETH.address), 0)
    })

    it('Fund Manager can mint and reedem cToken', async function() {
      assert.equal(await cToken.balanceOf(smartFundETH.address), 0)

      // send some DAI to exchnage portal
      DAI.transfer(exchangePortal.address, toWei(String(1)))

      // deposit in fund
      await smartFundETH.deposit({ from: userOne, value: toWei(String(1)) })

      // get DAI from exchange portal
      await smartFundETH.trade(
        ETH_TOKEN_ADDRESS,
        toWei(String(1)),
        DAI.address,
        0,
        [],
        "0x",
        {
          from: userOne,
        }
      )
      // mint DAI Ctoken
      await smartFundETH.compoundMint(toWei(String(1)), cToken.address)

      assert.equal(await cToken.balanceOf(smartFundETH.address), toWei(String(1)))
    })
  })
  //END
})
