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

const SmartFundETH = artifacts.require('./core/funds/SmartFundETH.sol')


contract('SmartFundETH', function([userOne, userTwo, userThree]) {
  beforeEach(async function() {
    this.ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'


    this.smartFundETH = await SmartFundETH.new(
      '0x0000000000000000000000000000000000000000', //address _owner,
      'TEST ETH FUND', // string _name,
      20, // uint256 _successFee,
      1000, // uint256 _platformFee,
      '0x0000000000000000000000000000000000000000', // address _platformAddress,
      '0x0000000000000000000000000000000000000000', // address _exchangePortalAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedExchangesAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedPoolsAddress,
      '0x0000000000000000000000000000000000000000', // address _poolPortalAddress,
      '0x0000000000000000000000000000000000000000' // address _cEther
    )
  })

  describe('INIT ETH SmartFund', function() {
    it('Correct init eth smart fund', async function() {
      const name = await this.smartFundETH.name()
      const totalShares = await this.smartFundETH.totalShares()
      assert.equal('TEST ETH FUND', name)
      assert.equal(0, totalShares)
    })
  })
})
