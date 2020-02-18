// TODO write docs for methods
pragma solidity ^0.4.24;

import "../zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../zeppelin-solidity/contracts/math/SafeMath.sol";

import "../bancor/interfaces/BancorConverterInterface.sol";
import "../bancor/interfaces/IGetRatioForBancorAssets.sol";
import "../bancor/interfaces/SmartTokenInterface.sol";
import "../bancor/interfaces/IGetBancorAddressFromRegistry.sol";
import "../bancor/interfaces/IBancorFormula.sol";

import "../uniswap/interfaces/UniswapExchangeInterface.sol";
import "../uniswap/interfaces/UniswapFactoryInterface.sol";


contract PoolPortal {
  using SafeMath for uint256;

  IGetRatioForBancorAssets public bancorRatio;
  IGetBancorAddressFromRegistry public bancorRegistry;
  UniswapFactoryInterface public uniswapFactory;
  address public BancorEtherToken;

  // Paraswap and Kyber recognizes ETH by this address
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

  ) public {
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
  * @param _additionalArgs  addition data for another pools like Uniswap
  */
  function buyPool
  (
    uint256 _amount,
    uint _type,
    ERC20 _poolToken,
    bytes32[] _additionalArgs
  )
  external
  payable
  {
    if(_type == uint(PortalType.Bancor)){
      buyBancorPool(_poolToken, _amount);
    }
    else if (_type == uint(PortalType.Uniswap)){
      uint256 ethAmount = uint256(_additionalArgs[0]);
      require(msg.value >= ethAmount, "Throw if not enought eth");
      buyUniswapPool(_poolToken, ethAmount, _additionalArgs);
    }
    else{
      // unknown portal type
      revert();
    }
  }


  // helper for buy pool via bancor
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


  // helper for buy pool via Uniswap
  function buyUniswapPool(address _poolToken, uint256 ethAmount, bytes32[] _additionalArgs)
  private
  returns(uint256 poolAmount)
  {
    // get token address
    address tokenAddress = uniswapFactory.getToken(_poolToken);

    // check if such a pool exist
    if(tokenAddress != address(0x0000000000000000000000000000000000000000)){
      // approve tokens to exchane
      uint256 erc20Amount = _additionalArgs[0];
      _transferFromSenderAndApproveTo(ERC20(tokenAddress), erc20Amount, _poolToken);

      // get exchange contract
      UniswapExchangeInterface exchange = UniswapExchangeInterface(_poolToken);

      // get additional params
      uint256 deadline = uint256(_additionalArgs[1]);
      uint256 min_liquidity = uint256(_additionalArgs[2]);

      // buy pool
      poolAmount = addLiquidity(
        min_liquidity,
        erc20Amount,
        deadline).value(ethAmount);

      // transfer pool token back to smart fund
      ERC20(_poolToken).transfer(msg.sender, poolAmount);
    }else{
      // throw if such pool not Exist in Uniswap network
      revert();
    }
  }


  /**
  * @dev sell Bancor or Uniswap pool
  *
  * @param _amount     amount of pool token
  * @param _type       pool type
  * @param _poolToken  pool token address
  * @param _additionalArgs  addition data for another pools like Uniswap
  */
  function sellPool
  (
    uint256 _amount,
    uint _type,
    ERC20 _poolToken,
    bytes32[] _additionalArgs
  )
  external
  payable
  {
    if(_type == uint(PortalType.Bancor)){
      sellPoolViaBancor(_poolToken, _amount);
    }
    else if (_type == uint(PortalType.Uniswap)){
      sellPoolViaUniswap(_poolToken, _amount, _additionalArgs);
    }
    else{
      // unknown portal type
      revert();
    }
  }

  // helper for sell Bancor pool
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


  // helper for sell pool via Uniswap
  function sellPoolViaUniswap(ERC20 _poolToken, uint256 _amount, bytes32[] _additionalArgs) private {
    address tokenAddress = uniswapFactory.getToken(_poolToken);
    // check if such a pool exist
    if(tokenAddress != address(0x0000000000000000000000000000000000000000)){
      UniswapExchangeInterface exchange = UniswapExchangeInterface(_poolToken);

      uint256 min_eth = uint256(_additionalArgs[0]);
      uint256 min_tokens = uint256(_additionalArgs[1]);
      uint256 deadline = uint256(_additionalArgs[2]);

      // liquidate
      (uint256 eth_amount,
       uint256 token_amount) = exchange.removeLiquidity(_amount, min_eth, min_tokens, deadline);

      // transfer assets back to smart fund
      msg.sender.transfer(eth_amount);
      ERC20(tokenAddress).transfer(msg.sender, token_amount);
    }else{
      revert();
    }
  }


  function getBacorConverterAddressByRelay(address relay) public view returns(address converter){
    converter = SmartTokenInterface(relay).owner();
  }


  function getBancorConnectorsByRelay(address relay)
  public
  view
  returns(
    ERC20 BNTConnector,
    ERC20 ERCConnector
  )
  {
    address converterAddress = getBacorConverterAddressByRelay(relay);
    BancorConverterInterface converter = BancorConverterInterface(converterAddress);
    BNTConnector = converter.connectorTokens(0);
    ERCConnector = converter.connectorTokens(1);
  }


  function getRatio(address _from, address _to, uint256 _amount) public view returns(uint256 result){
    result = bancorRatio.getRatio(_from, _to, _amount);
    return result;
  }


  // Calculate value for assets array in ration of some one assets (like ETH or DAI)
  function getTotalValue(address[] _fromAddresses, uint256[] _amounts, address _to) public view returns (uint256) {
    // replace ETH with Bancor ETH wrapper
    address to = ERC20(_to) == ETH_TOKEN_ADDRESS ? BancorEtherToken : _to;
    uint256 sum = 0;

    for (uint256 i = 0; i < _fromAddresses.length; i++) {
      sum = sum.add(getRatio(_fromAddresses[i], to, _amounts[i]));
    }

    return sum;
  }


  // This function calculate amount of both reserve for buy and sell by pool amount
  function getBancorConnectorsAmountByRelayAmount
  (
    uint256 _amount,
    ERC20 _relay
  )
  public view returns(uint256 bancorAmount, uint256 connectorAmount) {
    // get converter contract
    BancorConverterInterface converter = BancorConverterInterface(SmartTokenInterface(_relay).owner());

    // calculate BNT and second connector amount

    // get connectors
    ERC20 bancorConnector = converter.connectorTokens(0);
    ERC20 ercConnector = converter.connectorTokens(1);

    // get connectors balance
    uint256 bntBalance = converter.getConnectorBalance(bancorConnector);
    uint256 ercBalance = converter.getConnectorBalance(ercConnector);

    // get bancor formula contract
    IBancorFormula bancorFormula = IBancorFormula(bancorRegistry.getBancorContractAddresByName("BancorFormula"));

    // calculate input
    bancorAmount = bancorFormula.calculateFundCost(_relay.totalSupply(), bntBalance, 100, _amount);
    connectorAmount = bancorFormula.calculateFundCost(_relay.totalSupply(), ercBalance, 100, _amount);
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
