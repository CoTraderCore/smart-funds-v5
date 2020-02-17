contract IComptroller {
  function enterMarkets(address[] cTokens) external returns (uint[] memory);
  function exitMarket(address cToken) external returns (uint);
  function getAccountLiquidity(address account) public view returns (uint, uint, uint);
}
