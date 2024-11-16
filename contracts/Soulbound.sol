// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Soulbound is ERC721, ERC721URIStorage {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    mapping(address => uint256) private _userTokens;

    event Attest(address indexed to, uint256 indexed tokenId);
    event Revoke(address indexed to, uint256 indexed tokenId);

    constructor() ERC721("Soulbound", "SLB") {
        _tokenIdCounter.increment(); // Inizia da 1
    }

    function safeMint(address to, string memory uri) public { // safeMint(address_to, cid_metadata)
        require(msg.sender == to, "You can only mint a token for yourself");

        // Controlla se l'utente ha già un token
        uint256 existingTokenId = _userTokens[to];
        if (existingTokenId != 0) {
            // Brucia il token esistente
            _burn(existingTokenId);
        }

        // Mint di un nuovo token
        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, uri);  // Come URI viene settato il CID dei metadati 

        // Aggiorna la mappatura con il nuovo token ID
        _userTokens[to] = newTokenId;
    }

    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Only the owner can burn their token");
        _burn(tokenId);
    }

    function getUserToken(address user) public view returns (uint256) {
        return _userTokens[user];
    }

    function _beforeTokenTransfer(address from, address to, uint256) pure override internal {
        require(from == address(0) || to == address(0), "Token transfers are not allowed");
    }

    function _afterTokenTransfer(address from, address to, uint256 tokenId) override internal {
        if (from == address(0)) {
            emit Attest(to, tokenId);
        } else if (to == address(0)) {
            emit Revoke(to, tokenId);
        }
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        address owner = ownerOf(tokenId); 
        super._burn(tokenId);
        _userTokens[owner] = 0; 
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
