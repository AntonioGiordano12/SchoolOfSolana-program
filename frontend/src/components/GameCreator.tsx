import { FC, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import { PublicKey } from '@solana/web3.js';
import { GameOfLife } from './game_of_life';
import idl from './game_of_life.json';
import { notify } from "../utils/notifications";
import { GAME_SEED } from '../constants';
import { GamePlayer } from './GamePlayer';

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.address);

// Grid size and cell size
const GRID_SIZE = 64;
const CELL_SIZE = 10;

interface GameCreatorProps {
    onGameCreated: () => void;
    onExit?: () => void;
}

export const GameCreator: FC<GameCreatorProps> = ({ onGameCreated, onExit }) => {
    const ourWallet = useWallet();
    const { connection } = useConnection();
    const [gameName, setGameName] = useState('');
    const [mode, setMode] = useState<'edit' | 'preview'>('edit');
    const [grid, setGrid] = useState<boolean[][]>(() => Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false)));

    const getProvider = () => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        setProvider(provider)
        return provider
    };

    const handleCellClick = (row: number, col: number) => {
        if (mode === 'edit') {
            const newGrid = grid.map(row => [...row]);
            newGrid[row][col] = !newGrid[row][col];
            setGrid(newGrid);
        }
    };

    const togglePreview = () => {
        if (mode === 'edit') {
            setMode('preview');
        } else {
            setMode('edit');
        }
    };

    const serializeBitmap = (aliveCells: Array<[number, number]>): Uint8Array => {
        const bitmap = new Uint8Array(512); // 64x64 bits = 4096 bits = 512 bytes
        aliveCells.forEach(([row, col]) => {
            const bitIndex = row * GRID_SIZE + col;
            const byteIndex = Math.floor(bitIndex / 8);
            const bitOffset = bitIndex % 8;
            bitmap[byteIndex] |= (1 << bitOffset);
        });
        return bitmap;
    };

    const createGame = async () => {
        if (!ourWallet.connected) {
            notify({ type: 'error', message: 'Please connect your wallet first!' });
            return;
        }

        if (!gameName.trim()) {
            notify({ type: 'error', message: 'Please enter a game name!' });
            return;
        }

        const anchProvider = getProvider();
        const program = new Program<GameOfLife>(idl_object, anchProvider);

        const aliveCells: Array<[number, number]> = [];
        grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell) {
                    aliveCells.push([rowIndex, colIndex]);
                }
            });
        });

        if (aliveCells.length === 0) {
            notify({ type: 'error', message: 'Please add at least one live cell!' });
            return;
        }

        try {
            const [gamePda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from(GAME_SEED),
                    anchProvider.publicKey.toBuffer(),
                    Buffer.from(gameName),
                ],
                programID
            );

            const bitmap = Buffer.from(serializeBitmap(aliveCells));
            
            const tx = await program.methods
                .initialize(gameName, bitmap)
                .accounts({
                    gameOwner: anchProvider.publicKey,
                })
                .rpc();

            console.log("Game saved! - Transaction signature:", tx);
            notify({ type: 'success', message: 'Game saved successfully!' });
            onGameCreated();
        } catch (error) {
            console.error("Error saving game:", error);
            notify({ type: 'error', message: 'Failed to save the game. Please try again.' });
        }
    };

    if (mode === 'preview') {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center w-full mb-4">
                    <h2 className="text-xl font-bold text-white">Preview Mode</h2>
                    <div className="space-x-4">
                        <button
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            onClick={togglePreview}
                        >
                            Back to Edit
                        </button>
                        <button
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            onClick={createGame}
                        >
                            Save Game
                        </button>
                    </div>
                </div>
                <GamePlayer 
                    gameData={{
                        gameId: gameName || 'Preview',
                        gameAuthor: ourWallet.publicKey,
                        aliveCells: grid,
                        stars: 0,
                        pubkey: ourWallet.publicKey,
                    }}
                    previewMode={true}
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center w-full mb-4">
                <input
                    type="text"
                    maxLength={32}
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="Enter game name (max 32 characters)"
                    className="px-4 py-2 border rounded text-black"
                />
                <div className="space-x-4">
                    <button
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={togglePreview}
                    >
                        Preview
                    </button>
                    <button
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        onClick={createGame}
                    >
                        Save Game
                    </button>
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
                    {grid.map((row, rowIndex) => (
                        row.map((cell, colIndex) => (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                onClick={() => handleCellClick(rowIndex, colIndex)}
                                style={{
                                    width: `${CELL_SIZE}px`,
                                    height: `${CELL_SIZE}px`,
                                    cursor: 'pointer',
                                }}
                                className={`border transition-colors duration-200 ${
                                    cell ? 'bg-indigo-500' : 'bg-white'
                                } hover:bg-gray-100`}
                            />
                        ))
                    ))}
                </div>
            </div>
        </div>
    );
};
