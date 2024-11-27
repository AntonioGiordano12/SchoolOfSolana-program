# Game of Life Frontend

A Next.js-based frontend for the Game of Life Solana program, built using the Solana dApp Scaffold. This frontend provides an interactive interface for users to create, view, and interact with Game of Life instances on the Solana blockchain.

## Quick Start 🚀

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

💡 **Note**: This frontend connects to the Game of Life program on Devnet. For program details, see [anchor_project/README.md](../anchor_project/README.md).

For detailed setup and configuration, see [Local Development Setup](#local-development-setup) below.

## Features

- **Interactive Game Creation**: Create new Game of Life instances with custom initial states
- **Game Visualization**: View the evolution of game states directly in the browser
- **Social Interaction**: Star your favorite games and discover games created by other users
- **Wallet Integration**: Seamless connection with Solana wallets
- **Real-time Updates**: Track game states and user interactions on the blockchain

## Prerequisites

- Node.js 14+ 
- NPM or Yarn
- A Solana wallet (Phantom, Solflare, etc.)
- Solana program deployed and initialized on devnet

## Local Development Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser

## Project Structure

The frontend is organized as follows:

- `components/`: React components for the UI
- `views/`: Main page views and layouts
- `hooks/`: Custom React hooks for blockchain interaction
- `utils/`: Utility functions and helpers
- `public/`: Static assets

## Connecting to the Program

The frontend interacts with the Game of Life program on Devnet:
- Program ID: `Ge1ccFAwTuKgMY3AYpa9QsU5xCWce9iRiGiSaFa6NL1j`
- Network: Devnet (make sure your wallet is connected to Devnet)

## User Interface

The application provides several key interfaces:

- Gallery page with all the games
- Game creation interface
- Game viewer with evolution controls
- Starring system to favorite games

## Technical Details

Built with:
- Next.js 13
- Solana Web3.js
- Anchor Framework
- TailwindCSS
- Solana Wallet Adapter

## Future Improvements

- Implement social sharing features
- Add more interactive game controls
- Enhance mobile responsiveness
- Add game statistics and analytics
- Propose initial config or patterns for the Game of Life
- Deploy the frontend to a production environment
