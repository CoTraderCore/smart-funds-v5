pragma solidity ^0.4.21;

import "../../../contracts/zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract KyberNetworkMock {
  uint256 public amountToTransfer = 100;

  ERC20 constant private ETH_TOKEN_ADDRESS = ERC20(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);

  event ExecuteTrade(address indexed sender, ERC20 src, ERC20 dest, uint actualSrcAmount, uint actualDestAmount);

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
    uint256 destAmount = amountToTransfer;

    if (src != ETH_TOKEN_ADDRESS) {
      src.transferFrom(msg.sender, this, srcAmount);
    }

    if (dest == ETH_TOKEN_ADDRESS) {
      destAddress.transfer(destAmount);
    } else {
      dest.transfer(destAddress, destAmount);
    }
    
    emit ExecuteTrade(msg.sender, src, dest, srcAmount, destAmount);

    return destAmount;
  }


  function setAmountToTransfer(uint _amount) public {
    amountToTransfer = _amount;
  }

  function findBestRate(ERC20 src, ERC20 dest, uint srcQty) public view returns(uint, uint) {
    uint bestReserve = 1;
    uint bestRate = 100;
    
    return (bestReserve, bestRate);
  }
    
  function getExpectedRate(ERC20 src, ERC20 dest, uint srcQty) public view returns (uint expectedRate, uint slippageRate) {
    expectedRate = 100;
    slippageRate = 1;
  }

  function pay() public payable {}
}