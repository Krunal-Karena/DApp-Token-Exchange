// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "hardhat/console.sol";
import "./Token.sol";

contract Exchange {
    address public feeAccount;
    uint256 public feePercent;
    mapping(address => mapping ( address => uint256))public tokens;
    mapping(uint256 => _Order)public orders;
    mapping(uint256 => bool)public orderCancelled;
    mapping(uint256 => bool)public orderFilled;
    uint256 public orderCount;

    event Deposite ( address token,address user,uint256 amount,uint256 balance );
    event Withdraw ( address token,address user,uint256 amount,uint256 balance );
    event Order (uint256 id,address user,address tokenGet,uint256 amountGet,address tokenGive,uint256 amountGive,uint256 timestamp );
    event Cancel (uint256 id,address user,address tokenGet,uint256 amountGet,address tokenGive,uint256 amountGive,uint256 timestamp );
    event Trade (uint256 id,address user,address tokenGet,uint256 amountGet,address tokenGive,uint256 amountGive,address creator,uint256 timestamp);

    struct _Order{
        uint256 id;
        address user;
        address tokenGet;
        uint256 amountGet;
        address tokenGive;
        uint256 amountGive;
        uint256 timestamp;
    }
 
    constructor(address _feeAccount,uint256 _feePercent){
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    function depositToken(address _token,uint256 _amount) public {
        //transfer tokens
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));

        //update balance
        tokens[_token][msg.sender] = tokens[_token][msg.sender] + _amount;
    
        //emit an event
        emit Deposite(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function withdrawToken(address _token,uint256 _amount) public {
        //ensure user has enough balance
        require(tokens[_token][msg.sender] >= _amount);

        // update user balance
        Token(_token).transfer(msg.sender, _amount);
        //transfer token to user 
        tokens[_token][msg.sender] = tokens[_token][msg.sender] - _amount;
        //emit event
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    //check balances
    function balanceOf (address _token,address _user)
    public
    view
    returns(uint256)
    {
        return tokens[_token][_user];
    }


    // Make & cancel orders

    function makeOrder (address _tokenGet,uint256 _amountGet,address _tokenGive,uint256 _amountGive) 
    public
    {
        require(balanceOf(_tokenGive,msg.sender)>= _amountGive);
        orderCount = orderCount + 1;
        orders[orderCount] = _Order(orderCount,msg.sender,_tokenGet,_amountGet,_tokenGive,_amountGive,block.timestamp);
        
        emit Order(orderCount,msg.sender,_tokenGet,_amountGet,_tokenGive,_amountGive,block.timestamp);
    }

    function cancelOrder(uint256 _id)
    public{
        _Order storage _order = orders[_id];
        orderCancelled[_id] = true;
        require(address(_order.user) == msg.sender);
        require(_order.id == _id);
        emit Cancel(_order.id,msg.sender,_order.tokenGet,_order.amountGet,_order.tokenGive,_order.amountGive,block.timestamp);
    }

    //fill order
    function fillOrder (uint256 _id) public {
        require(_id >= 0 && _id <= orderCount,'order must exist');
        require(!orderFilled[_id]);
        require(!orderCancelled[_id]);

        _Order storage _order = orders[_id];

        trade(_order.id,_order.user,_order.tokenGet,_order.amountGet,_order.tokenGive,_order.amountGive);

        orderFilled[_id] = true;
    }

    function trade(uint256 _orderId , address _user , address _tokenGet , uint256 _amountGet , address _tokenGive,uint256 _amountGive) internal {
        
        uint256 _feeAmount = (_amountGet * feePercent ) /100;

        tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender] - (_amountGet + _feeAmount);
        tokens[_tokenGet][_user] = tokens[_tokenGet][_user] + _amountGet;

        //charge fee
        tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount] + _feeAmount;

        tokens[_tokenGive][_user] = tokens[_tokenGive][_user] - _amountGive;
        tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender] + _amountGive;

        emit Trade(_orderId,msg.sender,_tokenGet,_amountGet,_tokenGive,_amountGive,_user,block.timestamp);

    }
} 