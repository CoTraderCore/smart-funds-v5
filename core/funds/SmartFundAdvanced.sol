// TODO Desribe methods
pragma solidity ^0.4.24;

/*
* This contract inherits logic of SmartFundCore and implements logic of Compound.
* Perhaps in the future we will need funds that do not inherit the logic of Lend,
* therefore, this logic must be separate
*/

import "../../compound/CEther.sol";
import "../../compound/CToken.sol";
import "./SmartFundCore.sol";

contract SmartFundAdvanced is SmartFundCore {
  using SafeMath for uint256;

  CEther public cEther;
  mapping(address => bool) public isCTOKEN;
  address[] public compoundTokenAddresses;


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
    ISmartFundRegistry SmartFundRegistry = ISmartFundRegistry(_platformAddress);

    address _cEther = SmartFundRegistry.cEther();
    cEther = CEther(_cEther);
  }


  // _cToken - cToken address
  function compoundMint(uint256 _amount, address _cToken) external onlyOwner{
    if(_cToken == address(cEther)){
      // mint cETH
      cEther.mint.value(_amount)();
      // Add cEther
      _addToken(address(cEther));
      // Mark this tokens as Ctoken
      isCTOKEN[address(cEther)] = true;
      // Add compound token
      compoundTokenAddresses.push(address(cEther));
    }else{
      CToken cToken = CToken(_cToken);
      address underlyingAddress = cToken.underlying();
      ERC20(underlyingAddress).approve(address(_cToken), _amount);
      // mint cERC
      cToken.mint(_amount);
      // Add cToken
      _addToken(_cToken);
      // Mark this tokens as Ctoken
      isCTOKEN[_cToken] = true;
      // Add compound token
      compoundTokenAddresses.push(_cToken);
    }
  }

  // _amount The number of cTokens to be redeemed
  function compoundRedeem(uint256 _amount, address _cToken) external onlyOwner {
    if(_cToken == address(cEther)){
      cEther.redeem(_amount);
    }else{
      CToken cToken = CToken(_cToken);
      cToken.redeem(_amount);
    }
  }

  // _amount The number of underlying asset to be redeemed
  function compoundRedeemUnderlying(uint256 _amount, address _cToken) external onlyOwner {
    if(_cToken == address(cEther)){
      cEther.redeemUnderlying(_amount);
    }else{
      CToken cToken = CToken(_cToken);
      cToken.redeemUnderlying(_amount);
    }
  }

  // convert cToken fund balance in ETH ratio
  function compoundGetCTokenValue(
    address _cToken
  )
  public
  view
  returns(uint256 result)
  {
    result = CToken(_cToken).balanceOfUnderlying(address(this));
  }

  // return value for all smart fund cTokens in ETH ratio
  function compoundGetAllFundCtokensinETH()
  public
  view
  returns(uint256)
  {
    if(compoundTokenAddresses.length > 0){
      address[] memory fromAddresses = new address[](compoundTokenAddresses.length);
      uint256 balance = 0;

      for (uint256 i = 0; i < compoundTokenAddresses.length; i++) {
        balance = balance.add(compoundGetCTokenValue(cTokens[i]));
      }
      return balance;
    }
    else{
      return 0;
    }
  }
}
