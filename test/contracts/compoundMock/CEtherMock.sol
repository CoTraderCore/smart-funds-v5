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
    _burn(msg.sender, redeemTokens);
    msg.sender.transfer(redeemTokens);
  }

  function redeemUnderlying(uint redeemAmount) external returns (uint){
    _burn(msg.sender, redeemAmount);
    msg.sender.transfer(redeemAmount);
  }

  function balanceOfUnderlying(address account) external view returns (uint){
    return ERC20(address(this)).balanceOf(account);
  }

  function _burn(address _who, uint256 _value) private {
    require(_value <= balances[_who]);
    balances[_who] = balances[_who].sub(_value);
    totalSupply_ = totalSupply_.sub(_value);
  }
}
