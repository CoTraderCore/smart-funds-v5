/* globals describe, it, artifacts, contract, before, beforeEach, after, assert, web3 */

// Activate verbose mode by setting env var `export DEBUG=cot`
require('babel-polyfill')
const debug = require('debug')('cot')
const util = require('./util.js')
// const { DECIMALS } = util
const ExchangePortal = artifacts.require('./ExchangePortal.sol')
const KyberNetworkMock = artifacts.require('./KyberNetworkMock.sol')
const Token = artifacts.require('./tokens/Token.sol')

const ETH_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

contract('ExchangePortal', function(accounts) {
  // This only runs once across all test suites
  before(() => util.measureGas(accounts))
  after(() => util.measureGas(accounts))
  // if (util.isNotFocusTest('core')) return
  const eq = assert.equal.bind(assert)
  const user1 = accounts[0]
  let exchangePortal, kyber, token1, token2
  const logEvents = []
  const pastEvents = []

  async function deployContract() {
    debug('deploying contract')

    token1 = await Token.new()
    token2 = await Token.new()

    debug('deployed tokens')

    kyber = await KyberNetworkMock.new()
    debug('deployed kyber')

    debug('deployed dexs')

    exchangePortal = await ExchangePortal.new(kyber.address)

    debug('deployed exchange portal')

    // give exchange portal unlimited allowance for tests
    token1.approve(exchangePortal.address, Math.pow(10, 27))
    debug('gave exchange portal token1 allowance')

    token2.approve(exchangePortal.address, Math.pow(10, 27))
    debug('gave exchange portal token2 allowance')

    const kyberTokenAmount = 100000

    await token1.transfer(kyber.address, kyberTokenAmount)
    eq(await token1.balanceOf(kyber.address), kyberTokenAmount)
    debug('transfered token 1 to kyber')

    await token2.transfer(kyber.address, kyberTokenAmount)
    eq(await token2.balanceOf(kyber.address), kyberTokenAmount)
    debug('transfered token 2 to kyber')

    const eventsWatch = exchangePortal.allEvents()
    eventsWatch.watch((err, res) => {
      if (err) return
      pastEvents.push(res)
      debug('>>', res.event, res.args)
    })
    logEvents.push(eventsWatch)
  }

  after(function() {
    logEvents.forEach(ev => ev.stopWatching())
  })

  describe('Trade', function() {
    beforeEach(deployContract)

    it('should throw error when trading with non-existant exchange', async function() {
      await util.expectThrow(
        exchangePortal.trade(token1.address, 100, token2.address, 5, [0, 0, 0])
      )
    })

    it('should throw error when trading ether and setting different source amount', async function() {
      await util.expectThrow(
        exchangePortal.trade(
          ETH_TOKEN_ADDRESS,
          10,
          token2.address,
          0,
          [0, 0, 0],
          {
            value: 100,
          }
        )
      )
    })

    it('should throw error when trading the same token for the same token', async function() {
      await util.expectThrow(
        exchangePortal.trade(token1.address, 100, token1.address, 0, [0, 0, 0])
      )
    })

    it('should throw error when trading eth for eth', async function() {
      await util.expectThrow(
        exchangePortal.trade(
          ETH_TOKEN_ADDRESS,
          100,
          ETH_TOKEN_ADDRESS,
          0,
          [0, 0, 0],
          {
            value: 100,
          }
        )
      )
    })

    it('should throw error when sending eth when source is erc20', async function() {
      await util.expectThrow(
        exchangePortal.trade(
          token1.address,
          100,
          token2.address,
          0,
          [0, 0, 0],
          {
            value: 100,
          }
        )
      )
    })

    it('should be able to trade erc20 for erc20 using kyber', async function() {
      const initialUserBalance = await token2.balanceOf(user1)

      const { logs } = await exchangePortal.trade(
        token1.address,
        50,
        token2.address,
        0,
        [0, 0, 0]
      )

      assert.equal(logs.length, 1)
      assert.equal(logs[0].event, 'Trade')
      assert.equal(logs[0].args.src, token1.address)
      assert.equal(logs[0].args.srcAmount, 50)
      assert.equal(logs[0].args.dest, token2.address)
      assert.equal(logs[0].args.destReceived, 100)
      assert.equal(logs[0].args.exchangeType, 0)
      // assert(logs[0].args.value.eq(amount));

      const currentUserBalance = await token2.balanceOf(user1)

      eq(currentUserBalance - initialUserBalance, 100)
    })

    it('should be able to trade eth for erc20 using kyber', async function() {
      const initialUserBalance = await token2.balanceOf(user1)

      const { logs } = await exchangePortal.trade(
        ETH_TOKEN_ADDRESS,
        50,
        token2.address,
        0,
        [0, 0, 0],
        {
          value: 50,
        }
      )

      assert.equal(logs.length, 1)
      assert.equal(logs[0].event, 'Trade')
      assert.equal(logs[0].args.src, ETH_TOKEN_ADDRESS)
      assert.equal(logs[0].args.srcAmount, 50)
      assert.equal(logs[0].args.dest, token2.address)
      assert.equal(logs[0].args.exchangeType, 0)

      const currentUserBalance = await token2.balanceOf(user1)
      eq(currentUserBalance - initialUserBalance, 100)
    })

    it('should be able to trade erc20 for eth using kyber', async function() {
      // Sending Ether to kyber in order to facilitate trade
      await kyber.pay({ from: user1, value: 5000000000 })
      eq(await web3.eth.getBalance(kyber.address), 5000000000)
      // Balance of user1 before trading token2 for ether
      const initialUserBalance = await token2.balanceOf(user1)

      const { logs } = await exchangePortal.trade(
        token2.address,
        50,
        ETH_TOKEN_ADDRESS,
        0,
        [0, 0, 0]
      )

      assert.equal(logs.length, 1)
      assert.equal(logs[0].event, 'Trade')
      assert.equal(logs[0].args.src, token2.address)
      assert.equal(logs[0].args.srcAmount, 50)
      assert.equal(logs[0].args.dest, ETH_TOKEN_ADDRESS)
      assert.equal(logs[0].args.exchangeType, 0)

      // console.log(logs[0].args)
      // assert(logs[0].args.value.eq(50))

      const currentUserBalance = await token2.balanceOf(user1)
      eq(initialUserBalance - currentUserBalance, 50)
    })
  })

  describe('Get Value', function() {
    beforeEach(deployContract)

    it('TODO', async function() {})
  })

  describe('Get Total Value', function() {
    beforeEach(deployContract)

    it('TODO', async function() {})
  })
})
