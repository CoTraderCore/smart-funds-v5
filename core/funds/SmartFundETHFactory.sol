// due eip-170 error we should create 2 factory one for ETH another for USD
pragma solidity ^0.4.24;

import "./SmartFundETH.sol";

contract SmartFundETHFactory {
  function createSmartFund(
    address _owner,
    string  _name,
    uint256 _successFee,
    uint256 _platformFee,
    address _platfromAddress,
    address _exchangePortalAddress,
    address _permittedExchanges,
    address _permittedPools,
    address _poolPortalAddress,
    address _cEther,
    address _Comptroller
    )
  public
  returns(address)
  {
    SmartFundETH smartFundETH = new SmartFundETH(
      _owner,
      _name,
      _successFee,
      _platformFee,
      _platfromAddress,
      _exchangePortalAddress,
      _permittedExchanges,
      _permittedPools,
      _poolPortalAddress,
      _cEther,
      _Comptroller
    );

    return address(smartFundETH);
  }
}
