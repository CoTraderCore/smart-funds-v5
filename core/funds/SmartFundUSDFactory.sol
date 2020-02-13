// due eip-170 error we should create 2 factory one for ETH another for USD
pragma solidity ^0.4.24;

import "./SmartFundUSD.sol";

contract SmartFundUSDFactory {
  function createSmartFund(
    address _owner,
    string  _name,
    uint256 _successFee,
    uint256 _platformFee,
    address _platfromAddress,
    address _exchangePortalAddress,
    address _permittedExchanges,
    address _permittedPools,
    address _permittedStabels,
    address _poolPortalAddress,
    address _stableCoinAddress,
    bool    _isBorrowAbble
    )
  public
  returns(address)
  {
    SmartFundUSD smartFundUSD = new SmartFundUSD(
      _owner,
      _name,
      _successFee,
      _platformFee,
      _platfromAddress,
      _exchangePortalAddress,
      _permittedExchanges,
      _permittedPools,
      _permittedStabels,
      _poolPortalAddress,
      _stableCoinAddress,
      _isBorrowAbble
    );

    return address(smartFundUSD);
  }
}
