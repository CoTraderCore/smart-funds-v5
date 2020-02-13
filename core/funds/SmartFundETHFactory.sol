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
    bool    _isBorrowAbble
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
      _isBorrowAbble
    );

    return address(smartFundETH);
  }
}
