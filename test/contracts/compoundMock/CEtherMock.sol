pragma solidity ^0.4.24;

import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract CEtherMock is StandardToken, DetailedERC20 {
  constructor(string _name, string _symbol, uint8 _decimals, uint256 _totalSupply)
    DetailedERC20(_name, _symbol, _decimals)
    public
  {
    // Initialize totalSupply
    totalSupply_ = _totalSupply;
    // Initialize Holder
    // This contract is owner of all cEthers
    balances[address(this)] = _totalSupply;
  }

  function mint() external payable {
    require(msg.value > 0);
    // transfer cETHer
    // for mock 1 ETH = 1 cETH
    ERC20(address(this)).transfer(msg.sender, msg.value);
  }
  function redeem(uint redeemTokens) external returns (uint){
    require(ERC20(address(this)).transferFrom(msg.sender, address(this), redeemTokens));
    msg.sender.transfer(redeemTokens);
  }
  function redeemUnderlying(uint redeemAmount) external returns (uint){
    require(ERC20(address(this)).transferFrom(msg.sender, address(this), redeemAmount));
    msg.sender.transfer(redeemAmount);
  }
  function balanceOfUnderlying(address account) external view returns (uint){
    return ERC20(address(this)).balanceOf(account);
  }
}
