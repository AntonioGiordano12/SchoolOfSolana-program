// TODO: SignMessage
import { verify } from '@noble/ed25519';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { FC, useCallback, useState, useEffect } from 'react';
import { notify } from "../utils/notifications";

import { Program, AnchorProvider, web3, utils, BN, setProvider } from "@coral-xyz/anchor"
import idl from "./game_of_life.json"
import { GameOfLife } from './game_of_life';
import { PublicKey } from '@solana/web3.js';

import { GAME_SEED } from '../constants';

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.address)


const GRID_SIZE = 64; // 64x64 grid
const CELL_SIZE = 10; // Smaller cell size for the larger grid

function serializeBitmap(aliveCells: Array<[number, number]>): Uint8Array {
    const bitmap = new Uint8Array((GRID_SIZE * GRID_SIZE) / 8);
    for (const [row, col] of aliveCells) {
        if (row >= GRID_SIZE || col >= GRID_SIZE) {
            throw new Error(`Invalid cell position: (${row}, ${col}) exceeds grid size.`);
        }
        const bitIndex = row * GRID_SIZE + col;
        const byteIndex = Math.floor(bitIndex / 8);
        const bitOffset = bitIndex % 8;
        bitmap[byteIndex] |= 1 << bitOffset;
    }
    return bitmap;
}

function computeNextGeneration(currentGrid: boolean[][]): boolean[][] {
    const newGrid = currentGrid.map(row => [...row]);
    
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            let neighbors = 0;
            
            // Check all 8 neighbors
            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    if (di === 0 && dj === 0) continue;
                    
                    const ni = (i + di + GRID_SIZE) % GRID_SIZE;
                    const nj = (j + dj + GRID_SIZE) % GRID_SIZE;
                    
                    if (currentGrid[ni][nj]) neighbors++;
                }
            }
            
            // Apply Conway's Game of Life rules
            if (currentGrid[i][j]) {
                newGrid[i][j] = neighbors === 2 || neighbors === 3;
            } else {
                newGrid[i][j] = neighbors === 3;
            }
        }
    }
    
    return newGrid;
}

function areGridsEqual(grid1: boolean[][], grid2: boolean[][]): boolean {
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (grid1[i][j] !== grid2[i][j]) return false;
        }
    }
    return true;
}

