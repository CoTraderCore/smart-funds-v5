import "./SmartFundInterface.sol";

contract SmartFundUSDInterface is SmartFundInterface{
  // deposit `amount` of tokens.
  // returns number of shares the user receives
  function deposit(uint256 depositAmount) external returns (uint256);
}
