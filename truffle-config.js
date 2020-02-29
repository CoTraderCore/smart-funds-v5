module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    // truffle develop
    development: {
      host: '127.0.0.1',
      port: 9545,
      network_id: '*', // Match any network id
    },
    // ganache-cli
    ganacheCLI: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
    },
    // Ganache UI
    ganacheUI: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*',
    },
  },
  // be careful with this. see here: https://github.com/trufflesuite/truffle-compile/pull/5
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  // uncomment this to use gas reporter (slows down tests a tonne)
  // mocha: {
  //   reporter: 'eth-gas-reporter',
  //   reporterOptions : {
  //     currency: 'USD',
  //     gasPrice: 10,
  //   },
  // },
  coverage: {
    host: 'localhost',
    network_id: '*',
    port: 8555, // <-- If you change this, also set the port option in .solcover.js.
    gas: 0xfffffffffff, // <-- Use this high gas value
    gasPrice: 0x01, // <-- Use this low gas price
  },
}
