pragma solidity ^0.4.18;

import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";

contract Token is StandardToken, DetailedERC20 {
  constructor(string _name, string _symbol, uint8 _decimals, uint256 _totalSupply)
    DetailedERC20(_name, _symbol, _decimals)
    public
  {
    // Initialize totalSupply
    totalSupply_ = _totalSupply;
    // Initialize Holder
    balances[msg.sender] = _totalSupply;
  }
}
