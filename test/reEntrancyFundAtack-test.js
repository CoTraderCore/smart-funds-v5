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

const ReEntrancyFundAtack = artifacts.require('./ReEntrancyFundAtack')
const SmartFundETH = artifacts.require('./core/funds/SmartFundETH.sol')
const Token = artifacts.require('./tokens/Token')
const ExchangePortalMock = artifacts.require('./portalsMock/ExchangePortalMock')
const PoolPortalMock = artifacts.require('./portalsMock/PoolPortalMock')
const CoTraderDAOWalletMock = artifacts.require('./portalsMock/CoTraderDAOWalletMock')
const CToken = artifacts.require('./compoundMock/CTokenMock')
const CEther = artifacts.require('./compoundMock/CEtherMock')
const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

let xxxERC, DAI, exchangePortal, smartFundETH, cToken, cEther, BNT, DAIUNI, DAIBNT, poolPortal, COT_DAO_WALLET, yyyERC, atackContract

contract('SmartFundETH', function([userOne, userTwo, userThree]) {

  async function deployContracts(successFee=1000, platformFee=0){
    COT_DAO_WALLET = await CoTraderDAOWalletMock.new()

    // Deploy xxx Token
    xxxERC = await Token.new(
      "xxxERC20",
      "xxx",
      18,
      toWei(String(100000000))
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

    // Depoy poolPortal
    poolPortal = await PoolPortalMock.new(BNT.address, DAI.address, DAIBNT.address, DAIUNI.address)

    // Deploy ETH fund
    smartFundETH = await SmartFundETH.new(
      userOne,                                      // address _owner,
      'TEST ETH FUND',                              // string _name,
      successFee,                                   // uint256 _successFee,
      platformFee,                                  // uint256 _platformFee,
      COT_DAO_WALLET.address,                       // address _platformAddress,
      exchangePortal.address,                       // address _exchangePortalAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedExchangesAddress,
      '0x0000000000000000000000000000000000000000', // address _permittedPoolsAddress,
      poolPortal.address,                           // address _poolPortalAddress,
      cEther.address                                // address _cEther
    )

    // Deploy atack contract
    atackContract = await ReEntrancyFundAtack.new(smartFundETH.address)
  }

  beforeEach(async function() {
    await deployContracts()
  })

  describe('ReEntrancy atack', function() {
    it('Users should not be able to do ReEntrancy atack', async function() {
      // atackContract deployed correct
      assert.equal(await atackContract.fundAddress(), smartFundETH.address)

      // Deposit as user
      await smartFundETH.deposit({ from: userOne, value: toWei(String(10)) })
      assert.equal(await web3.eth.getBalance(smartFundETH.address), toWei(String(10)))

      // Deposit as hacker
      await atackContract.pay({ from: userTwo, value: toWei(String(1)) })
      await atackContract.deposit(toWei(String(1)))
      assert.equal(await web3.eth.getBalance(smartFundETH.address), toWei(String(11)))

      // Atack
      await atackContract.startAtack({ from: userTwo }).should.be.rejectedWith(EVMRevert)
      assert.equal(await web3.eth.getBalance(smartFundETH.address), toWei(String(11)))
    })
  })

})
