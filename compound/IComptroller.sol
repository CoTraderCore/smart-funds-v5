pragma solidity ^0.4.24;

contract IComptroller {
  function enterMarkets(address[] cTokens) external returns (uint[] memory);
  function exitMarket(address cToken) external returns (uint);
}
