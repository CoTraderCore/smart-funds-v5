contract SmartFundETHFactoryInterface {
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
    address _cEther
    )
  public
  returns(address);
}
