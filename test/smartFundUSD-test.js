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


contract('SmartFundUSD', function([userOne, userTwo, userThree]) {
  beforeEach(async function() {
    this.ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
    this.exchangePortal = await ExchangePortalMock.new(1, 1)

    // Deploy xxx Token
    this.xxxERC = await Token.new(
      "xxxERC20",
      "xxx",
      18,
      "1000000000000000000000000"
    )

    // Deploy DAI Token
    this.DAI = await Token.new(
      "DAI Stable Coin",
      "DAI",
      18,
      "1000000000000000000000000"
    )

    this.smartFundUSD = await SmartFundUSD.new(
      '0x0000000000000000000000000000000000000000', //address _owner,
      'TEST USD FUND',                              // string _name,
      1000,                                         // uint256 _successFee,
      20,                                           // uint256 _platformFee,
      '0x0000000000000000000000000000000000000000', // address _platformAddress,
      this.exchangePortal.address,                  // address _exchangePortalAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedExchangesAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedPoolsAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedStabels
      '0x0000000000000000000000000000000000000000', // address _poolPortalAddress,
      this.DAI.address,                             // address_stableCoinAddress
      '0x0000000000000000000000000000000000000000'  // address _cEther
    )
  })

  describe('INIT USD SmartFund', function() {
    it('Correct init xxx token', async function() {
      const name = await this.xxxERC.name()
      const totalSupply = await this.xxxERC.totalSupply()
      assert.equal(name, "xxxERC20")
      assert.equal(totalSupply, "1000000000000000000000000")
    })

    it('Correct init DAI token', async function() {
      const name = await this.DAI.name()
      const totalSupply = await this.DAI.totalSupply()

      assert.equal(name, "DAI Stable Coin")
      assert.equal(totalSupply, "1000000000000000000000000")
    })

    it('Correct init usd smart fund', async function() {
      const name = await this.smartFundUSD.name()
      const totalShares = await this.smartFundUSD.totalShares()
      const exchangePortal = await this.smartFundUSD.exchangePortal()
      const stableCoinAddress = await this.smartFundUSD.stableCoinAddress()

      assert.equal(stableCoinAddress, this.DAI.address)
      assert.equal(this.exchangePortal.address, exchangePortal)
      assert.equal('TEST USD FUND', name)
      assert.equal(0, totalShares)
    })
  })

  describe('Deposit', function() {
    it('should not be able to deposit 0 USD', async function() {
      await this.DAI.approve(this.smartFundUSD.address, 100, { from: userOne })
      await this.smartFundUSD.deposit(0, { from: userOne })
      .should.be.rejectedWith(EVMRevert)
    })

    it('should be able to deposit positive amount of USD', async function() {
      await this.DAI.approve(this.smartFundUSD.address, 100, { from: userOne })
      await this.smartFundUSD.deposit(100, { from: userOne })
      assert.equal(await this.smartFundUSD.addressToShares(userOne), toWei(String(1)))
      assert.equal(await this.smartFundUSD.calculateFundValue(), 100)
    })

    it('should accurately calculate empty fund value', async function() {
      // Ether is initial token, USD is second
      assert.equal((await this.smartFundUSD.getAllTokenAddresses()).length, 2)
      assert.equal(await this.smartFundUSD.calculateFundValue(), 0)
    })
  })


  describe('Withdraw', function() {
   it('should be able to withdraw all deposited funds', async function() {
      let totalShares = await this.smartFundUSD.totalShares()
      assert.equal(totalShares, 0)

      await this.DAI.approve(this.smartFundUSD.address, 100, { from: userOne })
      await this.smartFundUSD.deposit(100, { from: userOne })

      assert.equal(await this.DAI.balanceOf(this.smartFundUSD.address), 100)

      totalShares = await this.smartFundUSD.totalShares()
      assert.equal(totalShares, toWei(String(1)))

      await this.smartFundUSD.withdraw(0, { from: userOne })
      assert.equal(await this.DAI.balanceOf(this.smartFundUSD.address), 0)
    })

    it('should be able to withdraw percentage of deposited funds', async function() {
      let totalShares

      totalShares = await this.smartFundUSD.totalShares()
      assert.equal(totalShares, 0)

      await this.DAI.approve(this.smartFundUSD.address, 100, { from: userOne })
      await this.smartFundUSD.deposit(100, { from: userOne })

      totalShares = await this.smartFundUSD.totalShares()

      await this.smartFundUSD.withdraw(5000, { from: userOne }) // 50.00%

      assert.equal(await this.smartFundUSD.totalShares(), totalShares / 2)
    })
    //
    // it('should be able to withdraw deposited funds with multiple users', async function() {
    //   // deposit
    //   await this.smartFundUSD.deposit({ from: userOne, value: 100 })
    //
    //   assert.equal(await this.smartFundUSD.calculateFundValue(), 100)
    //   await this.smartFundUSD.deposit({ from: userTwo, value: 100 })
    //   assert.equal(await this.smartFundUSD.calculateFundValue(), 200)
    //
    //   // withdraw
    //   let sfBalance
    //   sfBalance = await web3.eth.getBalance(this.smartFundUSD.address)
    //   assert.equal(sfBalance, 200)
    //
    //   await this.smartFundUSD.withdraw(0, { from: userOne })
    //   sfBalance = await web3.eth.getBalance(this.smartFundUSD.address)
    //
    //   assert.equal(sfBalance, 100)
    //
    //   await this.smartFundUSD.withdraw(0, { from: userTwo })
    //   sfBalance = await web3.eth.getBalance(this.smartFundUSD.address)
    //   assert.equal(sfBalance, 0)
    // })
  })
  // END
})
