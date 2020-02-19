import "../../zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract SmartFundInterface {
  // the total number of shares in the fund
  uint256 totalShares;

  // how many shares belong to each address
  mapping (address => uint256) public addressToShares;
  // sends percentage of fund tokens to the user
  // function withdraw() external;
  function withdraw(uint256 _percentageWithdraw) external;

  // for smart fund owner to trade tokens
  function trade(
    ERC20 _source,
    uint256 _sourceAmount,
    ERC20 _destination,
    uint256 _type,
    bytes32[] additionalArgs,
    bytes _additionalData
  )
    external;

  function buyPool(
    uint256 _amount,
    uint _type,
    ERC20 _poolToken
  )
    external;

  function sellPool(
    uint256 _amount,
    uint _type,
    ERC20 _poolToken
  )
    external;

  // calculates the number of shares a buyer will receive for depositing `amount` of ether
  function calculateDepositToShares(uint256 _amount) public view returns (uint256);
}
