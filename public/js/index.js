"use strict";

const TOKEN_DECIMALS = 10n ** 18n

const timerString = document.getElementById('timerString');

const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
const Fortmatic = window.Fortmatic;
const evmChains = window.evmChains;

// Web3modal instance
let web3Modal

// Chosen wallet provider given by the dialog window
let provider;


// Address of the selected account
let selectedAccount;
let userTokens = {};
let tiers = []
let plans = []
let web3;
let chains;
let chain;
let contracts;
let stakingContract;
let presaleContract;
let tokenContract;
let minBUSDval = 0;
let forSaleVal = 0;
let totalSoldVal = 0;
let leftToken = 0;
let RATEval = 0;
let endTime = 0;
let startTime = 0;
let active;
let balanceHTML;

async function init() {
  web3 = new Web3(provider);
  const accounts = await web3.eth.getAccounts();
  selectedAccount = accounts[0];
  var first = selectedAccount.slice(0, 5);
  var last = selectedAccount.slice(-3);
  document.querySelector("#btn-disconnect").textContent = first + "..." + last;
  document.querySelector("#btn-connect").style.display = "none";
  document.querySelector("#btn-disconnect").style.display = "block";
  presaleContract = new web3.eth.Contract(contracts.presaleContractData.abi, contracts.presaleContractData.address, { from: selectedAccount });
  stakingContract = new web3.eth.Contract(contracts.stakingContractData.abi, contracts.stakingContractData.address, { from: selectedAccount });
  tokenContract = new web3.eth.Contract(contracts.tokenContractData.abi, contracts.tokenContractData.address, { from: selectedAccount });

  balanceHTML.innerHTML = dec(await tokenContract.methods.balanceOf(selectedAccount).call());
  const networkId = await web3.eth.net.getId()
  if (networkId !== chain.chain_id) {

  }
}

function num(integer) {
  return integer / TOKEN_DECIMALS
}

function dec(integer) {
  return Number((Number(integer) / Number(TOKEN_DECIMALS)).toFixed(4))
}

function toDays(seconds) {
  return seconds / 86400
}

async function invest(tier, plan) {
  const amount = BigInt(document.querySelector(`#investInput_${tier}_${plan}`).value) * BigInt(TOKEN_DECIMALS)

  console.log({ tiers })
  console.log({ minDep: tiers[tier].minAmount })
  if (amount + userTokens[`${tier}:${plan}`].staking < tiers[tier].minAmount) return notify('Stake deposit is less than the tier minimum deposit', 'warning');
  if (amount + userTokens[`${tier}:${plan}`].staking > tiers[tier].maxAmount) return notify('Staking amount can not be higher than the tier maximum amount', 'warning');

  if (BigInt(await tokenContract.methods.balanceOf(selectedAccount).call()) < amount) return notify('You do not have enough MPD Tokens', 'warning');

  const allowance = BigInt(await tokenContract.methods.allowance(selectedAccount, stakingContract._address).call())

  if (allowance < amount) {
    await tokenContract.methods.approve(stakingContract._address, amount - allowance).send()
    notify('Allowance approved', 'success')
  }

  try {
    await stakingContract.methods.invest(tier, plan, amount).send()
    notify('Succesfully deposited to staking', 'success')
  } catch (err) {
    console.log(err.message)
    notify('Failed to deposit', 'error')
  }
}

async function unstake(tier, plan) {
  if (userTokens[`${tier}:${plan}`].unstaked === 0) return notify('You have 0 staking MPD Tokens', 'warning');

  try {
    await stakingContract.methods.unstake(tier, plan).send()
    notify('Succesfully unstaked', 'success')
  } catch (err) {
    console.log(err.message)
    notify('Failed to unstake', 'error')
  }
}

async function claimReward(tier, plan) {
  if (userTokens[`${tier}:${plan}`].reward === 0) return notify('You have 0 staking MPD Rewards', 'warning');

  try {
    await stakingContract.methods.claimReward(tier, plan).send()
    notify('Succesfully claimed the reward', 'success')
  } catch (err) {
    console.log(err.message)
    notify('Failed to claim the reward', 'error')
  }
}

async function restake(tier, plan) {
  if (userTokens[`${tier}:${plan}`].unstaked === 0) return alert('you have 0 staking tokens');

  try {
    await stakingContract.methods.restake(tier, plan).send()
    notify('Succesfully restaked', 'success')
  } catch (err) {
    console.log(err.message)
    notify('Failed to restake tokens', 'error')
  }
}


