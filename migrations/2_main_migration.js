/* globals artifacts */
const ParaswapParams = artifacts.require('./paraswap/ParaswapParams.sol')
const GetBancorAddressFromRegistry = artifacts.require('./bancor/GetBancorAddressFromRegistry.sol')
const GetRatioForBancorAssets = artifacts.require('./bancor/GetRatioForBancorAssets.sol')

const ExchangePortal = artifacts.require('./core/portals/ExchangePortal.sol')
const PoolPortal = artifacts.require('./core/portals/PoolPortal.sol')

const PermittedExchanges = artifacts.require('./core/verification/PermittedExchanges.sol')
const PermittedStabels = artifacts.require('./core/verification/PermittedStabels.sol')
const PermittedPools = artifacts.require('./core/verification/PermittedPools.sol')

const SmartFundETHFactory = artifacts.require('./core/SmartFundETHFactory.sol')
const SmartFundUSDFactory = artifacts.require('./core/SmartFundUSDFactory.sol')

const SmartFundRegistry = artifacts.require('./core/SmartFundRegistry.sol')

const PARASWAP_NETWORK_ADDRESS = "0xF92C1ad75005E6436B4EE84e88cB23Ed8A290988"
const PARASWAP_PRICE_ADDRESS = "0xC6A3eC2E62A932B94Bac51B6B9511A4cB623e2E5"
const BANCOR_REGISTRY = "0x178c68aefdcae5c9818e43addf6a2b66df534ed5"
const BANCOR_ETH_WRAPPER = "0xc0829421C1d260BD3cB3E0F06cfE2D52db2cE315"
const PLATFORM_FEE = 1000
const STABLE_COIN_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const UNISWAP_FACTORY = "0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95"
const COMPOUND_CETHER = "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5"



module.exports = (deployer, network, accounts) => {
  deployer
    .then(() => deployer.deploy(ParaswapParams))

    .then(() => deployer.deploy(GetBancorAddressFromRegistry, BANCOR_REGISTRY))

    .then(() => deployer.deploy(GetRatioForBancorAssets, GetBancorAddressFromRegistry.address))

    .then(() => deployer.deploy(PoolPortal,
      GetBancorAddressFromRegistry.address,
      GetRatioForBancorAssets.address,
      BANCOR_ETH_WRAPPER,
      UNISWAP_FACTORY
    ))

    .then(() => deployer.deploy(PermittedPools, PoolPortal.address))

    .then(() => deployer.deploy(PermittedStabels, STABLE_COIN_ADDRESS))

    .then(() => deployer.deploy(ExchangePortal,
      PARASWAP_NETWORK_ADDRESS,
      PARASWAP_PRICE_ADDRESS,
      ParaswapParams.address,
      GetBancorAddressFromRegistry.address,
      BANCOR_ETH_WRAPPER,
      PermittedStabels.address,
      PoolPortal.address
    ))
    .then(() => deployer.deploy(PermittedExchanges, ExchangePortal.address))

    .then(() => deployer.deploy(SmartFundETHFactory))

    .then(() => deployer.deploy(SmartFundETHFactory))

    .then(() => deployer.deploy(
      SmartFundRegistry,
      PLATFORM_FEE,
      PermittedExchanges.address,
      ExchangePortal.address,
      PermittedPools.address,
      PoolPortal.address,
      PermittedStabels.address,
      STABLE_COIN_ADDRESS,
      SmartFundETHFactory.address,
      SmartFundUSDFactory.address,
      COMPOUND_CETHER
    ))
}
