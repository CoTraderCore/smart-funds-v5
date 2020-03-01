import { BN, fromWei } from 'web3-utils'

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

const SmartFundETHFactory = artifacts.require('./core/funds/SmartFundETHFactory.sol')
const SmartFundUSDFactory = artifacts.require('./core/funds/SmartFundUSDFactory.sol')
const SmartFundRegistry = artifacts.require('./core/SmartFundRegistry.sol')


contract('SmartFundRegistry', function([userOne, userTwo, userThree]) {
  beforeEach(async function() {
    this.ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

    this.smartFundETHFactory = await SmartFundETHFactory.new()
    this.smartFundUSDFactory = await SmartFundUSDFactory.new()


    this.registry = await SmartFundRegistry.new(
      1000, //   PLATFORM_FEE,
      '0x0000000000000000000000000000000000000000', //   PermittedExchanges.address,
      '0x0000000000000000000000000000000000000000', //   ExchangePortal.address,
      '0x0000000000000000000000000000000000000000', //   PermittedPools.address,
      '0x0000000000000000000000000000000000000000', //   PoolPortal.address,
      '0x0000000000000000000000000000000000000000', //   PermittedStabels.address,
      '0x0000000000000000000000000000000000000000', //   STABLE_COIN_ADDRESS,
      this.smartFundETHFactory.address, //   SmartFundETHFactory.address,
      this.smartFundUSDFactory.address, //   SmartFundUSDFactory.address,
      '0x0000000000000000000000000000000000000000', //   COMPOUND_CETHER
    )
  })

  describe('INIT registry', function() {
    it('Correct funds initial amount', async function() {
      const totalFunds = await this.registry.totalSmartFunds()
      assert.equal(0, totalFunds)
    })
  })

  describe('Create funds', function() {
    it('should be able create new ETH and USD funds', async function() {
      await this.registry.createSmartFund("ETH Fund", 20, false)
      let totalFunds = await this.registry.totalSmartFunds()
      assert.equal(1, totalFunds)

      await this.registry.createSmartFund("USD Fund", 20, true)
      totalFunds = await this.registry.totalSmartFunds()
      assert.equal(2, totalFunds)
    })
  })
})
