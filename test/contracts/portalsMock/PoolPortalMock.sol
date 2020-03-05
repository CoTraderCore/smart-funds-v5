pragma solidity ^0.4.24;

import "../../../contracts/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract PoolPortalMock {

  using SafeMath for uint256;

  address public DAI;
  address public BNT;
  address public DAIBNTPoolToken;
  address public DAIUNIPoolToken;

  enum PortalType { Bancor, Uniswap }

  // KyberExchange recognizes ETH by this address, airswap recognizes ETH as address(0x0)
  ERC20 constant private ETH_TOKEN_ADDRESS = ERC20(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);
  address constant private NULL_ADDRESS = address(0);

  constructor(
    address _BNT,
    address _DAI,
    address DAIBNTPoolToken,
    address _DAIUNIPoolToken)
    public
  {
    DAI = _DAI;
    BNT = _BNT;
    DAIBNTPoolToken = _BNTPoolToken;
    DAIUNIPoolToken = _UNIPoolToken;
  }

  function buyBancorPool(ERC20 _poolToken, uint256 _amount) private {
     uint256 relayAmount = _amount.div(2);

     require(ERC20(DAI).transferFrom(msg.sender, address(this), relayAmount));
     require(ERC20(DAI).transferFrom(msg.sender, address(this), relayAmount))

     ERC20(DAIBNTPoolToken).transfer(msg.sender, _amount);
  }

  function buyUniswapPool(address _poolToken, uint256 _ethAmount){
    require(ERC20(DAI).transferFrom(msg.sender, address(this), _ethAmount));
    ERC20(DAIUNIPoolToken).transfer(msg.sender, _amount.mul(2));
  }

  function buyPool
  (
    uint256 _amount,
    uint _type,
    ERC20 _poolToken
  )
  external
  payable
  {
    if(_type == uint(PortalType.Bancor)){
      buyBancorPool(_poolToken, _amount);
    }
    else if (_type == uint(PortalType.Uniswap)){
      require(_amount == msg.value, "Not enough ETH");
      buyUniswapPool(_poolToken, _amount);
    }
    else{
      // unknown portal type
      revert();
    }
  }

  function sellPool
  (
    uint256 _amount,
    uint _type,
    ERC20 _poolToken
  )
  external
  payable
  {
    if(_type == uint(PortalType.Bancor)){
      sellPoolViaBancor(_poolToken, _amount);
    }
    else if (_type == uint(PortalType.Uniswap)){
      sellPoolViaUniswap(_poolToken, _amount);
    }
    else{
      // unknown portal type
      revert();
    }
  }

  function sellPoolViaBancor(ERC20 _poolToken, uint256 _amount) private {

  }

  function sellPoolViaUniswap(ERC20 _poolToken, uint256 _amount) private {

  }

  function pay() public payable {}

  function() public payable {}
}
