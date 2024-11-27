import { FC, useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, setProvider, web3 } from "@coral-xyz/anchor";
import { PublicKey } from '@solana/web3.js';
import { GameOfLife } from './game_of_life';
import idl from './game_of_life.json';
import { notify } from "../utils/notifications";
import { GAME_SEED, STAR_SEED } from '../constants';

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.address);

// Grid size and cell size
const GRID_SIZE = 64;
const CELL_SIZE = 10;

interface GameData {
    gameId: string;
    gameAuthor: PublicKey;
    aliveCells: boolean[][];
    stars: number;
    pubkey: PublicKey;
}

interface GamePlayerProps {
    gameData: GameData;
    onExit: () => void;
}

export const GamePlayer: FC<GamePlayerProps> = ({ gameData, onExit }) => {
    const ourWallet = useWallet();
    const { connection } = useConnection();
    const [grid, setGrid] = useState(() => gameData.aliveCells);
    const [gameHistory, setGameHistory] = useState<boolean[][][]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [reachedEnd, setReachedEnd] = useState(false);
    const [isStarred, setIsStarred] = useState(false);

    const getProvider = () => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        setProvider(provider)
        return provider
    };

    useEffect(() => {
        if (ourWallet.connected) {
            checkStarStatus();
        }
    }, [ourWallet.connected]);

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

    useEffect(() => {
        startGame();
    }, []);

    const checkStarStatus = async () => {
        if (!ourWallet.connected) return;

        try {
            const [gamePda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from(GAME_SEED),
                    gameData.gameAuthor.toBuffer(),
                    Buffer.from(gameData.gameId),
                ],
                programID
            );

            const [starPda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from(STAR_SEED),
                    ourWallet.publicKey.toBuffer(),
                    gamePda.toBuffer(),
                ],
                programID
            );

            const anchProvider = getProvider();
            const program = new Program<GameOfLife>(idl_object, anchProvider);

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

    const computeNextGeneration = (currentGrid: boolean[][]): boolean[][] => {
        const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));

        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                let neighbors = 0;

                // Check all 8 neighbors
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (i === 0 && j === 0) continue;

                        const newRow = (row + i + GRID_SIZE) % GRID_SIZE;
                        const newCol = (col + j + GRID_SIZE) % GRID_SIZE;

                        if (currentGrid[newRow][newCol]) {
                            neighbors++;
                        }
                    }
                }

                // Apply Game of Life rules
                if (currentGrid[row][col]) {
                    newGrid[row][col] = neighbors === 2 || neighbors === 3;
                } else {
                    newGrid[row][col] = neighbors === 3;
                }
            }
        }

        return newGrid;
    };

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

        // Generate initial 100 generations
        for (let i = 0; i < 100; i++) {
            const nextGrid = computeNextGeneration(currentGrid);
            history.push(nextGrid);
            currentGrid = nextGrid;
        }

        setGameHistory(history);
        setCurrentStep(0);
        setReachedEnd(false);
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

            const anchProvider = getProvider();
            const program = new Program<GameOfLife>(idl_object, anchProvider);

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

    return (
        <div className="flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-4">
                <h2 className="text-xl font-bold text-white">{gameData.gameId}</h2>
                <div className="space-x-4">
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
                    <button
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        onClick={onExit}
                    >
                        Exit
                    </button>
                </div>
            </div>

            <div className="border border-gray-300 rounded-lg p-2 overflow-auto">
                <div className="grid" style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                    gap: '1px',
                }}>
                    {gameHistory[currentStep]?.map((row, rowIndex) => (
                        row.map((cell, colIndex) => (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                style={{
                                    width: `${CELL_SIZE}px`,
                                    height: `${CELL_SIZE}px`,
                                    cursor: 'default',
                                }}
                                className={`border transition-colors duration-200 ${cell ? 'bg-indigo-500' : 'bg-white'
                                    }`}
                            />
                        ))
                    ))}
                </div>
            </div>

            <div className="flex gap-2 items-center mt-4">
                <button
                    className="px-4 py-2 bg-gray-200 rounded-lg text-black"
                    onClick={() => setCurrentStep(step => Math.max(0, step - 1))}
                    disabled={currentStep === 0}
                >
                    ←
                </button>
                <span className="ml-2">
                    Generation: {currentStep}
                </span>
                <button
                    className="px-4 py-2 bg-gray-200 rounded-lg text-black"
                    onClick={() => setCurrentStep(step => Math.min(gameHistory.length - 1, step + 1))}
                    disabled={currentStep === gameHistory.length - 1}
                >
                    →
                </button>
                {reachedEnd && (
                    <button
                        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
                        onClick={generateMoreGenerations}
                    >
                        Generate More
                    </button>
                )}
            </div>
        </div>
    );
};
