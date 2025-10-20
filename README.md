# CrediChain

## Ethereum Transaction History Integration

This project now includes integration with the Etherscan API to fetch transaction history for connected wallets. 

Key features:
- Fetches both normal ETH transactions and ERC-20 token transfers
- Supports multiple Ethereum networks (Mainnet, Sepolia, Holesky, etc.)
- Uses API key: `91WBR32VV7QPMZCNPQP8U557NTBWB969TG`
- Combines local cached transactions with live data from Etherscan

## Global Network Switching

The application now supports global network switching, meaning when a user changes the network in one component, that change is reflected across all components in the application.

Key features:
- Centralized network state management
- Real-time updates across all components
- Integration with MetaMask network switching
- Network persistence in localStorage

For detailed implementation information, see [GLOBAL_NETWORK_SWITCHING.md](GLOBAL_NETWORK_SWITCHING.md)

For detailed implementation information, see [ETHEREUM_INTEGRATION.md](ETHEREUM_INTEGRATION.md)

## Troubleshooting Transaction History

If transaction history is not loading:
1. Check browser console for errors
2. Verify you're connected to a supported network (Mainnet, Sepolia)
3. Ensure the wallet address has transactions
4. Check if Etherscan API is responding (temporary outages can occur)
5. Try refreshing the page
