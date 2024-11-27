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

import { GAME_SEED, STAR_SEED } from '../constants';

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.address)

// Grid size and cell size
const GRID_SIZE = 64; // 64x64 grid
let CELL_SIZE = 10; // Smaller cell size for the larger grid

interface GameOfLifeProps {
    mode: 'create' | 'play';
    gameData?: {
        gameId: string;
        gameAuthor: PublicKey;
        aliveCells: boolean[][];
        stars: number;
        pubkey: PublicKey;
    };
    onExit?: () => void;
}

export const CreateGameOfLife: FC<GameOfLifeProps> = ({ mode, gameData, onExit }) => {
    const ourWallet = useWallet();
    const { connection } = useConnection();
    
    const getProvider = () => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        setProvider(provider)
        return provider
    };
    
    const anchProvider = getProvider();
    const program = new Program<GameOfLife>(idl_object, anchProvider);

    const [gameName, setGameName] = useState(mode === 'play' ? gameData?.gameId || '' : '');
    const [grid, setGrid] = useState(() => {
        if (mode === 'play' && gameData?.aliveCells) {
            return gameData.aliveCells;
        }
        return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
    });
    const [isPlayMode, setIsPlayMode] = useState(mode === 'play');
    const [gameHistory, setGameHistory] = useState<boolean[][][]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [reachedEnd, setReachedEnd] = useState(false);
    const [initialGrid, setInitialGrid] = useState<boolean[][]>([]);
    const [isStarred, setIsStarred] = useState(false);

    // Load star status when in play mode
    useEffect(() => {
        if (mode === 'play' && gameData) {
            checkStarStatus();
        }
    }, [mode, gameData]);

    const checkStarStatus = async () => {
        if (!ourWallet.connected || !gameData) return;

        try {
            // First get the game PDA
            const [gamePda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from(GAME_SEED),
                    gameData.gameAuthor.toBuffer(),
                    Buffer.from(gameData.gameId),
                ],
                programID
            );

            // Then get the star PDA
            const [starPda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from(STAR_SEED),
                    ourWallet.publicKey.toBuffer(),
                    gamePda.toBuffer(),
                ],
                programID
            );

            try {
                await program.account.star.fetch(starPda);
                setIsStarred(true);
            } catch {
                setIsStarred(false);
            }
        } catch (error) {
            console.error("Error checking star status:", error);
        }
    };

    const handleStar = async () => {
        if (!ourWallet.connected || !gameData) return;

        try {
            // First get the game PDA
            const [gamePda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from(GAME_SEED),
                    gameData.gameAuthor.toBuffer(),
                    Buffer.from(gameData.gameId),
                ],
                programID
            );

            // Then get the star PDA
            const [starPda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from(STAR_SEED),
                    ourWallet.publicKey.toBuffer(),
                    gamePda.toBuffer(),
                ],
                programID
            );

            if (!isStarred) {
                await program.methods.starGame()
                    .accountsStrict({
                        game: gamePda,
                        starUser: ourWallet.publicKey,
                        staredGame: starPda,
                        systemProgram: web3.SystemProgram.programId,
                    })
                    .rpc();
                setIsStarred(true);
                notify({ type: 'success', message: 'Game starred!' });
            } else {
                await program.methods.unstarGame()
                    .accountsStrict({
                        game: gamePda,
                        starUser: ourWallet.publicKey,
                        starGame: starPda,
                    })
                    .rpc();
                setIsStarred(false);
                notify({ type: 'success', message: 'Game unstarred!' });
            }
        } catch (error) {
            console.error("Error starring game:", error);
            notify({ type: 'error', message: 'Error starring game' });
        }
    };

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

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentStep(step => {
                    if (step < gameHistory.length - 1) {
                        return step + 1;
                    }
                    setReachedEnd(true);
                    setIsPlaying(false);
                    return step;
                });
            }, 500);
        }
        return () => clearInterval(interval);
    }, [isPlaying, gameHistory.length]);

    const generateMoreGenerations = () => {
        let currentGrid = gameHistory[gameHistory.length - 1];
        const newHistory = [...gameHistory];
        
        // Generate 100 more generations
        for (let i = 0; i < 100; i++) {
            const nextGrid = computeNextGeneration(currentGrid);
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
            notify({ type: 'success', message: `Game saved ` });
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
        <div className="flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-4">
                {mode === 'create' ? (
                    <input
                        type="text"
                        placeholder="Enter game name"
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        className="px-4 py-2 border rounded"
                    />
                ) : (
                    <h2 className="text-xl font-bold text-white">{gameName}</h2>
                )}
                <div className="space-x-4">
                    {mode === 'play' && (
                        <>
                            <button
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                onClick={() => setIsPlaying(!isPlaying)}
                            >
                                {isPlaying ? 'Pause' : 'Play'}
                            </button>
                            <button
                                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                onClick={handleStar}
                            >
                                {isStarred ? '⭐ Unstar' : '☆ Star'}
                            </button>
                        </>
                    )}
                    {mode === 'create' && (
                        <button
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            onClick={startGame}
                        >
                            Start Game
                        </button>
                    )}
                    {onExit && (
                        <button
                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                            onClick={onExit}
                        >
                            Exit
                        </button>
                    )}
                </div>
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
            {isPlayMode && (
                <div className="flex gap-2 items-center mb-4">
                    <button
                        className="px-4 py-2 bg-gray-200 rounded-lg text-black"
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
                        className="px-4 py-2 bg-gray-200 rounded-lg text-black"
                        onClick={() => setCurrentStep(step => Math.min(gameHistory.length - 1, step + 1))}
                        disabled={currentStep === gameHistory.length - 1}
                    >
                        →
                    </button>
                    <span className="ml-2">
                        Generation: {currentStep}
                    </span>
                    {reachedEnd && (
                        <button
                            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
                            onClick={generateMoreGenerations}
                        >
                            Generate More
                        </button>
                    )}
                    <button
                        className="ml-4 px-4 py-2 bg-red-500 text-white rounded-lg"
                        onClick={() => {
                            setIsPlayMode(false);
                            setIsPlaying(false);
                            setGrid(gameHistory[currentStep]);
                        }}
                    >
                        Exit
                    </button>
                </div>
            )}
            {mode === 'create' && (
                <div className="flex flex-col items-center gap-4 mt-4 w-96">
                    <input
                        type="text"
                        maxLength={32}
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        placeholder="Enter game name (max 32 characters)"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                    />
                    <button
                        className="group w-full btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
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
                </div>
            )}
        </div>
    );
};
