pragma solidity ^0.4.18;

import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract EOS is StandardToken {
  string public constant NAME = "EOS";
  string public constant SYMBOL = "EOS";
  uint8 public constant DECIMALS = 18;

  // uint256 public constant INITIAL_SUPPLY = 10000 * (10 ** uint256(decimals));
  uint256 public constant INITIAL_SUPPLY = 10000;

  constructor() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
  }
}