export const CreateGameOfLife: FC = () => {
    const ourWallet = useWallet();
    const { connection } = useConnection();
    
    const getProvider = () => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        setProvider(provider)
        return provider
    };
    
    const anchProvider = getProvider();
    const program = new Program<GameOfLife>(idl_object, anchProvider);

    const [gameName, setGameName] = useState('');
    const [grid, setGrid] = useState(() => Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false)));
    const [isPlayMode, setIsPlayMode] = useState(false);
    const [gameHistory, setGameHistory] = useState<boolean[][][]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [cycleDetected, setCycleDetected] = useState<number | null>(null);
    const [reachedEnd, setReachedEnd] = useState(false);
    const [initialGrid, setInitialGrid] = useState<boolean[][]>([]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentStep(step => {
                    if (step < gameHistory.length - 1) {
                        return step + 1;
                    }
                    if (!cycleDetected) {
                        setReachedEnd(true);
                    }
                    setIsPlaying(false);
                    return step;
                });
            }, 500);
        }
        return () => clearInterval(interval);
    }, [isPlaying, gameHistory.length, cycleDetected]);

    const generateMoreGenerations = () => {
        let currentGrid = gameHistory[gameHistory.length - 1];
        const newHistory = [...gameHistory];
        
        // Generate 100 more generations
        for (let i = 0; i < 100; i++) {
            const nextGrid = computeNextGeneration(currentGrid);
            
            // Check for cycles by comparing with previous generations
            for (let j = 0; j < newHistory.length; j++) {
                if (areGridsEqual(nextGrid, newHistory[j])) {
                    setCycleDetected(j);
                    setReachedEnd(false);
                    return;
                }
            }
            
            newHistory.push(nextGrid);
            currentGrid = nextGrid;
        }
        
        setGameHistory(newHistory);
        setReachedEnd(false);
    };

    const startGame = () => {
        const history = [grid];
        let currentGrid = grid;
        
        // Store the initial grid configuration
        setInitialGrid([...grid.map(row => [...row])]);
        
        // Generate initial 100 generations
        for (let i = 0; i < 100; i++) {
            const nextGrid = computeNextGeneration(currentGrid);
            
            // Check for cycles
            for (let j = 0; j < history.length; j++) {
                if (areGridsEqual(nextGrid, history[j])) {
                    setCycleDetected(j);
                    break;
                }
            }
            
            if (cycleDetected !== null) break;
            
            history.push(nextGrid);
            currentGrid = nextGrid;
        }
        
        setGameHistory(history);
        setCurrentStep(0);
        setIsPlayMode(true);
        setReachedEnd(false);
    };

    const handleCellClick = (row: number, col: number) => {
        if (isPlayMode) return; // Disable cell clicking in play mode
        const newGrid = grid.map((rowArray, rowIndex) =>
            rowArray.map((cell, colIndex) =>
                rowIndex === row && colIndex === col ? !cell : cell
    )
);
setGrid(newGrid);
};

    const createGame = async () => {
        const [gamePda, gameBump] = getGameAddress(anchProvider.publicKey, gameName, program.programId)

        if (!gameName.trim()) {
            notify({ type: 'error', message: 'Please enter a game name!' });
            return;
        }

        // Get both initial and current configurations
        const initialAliveCells: Array<[number, number]> = [];
        const currentAliveCells: Array<[number, number]> = [];

        initialGrid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell) {
                    initialAliveCells.push([rowIndex, colIndex]);
                }
            });
        });

        gameHistory[currentStep].forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell) {
                    currentAliveCells.push([rowIndex, colIndex]);
                }
            });
        });

        if (initialAliveCells.length === 0) {
            notify({ type: 'error', message: 'Initial configuration must have at least one cell!' });
            return;
        }

        try {
            const initialBitmap = Buffer.from(serializeBitmap(initialAliveCells));
            const currentBitmap = Buffer.from(serializeBitmap(currentAliveCells));
            
            const tx = await program.methods
                .initialize(gameName, initialBitmap)
                .accounts({
                    gameOwner: anchProvider.publicKey,
                })
                .rpc();

            console.log("Game saved! - Transaction signature:", tx);
            notify({ type: 'success', message: `Game saved at generation ${currentStep}!` });
        } catch (error) {
            console.error("Error saving game:", error);
            notify({ type: 'error', message: 'Failed to save the game. Please try again.' });
        }
    };

    const getGameAddress = function (ownerKey, gameId, programId) {
        const paddedGameId = Buffer.alloc(32);
        const encodedGameId = Buffer.from(gameId, 'utf8');
        paddedGameId.set(encodedGameId.subarray(0, Math.min(encodedGameId.length, 32)));
        return PublicKey.findProgramAddressSync(
            [
                Buffer.from(GAME_SEED),
                ownerKey.toBuffer(),
                paddedGameId,
            ],
            programId
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-md flex justify-between items-center">
                <input
                    type="text"
                    maxLength={32}
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="Enter game name (max 32 characters)"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                    disabled={isPlayMode}
                />
            </div>

            <div className="border border-gray-300 rounded-lg p-2 overflow-auto">
                <div className="grid" style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                    gap: '1px',
                }}>
                    {(isPlayMode ? gameHistory[currentStep] : grid).map((row, rowIndex) => (
                        row.map((cell, colIndex) => (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                onClick={() => handleCellClick(rowIndex, colIndex)}
                                style={{
                                    width: `${CELL_SIZE}px`,
                                    height: `${CELL_SIZE}px`,
                                    cursor: isPlayMode ? 'default' : 'pointer',
                                }}
                                className={`border transition-colors duration-200 ${
                                    cell
                                        ? 'bg-indigo-500'
                                        : 'bg-white'
                                    }${!isPlayMode ? ' hover:bg-gray-100' : ''
                                }`}
                            />
                        ))
                    ))}
                </div>
            </div>

            <div className="flex gap-4">
                {!isPlayMode ? (
                    <>
                        <button
                            className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                            onClick={createGame}
                            disabled={!ourWallet}
                        >
                            <div className="hidden group-disabled:block">
                                Wallet not connected
                            </div>
                            <span className="block group-disabled:hidden">
                                Save Game
                            </span>
                        </button>
                        <button
                            className="group w-60 m-2 btn bg-gradient-to-br from-green-500 to-emerald-500 hover:from-white hover:to-green-300 text-black"
                            onClick={startGame}
                        >
                            Start Game
                        </button>
                    </>
                ) : (
                    <div className="flex gap-2 items-center">
                        <button
                            className="px-4 py-2 bg-gray-200 rounded-lg"
                            onClick={() => setCurrentStep(step => Math.max(0, step - 1))}
                            disabled={currentStep === 0}
                        >
                            ←
                        </button>
                        <button
                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg"
                            onClick={() => setIsPlaying(!isPlaying)}
                        >
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>
                        <button
                            className="px-4 py-2 bg-gray-200 rounded-lg"
                            onClick={() => setCurrentStep(step => Math.min(gameHistory.length - 1, step + 1))}
                            disabled={currentStep === gameHistory.length - 1}
                        >
                            →
                        </button>
                        <span className="ml-2">
                            Generation: {currentStep}
                            {cycleDetected !== null && currentStep >= cycleDetected && 
                                ` (Cycle detected from generation ${cycleDetected})`}
                        </span>
                        {reachedEnd && !cycleDetected && (
                            <button
                                className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
                                onClick={generateMoreGenerations}
                            >
                                Generate More
                            </button>
                        )}
                        <button
                            className="group w-40 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                            onClick={createGame}
                            disabled={!ourWallet || isPlaying}
                        >
                            <div className="hidden group-disabled:block">
                                {!ourWallet ? 'Wallet not connected' : 'Pause to save'}
                            </div>
                            <span className="block group-disabled:hidden">
                                Save Game
                            </span>
                        </button>
                        <button
                            className="ml-4 px-4 py-2 bg-red-500 text-white rounded-lg"
                            onClick={() => {
                                setIsPlayMode(false);
                                setIsPlaying(false);
                                // Update the grid to match the current state
                                setGrid(gameHistory[currentStep]);
                            }}
                        >
                            Exit
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
