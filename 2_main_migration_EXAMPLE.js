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

const PARASWAP_NETWORK_ADDRESS = ""
const PARASWAP_PRICE_ADDRESS = ""
const BANCOR_REGISTRY = ""
const BANCOR_ETH_WRAPPER = ""
const PRICE_FEED_ADDRESS = ""
const PLATFORM_FEE = 1000
const STABLE_COIN_ADDRESS = ""



module.exports = (deployer, network, accounts) => {
  deployer
    .then(() => deployer.deploy(ParaswapParams))

    .then(() => deployer.deploy(GetBancorAddressFromRegistry, BANCOR_REGISTRY))

    .then(() => deployer.deploy(GetRatioForBancorAssets, GetBancorAddressFromRegistry.address))

    .then(() => deployer.deploy(PoolPortal,
      GetBancorAddressFromRegistry.address,
      GetRatioForBancorAssets.address,
      BANCOR_ETH_WRAPPER
    ))

    .then(() => deployer.deploy(PermittedPools, PoolPortal.address))

    .then(() => deployer.deploy(ExchangePortal,
      PARASWAP_NETWORK_ADDRESS,
      PRICE_FEED_ADDRESS,
      ParaswapParams.address,
      GetBancorAddressFromRegistry.address,
      BANCOR_ETH_WRAPPER,
      GetRatioForBancorAssets.address
    ))
    .then(() => deployer.deploy(PermittedExchanges, ExchangePortal.address))

    .then(() => deployer.deploy(SmartFundETHFactory))

    .then(() => deployer.deploy(SmartFundETHFactory))

    .then(() => deployer.deploy(PermittedStabels, STABLE_COIN_ADDRESS))

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
      SmartFundUSDFactory.address
    ))
}
