import "./CToken.sol";

contract IPriceOracle {
  function getUnderlyingPrice(CToken cToken) external view returns (uint);
}
