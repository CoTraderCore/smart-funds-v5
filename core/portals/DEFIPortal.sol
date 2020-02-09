// for any additional defi logic like compound
pragma solidity ^0.4.24;

import "../../zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../../compound/CEther.sol";
import "../../compound/CToken.sol";

contract DEFIPortal {
  CEther public cEther;
  CToken cToken;
  address public Comptroller;
  address constant private ETH_TOKEN_ADDRESS = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

  enum CompoundAction { Mint, Withdraw }

  /**
  * @dev constructor
  *
  * @param _cEther        address of cEther
  * @param _Comptroller   address of Compound
  */
  constructor(
    address _cEther,
    address _Comptroller
  )
  public
  {
    cEther = CEther(_cEther);
    Comptroller = _Comptroller;
  }

  /**
  * @dev Facilitates for borrow, withdraw, liquidate or mint from Compound
  *
  * @param _cAddress                 compound CToken address
  * @param _ercAddress               erc20 token address, for eth operation just set 0x address
  * @param _sourceAmount             amount to convert from (in _source token)
  * @return The amount of _destination received from the trade
  */
  function compound(
    address _cAddress,
    address _ercAddress,
    uint256 _sourceAmount,
    uint _action
  )
  external
  payable
  returns(uint256 returnAmount){
   // Action Mint
   if(_action == uint(CompoundAction.Mint)){
     if(_cAddress == address(cEther)){
       require(msg.value == _sourceAmount);
       cEther.mint.value(_sourceAmount)();
       // transfer CEther to sender
       returnAmount = _transferRemainingAssetToSender(msg.sender, address(cEther));
     }else{
       // approve erc20
       _transferFromSenderAndApproveTo(ERC20(_ercAddress), _sourceAmount, Comptroller);
       cToken = CToken(_cAddress);
       // mint
       cToken.mint(_sourceAmount);
       // transfer CToken to sender
       returnAmount = _transferRemainingAssetToSender(msg.sender, address(cToken));
     }
    }
    // Action Withdraw
    else if(_action == uint(CompoundAction.Withdraw)){
      if(_cAddress == address(cEther)){
         // approve CEther not erc20!
         _transferFromSenderAndApproveTo(ERC20(_cAddress), _sourceAmount, Comptroller);
         cEther.redeemUnderlying(_sourceAmount);
         // transfer ETH to sender
         returnAmount = _transferRemainingAssetToSender(msg.sender, ETH_TOKEN_ADDRESS);
       }else{
         _transferFromSenderAndApproveTo(ERC20(_cAddress), _sourceAmount, Comptroller);
         cToken = CToken(_cAddress);
         cToken.redeemUnderlying(_sourceAmount);
         // transfer ERC20 to sender
         returnAmount = _transferRemainingAssetToSender(msg.sender, _ercAddress);
      }
    }
    else{
      // Unknown type
       revert();
     }
  }


  /**
  * @dev Transfers tokens to this contract and approves them to another address
  *
  * @param _source          Token to transfer and approve
  * @param _sourceAmount    The amount to transfer and approve (in _source token)
  * @param _to              Address to approve to
  */
  function _transferFromSenderAndApproveTo(ERC20 _source, uint256 _sourceAmount, address _to) private {
    require(_source.transferFrom(msg.sender, address(this), _sourceAmount));

    _source.approve(_to, _sourceAmount);
  }

  // TODO Cut commision and send to registry
  function _transferRemainingAssetToSender(address sender, address asset)
  private
  returns(uint256 amount){
    if(asset == ETH_TOKEN_ADDRESS){
      amount = address(this).balance;
      (msg.sender).transfer(amount);
    }else{
      amount = ERC20(asset).balanceOf(address(this));
      ERC20(asset).transfer(msg.sender, amount);
    }
  }
}
