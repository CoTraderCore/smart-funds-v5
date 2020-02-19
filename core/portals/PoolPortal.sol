pragma solidity ^0.4.24;

/*
* This contract allow buy/sell pool for Bancor and Uniswap assets
* and provide ratio and addition info for pool assets
*/

import "../../zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../../zeppelin-solidity/contracts/math/SafeMath.sol";

import "../../bancor/interfaces/BancorConverterInterface.sol";
import "../../bancor/interfaces/IGetRatioForBancorAssets.sol";
import "../../bancor/interfaces/SmartTokenInterface.sol";
import "../../bancor/interfaces/IGetBancorAddressFromRegistry.sol";
import "../../bancor/interfaces/IBancorFormula.sol";

import "../../uniswap/interfaces/UniswapExchangeInterface.sol";
import "../../uniswap/interfaces/UniswapFactoryInterface.sol";


contract PoolPortal {
  using SafeMath for uint256;

  IGetRatioForBancorAssets public bancorRatio;
  IGetBancorAddressFromRegistry public bancorRegistry;
  UniswapFactoryInterface public uniswapFactory;

  address public BancorEtherToken;

  // CoTrader platform recognize ETH by this address
  ERC20 constant private ETH_TOKEN_ADDRESS = ERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

  enum PortalType { Bancor, Uniswap }

  /**
  * @dev contructor
  *
  * @param _bancorRegistryWrapper  address of GetBancorAddressFromRegistry
  * @param _bancorRatio  address of GetRatioForBancorAssets
  * @param _bancorEtherToken  address of Bancor ETH wrapper
  * @param _uniswapFactory  address of Uniswap factory contract
  */
  constructor(
    address _bancorRegistryWrapper,
    address _bancorRatio,
    address _bancorEtherToken,
    address _uniswapFactory

  )
  public
  {
    bancorRegistry = IGetBancorAddressFromRegistry(_bancorRegistryWrapper);
    bancorRatio = IGetRatioForBancorAssets(_bancorRatio);
    BancorEtherToken = _bancorEtherToken;
    uniswapFactory = UniswapFactoryInterface(_uniswapFactory);
  }


  /**
  * @dev buy Bancor or Uniswap pool
  *
  * @param _amount     amount of pool token
  * @param _type       pool type
  * @param _poolToken  pool token address
  */
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
      buyUniswapPool(_amount, _poolToken, msg.value);
    }
    else{
      // unknown portal type
      revert();
    }
  }


  /**
  * @dev helper for buy pool in Bancor network
  *
  * @param _poolToken        address of bancor converter
  * @param _amount           amount of bancor relay
  */
  function buyBancorPool(ERC20 _poolToken, uint256 _amount) private {
    // get Bancor converter
    address converterAddress = getBacorConverterAddressByRelay(address(_poolToken));
    // calculate connectors amount for buy certain pool amount
    (uint256 bancorAmount,
     uint256 connectorAmount) = getBancorConnectorsAmountByRelayAmount(_amount, _poolToken);
    // get converter as contract
    BancorConverterInterface converter = BancorConverterInterface(converterAddress);
    // approve bancor and coonector amount to converter
    // get connectors
    (ERC20 bancorConnector,
    ERC20 ercConnector) = getBancorConnectorsByRelay(address(_poolToken));
    // reset approve (some ERC20 not allow do new approve if already approved)
    bancorConnector.approve(converterAddress, 0);
    ercConnector.approve(converterAddress, 0);
    // transfer from fund and approve to converter
    _transferFromSenderAndApproveTo(bancorConnector, bancorAmount, converterAddress);
    _transferFromSenderAndApproveTo(ercConnector, connectorAmount, converterAddress);
    // buy relay from converter
    converter.fund(_amount);
    // transfer relay back to smart fund
    _poolToken.transfer(msg.sender, _amount);

    // transfer connectors back if a small amount remains
    uint256 bancorRemains = bancorConnector.balanceOf(address(this));
    if(bancorRemains > 0)
       bancorConnector.transfer(msg.sender, bancorRemains);

    uint256 ercRemains = ercConnector.balanceOf(address(this));
    if(ercRemains > 0)
        ercConnector.transfer(msg.sender, ercRemains);
  }


  /**
  * @dev helper for buy pool in Uniswap network
  *
  * @param _minLiquidity     min liquidity
  * @param _poolToken        address of Uniswap exchange
  * @param _ethAmount        ETH amount (in wei)
  */
  function buyUniswapPool(uint256 _minLiquidity, address _poolToken, uint256 _ethAmount)
  private
  returns(uint256 poolAmount)
  {
    // get token address
    address tokenAddress = uniswapFactory.getToken(_poolToken);
    // check if such a pool exist
    if(tokenAddress != address(0x0000000000000000000000000000000000000000)){
      // get tokens amd approve to exchange
      uint256 erc20Amount = getUniswapTokenAmountByETH(tokenAddress, _ethAmount);
      _transferFromSenderAndApproveTo(ERC20(tokenAddress), erc20Amount, _poolToken);
      // get exchange contract
      UniswapExchangeInterface exchange = UniswapExchangeInterface(_poolToken);
      // set deadline
      uint256 deadline = now + 15 minutes;
      // buy pool
      poolAmount = exchange.addLiquidity.value(_ethAmount)(
        _minLiquidity,
        erc20Amount,
        deadline);
      // reset approve (some ERC20 not allow do new approve if already approved)
      ERC20(tokenAddress).approve(_poolToken, 0);
      // transfer pool token back to smart fund
      ERC20(_poolToken).transfer(msg.sender, poolAmount);
      // transfer ERC20 remains
      uint256 remainsERC = ERC20(tokenAddress).balanceOf(address(this));
      if(remainsERC > 0)
          ERC20(tokenAddress).transfer(msg.sender, remainsERC);
    }else{
      // throw if such pool not Exist in Uniswap network
      revert();
    }
  }

  /**
  * @dev return token amount by ETH input ratio
  *
  * @param _token     address of ERC20 token
  * @param _amount    ETH amount (in wei)
  */
  function getUniswapTokenAmountByETH(address _token, uint256 _amount)
  public
  view
  returns(uint256)
  {
    UniswapExchangeInterface exchange = UniswapExchangeInterface(
      uniswapFactory.getExchange(_token));
    return exchange.getTokenToEthOutputPrice(_amount);
  }


  /**
  * @dev sell Bancor or Uniswap pool
  *
  * @param _amount     amount of pool token
  * @param _type       pool type
  * @param _poolToken  pool token address
  */
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

  /**
  * @dev helper for sell pool in Bancor network
  *
  * @param _poolToken        address of bancor relay
  * @param _amount           amount of bancor relay
  */
  function sellPoolViaBancor(ERC20 _poolToken, uint256 _amount) private {
    // transfer pool from fund
    _poolToken.transferFrom(msg.sender, address(this), _amount);
    // get Bancor Converter address
    address converterAddress = getBacorConverterAddressByRelay(address(_poolToken));
    // liquidate relay
    BancorConverterInterface(converterAddress).liquidate(_amount);
    // get connectors
    (ERC20 bancorConnector,
    ERC20 ercConnector) = getBancorConnectorsByRelay(address(_poolToken));
    // transfer connectors back to fund
    bancorConnector.transfer(msg.sender, bancorConnector.balanceOf(this));
    ercConnector.transfer(msg.sender, ercConnector.balanceOf(this));
  }


  /**
  * @dev helper for sell pool in Uniswap network
  *
  * @param _poolToken        address of uniswap exchane
  * @param _amount           amount of uniswap pool
  */
  function sellPoolViaUniswap(ERC20 _poolToken, uint256 _amount) private {
    address tokenAddress = uniswapFactory.getToken(_poolToken);
    // check if such a pool exist
    if(tokenAddress != address(0x0000000000000000000000000000000000000000)){
      UniswapExchangeInterface exchange = UniswapExchangeInterface(_poolToken);
      // approve pool token
      _transferFromSenderAndApproveTo(ERC20(_poolToken), erc20Amount, _poolToken);
      // get additional data
      (uint256 minEthAmount,
        uint256 minErcAmount) = getUniswapConnectorsAmountByPoolAmount(
          _amount,
          address(_poolToken));
      // sub slippage 5% for min return
      minEthAmount = minEthAmount.div(100).mul(95);
      minErcAmount = minErcAmount.div(100).mul(95);
      // set deadline
      uint256 deadline = now + 15 minutes;
      // liquidate
      (uint256 eth_amount,
       uint256 token_amount) = exchange.removeLiquidity(
         _amount,
         minEthAmount,
         minErcAmount,
         deadline);
      // transfer assets back to smart fund
      msg.sender.transfer(eth_amount);
      ERC20(tokenAddress).transfer(msg.sender, token_amount);
    }else{
      revert();
    }
  }

  /**
  * @dev helper for get bancor converter by bancor relay addrses
  *
  * @param _relay       address of bancor relay
  */
  function getBacorConverterAddressByRelay(address _relay)
  public
  view
  returns(address converter)
  {
    converter = SmartTokenInterface(_relay).owner();
  }

  /**
  * @dev helper for get Bancor ERC20 connectors addresses
  *
  * @param _relay       address of bancor relay
  */
  function getBancorConnectorsByRelay(address _relay)
  public
  view
  returns(
    ERC20 BNTConnector,
    ERC20 ERCConnector
  )
  {
    address converterAddress = getBacorConverterAddressByRelay(_relay);
    BancorConverterInterface converter = BancorConverterInterface(converterAddress);
    BNTConnector = converter.connectorTokens(0);
    ERCConnector = converter.connectorTokens(1);
  }


  /**
  * @dev return ERC20 address from Uniswap exchange address
  *
  * @param _exchange       address of uniswap exchane
  */
  function getTokenByUniswapExchange(address _exchange)
  public
  view
  returns(address)
  {
    return uniswapFactory.getToken(_exchange);
  }


  /**
  * @dev helper for get amounts for both Uniswap connectors for input amount of pool
  *
  * @param _amount         relay amount
  * @param _exchange       address of uniswap exchane
  */
  function getUniswapConnectorsAmountByPoolAmount(
    uint256 _amount,
    address _exchange
  )
  public
  view
  returns(uint256 ethAmount, uint256 ercAmount)
  {
    ERC20 token = ERC20(uniswapFactory.getToken(_exchange));
    // total_liquidity exchange.totalSupply
    uint256 totalLiquidity = UniswapExchangeInterface(_exchange).totalSupply();
    // ethAmount = amount * exchane.eth.balance / total_liquidity
    ethAmount = _amount.mul(_exchange.balance).div(totalLiquidity);
    // ercAmount = amount * token.balanceOf(exchane) / total_liquidity
    ercAmount = _amount.mul(token.balanceOf(_exchange)).div(totalLiquidity);
  }


  /**
  * @dev helper for get amount for both Bancor connectors for input amount of pool
  *
  * @param _amount      relay amount
  * @param _relay       address of bancor relay
  */
  function getBancorConnectorsAmountByRelayAmount
  (
    uint256 _amount,
    ERC20 _relay
  )
  public view returns(uint256 bancorAmount, uint256 connectorAmount) {
    // get converter contract
    BancorConverterInterface converter = BancorConverterInterface(
      SmartTokenInterface(_relay).owner());
    // calculate BNT and second connector amount
    // get connectors
    ERC20 bancorConnector = converter.connectorTokens(0);
    ERC20 ercConnector = converter.connectorTokens(1);
    // get connectors balance
    uint256 bntBalance = converter.getConnectorBalance(bancorConnector);
    uint256 ercBalance = converter.getConnectorBalance(ercConnector);
    // get bancor formula contract
    IBancorFormula bancorFormula = IBancorFormula(
      bancorRegistry.getBancorContractAddresByName("BancorFormula"));
    // calculate input
    bancorAmount = bancorFormula.calculateFundCost(
      _relay.totalSupply(),
      bntBalance,
      100,
       _amount);
    connectorAmount = bancorFormula.calculateFundCost(
      _relay.totalSupply(),
      ercBalance,
      100,
       _amount);
  }

  /**
  * @dev helper for get ratio between assets in bancor newtork
  *
  * @param _from      token or relay address
  * @param _to        token or relay address
  * @param _amount    amount from
  */
  function getBancorRatio(address _from, address _to, uint256 _amount)
  public
  view
  returns(uint256)
  {
    // Change ETH to Bancor ETH wrapper
    address fromAddress = ERC20(_from) == ETH_TOKEN_ADDRESS ? BancorEtherToken : _from;
    address toAddress = ERC20(_to) == ETH_TOKEN_ADDRESS ? BancorEtherToken : _to;
    // return Bancor ratio
    return bancorRatio.getRatio(fromAddress, toAddress, _amount);
  }


  /**
  * @dev Transfers tokens to this contract and approves them to another address
  *
  * @param _source          Token to transfer and approve
  * @param _sourceAmount    The amount to transfer and approve (in _source token)
  * @param _to              Address to approve to
  */
  function _transferFromSenderAndApproveTo(ERC20 _source, uint256 _sourceAmount, address _to) private {
    require(_source.transferFrom(msg.sender, address(this), _sourceAmount));

    _source.approve(_to, _sourceAmount);
  }

  // fallback payable function to receive ether from other contract addresses
  function() public payable {}
}
