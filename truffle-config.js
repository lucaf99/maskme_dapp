module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545, // Porta predefinita per Ganache
      network_id: "*", // Per ogni id network
      chain_id: 1337,
    },
  },
  compilers: {
    solc: {
      version: "0.8.4", // Versione Solidity
    },
  },
};
