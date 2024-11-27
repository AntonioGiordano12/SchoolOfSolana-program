# Game of Life - Solana Program

A blockchain implementation of Conway's Game of Life built on Solana using the Anchor framework. This project demonstrates the use of Program Derived Addresses (PDAs) for game state management and user interactions on the Solana blockchain.

## Project Overview

The Game of Life is a cellular automaton simulation where cells evolve based on their neighbors' states. This implementation brings the classic game to the Solana blockchain, allowing users to:
- Create new game instances with custom initial states
- Track game evolution on-chain
- Interact with games through a starring mechanism
- Browse and discover other users' game configurations

## Quick Start 🚀

1. Clone and install:
```bash
cd anchor_project/game-of-life
npm install
```

2. Deploy and initialize (one command):
```bash
npm run deploy-and-init
```

⚠️ **CRITICAL**: The feed system MUST be initialized for the program to work. The `deploy-and-init` command above handles this automatically. If deploying manually, remember to run `npm run initialize-feed` after deployment.

For detailed setup and development instructions, see [Local Development Setup](#local-development-setup) below.

### Technical Implementation

The program utilizes PDAs for:
- Storing game states
- Managing user interactions (starring system)
- Maintaining a feed of created games

## Deployment

- Program ID: `Ge1ccFAwTuKgMY3AYpa9QsU5xCWce9iRiGiSaFa6NL1j` (stored in `id.json`)
- Network: Devnet
- Frontend: [Link to deployed frontend - Coming soon]

## Local Development Setup

### Prerequisites

- Node.js
- Rust and Cargo
- Solana CLI tools
- Anchor CLI

### Building and Testing the Anchor Program

1. Clone the repository
2. Install dependencies:
```bash
cd anchor_project/game-of-life
npm install
```

3. Configure for local testing:
   - Open `Anchor.toml`
   - Change the cluster to `localnet` for local testing:
     ```toml
     [provider]
     cluster = "localnet"
     ```

4. Build the program:
```bash
anchor build
```

5. Run tests locally:
```bash
anchor test
```

Note: While the program is deployed on devnet, testing should be done locally due to devnet airdrop limitations that affect account creation and transaction signing during tests.

### Available Commands

⚠️ **IMPORTANT**: After deploying the program, you MUST initialize the feed system using either `npm run initialize-feed` or `npm run deploy-and-init`. The program will not function correctly without this initialization step, as the feed system is essential for tracking and displaying games.

- `npm run deploy-and-init` - Deploy and initialize the feed system in one command (RECOMMENDED)
- `npm run deploy` - Deploy the program using the keypair in `id.json`
- `npm run initialize-feed` - Initialize the feed system (REQUIRED if not using `deploy-and-init`)

## Frontend

The frontend application is built using Next.js framework (from the solana dapp scaffold) and allows users to:
- Create new game instances
- View game evolution
- Star favorite games
- Browse other users' games

### Running Frontend Locally

1. go into the frontend directory
2. check the `README.md`

## Project Structure

The program is structured with the following main components:

- Game initialization
- Feed system for tracking games
- User interaction through starring mechanism

## Future Improvements

- Implement a minting system for NFTs
- Allow game authors to edit or delete their games
- Make use of the iteration field in game accounts to reload a game from a specific iteration
- Add more features and interactive elements to the frontend
- Deploy and host the frontend on a public server
