// for any additional defi logic like compound
pragma solidity ^0.4.24;

import "../../zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../../compound/CEther.sol";
import "../../compound/CToken.sol";
import "../../compound/IComptroller.sol";

contract DEFIPortal {
  CEther public cEther;
  CToken cToken;
  IComptroller public Comptroller;
  address constant private ETH_TOKEN_ADDRESS = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

  enum CompoundAction { Mint, Borrow, Withdraw }

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
    Comptroller = IComptroller(_Comptroller);
  }

  /**
  * @dev Facilitates for borrow, withdraw, liquidate or mint from Compound
  *
  * @param _fromAddress              from token
  * @param _toAddress                to token, for eth operation just set 0x address
  * @param _sourceAmount             amount to convert from (in _source token)
  * @return The amount of _destination received from the trade
  */
  function compound(
    address _fromAddress,
    address _toAddress,
    uint256 _sourceAmount,
    uint _action
  )
  external
  payable
  returns(uint256 returnAmount){

   // Action Mint
   if(_action == uint(CompoundAction.Mint)){
     if(_fromAddress == address(cEther)){
       require(msg.value == _sourceAmount);
       cEther.mint.value(_sourceAmount)();
       // transfer CEther to sender
       returnAmount = _transferRemainingAssetToSender(msg.sender, address(cEther));
     }else{
       // approve erc20
       _transferFromSenderAndApproveTo(ERC20(_toAddress), _sourceAmount, address(Comptroller));
       cToken = CToken(_fromAddress);
       // mint
       cToken.mint(_sourceAmount);
       // transfer CToken to sender
       returnAmount = _transferRemainingAssetToSender(msg.sender, address(cToken));
     }
    }

    // Action Borrow
    else if(_action == uint(CompoundAction.Borrow)){
      _transferFromSenderAndApproveTo(ERC20(_fromAddress), _sourceAmount, address(Comptroller));
      if(_toAddress == address(cEther)){
        cEther.borrow(_sourceAmount);
      }else{
        cToken = CToken(_toAddress);
        cToken.borrow(_sourceAmount);
      }
      // transfer ERC20 to sender
      returnAmount = _transferRemainingAssetToSender(msg.sender, _toAddress);
    }

    // Action Withdraw
    else if(_action == uint(CompoundAction.Withdraw)){
      // approve CEther not erc20!
      _transferFromSenderAndApproveTo(ERC20(_fromAddress), _sourceAmount, address(Comptroller));
      if(_fromAddress == address(cEther)){
         cEther.redeemUnderlying(_sourceAmount);
         // transfer ETH to sender
         returnAmount = _transferRemainingAssetToSender(msg.sender, ETH_TOKEN_ADDRESS);
       }else{
         cToken = CToken(_fromAddress);
         cToken.redeemUnderlying(_sourceAmount);
         // transfer ERC20 to sender
         returnAmount = _transferRemainingAssetToSender(msg.sender, _toAddress);
      }
    }
    else{
      // Unknown type
       revert();
     }
  }

  function compoundEnterMarkets(address[] memory cTokens) public {
    Comptroller.enterMarkets(cTokens);
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
      (sender).transfer(amount);
    }else{
      amount = ERC20(asset).balanceOf(address(this));
      ERC20(asset).transfer(sender, amount);
    }
  }
}
