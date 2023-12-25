require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const privateKeys = process.env.PRIVATE_KEYS || ""

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks : {
    localhost : {
      url : "http://127.0.0.1:8545/"
    },
    mumbai :{
      url : `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts : privateKeys.split(",") 
    }
  },
};
