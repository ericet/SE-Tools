const client = new dsteem.Client('https://api.steem.buzz');
const ssc = new SSC('https://api.steem-engine.com/rpc/');
steem.api.setOptions({ url: 'https://api.steem.buzz' });

// Checking if the already exists
async function checkAccountName(username) {
  const ac = await client.database.call('lookup_account_names', [[username]]);
  return (ac[0] === null) ? false : true;
}

function transfer(i, from,to, amount,token,memo,activeKey){
  setTimeout(function () {
    let json = JSON.stringify({
      contractName: 'tokens',
      contractAction: 'transfer',
      contractPayload: {
        symbol: token,
        to: to,
        quantity: amount,
        memo:memo
      }
    });

    steem.broadcast.customJson(activeKey, [from], [], 'ssc-mainnet1', json, (err, result) => {
      if (err){
        logit($('#log'), `Failed to transfer ${amount} ${token} to @${to}`);
      }
      else {
        logit($('#log'), `Successfully transferred ${amount} ${token} to @${to}`);
      }

    });
  }, (+i + +1) * 1000);
}

async function getUserBalance(username, limit = 1000, offset = 0) {
  return new Promise((resolve, reject) => {
    ssc.find(
      'tokens',
      'balances',
      { account: username },
      limit,
      offset,
      [],
      (err, result) => {
        resolve(result);
      }
    );
  });
}

function logit(dom, msg) {
  if ((msg == undefined) || (msg == null)|| (msg == '')) {
      return;
  }
  var d = new Date();
  var n = d.toLocaleTimeString();    
  var s = dom.val();
  dom.val((s + "\n" + n + ": " + msg).trim());
}

$(document).ready(async function () {
  $('#username').keyup(async function () {
    let tokens = document.getElementById('token');
    const balance = await getUserBalance($(this).val());
    let htmlString='';
    let length = tokens.options.length;
for (i = 0; i < length; i++) {
  tokens.options[i] = null;
}
    if (balance.length > 0) {
      for (var i in balance) {
        if (balance[i].balance > 0) {
          let value = balance[i].symbol + ' (' + balance[i].balance+')';
          if(balance[i].symbol==='STEEMP'){
            htmlString += '<option value="'+balance[i].symbol+'" selected>'+value+'</option>';
          }else{
          htmlString += '<option value="'+balance[i].symbol+'">'+value+'</option>';
          }
        }
      }
      tokens.innerHTML +=htmlString;
    }
  });

  $('#transfer').submit(async function (e) {
    e.preventDefault();
    const username = $("#username").val().trim();
    const activeKey = $('#active-key').val().trim();
    const amount = $("#amount").val().trim();
    const token = $("#token").val();
    const memo = $("#memo").val().trim();
    const accounts = $("#accounts").val().trim();
    if (steem.utils.validateAccountName(username) !== null) {
      alert('Invalid Steem ID');
      $("#username").focus();
      return;
    }
    if (activeKey =='') {
      alert('Your Private Active Key is missing.');
      $("#active-key").focus();
      return;
    }  
    if (token =='') {
      alert('Your do not have any available Steem-Engine Tokens.');
      $("#token").focus();
      return;
    }  
    if (accounts =='') {
      alert('Please enter accounts.');
      $("#accounts").focus();
      return;
    }  
    let addresses = accounts.split("\n");
    if(addresses!=''){
      for (let i in addresses){
        let account = addresses[i].trim().replace('@', '');
        let validAccount = await checkAccountName(account);
        if(validAccount){
          transfer(i, username,account, amount,token,memo,activeKey)
        }else{
          logit($('#log'), account+" is an invalid steem ID");
        }
        
      }
    }
  });
});