async function fetchStakingContractData() {
  for (let i = 0; i < 2; i++) {
    const plan = await stakingContract.methods.stakePlans(i).call()
    plans.push(plan)
  }

  let tiersHTML = document.querySelector('#tiers')

  for (let i = 0; i < 3; i++) {
    let tier = await stakingContract.methods.stakeTiers(i).call()

    tier.minAmount = BigInt(tier.minAmount)
    tier.maxAmount = BigInt(tier.maxAmount)
    tiers.push(tier)

    let tierHTML = `           
    <div class="col-12 col-sm-4">
    <div data-aos="fade-up" data-aos-duration="1000" class="aos-init aos-animate">
    <div class="${tier.name.toLowerCase()}">
      <h2 id="name">${tier.name}</h2 >
      <div class="planline"></div>

      <div class="pplanl">
        <p>Deposit</p>
        <h3>${num(tier.minAmount)} - ${num(tier.maxAmount)}</h3>
      </div>

      <p>Staking time</p>
      <h3>TBA</h3>

      <p>Requirements</p>
      <h3>-</h3>

      <div class="garant">
        <p>Guaranteed allocation</p>
        <h3 style="color: #3ddf84;">&#10003;</h3>
      </div>`

    for (let j = 0; j < plans.length; j++) {
      const stakeData = await stakingContract.methods.userTokensInContract(i, j).call()
      const reward = BigInt(await stakingContract.methods.calculateReward(i, j).call())
      console.log(reward)
      const staking = BigInt(stakeData[0])
      const unstaked = BigInt(stakeData[1])
      userTokens[`${i}:${j}`] = { staking, unstaked, reward }

      tierHTML += `
      <button class="accordion ido_button" onclick="openAcc(this)" style="width:340px">${toDays(plans[j].lockDays)} Days</button>
      <div class="panel">
        <br />
        <center><h4>${plans[j].percent}% APR</h4></center>
        <div class="planline"></div>

        <div class="stalepanel">
          <input id='investInput_${i}_${j}' type="number" class="form-control" placeholder="0 MPD">
            <button type="button" onclick="invest(${i}, ${j})" id="invest_btn" class="apply"
              style="margin-top:10px; width:100%;">Stake</button>

        </div>

        <div class="st-form">
          <div class="st-title">Staking</div>
          <div class="st-amount">${num(staking)} MPD</div>
        </div>

        <div class="st-form">
          <div class="st-title">Unstaked</div>
          <div class="st-amount">${num(unstaked)} MPD</div>

          <div class="row">
            <div class="col-6"><button onclick="restake(${i}, ${j})" type="button" class="apply"
              style="margin-top:10px; width:100%;">Restake</button></div>
            <div class="col-6"><button onclick="unstake(${i}, ${j})" type="button" class="apply"
              style="margin-top: 10px; width: 100%;">Withdraw</button></div>
          </div>
        </div>
        <div class="st-form">
            <div class="st-title">Rewards</div>
            <div class="st-amount">${dec(reward)} MPD</div>

            <div class="row">
                <div class="col-6"><button onclick="claimReward(${i}, ${j})" type="button" class="apply" style="margin-top: 10px; width: 100%;">Withdraw</button></div>
            </div>
        </div>
      </div>
      <div class="clr"></div>
      <br />`
    }

    tierHTML += `
    </div >
    </div >
    </div >`

    if (i === 0) tiersHTML.innerHTML = ''
    tiersHTML.insertAdjacentHTML('beforeend', tierHTML)
  }
}

async function fetchPresaleContractData() {
  await presaleContract.methods.getStatus().call(function (err, data) {
    if (err) { console.log(err) }
    if (data) {
      active = data;
    }
  });
  await presaleContract.methods.getRate().call(function (err, data) {
    if (err) { console.log(err) }
    if (data) {
      RATEval = parseInt(data) / 1000;
    }
  });
  await presaleContract.methods.getTotalSold().call(function (err, data) {
    if (err) { console.log(err) }
    if (data) {
      totalSoldVal = parseFloat(web3.utils.fromWei(data));
    }
  });
  await presaleContract.methods.getForSale().call(function (err, data) {
    if (err) { console.log(err) }
    if (data) {
      var td = parseFloat(web3.utils.fromWei(data));
      forSaleVal = td;
    }
  });
  await presaleContract.methods.getStartTime().call(function (err, data) {
    if (err) { console.log(err) }
    if (data) {
      startTime = parseInt(data);
    }
  });
  await presaleContract.methods.getSaleDays().call(function (err, data) {
    if (err) { console.log(err) }
    if (data) {
      endTime = parseInt(data) + startTime;
    }
  });
  await presaleContract.methods.getLeftToken().call(function (err, data) {
    if (err) { console.log(err) }
    if (data) {
      leftToken = parseFloat(web3.utils.fromWei(data));
    }
  });
}

