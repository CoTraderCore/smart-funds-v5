// TODO Desribe methods
pragma solidity ^0.4.24;

/*
* This contract inherits logic of SmartFundCore and implements logic of Compound.
* Perhaps in the future we will need funds that do not inherit the logic of Borrow and Lend,
* therefore, this logic must be separate
*/

import "../../compound/CEther.sol";
import "../../compound/CToken.sol";
import "../../compound/IComptroller.sol";
import "../../compound/IPriceOracle.sol";
import "../interfaces/ISmartFundRegistry.sol";
import "./SmartFundCore.sol";

contract SmartFundAdvanced is SmartFundCore {
  CEther public cEther;
  CToken cToken;
  IComptroller public Comptroller;
  IPriceOracle public PriceOracle;
  ISmartFundRegistry public SmartFundRegistry;
  bool public isBorrowAbble;

  /**
  * @dev constructor
  * @param _owner                        Owner of new smart fund
  * @param _name                         Name of new smart fund
  * @param _successFee                   Initial success fee
  * @param _platformFee                  Initial platform fee
  * @param _platformAddress              Address of smart fund registry
  * @param _exchangePortalAddress        Address of the initial ExchangePortal contract
  * @param _permittedExchangesAddress    Address of the permittedExchanges contract
  * @param _poolPortalAddress            Address of the initial PoolPortal contract
  * @param _permittedPoolsAddress        Address of the permittedPool contract
  * @param _isBorrowAbble                bool can be set only once
  */
  constructor(
    address _owner,
    string  _name,
    uint256 _successFee,
    uint256 _platformFee,
    address _platformAddress,
    address _exchangePortalAddress,
    address _permittedExchangesAddress,
    address _permittedPoolsAddress,
    address _poolPortalAddress,
    bool    _isBorrowAbble
  )
  SmartFundCore(
    _owner,
    _name,
    _successFee,
    _platformFee,
    _platformAddress,
    _exchangePortalAddress,
    _permittedExchangesAddress,
    _permittedPoolsAddress,
    _poolPortalAddress
  )
  public
  {
    SmartFundRegistry = ISmartFundRegistry(_platformAddress);

    address _cEther = SmartFundRegistry.cEther();
    cEther = CEther(_cEther);

    address _Comptroller = SmartFundRegistry.Comptroller();
    Comptroller = IComptroller(_Comptroller);

    isBorrowAbble = _isBorrowAbble;
  }


  // _cToken - cToken address
  function compoundMint(uint256 _amount, address _cToken) external onlyOwner{
    if(_cToken == address(cEther)){
      // mint cETH
      cEther.mint.value(_amount)();
      // Add cEther
      _addToken(address(cEther));
    }else{
      cToken = CToken(_cToken);
      // mint cERC
      cToken.mint(_amount);
      // Add cToken
      _addToken(address(_cToken));
    }
  }

  // _amount The number of cTokens to be redeemed
  function compoundRedeem(uint256 _amount, address _cToken) external onlyOwner {
    if(_cToken == address(cEther)){
      cEther.redeem(_amount);
    }else{
      cToken = CToken(_cToken);
      cToken.redeem(_amount);
    }
  }

  // _amount The number of underlying asset to be redeemed
  function compoundRedeemUnderlying(uint256 _amount, address _cToken) external onlyOwner {
    if(_cToken == address(cEther)){
      cEther.redeemUnderlying(_amount);
    }else{
      cToken = CToken(_cToken);
      cToken.redeemUnderlying(_amount);
    }
  }

  // _cToken - cToken address
  function compoundBorrow(uint256 _amount, address _cToken) external onlyOwner{
    if(_cToken == address(cEther)){
      cEther.borrow(_amount);
    }else{
      cToken = CToken(_cToken);
      cToken.borrow(_amount);
      // Add borrowed asset to fund
      address underlyingAddress = cToken.underlying();
      _addToken(underlyingAddress);
    }
  }

  // _cToken - cToken address
  function compoundRepayBorrow(uint256 _amount, address _cToken) external onlyOwner {
    if(_cToken == address(cEther)){
      cEther.repayBorrow.value(_amount)();
    }else{
      cToken = CToken(_cToken);
      address underlyingAddress = cToken.underlying();
      ERC20(underlyingAddress).approve(address(_cToken), _amount);
      cToken.repayBorrow(_amount);
    }
  }

  // return underlying asset in ETH price * amount
  function getRatioForCToken(address _cToken, uint256 _amount) public view returns(uint256 result){
    // get latest PriceOracle address
    address _PriceOracle = SmartFundRegistry.PriceOracle();
    PriceOracle = IPriceOracle(_PriceOracle);

    if(_amount > 0){
      result = PriceOracle.getUnderlyingPrice(CToken(_cToken)) * _amount;
    }else{
      result = 0;
    }
  }

  function compoundEnterMarkets(address[] memory cTokens) public {
    require(isBorrowAbble);
    Comptroller.enterMarkets(cTokens);
  }

  function compoundExitMarkets(address _cToken) public {
    Comptroller.exitMarket(_cToken);
  }
}
