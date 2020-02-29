/* globals describe, it, artifacts, contract, before, beforeEach, after, assert, web3 */

// Activate verbose mode by setting env var `export DEBUG=cot`
require('babel-polyfill')
const debug = require('debug')('cot')
// const BN = require('bignumber.js')
const util = require('./util.js')
const { DECIMALS } = util
const KyberNetwork = artifacts.require('./KyberNetwork.sol')
const TokenOracle = artifacts.require('./TokenOracle.sol')
const COT = artifacts.require('./tokens/COT.sol')
const BAT = artifacts.require('./tokens/BAT.sol')

const ETH_TOKEN_ADDRESS = '0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

contract('KyberNetwork', function(accounts) {
  // This only runs once across all test suites
  before(() => util.measureGas(accounts))
  after(() => util.measureGas(accounts))
  // if (util.isNotFocusTest('core')) return
  const eq = assert.equal.bind(assert)
  const user1 = accounts[0]
  const user2 = accounts[1]
  let kyber, tokenOracle, cot, bat
  const logEvents = []
  const pastEvents = []

  async function deployContract() {
    debug('deploying contract')

    cot = await COT.new(user1)
    bat = await BAT.new()
    tokenOracle = await TokenOracle.new(cot.address)
    kyber = await KyberNetwork.new(tokenOracle.address)

    const eventsWatch = tokenOracle.allEvents()
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

  describe('Inital State', function() {
    beforeEach(deployContract)

    it('should have correct oracle address set', async function() {
      eq(await kyber.tokenOracle(), tokenOracle.address)
    })
  })

  describe('Trade', function() {
    beforeEach(deployContract)

    it('should be able to trade', async function() {
      // set 1 cot to equal 50 bat
      await tokenOracle.setRate(bat.address, 50 * DECIMALS, { from: user1 })

      // transfer bat to kyber so that it can pay out
      await bat.transfer(kyber.address, 50, { from: user1 })

      // transfer money to user2 to invest
      await cot.transfer(user2, 1, { from: user1 })

      // approve kyber to make a trade with user2's funds
      await cot.approve(kyber.address, 1, { from: user2 })

      // trade 1 cot on kyber network
      await kyber.trade(cot.address, 1, bat.address, user2, 0, 0, 0, {
        from: user2,
      })

      eq((await bat.balanceOf(user2)).toNumber(), 50)
      eq((await bat.balanceOf(kyber.address)).toNumber(), 0)
      eq((await cot.balanceOf(user2)).toNumber(), 0)
    })

    it('should be able to trade BAT for Ether', async function() {
      // set 1 cot to equal 10 BAT
      await tokenOracle.setRate(bat.address, 10 * DECIMALS)

      // set 1 cot to equal 10 ether
      await tokenOracle.setRate(ETH_TOKEN_ADDRESS, 10 * DECIMALS)

      // transfer 10 Ether to kyber
      await kyber.pay({ from: user1, value: 10 * DECIMALS })

      // transfer 50 BAT to user2
      await bat.transfer(user2, 10 * DECIMALS)

      await bat.approve(kyber.address, 10 * DECIMALS, { from: user2 })

      // Ether balance of user2 before they trade
      const initialEtherBalance = await web3.eth.getBalance(user2)

      await kyber.trade(
        bat.address,
        10 * DECIMALS,
        ETH_TOKEN_ADDRESS,
        user2,
        0,
        0,
        0,
        {
          from: user2,
        }
      )

      // Ether balance of user2 after trade
      const currentEtherBalance = await web3.eth.getBalance(user2)

      // Tried to take into account gas spent by user2 so that we could use eq, not worth it.
      assert(currentEtherBalance - initialEtherBalance > 9.99 * DECIMALS)
      eq(await bat.balanceOf(user2), 0)
    })

    it('should be able to trade Ether for BAT', async function() {
      // set 1 cot to equal 10 BAT
      await tokenOracle.setRate(bat.address, 10 * DECIMALS)

      // set 1 cot to equal 10 ether
      await tokenOracle.setRate(ETH_TOKEN_ADDRESS, 10 * DECIMALS)

      // send BAT to kyber to facilitate trade
      await bat.transfer(kyber.address, 10 * DECIMALS)

      const initialEtherBalance = await web3.eth.getBalance(user2)

      await kyber.trade(
        ETH_TOKEN_ADDRESS,
        10 * DECIMALS,
        bat.address,
        user2,
        0,
        0,
        0,
        {
          from: user2,
          value: 10 * DECIMALS,
        }
      )

      // Ether balance of user2 after trade
      const currentEtherBalance = await web3.eth.getBalance(user2)

      assert(initialEtherBalance - currentEtherBalance > 10 * DECIMALS)
      eq(await bat.balanceOf(user2), 10 * DECIMALS)
    })
  })
})