function getTimer() {
  var diff = 0;
  if (selectedAccount) {
    if (startTime > 0 && endTime > 0) {
      if (Date.now() / 1000 > startTime && Date.now() / 1000 < endTime) {
        diff = Math.floor(endTime - (Date.now() / 1000));
        if (totalSoldVal >= forSaleVal || leftToken / RATEval < minBUSDval) {
          diff = 0;
          timerString.innerHTML = "Sale ended";
        } else {
          if (!active) {
            diff = 0;
            timerString.innerHTML = "Sale ended";
          }
        }
      } else if (Date.now() / 1000 >= endTime) {
        timerString.innerHTML = "Sale ended";
      } else {
        diff = Math.floor(startTime - (Date.now() / 1000));
      }
      if (diff > 0) {
        let days = Math.floor((diff % (60 * 60 * 60 * 24)) / (60 * 60 * 24));
        let hours = (Math.floor((diff % (60 * 60 * 60 * 24)) / (60 * 60)) < 10) ? '0' + Math.floor((diff % (60 * 60 * 60 * 24)) / (60 * 60)) : Math.floor((diff % (60 * 60 * 60 * 24)) / (60 * 60));
        let minutes = (Math.floor((diff % (60 * 60)) / 60) < 10) ? '0' + Math.floor((diff % (60 * 60)) / 60) : Math.floor((diff % (60 * 60)) / 60);
        let seconds = (Math.floor(diff % 60) < 10) ? '0' + Math.floor(diff % 60) : Math.floor(diff % 60);
        if (days == 0) {
          timerString.innerHTML = hours + ":" + minutes + ":" + seconds;
        } else {
          hours = hours - days * 24;
          timerString.innerHTML = days + " days " + hours + ":" + minutes + ":" + seconds;
        }
      }
    }
  }
}
let timerId = setInterval(() => getTimer(), 1000);

async function refreshAccountData() {
  document.querySelector("#btn-connect").style.display = "none";
  document.querySelector("#btn-disconnect").style.display = "block";
  const accounts = await web3.eth.getAccounts();
  selectedAccount = accounts[0];
  var first = selectedAccount.slice(0, 5);
  var last = selectedAccount.slice(-3);
  document.querySelector("#btn-disconnect").textContent = first + "..." + last;
  fetchPresaleContractData();
}

async function switchChain() {
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chain.hex_chain_id,
          chainName: chain.name,
          rpcUrls: [chain.rpc_url],
          nativeCurrency: chain.native_currency,
        },
      ],
    });
  } catch (error) {
    console.log(error)
  }
  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: chain.hex_chain_id }],
  });

  switchNetworkHTML.style.display = 'flex'

  refreshAccountData()

}

async function loadData() {
  await provider.enable();

  await init();
  await fetchStakingContractData();
  // await fetchPresaleContractData();
  // Subscribe to accounts change
  provider.on("accountsChanged", (accounts) => {
    refreshAccountData()
  });

  // Subscribe to chainId change
  provider.on("chainChanged", (chainId) => {
    refreshAccountData()
  });

  // Subscribe to networkId change
  provider.on("networkChanged", (networkId) => {
    refreshAccountData()
  });
}
/**
 * Connect wallet button pressed.
 */
async function onConnect() {
  alert('hey')
  try {
    provider = await web3Modal.connect();
  } catch (e) {
    return;
  }

  await init();
  await fetchPresaleContractData();
  // Subscribe to accounts change
  provider.on("accountsChanged", (accounts) => {
    refreshAccountData()
  });

  // Subscribe to chainId change
  provider.on("chainChanged", (chainId) => {
    refreshAccountData()
  });

  // Subscribe to networkId change
  provider.on("networkChanged", (networkId) => {
    refreshAccountData()
  });
}

/**
 * Disconnect wallet button pressed.
 */
async function onDisconnect() {
  if (provider.close) {
    await provider.close;
    await web3Modal.clearCachedProvider();
    await web3Modal.providerController.clearCachedProvider();
  }
  await web3Modal.providerController.clearCachedProvider();
  selectedAccount = null;
  provider = null;
  selectedAccount = null;
  document.querySelector("#btn-connect").style.display = "block";
  document.querySelector("#btn-disconnect").style.display = "none";
}


/**
 * Main entry point.
 */
window.addEventListener('load', async () => {

  const switchNetworkHTML = document.querySelector("#switchNetwork")

  chains = await (await fetch('/public/config/chains.json')).json()
  contracts = await (await fetch('/public/config/contracts.json')).json()

  chain = chains.testnet

  const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider,
      ...chain
    },
    fortmatic: {
      package: Fortmatic,
      options: {
        // Mikko's TESTNET api key
        key: "pk_test_391E26A3B43A3350"
      }
    }
  };

  document.querySelector("#btn-connect").addEventListener("click", onConnect);
  document.querySelector("#btn-disconnect").addEventListener("click", onDisconnect);

  web3Modal = new Web3Modal({
    network: chain.network,
    cacheProvider: true,
    providerOptions,
    disableInjectedProvider: false,
  });

  if (web3Modal.providerController.cachedProvider) {
    if (web3Modal.providerController.cachedProvider == "walletconnect") {
      provider = new WalletConnectProvider(chain);
      if (provider.chainId != chain.chain_id) {
        switchNetworkHTML.style.display = 'flex'
      }
    } else {
      for (var i = 0; i <= web3Modal.providerController.providers.length; i++) {
        if (web3Modal.providerController.providers[i].id == web3Modal.providerController.cachedProvider) {
          const connector = web3Modal.providerController.providerOptions[web3Modal.providerController.providers[i].id];
          const proxy = await connector;
          provider = await web3Modal.connect(proxy);
          break;
        }
      }
    }
  }

  balanceHTML = document.querySelector('#balance')
  if (provider) {
    if (provider.chainId != chain.chain_id) {
      switchNetworkHTML.style.display = 'flex'
    } else {
      loadData()
    }
  }
});
