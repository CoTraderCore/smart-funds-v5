pragma solidity ^0.4.24;

import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract CTokenMock is StandardToken, DetailedERC20 {
  address public underlying;

  constructor(string _name, string _symbol, uint8 _decimals, uint256 _totalSupply, address _underlying)
    DetailedERC20(_name, _symbol, _decimals)
    public
  {
    // Initialize totalSupply
    totalSupply_ = _totalSupply;
    // Initialize Holder
    // This contract is owner of all cTokens
    balances[address(this)] = _totalSupply;

    // Initial ERC underlying
    underlying = _underlying;
  }

  function mint(uint mintAmount) external returns (uint) {
    require(ERC20(underlying).transferFrom(msg.sender, address(this), mintAmount));
    // transfer cToken
    // for mock 1 cToken = 1 erc token
    ERC20(address(this)).transfer(msg.sender, mintAmount);

    return mintAmount;
  }

  function redeem(uint redeemTokens) external returns (uint){
    _burn(msg.sender, redeemTokens);
    ERC20(underlying).transfer(msg.sender, redeemTokens);
  }

  function redeemUnderlying(uint redeemAmount) external returns (uint){
    _burn(msg.sender, redeemAmount);
    ERC20(underlying).transfer(msg.sender, redeemAmount);
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
