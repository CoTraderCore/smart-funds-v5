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
import "../interfaces/ISmartFundRegistry.sol";
import "./SmartFundCore.sol";

contract SmartFundAdvanced is SmartFundCore {
  using SafeMath for uint256;

  CEther public cEther;
  IComptroller public Comptroller;
  ISmartFundRegistry public SmartFundRegistry;
  bool public isBorrowAbble;
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

  // _cToken - cToken address
  function compoundBorrow(uint256 _amount, address _cToken) external onlyOwner{
    if(_cToken == address(cEther)){
      cEther.borrow(_amount);
    }else{
      CToken cToken = CToken(_cToken);
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
      CToken cToken = CToken(_cToken);
      address underlyingAddress = cToken.underlying();
      ERC20(underlyingAddress).approve(address(_cToken), _amount);
      cToken.repayBorrow(_amount);
    }
  }

  // if manager did borrow, this function return free of debt assets in ETH value
  function compoundGetLiquidity() public view returns (uint256 result){
    (, result, ) = Comptroller.getAccountLiquidity(address(this));
  }

  // return price of input amount of cToken in ETH ratio
  function compoundGetCTokenValueByInput(
    address _cToken,
    uint256 _amount
  )
  public
  view
  returns(uint256 result)
  {
    uint256 exchangeRateCurrent;
    if(_cToken == address(cEther)){
      exchangeRateCurrent = cEther.exchangeRateCurrent();
    }else{
      CToken cToken = CToken(_cToken);
      exchangeRateCurrent = cToken.exchangeRateCurrent();
    }
    result = exchangeRateCurrent.mul(_amount).div(10000000000000000000000000000);
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

  // this function check if curent address has debt or not
  // if has debt, return free liqudity in ETH, else return
  // value for all compound assets in array in ETH ratio
  function compoundCalculateValueForCtokens(
    address[] memory cTokens
  )
  public
  view
  returns(uint256)
  {
    uint256 accountLiquidity = compoundGetLiquidity();
    // if account did bororow return free of debt compound assets
    if(accountLiquidity > 0){
      return accountLiquidity;
    }
    // else calculate all compound assets
    else{
      uint256 balance = 0;
      for(uint i=0; i < cTokens.length; i++){
        balance = balance.add(compoundGetCTokenValue(cTokens[i]));
      }
      return balance;
    }
  }

  // return value for all smart fund cTokens in ETH ratio
  function compoundGetAllFundCtokensinETH()
  public
  view
  returns(uint256)
  {
    if(compoundTokenAddresses.length > 0){
      address[] memory fromAddresses = new address[](compoundTokenAddresses.length);
      for (uint256 i = 0; i < compoundTokenAddresses.length; i++) {
        fromAddresses[i] = compoundTokenAddresses[i];
      }
      return compoundCalculateValueForCtokens(fromAddresses);
    }
    else{
      return 0;
    }
  }

  // Allow manager start do borrow, leaving assets as collateral
  function compoundEnterMarkets(address[] memory cTokens) public {
    require(isBorrowAbble);
    Comptroller.enterMarkets(cTokens);
  }

  function compoundExitMarkets(address _cToken) public {
    Comptroller.exitMarket(_cToken);
  }
}
