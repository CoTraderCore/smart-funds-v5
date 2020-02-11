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

  // TEST Methods for borrow
  // _ercAddress - cToken address
  function borrowERCviaETH(uint256 _amount, address _token) external payable{
    require(msg.value == _amount);
    cEther.mint.value(_amount)();

    cToken = CToken(_token);

    // should calculate by rate
    uint256 borrowAmount = 1;

    cToken.borrow(borrowAmount);

    address underlyingAddress = cToken.underlying();
    _transferRemainingAssetToSender(msg.sender, _token);
    _transferRemainingAssetToSender(msg.sender, underlyingAddress);
  }

  // _ercAddress - cToken address
  function borrowETHviaERC(uint256 _amount, address _token) external{
    cToken = CToken(_token);
    address underlyingAddress = cToken.underlying();

    // approve erc20 to CToken contract
    _transferFromSenderAndApproveTo(ERC20(underlyingAddress), _amount, _token);
    // mint
    cToken.mint(_amount);

    // should calculate by rate
    uint256 borrowAmount = 1;

    cEther.borrow(borrowAmount);

    _transferRemainingAssetToSender(msg.sender, ETH_TOKEN_ADDRESS);
    _transferRemainingAssetToSender(msg.sender, _token);
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
