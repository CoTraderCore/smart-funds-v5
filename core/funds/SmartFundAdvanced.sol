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
  * @param _permittedPoolAddress         Address of the permittedPool contract
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
    address _poolPortalAddress
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


  // TEST Methods for borrow
  // _ercAddress - cToken address
  function borrowERCviaETH(uint256 _amount, address _token) external payable{
    require(msg.value == _amount);
    cEther.mint.value(_amount)();

    cToken = CToken(_token);

    // should calculate by rate
    uint256 borrowAmount = 1;

    cToken.borrow(borrowAmount);

    address underlyingAddress = cToken.underlying();
    _addToken(address(cToken));
    _addToken(underlyingAddress);
  }

  // _ercAddress - cToken address
  function borrowETHviaERC(uint256 _amount, address _token) external{
    cToken = CToken(_token);
    address underlyingAddress = cToken.underlying();

    // approve erc20 to CToken contract
    _transferFromSenderAndApproveTo(ERC20(underlyingAddress), _amount, _token);
    // mint
    cToken.mint(_amount);

    // should calculate by rate
    uint256 borrowAmount = 1;

    cEther.borrow(borrowAmount);
    _addToken(address(cEther));
  }



  function compoundEnterMarkets(address[] memory cTokens) public {
    Comptroller.enterMarkets(cTokens);
  }
}
