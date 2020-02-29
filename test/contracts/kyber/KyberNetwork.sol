pragma solidity ^0.4.21;

import "../TokenOracleInterface.sol";
import "../../../contracts/zeppelin-solidity/contracts/ownership/Ownable.sol";

contract KyberNetwork is Ownable {
  TokenOracleInterface public tokenOracle;

  uint256 public constant DECIMALS = 10 ** 18;
  ERC20 constant private ETH_TOKEN_ADDRESS = ERC20(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);

  event ExecuteTrade(address indexed sender, ERC20 src, ERC20 dest, uint actualSrcAmount, uint actualDestAmount);

  function KyberNetwork(address _tokenOracle) public {
    tokenOracle = TokenOracleInterface(_tokenOracle);
  }

  function setTokenOracle(address _tokenOracle) public onlyOwner {
    tokenOracle = TokenOracleInterface(_tokenOracle);
  }

  /// @notice use token address ETH_TOKEN_ADDRESS for ether
  /// @dev makes a trade between src and dest token and send dest token to destAddress
  /// @param src Src token
  /// @param srcAmount amount of src tokens
  /// @param dest   Destination token
  /// @param destAddress Address to send tokens to
  /// @param maxDestAmount A limit on the amount of dest tokens
  /// @param minConversionRate The minimal conversion rate. If actual rate is lower, trade is canceled.
  /// @param walletId is the wallet ID to send part of the fees
  /// @return amount of actual dest tokens
  function trade(
    ERC20 src,
    uint srcAmount,
    ERC20 dest,
    address destAddress,
    uint maxDestAmount,
    uint minConversionRate,
    address walletId
  )
    public
    payable
    returns(uint)
  {
    require(src != dest);

    uint256 destAmount = tokenOracle.convert(src, dest, srcAmount);

    if (src == ETH_TOKEN_ADDRESS) {
      require(msg.value == srcAmount);
    } else {
      require(msg.value == 0);
      src.transferFrom(msg.sender, this, srcAmount);
    }

    if (dest == ETH_TOKEN_ADDRESS) {
      (destAddress).transfer(destAmount);
    } else {
      dest.transfer(destAddress, destAmount);
    }
    
    emit ExecuteTrade(msg.sender, src, dest, srcAmount, destAmount);

    return destAmount;
  }

  /// @notice use token address ETH_TOKEN_ADDRESS for ether
  /// @dev best conversion rate for a pair of tokens, if number of reserves have small differences. randomize
  /// @param src Src token
  /// @param dest Destination token
  function findBestRate(ERC20 src, ERC20 dest, uint srcQty) public view returns(uint, uint) {
    uint256 bestReserve = 0;
    uint256 bestRate = tokenOracle.convert(src, dest, DECIMALS);
    
    return (bestReserve, bestRate);
  }
    
  function getExpectedRate(ERC20 src, ERC20 dest, uint srcQty) public view returns (uint expectedRate, uint slippageRate) {
    expectedRate = tokenOracle.convert(src, dest, DECIMALS);
    slippageRate = 0;
  }

  // Method for kyberexchange to receive ether
  function pay() public payable {}
}