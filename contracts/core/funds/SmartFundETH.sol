pragma solidity ^0.4.24;

import "./SmartFundAdvanced.sol";
import "../interfaces/SmartFundETHInterface.sol";

/*
  Note: this smart fund inherits SmartFundAdvanced and make core operations like deposit,
  calculate fund value etc in ETH
*/
contract SmartFundETH is SmartFundETHInterface, SmartFundAdvanced {
  using SafeMath for uint256;
  using SafeERC20 for ERC20;

  /**
  * @dev constructor
  *
  * @param _owner                        Address of the fund manager
  * @param _name                         Name of the fund, required for DetailedERC20 compliance
  * @param _successFee                   Percentage of profit that the fund manager receives
  * @param _platformFee                  Percentage of the success fee that goes to the platform
  * @param _platformAddress              Address of platform to send fees to
  * @param _exchangePortalAddress        Address of initial exchange portal
  * @param _permittedExchangesAddress    Address of PermittedExchanges contract
  * @param _permittedPoolsAddress        Address of PermittedPools contract
  * @param _poolPortalAddress            Address of initial pool portal
  * @param _cEther                       Address of the cEther
  */
  constructor(
    address _owner,
    string _name,
    uint256 _successFee,
    uint256 _platformFee,
    address _platformAddress,
    address _exchangePortalAddress,
    address _permittedExchangesAddress,
    address _permittedPoolsAddress,
    address _poolPortalAddress,
    address _cEther
  )
  SmartFundAdvanced(
    _owner,
    _name,
    _successFee,
    _platformFee,
    _platformAddress,
    _exchangePortalAddress,
    _permittedExchangesAddress,
    _permittedPoolsAddress,
    _poolPortalAddress,
    _cEther
  )
  public{}

  /**
  * @dev Deposits ether into the fund and allocates a number of shares to the sender
  * depending on the current number of shares, the funds value, and amount deposited
  *
  * @return The amount of shares allocated to the depositor
  */
  function deposit() external payable returns (uint256) {
    // Check if the sender is allowed to deposit into the fund
    if (onlyWhitelist)
      require(whitelist[msg.sender]);

    // Require that the amount sent is not 0
    require(msg.value != 0);

    totalWeiDeposited += msg.value;

    // Calculate number of shares
    uint256 shares = calculateDepositToShares(msg.value);

    // If user would receive 0 shares, don't continue with deposit
    require(shares != 0);

    // Add shares to total
    totalShares = totalShares.add(shares);

    // Add shares to address
    addressToShares[msg.sender] = addressToShares[msg.sender].add(shares);

    addressesNetDeposit[msg.sender] += int256(msg.value);

    emit Deposit(msg.sender, msg.value, shares, totalShares);

    return shares;
  }

  /**
  * @dev Calculates the funds value in deposit token (Ether)
  *
  * @return The current total fund value
  */
  function calculateFundValue() public view returns (uint256) {
    uint256 ethBalance = address(this).balance;

    // If the fund only contains ether, return the funds ether balance
    if (tokenAddresses.length == 1)
      return ethBalance;

    // Otherwise, we get the value of all the other tokens in ether via exchangePortal

    // Calculate value for ERC20
    // Sub cTokens + ETH
    uint cTokensAndETHlength = compoundCTokensLength() + 1;
    address[] memory fromAddresses = new address[](tokenAddresses.length - cTokensAndETHlength);
    uint256[] memory amounts = new uint256[](tokenAddresses.length - cTokensAndETHlength);
    uint8 ercIndex = 0;

    for (uint256 i = 1; i < tokenAddresses.length; i++) {
      // No need for cToken
      if(!isCTOKEN[tokenAddresses[i]]){
        fromAddresses[ercIndex] = tokenAddresses[i];
        amounts[ercIndex] = ERC20(tokenAddresses[i]).balanceOf(address(this));
        ercIndex++;
      }
    }
    // Ask the Exchange Portal for the value of all the funds tokens in eth
    uint256 tokensValue = exchangePortal.getTotalValue(fromAddresses, amounts, ETH_TOKEN_ADDRESS);

    // get compound c tokens in ETH
    uint256 compoundCTokensValueInETH = compoundGetAllFundCtokensinETH();

    // Sum ETH + ERC20 + cTokens
    return ethBalance + tokensValue + compoundCTokensValueInETH;
  }

  /**
  * @dev get balance of input asset address in ETH ratio
  *
  * @param _token     token address
  *
  * @return balance in ETH
  */
  function getTokenValue(ERC20 _token) public view returns (uint256) {
    // return ETH
    if (_token == ETH_TOKEN_ADDRESS){
      return address(this).balance;
    }
    // return CToken in ETH
    else if(isCTOKEN[_token]){
      return compoundGetCTokenValue(_token);
    }
    // return ERC20 in ETH
    else{
      uint256 tokenBalance = _token.balanceOf(address(this));
      return exchangePortal.getValue(_token, ETH_TOKEN_ADDRESS, tokenBalance);
    }
  }
}
