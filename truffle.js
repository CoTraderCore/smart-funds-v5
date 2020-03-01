require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gasLimit: 12000000,
      gas: 12000000
    }
  },
  compilers: {
     solc: {
       version: "0.4.24",  // ex:  "0.4.20". (Default: Truffle's installed solc)
       optimizer: {
       enabled: true,
       runs: 200
      }
    }
  }
};
