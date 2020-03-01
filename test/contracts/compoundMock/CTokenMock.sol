pragma solidity ^0.4.24;

import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract CTokenMock is StandardToken, DetailedERC20 {
  constructor(string _name, string _symbol, uint8 _decimals, uint256 _totalSupply)
    DetailedERC20(_name, _symbol, _decimals)
    public
  {
    // Initialize totalSupply
    totalSupply_ = _totalSupply;
    // Initialize Holder
    balances[address(this)] = _totalSupply;
  }

  function mint(uint mintAmount) external {
    require(ERC20(address(this)).transferFrom(msg.sender, address(this), mintAmount));
    // transfer cToken
    // for mock 1 cToken = 1 erc token
    ERC20(address(this)).transfer(msg.sender, mintAmount);
  }
  function redeem(uint redeemTokens) external returns (uint){
    require(ERC20(address(this)).transferFrom(msg.sender, address(this), redeemTokens));
    msg.sender.transfer(redeemTokens);
  }
  function redeemUnderlying(uint redeemAmount) external returns (uint){
    require(ERC20(address(this)).transferFrom(msg.sender, address(this), redeemTokens));
    msg.sender.transfer(redeemAmount);
  }
}
