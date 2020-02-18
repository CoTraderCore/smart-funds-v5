import "../../zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract PoolPortalInterface {
  function buyPool
  (
    uint256 _amount,
    uint _type,
    ERC20 _poolToken,
    bytes32[] _additionalArgs
  )
  external
  payable;

  function sellPool
  (
    uint256 _amount,
    uint _type,
    ERC20 _poolToken,
    bytes32[] _additionalArgs
  )
  external
  payable;

  function getBacorConverterAddressByRelay(address relay)
  public
  view
  returns(address converter);

  function getBancorConnectorsAmountByRelayAmount
  (
    uint256 _amount,
    ERC20 _relay
  )
  public view returns(uint256 bancorAmount, uint256 connectorAmount);

  function getBancorConnectorsByRelay(address relay)
  public
  view
  returns(
    ERC20 BNTConnector,
    ERC20 ERCConnector
  );

  function getBancorRatio(address _from, address _to, uint256 _amount)
  public
  view
  returns(uint256);

  function getUniswapConnectorsAmountByPoolAmount(
    uint256 _amount,
    address _exchange
  )
  public
  view
  returns(uint256 ethAmount, uint256 ercAmount);

  function getUniswapTokenAmountByETH(address _token, uint256 _amount)
  public
  view
  returns(uint256);
}
