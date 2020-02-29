pragma solidity ^0.4.24;

/*
* This contract inherits logic of SmartFundCore and implements logic of Compound.
* Perhaps in the future we will need select for inherit the logic of Lend or not,
* therefore, this logic must be separate
*
* NOTE: maybe in future, if we don't need implement borrow logic, and no need bind
* debt with msg.sender, we can do Compound logic as addition portal
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
  * @param _cEther                       Address of the cEther
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
    address _cEther
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
  }


  /**
  * @dev buy Compound cTokens
  *
  * @param _amount       amount of ERC20 or ETH
  * @param _cToken       cToken address
  */
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

  /**
  * @dev sell certain percent of Ctokens to Compound
  *
  * @param _percent      percent from 1 to 100
  * @param _cToken       cToken address
  */
  function compoundRedeemByPercent(uint _percent, address _cToken) external onlyOwner {
    uint256 amount = (_percent == 100)
    // if 100 return all
    ? ERC20(address(_cToken)).balanceOf(address(this))
    // else calculate percent
    : getPercentFromCTokenBalance(_percent, address(_cToken));

    if(_cToken == address(cEther)){
      cEther.redeem(amount);
    }else{
      CToken cToken = CToken(_cToken);
      cToken.redeem(amount);
    }
  }


  /**
  * @dev return percent of compound cToken balance
  *
  * @param _percent       amount of ERC20 or ETH
  * @param _cToken       cToken address
  */
  function getPercentFromCTokenBalance(uint _percent, address _cToken)
  public
  view
  returns(uint256)
  {
    if(_percent > 0 && _percent <= 100){
      uint256 currectBalance = ERC20(_cToken).balanceOf(address(this));
      return currectBalance.div(100).mul(_percent);
    }
    else{
      // not correct percent
      return 0;
    }
  }

  /**
  * @dev sell Compound cToken by cToken amount
  *
  * @param _amount       amount of ERC20 or ETH
  * @param _cToken       cToken address
  */
  function compoundRedeem(uint256 _amount, address _cToken) external onlyOwner {
    if(_cToken == address(cEther)){
      cEther.redeem(_amount);
    }else{
      CToken cToken = CToken(_cToken);
      cToken.redeem(_amount);
    }
  }

  /**
  * @dev sell Compound cToken by underlying (ERC20 or ETH) amount
  *
  * @param _amount       amount of ERC20 or ETH
  * @param _cToken       cToken address
  */
  function compoundRedeemUnderlying(uint256 _amount, address _cToken) external onlyOwner {
    if(_cToken == address(cEther)){
      cEther.redeemUnderlying(_amount);
    }else{
      CToken cToken = CToken(_cToken);
      cToken.redeemUnderlying(_amount);
    }
  }

  /**
  * @dev get value for cToken in base asset (ERC20 or ETH) ratio for this smart fund address
  *
  * @param _cToken       cToken address
  */
  function compoundGetCTokenValue(
    address _cToken
  )
    public
    view
    returns(uint256 result)
  {
    result = CToken(_cToken).balanceOfUnderlying(address(this));
  }

  /**
  * @dev get value for all cTokens for this smart fund address in ETH ratio
  *
  */
  function compoundGetAllFundCtokensinETH()
    public
    view
    returns(uint256)
  {
    if(compoundTokenAddresses.length > 0){
      uint256 balance = 0;
      for (uint256 i = 0; i < compoundTokenAddresses.length; i++) {
        balance = balance.add(compoundGetCTokenValue(compoundTokenAddresses[i]));
      }
      return balance;
    }
    else{
      return 0;
    }
  }
}
