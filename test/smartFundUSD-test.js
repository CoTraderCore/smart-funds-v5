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

const SmartFundUSD = artifacts.require('./core/funds/SmartFundUSD.sol')
const Token = artifacts.require('./tokens/Token')
const ExchangePortalMock = artifacts.require('./portalsMock/ExchangePortalMock')


contract('SmartFundUSD', function([userOne, userTwo, userThree]) {
  beforeEach(async function() {
    this.ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
    this.exchangePortal = await ExchangePortal.new(1, 1)

    this.smartFundUSD = await SmartFundUSD.new(
      '0x0000000000000000000000000000000000000000', //address _owner,
      'TEST USD FUND',                              // string _name,
      20,                                           // uint256 _successFee,
      1000,                                         // uint256 _platformFee,
      '0x0000000000000000000000000000000000000000', // address _platformAddress,
      this.exchangePortal,                          // address _exchangePortalAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedExchangesAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedPoolsAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedStabels
      '0x0000000000000000000000000000000000000000', // address _poolPortalAddress,
      '0x0000000000000000000000000000000000000000', // address_stableCoinAddress
      '0x0000000000000000000000000000000000000000'  // address _cEther
    )
  })

  describe('INIT USD SmartFund', function() {
    it('Correct init usd smart fund', async function() {
      const name = await this.smartFundUSD.name()
      const totalShares = await this.smartFundUSD.totalShares()
      assert.equal('TEST USD FUND', name)
      assert.equal(0, totalShares)
    })
  })
})
