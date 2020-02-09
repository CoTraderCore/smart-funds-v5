// for any additional defi logic like compound
pragma solidity ^0.4.24;

import "../../zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract DEFIPortal {
  CEther public cEther;
  address public Comptroller;

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
  * @param _source                  ERC20 token to convert from or Compoud token
  * @param _sourceAmount            Amount to convert from (in _source token)
  * @return The amount of _destination received from the trade
  */
  function compound(ERC20 _source, uint256 _sourceAmount, uint action)
  external
  payable
  returns(uint256)
  {
   if(action == uint(CompoundAction.Mint)){
     if(address(_source) != address(cEther)){
       // approve erc20
       _transferFromSenderAndApproveTo(_source, _sourceAmount, Comptroller);
       cToken.mint(_sourceAmount);
     }else{
       require(msg.value == _sourceAmount);
       cEther.mint.value(_sourceAmount)();
     }
    }
    else if(action == uint(CompoundAction.Withdraw)){
      if(address(_source) != address(cEther)){
        // approve cTokens
        _transferFromSenderAndApproveTo(_source, _sourceAmount, Comptroller);
        cToken.redeemUnderlying(_sourceAmount);
       }else{
        cEther.redeemUnderlying(_sourceAmount);
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
}
