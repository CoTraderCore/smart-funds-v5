import "./SmartFundInterface.sol";

contract SmartFundETHInterface is SmartFundInterface{
  // deposit `amount` of tokens.
  // returns number of shares the user receives
  function deposit() external payable returns (uint256);
}
