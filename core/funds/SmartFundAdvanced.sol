pragma solidity ^0.4.24;

/*
* This contract inherits logic of SmartFundCore and implements logic of Compound.
* Perhaps in the future we will need funds that do not inherit the logic of Borrow and Lend,
* therefore, this logic must be separate
*/

import "../../compound/CEther.sol";
import "../../compound/CToken.sol";
import "../../compound/IComptroller.sol";
import "./SmartFundCore.sol";

contract SmartFundAdvanced is SmartFundCore {
  CEther public cEther;
  CToken cToken;
  IComptroller public Comptroller;

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
  * @param _permittedPoolsAddress         Address of the permittedPool contract
  * @param _cEther        address of cEther
  * @param _Comptroller   address of Compound
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
    address _cEther,
    address _Comptroller
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
    cEther = CEther(_cEther);
    Comptroller = IComptroller(_Comptroller);
  }


  // _cToken - cToken address
  function compoundBorrow(uint256 _amount, address _cToken) external payable{
    if(_cToken == cEther){
      cEther.borrow(_amount);
    }else{
      cToken = CToken(_cToken);
      cToken.borrow(borrowAmount);
      // Add borrowed asset to fund
      address underlyingAddress = cToken.underlying();
      _addToken(underlyingAddress);
    }
  }

  // _ercAddress - cToken address
  function compoundMint(uint256 _amount, address _cToken) external payable{
    if(_cToken == cEther){
      require(msg.value == _amount);
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

  function compoundEnterMarkets(address[] memory cTokens) public {
    Comptroller.enterMarkets(cTokens);
  }

  function compoundExitMarkets(address cToken) public {
    Comptroller.exitMarket(cToken);
  }

  // TODO
  /*
  function getRatioForCToken(address _cToken, uint256 _amount) view returns(uint256){
  return PriceOracle.getUnderlyingPrice(_cToken) * _amount;
  }
  */
}
