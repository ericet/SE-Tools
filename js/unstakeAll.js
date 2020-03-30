const client = new dsteem.Client('https://anyx.io');
const ssc = new SSC('https://api.steem-engine.com/rpc/');
steem.api.setOptions({ url: 'https://api.steem.bts.tw' });

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
function unstakeToken(i, symbol, stake, account, activeKey) {
  if (stake > 0) {
    unstake(i, symbol, stake, account, activeKey);
  }

}

function unstake(i, symbol, stake, account, activeKey) {
  setTimeout(function () {
    var json = JSON.stringify({
      contractName: 'tokens',
      contractAction: 'unstake',
      contractPayload: {
        symbol: symbol,
        quantity: stake
      }
    });

    steem.broadcast.customJson(activeKey, [account], [], 'ssc-mainnet1', json, (err, result) => {
      if (err){
        console.log(err);
      }
      else {
        console.log(account + " unstaked " + stake + " " + symbol);
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
      let htmlString = '<table id="tokens" class="display" style="width:100%"><thead><tr><th>Select Tokens</th><th>Symbol</th><th>Staked</th></tr></thead><tbody></tbody>';
      for (var i in balance) {
        if (balance[i].stake > 0 && balance[i].symbol != 'STEEMP') {
          let value = balance[i].symbol + ':' + balance[i].stake;
          htmlString += '<tr>';
          htmlString += '<td> <input type="checkbox" id="' + balance[i].symbol + '" name="token" value="' + value + '" checked/></td>';
          htmlString += '<td>' + balance[i].symbol + '</td>';
          htmlString += '<td>' + balance[i].stake + '</td>';
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
        unstakeToken(i++, token.split(':')[0], token.split(':')[1], username, activeKey);
      });
    }
  });
});
