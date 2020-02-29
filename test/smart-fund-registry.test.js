/* globals describe, it, artifacts, contract, before, beforeEach, after, assert */

// Activate verbose mode by setting env var `export DEBUG=cot`
require('babel-polyfill')
const debug = require('debug')('cot')
// const BN = require('bignumber.js')
const util = require('./util.js')
const SmartFundRegistry = artifacts.require('./SmartFundRegistry.sol')

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('SmartFundRegistry', function(accounts) {
  // This only runs once across all test suites
  before(() => util.measureGas(accounts))
  after(() => util.measureGas(accounts))
  // if (util.isNotFocusTest('core')) return
  const eq = assert.equal.bind(assert)
  const user1 = accounts[0]
  // const user2 = accounts[1]
  // const user3 = accounts[2]
  // const user4 = accounts[3]
  // const user5 = accounts[4]
  // const user6 = accounts[5]
  // const user7 = accounts[6]
  // const recoveryAddresses = [user2, user3, user4, user5, user6]

  let smartFundRegistry
  const logEvents = []
  const pastEvents = []

  async function deployContract() {
    debug('deploying contract')

    smartFundRegistry = await SmartFundRegistry.new(
      0,
      NULL_ADDRESS,
      NULL_ADDRESS
    )

    const eventsWatch = smartFundRegistry.allEvents()
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

  describe('Initial State', function() {
    beforeEach(deployContract)

    // TODO check addresses set correctly too
    it('should have no funds at the start', async function() {
      eq(await smartFundRegistry.totalSmartFunds(), 0)
      const addresses = await smartFundRegistry.getAllSmartFundAddresses()
      eq(addresses.length, 0)
    })
  })

  describe('Create Smart Fund', function() {
    beforeEach(deployContract)

    it('should create a smart fund', async function() {
      await smartFundRegistry.createSmartFund('My First Fund', 1500, {
        from: user1,
      })

      eq(await smartFundRegistry.totalSmartFunds(), 1)
      const addresses = await smartFundRegistry.getAllSmartFundAddresses()
      eq(addresses.length, 1)
    })

    // it('should create multiple smart funds', async function() {
    //   await smartFundRegistry.createSmartFund('Fund 1', {
    //     from: user1,
    //   })
    //   await smartFundRegistry.createSmartFund('Fund 2', {
    //     from: user1,
    //   })

    //   eq(await smartFundRegistry.totalSmartFunds(), 2)
    //   const addresses = await smartFundRegistry.getAllSmartFundAddresses()
    //   eq(addresses.length, 2)

    //   // const cot = await smartFundRegistry.getSmartFund(0)
    //   // const bat = await smartFundRegistry.getSmartFund(1)

    //   // eq(cot[1].toNumber(), 18)
    //   // eq(bat[1].toNumber(), 17)
    // })
  })

  // describe('Recoverable', function() {
  //   beforeEach(deployContract)

  //   it('should be able to set the recovery addresses only once', async function() {
  //     await smartFundRegistry.initializeRecoveryAddresses(recoveryAddresses)
  //     await util.expectThrow(
  //       smartFundRegistry.initializeRecoveryAddresses(recoveryAddresses)
  //     )
  //   })

  //   it('should be able to transfer ownership only if 2 or more approve', async function() {
  //     await smartFundRegistry.initializeRecoveryAddresses(recoveryAddresses)
  //     await smartFundRegistry.approveNewOwner(user7, { from: user2 })
  //     await util.expectThrow(
  //       smartFundRegistry.claimOwnership(0, 1, { from: user7 })
  //     )
  //     await smartFundRegistry.approveNewOwner(user7, { from: user3 })
  //     await smartFundRegistry.claimOwnership(0, 1, { from: user7 })
  //     eq(await smartFundRegistry.owner.call(), user7)
  //   })

  //   it('should be able to replace a recovery address only if 3+ approve', async function() {
  //     await smartFundRegistry.initializeRecoveryAddresses(recoveryAddresses)
  //     await smartFundRegistry.approveNewRecoveryAddress(user7, { from: user2 })
  //     await smartFundRegistry.approveNewRecoveryAddress(user7, { from: user3 })
  //     await util.expectThrow(
  //       smartFundRegistry.claimRecoveryAddress(0, 1, 2, 3, { from: user7 })
  //     )
  //     await smartFundRegistry.approveNewRecoveryAddress(user7, { from: user4 })
  //     await util.expectThrow(
  //       smartFundRegistry.claimRecoveryAddress(0, 1, 2, 5, { from: user7 })
  //     )
  //     await smartFundRegistry.claimRecoveryAddress(0, 1, 2, 3, { from: user7 })
  //     await util.expectThrow(
  //       smartFundRegistry.claimRecoveryAddress(0, 1, 2, 4, { from: user7 })
  //     )
  //     eq((await smartFundRegistry.getRecoveryAddresses.call())[3], user7)
  //   })
  // })
})
