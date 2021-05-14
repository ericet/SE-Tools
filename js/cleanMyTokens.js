const client = new dsteem.Client('https://api.steem.buzz');
const ssc = new SSC('https://api.steem-engine.net/rpc/');
steem.api.setOptions({ url: 'https://api.steem.buzz' });

// Checking if the already exists
async function checkAccountName(username) {
  const ac = await client.database.call('lookup_account_names', [[username]]);
  return (ac[0] === null) ? true : false;
}

// Returns an account's Resource Credits data
async function getRC(username) {
  return client.call('rc_api', 'find_rc_accounts', { accounts: [username] });
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
function getTokenBidPrice(symbol, limit = 1000, offset = 0, holders = []) {
  return new Promise((resolve, reject) => {
    ssc.find(
      'market',
      'metrics', {
      'symbol': symbol
    },
      limit,
      offset,
      [],
      (err, result) => {
        if (result.length) {
          holders = [...holders, ...result];
          resolve(holders[0].highestBid);
        }

      });
  });

}
async function sellToken(i, symbol, balance, account, activeKey) {
  var price = await getTokenBidPrice(symbol);
  if (balance > 0 && price > 0) {
    sell(i, symbol, balance, price, account, activeKey);
  }

}

function sell(i, symbol, balance, price, account, activeKey) {
  setTimeout(function () {
    var json = JSON.stringify({
      contractName: 'market',
      contractAction: 'sell',
      contractPayload: {
        symbol: symbol,
        quantity: balance,
        price: price
      }
    });

    steem.broadcast.customJson(activeKey, [account], [], 'ssc-mainnet1', json, (err, result) => {
      if (err){
        console.log(err);
      }
      else {
        console.log(account + " sold " + balance + " " + symbol + " at " + price + " steem");
      }

    });
  }, (+i + +1) * 1000);


}

(function () {
  if (!console) {
    console = {};
  }
  var logger = document.getElementById('log');
  console.log = function (message) {
    if (typeof message == 'object') {
      logger.innerHTML += (JSON && JSON.stringify ? JSON.stringify(message) : String(message)) + '<br />';
    } else {
      logger.innerHTML += message + '<br />';
    }
  }
})();

$(document).ready(async function () {
  $('#username').keyup(async function () {
    const parent = $(this).parent('.form-group');
    const balance = await getUserBalance($(this).val());
    if (balance.length > 0) {
      let htmlString = '<table id="tokens" class="display" style="width:100%"><thead><tr><th>Select Tokens</th><th>Symbol</th><th>Balance</th></tr></thead><tbody></tbody>';
      for (var i in balance) {
        if (balance[i].balance > 0 && balance[i].symbol != 'STEEMP') {
          let value = balance[i].symbol + ':' + balance[i].balance;
          htmlString += '<tr>';
          htmlString += '<td> <input type="checkbox" id="' + balance[i].symbol + '" name="token" value="' + value + '" checked/></td>';
          htmlString += '<td>' + balance[i].symbol + '</td>';
          htmlString += '<td>' + balance[i].balance + '</td>';
          htmlString += '</tr>';
        }
      }
      htmlString += '</tbody></table>';
      parent.find('.display').remove();
      parent.append(htmlString);
    }
  });

  // Processisng cleanup
  $('#cleanup').submit(async function (e) {
    e.preventDefault();
    let tokens = [];
    $.each($("input[name='token']:checked"), function () {
      tokens.push($(this).val());
    });

    const username = $('#username').val();
    const activeKey = $('#active-key').val();
    if (activeKey) {
      let i = 0;
      tokens.forEach(token => {
        sellToken(i++, token.split(':')[0], token.split(':')[1], username, activeKey);
      });
    }
  });
});
