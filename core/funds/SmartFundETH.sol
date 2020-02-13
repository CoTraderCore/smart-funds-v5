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
  * @param _cEther                       Address of Compound ETH wrapper
  * @param _Comptroller                  Address of Compound comptroller
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
    address _cEther,
    address _Comptroller
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
    _cEther,
    _Comptroller
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
    address[] memory fromAddresses = new address[](tokenAddresses.length - 1);
    uint256[] memory amounts = new uint256[](tokenAddresses.length - 1);

    for (uint256 i = 1; i < tokenAddresses.length; i++) {
      fromAddresses[i-1] = tokenAddresses[i];
      amounts[i-1] = ERC20(tokenAddresses[i]).balanceOf(address(this));
    }
    // Ask the Exchange Portal for the value of all the funds tokens in eth
    uint256 tokensValue = exchangePortal.getTotalValue(fromAddresses, amounts, ETH_TOKEN_ADDRESS);

    // Sum ETH + ERC20
    return ethBalance + tokensValue;
  }

  // return token value in ETH
  function getTokenValue(ERC20 _token) public view returns (uint256) {
    if (_token == ETH_TOKEN_ADDRESS)
      return address(this).balance;
    uint256 tokenBalance = _token.balanceOf(address(this));

    return exchangePortal.getValue(_token, ETH_TOKEN_ADDRESS, tokenBalance);
  }
}
