pragma solidity ^0.4.18;

import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract Token is StandardToken {
  string public constant NAME = "Token";
  string public constant SYMBOL = "TKN";
  uint8 public constant decimals = 18;

  // uint256 public constant TOTAL_SUPPLY = 10000 * (10 ** uint256(DECIMALS));
  uint256 public constant TOTAL_SUPPLY = 1000000;

  function Token() public {
    totalSupply_ = TOTAL_SUPPLY;
    balances[msg.sender] = TOTAL_SUPPLY;
  }
}
