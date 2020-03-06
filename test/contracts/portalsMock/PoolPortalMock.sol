// This contract sell/buy UNI and BNT Pool relays for DAI mock token
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
    address _DAIBNTPoolToken,
    address _DAIUNIPoolToken)
    public
  {
    DAI = _DAI;
    BNT = _BNT;
    DAIBNTPoolToken = _DAIBNTPoolToken;
    DAIUNIPoolToken = _DAIUNIPoolToken;
  }


  // for mock 1 Relay BNT = 0.5 BNT and 0.5 ERC
  function buyBancorPool(ERC20 _poolToken, uint256 _amount) private {
     uint256 relayAmount = _amount.div(2);

     require(ERC20(BNT).transferFrom(msg.sender, address(this), relayAmount));
     require(ERC20(DAI).transferFrom(msg.sender, address(this), relayAmount));

     ERC20(DAIBNTPoolToken).transfer(msg.sender, _amount);
  }

  // for mock 1 UNI = 0.5 ETH and 0.5 ERC
  function buyUniswapPool(address _poolToken, uint256 _ethAmount) private {
    require(ERC20(DAI).transferFrom(msg.sender, address(this), _ethAmount));
    ERC20(DAIUNIPoolToken).transfer(msg.sender, _ethAmount.mul(2));
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

  function getBancorConnectorsByRelay(address relay)
  public
  view
  returns(
    ERC20 BNTConnector,
    ERC20 ERCConnector
  )
  {
    BNTConnector = ERC20(BNT);
    ERCConnector = ERC20(DAI);
  }

  function getUniswapConnectorsAmountByPoolAmount(
    uint256 _amount,
    address _exchange
  )
  public
  view
  returns(uint256 ethAmount, uint256 ercAmount){
    ethAmount = _amount.div(2);
    ercAmount = _amount.div(2);
  }


  function getTokenByUniswapExchange(address _exchange)
  public
  view
  returns(address){
    return DAI;
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
    // get BNT pool relay back
    require(ERC20(DAIBNTPoolToken).transferFrom(msg.sender, address(this), _amount));

    // send back connectors
    require(ERC20(DAI).transfer(msg.sender, _amount.div(2)));
    require(ERC20(BNT).transfer(msg.sender, _amount.div(2)));
  }

  function sellPoolViaUniswap(ERC20 _poolToken, uint256 _amount) private {
    // get UNI pool back
    require(ERC20(DAIUNIPoolToken).transferFrom(msg.sender, address(this), _amount));

    // send back connectors
    require(ERC20(DAI).transfer(msg.sender, _amount.div(2)));
    address(msg.sender).transfer(_amount.div(2));
  }


  function pay() public payable {}

  function() public payable {}
}
