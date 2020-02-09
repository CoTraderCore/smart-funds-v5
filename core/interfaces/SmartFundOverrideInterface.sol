// DAI and ETH have different implements of this methods but we require implement this method
contract SmartFundOverrideInterface {
  function calculateFundValue() public view returns (uint256);
  function getTokenValue(ERC20 _token) public view returns (uint256);
}
