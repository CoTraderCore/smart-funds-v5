/* globals describe, it, artifacts, contract, before, after, assert */

// Activate verbose mode by setting env var `export DEBUG=cot`
require('babel-polyfill')
// const BN = require('bignumber.js')
const util = require('./util.js')
const COT = artifacts.require('./tokens/COT.sol')

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('SmartFund', function(accounts) {
  // This only runs once across all test suites
  before(() => util.measureGas(accounts))
  after(() => util.measureGas(accounts))
  // if (util.isNotFocusTest('core')) return
  const eq = assert.equal.bind(assert)
  const user1 = accounts[0]
  const user2 = accounts[1]
  let cot

  async function deployContract() {}

  describe('Initial state', function() {
    before(deployContract)

    it('should give all tokens to fund creator if no owner set', async function() {
      cot = await COT.new(NULL_ADDRESS, { from: user1 })
      const creatorBalance = await cot.balanceOf(user1)
      eq(creatorBalance.toNumber(), Math.pow(10, 29))

      cot = await COT.new(user2, { from: user1 })
      const userBalance = await cot.balanceOf(user2)
      eq(userBalance.toNumber(), Math.pow(10, 29))
    })
  })
})
