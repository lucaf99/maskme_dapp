const DataMaskRegistry = artifacts.require("DataMaskRegistry");
const Soulbound = artifacts.require("Soulbound");

module.exports = function(deployer) {
  deployer.deploy(DataMaskRegistry);
  deployer.deploy(Soulbound);
};
